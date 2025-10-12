import express from 'express'
import { QRCodegen } from '../controllers/qrcodeController.js';

const router = express.Router();



// generate the qrcode 
router.get('/generate/:tableId', QRCodegen);

export default router;