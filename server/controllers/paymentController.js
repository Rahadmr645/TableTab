import dotenv from "dotenv";
import { getTenantStripe } from "../utils/stripeClient.js";

dotenv.config();

export const paymentIntent = async (req, res) => {
  try {
    const { stripe, publishableKey } = await getTenantStripe(req.tenantId);
    if (!stripe) {
      return res.status(503).json({ error: "Stripe is not configured" });
    }

    const amount = Number(req.body.amount);

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const meta = {
      ...(req.tenantId ? { tenantId: String(req.tenantId) } : {}),
    };

    let paymentIntentResult;
    try {
      paymentIntentResult = await stripe.paymentIntents.create({
        amount: amount,
        currency: "sar",
        payment_method_types: ["card", "stc_pay"],
        metadata: meta,
      });
    } catch (stripeErr) {
      console.warn(
        "Could not create PaymentIntent with explicit payment_method_types, falling back to automatic_payment_methods:",
        stripeErr.message
      );
      paymentIntentResult = await stripe.paymentIntents.create({
        amount: amount,
        currency: "sar",
        automatic_payment_methods: { enabled: true },
        metadata: meta,
      });
    }

    res.status(200).json({
      clientSecret: paymentIntentResult.client_secret,
      publishableKey: publishableKey,
    });
  } catch (error) {
    console.error("Stripe error:", error);
    res.status(500).json({ error: error.message });
  }
};
