import Stripe from "stripe";
import Tenant from "../models/Tenant.js";

let _stripe = null;

/** Lazy Stripe client so the app can boot when `STRIPE_SECRET_KEY` is unset (non-payment dev). */
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!_stripe) _stripe = new Stripe(key);
  return _stripe;
}

/** Get Stripe client for a specific tenant if configured, otherwise fallback to platform's client */
export async function getTenantStripe(tenantId) {
  if (tenantId) {
    try {
      const tenant = await Tenant.findById(tenantId).select("stripeSecretKey stripePublishableKey").lean();
      if (tenant && tenant.stripeSecretKey && tenant.stripeSecretKey.trim()) {
        return {
          stripe: new Stripe(tenant.stripeSecretKey.trim()),
          publishableKey: tenant.stripePublishableKey ? tenant.stripePublishableKey.trim() : ""
        };
      }
    } catch (err) {
      console.error("Error fetching tenant Stripe keys:", err);
    }
  }
  return {
    stripe: getStripe(),
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ""
  };
}
