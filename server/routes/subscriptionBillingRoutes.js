import express from "express";
import {
  optionalAuthenticate,
  authenticate,
} from "../middlewares/authMiddleware.js";
import {
  getBillingContext,
  startTrialCardSetup,
  finalizeTrialCardSetup,
} from "../controllers/subscriptionPayController.js";

const router = express.Router();

router.get("/billing-context", optionalAuthenticate, getBillingContext);
router.post("/trial-setup/start", authenticate, startTrialCardSetup);
router.post("/trial-setup/finalize", authenticate, finalizeTrialCardSetup);

export default router;
