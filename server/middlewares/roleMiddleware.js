/**
 * Role-based access for staff. Customers (`customer` role) are denied here by default.
 * Usage: `router.get('/admin-only', authenticate, requireRole(['owner','manager']), ...)`
 */
export function requireRole(allowedRoles = []) {
  const set = new Set(allowedRoles);
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (!set.has(role)) {
      return res.status(403).json({ message: "Insufficient permissions for this action" });
    }
    next();
  };
}

/** Staff routes should never run as a guest/customer user JWT. */
export function requireStaffAccount(req, res, next) {
  const role = req.user?.role;
  if (!role || role === "customer") {
    return res.status(403).json({ message: "Staff access only" });
  }
  next();
}
