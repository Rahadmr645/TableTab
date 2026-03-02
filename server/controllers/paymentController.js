import express from "express";
import Stripe from "stripe";

import dotenv from "dotenv";
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const paymentIntent = async (req, res) => {

  console.log("stirpe data", req.body)
 
  const { amount } = req.body; // amount in cents
 console.log('amount recievd', amount)
  try {
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "USD",
      automatic_payment_methods: { enabled: true },
    });
    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};


