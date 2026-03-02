import express from "express";
import { paymentIntent } from "../controllers/paymentController.js";

const router = express.Router();

// create payment
router.post("/create-payment-intent", paymentIntent);


export default router;