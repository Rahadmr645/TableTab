import mongoose from "mongoose";

/** OTP records scoped per tenant so the same email can exist on different restaurants. */
const otpSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

otpSchema.index({ tenantId: 1, email: 1 });

const AdminOTP = mongoose.model("AdminOTP", otpSchema);

export default AdminOTP;
