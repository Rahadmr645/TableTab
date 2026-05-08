import Stripe from "stripe";

let _stripe = null;

/** Lazy Stripe client so the app can boot when `STRIPE_SECRET_KEY` is unset (non-payment dev). */
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!_stripe) _stripe = new Stripe(key);
  return _stripe;
}
