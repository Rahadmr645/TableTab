import express from "express";
import { optionalAuthenticate } from "../middlewares/authMiddleware.js";
import { QRCodegen, barcodeCodegen } from "../controllers/qrcodeController.js";
import {
  resolvePublicTenant,
  resolveOptionalBranch,
  stripForbiddenTenantFields,
} from "../middlewares/tenantMiddleware.js";
import { requireActiveSubscription } from "../middlewares/subscriptionMiddleware.js";

const router = express.Router();

const chain = [
  optionalAuthenticate,
  resolvePublicTenant,
  resolveOptionalBranch,
  stripForbiddenTenantFields,
  requireActiveSubscription,
];

router.get("/generate", ...chain, QRCodegen);
router.get("/generate/:tableId", ...chain, QRCodegen);
router.get("/barcode", ...chain, barcodeCodegen);
router.get("/barcode/:tableId", ...chain, barcodeCodegen);

export default router;
