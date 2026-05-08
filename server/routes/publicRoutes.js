import express from "express";
import { submitSubscriptionPaymentLead } from "../controllers/subscriptionLeadController.js";
import {
  startSubscriptionPayment,
  finalizeSubscriptionPayment,
  startPublicTrialSetup,
  finalizePublicTrialSetup,
} from "../controllers/subscriptionPayController.js";
import { registerTrialEnrollment } from "../controllers/tenantController.js";

const router = express.Router();

router.post("/subscription-payment-lead", submitSubscriptionPaymentLead);
router.post("/subscription-pay/start", startSubscriptionPayment);
router.post("/subscription-pay/finalize", finalizeSubscriptionPayment);
router.post("/trial-request/setup/start", startPublicTrialSetup);
router.post("/trial-request/setup/finalize", finalizePublicTrialSetup);
router.post("/trial-enrollment/register", registerTrialEnrollment);

export default router;
