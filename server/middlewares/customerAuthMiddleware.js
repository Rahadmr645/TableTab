import { authenticate } from "./authMiddleware.js";

/**
 * Customer-only JWT guard for `/api/user/*` account routes.
 * Sets legacy `req.customerId` for existing controllers.
 */
export function requireCustomerAuth(req, res, next) {
  authenticate(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (req.user.role !== "customer") {
      return res.status(403).json({ message: "Customer session required" });
    }
    req.customerId = req.user.userId;
    next();
  });
}

