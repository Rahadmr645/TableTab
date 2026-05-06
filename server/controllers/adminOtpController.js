import AdminOTP from "../models/AdminOTP.js";
import dotenv from "dotenv";
dotenv.config();
import bcrypt from "bcryptjs";

import sendEmail from "../utils/sendMailer.js";

export const sendOTP = async (req, res) => {
  
  console.log('data', req.body)
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "please provide email" });
    }

    const otp = Math.floor(10000 + Math.random() * 900000).toString();

    // has otp befor save
    const hashedOTP = await bcrypt.hash(otp, 10);

    //  calculate the expiry time first
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    // delete previous otp
    await AdminOTP.deleteMany({ email });

    await AdminOTP.create({
      email,
      otp: hashedOTP,
      expiresAt: expiresAt,
    });
    await sendEmail(
      email,
      "your otp Code",
      `yoru otp code is ${otp} and it will expire in 2 min`,
    );
    res.status(200).json({
      message: "OTP send successfully",
      expiresAt: expiresAt.getTime(), // send as timestamp
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
