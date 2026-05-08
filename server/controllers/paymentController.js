import dotenv from "dotenv";
import { getStripe } from "../utils/stripeClient.js";

dotenv.config();

export const paymentIntent = async (req, res) => {
  try {
    const stripe = getStripe();
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

    const paymentIntentResult = await stripe.paymentIntents.create({
      amount: amount,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: meta,
    });

    res.status(200).json({
      clientSecret: paymentIntentResult.client_secret,
    });
  } catch (error) {
    console.error("Stripe error:", error);
    res.status(500).json({ error: error.message });
  }
};
