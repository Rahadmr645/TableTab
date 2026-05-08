import express from "express";
import { QRCodegen, barcodeCodegen } from "../controllers/qrcodeController.js";
import {
  resolvePublicTenant,
  resolveOptionalBranch,
  stripForbiddenTenantFields,
} from "../middlewares/tenantMiddleware.js";
import { requireActiveSubscription } from "../middlewares/subscriptionMiddleware.js";

const router = express.Router();

const chain = [
  resolvePublicTenant,
  resolveOptionalBranch,
  stripForbiddenTenantFields,
  requireActiveSubscription,
];

router.get("/generate/:tableId", ...chain, QRCodegen);
router.get("/barcode/:tableId", ...chain, barcodeCodegen);

export default router;
