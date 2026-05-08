import bcrypt from "bcryptjs";

import AdminOTP from "../models/AdminOTP.js";

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(500).json({ message: "Tenant context missing" });
    }

    const record = await AdminOTP.findOne({
      email: String(email).toLowerCase().trim(),
      tenantId,
    });

    if (!record) {
      return res.status(400).json({ message: "OTP not found" });
    }

    if (record.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const isMatch = await bcrypt.compare(otp.toString().trim(), record.otp);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    await AdminOTP.deleteMany({
      email: String(email).toLowerCase().trim(),
      tenantId,
    });

    res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};
