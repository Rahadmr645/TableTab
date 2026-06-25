import express from "express";

import { sendOTP } from "../controllers/adminOtpController.js";
import { verifyOTP } from "../controllers/adminotpVerify.js";
import {
  resolveStaffOtpTenant,
  stripForbiddenTenantFields,
} from "../middlewares/tenantMiddleware.js";

const router = express.Router();

const chain = [
  resolveStaffOtpTenant,
  stripForbiddenTenantFields,
];

router.post("/send-otp", ...chain, sendOTP);
router.post("/verify-otp", ...chain, verifyOTP);

export default router;
