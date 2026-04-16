import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Stripe secret key missing");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const paymentIntent = async (req, res) => {
  try {
    console.log("stripe data:", req.body);

    // Always validate
    const amount = Number(req.body.amount);

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // must be in cents
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId: "exampleUser",
      },
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    });

  } catch (error) {
    console.error("Stripe error:", error);
    res.status(500).json({ error: error.message });
  }
};