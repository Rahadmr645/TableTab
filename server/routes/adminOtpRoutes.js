import express from "express";

import { sendOTP } from "../controllers/adminOtpController.js";
import { verifyOTP } from "../controllers/adminotpVerify.js";
import {
  resolvePublicTenant,
  stripForbiddenTenantFields,
} from "../middlewares/tenantMiddleware.js";
import { requireActiveSubscription } from "../middlewares/subscriptionMiddleware.js";

const router = express.Router();

const chain = [
  resolvePublicTenant,
  stripForbiddenTenantFields,
  requireActiveSubscription,
];

router.post("/send-otp", ...chain, sendOTP);
router.post("/verify-otp", ...chain, verifyOTP);

export default router;
