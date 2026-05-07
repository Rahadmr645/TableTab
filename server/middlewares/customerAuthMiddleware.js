import JWT from "jsonwebtoken";

const SECRET = process.env.SECTRATE_KEY;

/**
 * Requires `Authorization: Bearer <jwt>` from customer login/signup.
 * Sets `req.customerId` (Mongo ObjectId string) on success.
 */
export function requireCustomerAuth(req, res, next) {
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
    const id = decoded?.id;
    if (!id) {
      return res.status(401).json({ message: "Invalid token payload" });
    }
    req.customerId = String(id);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
