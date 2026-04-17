import express from "express";
import { QRCodegen, barcodeCodegen } from "../controllers/qrcodeController.js";

const router = express.Router();

router.get("/generate/:tableId", QRCodegen);
router.get("/barcode/:tableId", barcodeCodegen);

export default router;