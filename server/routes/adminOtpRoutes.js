import express from 'express';

import { sendOTP } from '../controllers/adminOtpController.js';
import { verifyOTP } from '../controllers/adminotpVerify.js';


const router = express.Router();

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);


export default router