import mongoose from "mongoose";

/**
 * Public submissions from the admin app's subscription plans page (payment proof Gmail + plan).
 */
const subscriptionPaymentLeadSchema = new mongoose.Schema(
  {
    planKey: { type: String, required: true, trim: true },
    planName: { type: String, required: true, trim: true },
    paymentGmail: { type: String, required: true, trim: true, lowercase: true },
    paymentNote: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

const SubscriptionPaymentLead = mongoose.model(
  "SubscriptionPaymentLead",
  subscriptionPaymentLeadSchema,
);
export default SubscriptionPaymentLead;
