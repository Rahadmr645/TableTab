import express from "express";
import { paymentIntent } from "../controllers/paymentController.js";
import { optionalPublicTenant } from "../middlewares/tenantMiddleware.js";

const router = express.Router();

router.post("/create-payment-intent", optionalPublicTenant, paymentIntent);

export default router;
