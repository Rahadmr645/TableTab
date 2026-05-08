import AdminOTP from "../models/AdminOTP.js";
import bcrypt from "bcryptjs";

import sendEmail from "../utils/sendMailer.js";
import User, { STAFF_ROLES } from "../models/UserModel.js";

export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "please provide email" });
    }

    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(500).json({ message: "Tenant context missing" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const staffUser = await User.findOne({
      email: normalizedEmail,
      tenantId,
      role: { $in: STAFF_ROLES },
    })
      .select("staffStatus")
      .lean();

    if (!staffUser) {
      return res.status(403).json({
        message:
          "This email is not registered for staff access. Your restaurant owner or manager must add your account first.",
      });
    }

    if (staffUser.staffStatus === "suspended") {
      return res.status(403).json({
        message: "This account has been suspended. Contact your restaurant owner.",
      });
    }

    const otp = Math.floor(10000 + Math.random() * 900000).toString();

    const hashedOTP = await bcrypt.hash(otp, 10);

    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    await AdminOTP.deleteMany({
      email: normalizedEmail,
      tenantId,
    });

    await AdminOTP.create({
      tenantId,
      email: normalizedEmail,
      otp: hashedOTP,
      expiresAt: expiresAt,
    });
    await sendEmail(
      normalizedEmail,
      "TableTab — your sign-in code",
      `Your verification code is ${otp}. It expires in 2 minutes.`,
    );
    res.status(200).json({
      message: "OTP send successfully",
      expiresAt: expiresAt.getTime(),
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
