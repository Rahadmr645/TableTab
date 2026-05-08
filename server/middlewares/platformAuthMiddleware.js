import JWT from "jsonwebtoken";

const SECRET = process.env.SECTRATE_KEY;

/**
 * Platform-operator JWTs are signed with the same secret as staff tokens but carry
 * `{ platformOwner: true }` and no tenant scope. Never treat them as tenant JWTs.
 */
export function signPlatformToken(payload, options = {}) {
  if (!SECRET) {
    throw new Error("SECTRATE_KEY is not configured");
  }
  return JWT.sign(payload, SECRET, { expiresIn: "8h", ...options });
}

export function authenticatePlatformOwner(req, res, next) {
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
    if (!decoded?.platformOwner) {
      return res.status(403).json({ message: "Platform owner access required" });
    }
    req.platformOwner = { email: decoded.email };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
