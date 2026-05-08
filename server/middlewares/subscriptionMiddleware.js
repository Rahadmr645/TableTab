import Tenant from "../models/Tenant.js";

/**
 * Blocks API usage when the tenant subscription is not usable.
 * We treat **active** and **trial** as allowed; **expired** is blocked (403).
 * This aligns with typical SaaS trials while keeping the strict gate requested for expired accounts.
 */
export async function requireActiveSubscription(req, res, next) {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(500).json({ message: "Tenant context missing" });
    }

    const tenant = await Tenant.findById(tenantId).select("subscriptionStatus expiresAt").lean();
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    const status = tenant.subscriptionStatus;
    const allowed = status === "active" || status === "trial";
    if (!allowed) {
      return res.status(403).json({
        message: "Subscription inactive or expired",
        subscriptionStatus: status,
      });
    }

    if (tenant.expiresAt && new Date(tenant.expiresAt) < new Date()) {
      return res.status(403).json({
        message: "Tenant subscription period has ended",
        expiresAt: tenant.expiresAt,
      });
    }

    req.tenantRecord = tenant;
    next();
  } catch (e) {
    res.status(500).json({ message: "Subscription check failed", error: e.message });
  }
}
