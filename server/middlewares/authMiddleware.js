import JWT from "jsonwebtoken";
import mongoose from "mongoose";

const SECRET = process.env.SECTRATE_KEY;

/**
 * Verify `Authorization: Bearer <jwt>` and attach SaaS identity on `req`.
 * Payload shape (required): `{ userId, tenantId, role }` — optional legacy `{ id }` maps to `userId`.
 * Staff tokens may include `branchId` for outlet-scoped filtering without an extra DB round-trip.
 */
export function authenticate(req, res, next) {
  if (!SECRET) {
    return res.status(503).json({
      message: "Server authentication is not configured (missing SECTRATE_KEY).",
    });
  }

  const raw = req.headers.authorization || "";
  const token = raw.startsWith("Bearer ") ? raw.slice(7).trim() : "";

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const decoded = JWT.verify(token, SECRET);
    const userId = decoded?.userId ?? decoded?.id;
    const tenantId = decoded?.tenantId;
    const role = decoded?.role;
    const branchId = decoded?.branchId ?? null;

    if (!userId || !tenantId || !role) {
      return res.status(401).json({
        message:
          "Invalid token payload (expected userId, tenantId, role — re-login after upgrade).",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(String(userId))) {
      return res.status(401).json({ message: "Invalid token user id" });
    }
    if (!mongoose.Types.ObjectId.isValid(String(tenantId))) {
      return res.status(401).json({ message: "Invalid token tenant id" });
    }

    req.user = {
      userId: String(userId),
      tenantId: String(tenantId),
      role: String(role),
      branchId: branchId && mongoose.Types.ObjectId.isValid(String(branchId))
        ? String(branchId)
        : null,
      email: decoded?.email,
      username: decoded?.username,
    };
    /** Canonical tenant for downstream middleware/controllers — always from JWT, never from client body */
    req.tenantId = new mongoose.Types.ObjectId(String(tenantId));

    const headerTenant = req.headers["x-tenant-id"];
    if (
      headerTenant &&
      String(headerTenant) !== String(tenantId)
    ) {
      return res.status(403).json({
        message: "Tenant mismatch: X-Tenant-Id must match the authenticated tenant.",
      });
    }

    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/** Same as `authenticate` but continues when no/invalid token (sets no `req.user`). */
export function optionalAuthenticate(req, res, next) {
  if (!SECRET) return next();

  const raw = req.headers.authorization || "";
  const token = raw.startsWith("Bearer ") ? raw.slice(7).trim() : "";
  if (!token) return next();

  try {
    const decoded = JWT.verify(token, SECRET);
    const userId = decoded?.userId ?? decoded?.id;
    const tenantId = decoded?.tenantId;
    const role = decoded?.role;
    const branchId = decoded?.branchId ?? null;
    if (userId && tenantId && role) {
      req.user = {
        userId: String(userId),
        tenantId: String(tenantId),
        role: String(role),
        branchId:
          branchId && mongoose.Types.ObjectId.isValid(String(branchId))
            ? String(branchId)
            : null,
      };
      req.tenantId = new mongoose.Types.ObjectId(String(tenantId));
    }
  } catch {
    /* ignore */
  }
  next();
}

export function signUserToken(payload, options = {}) {
  if (!SECRET) {
    throw new Error("SECTRATE_KEY is not configured");
  }
  return JWT.sign(payload, SECRET, { expiresIn: "1d", ...options });
}

/** Short-lived token after public trial card setup — allows one tenant registration. */
export function signTrialEnrollmentToken({ email, setupIntentId }) {
  if (!SECRET) {
    throw new Error("SECTRATE_KEY is not configured");
  }
  return JWT.sign(
    {
      typ: "trial_enrollment",
      email: String(email).toLowerCase().trim(),
      setupIntentId: String(setupIntentId),
    },
    SECRET,
    { expiresIn: "2h" },
  );
}

export function verifyTrialEnrollmentToken(token) {
  if (!SECRET) {
    throw new Error("SECTRATE_KEY is not configured");
  }
  const d = JWT.verify(token, SECRET);
  if (d.typ !== "trial_enrollment") {
    throw new Error("Invalid enrollment token");
  }
  if (!d.email || !d.setupIntentId) {
    throw new Error("Invalid enrollment payload");
  }
  return {
    email: String(d.email).toLowerCase().trim(),
    setupIntentId: String(d.setupIntentId),
  };
}
