import mongoose from "mongoose";

/**
 * Billing / plan period for a tenant. Enforced at API layer with `subscriptionMiddleware`
 * (see `subscriptionStatus` on Tenant for fast gate checks).
 */
const subscriptionSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    plan: { type: String, required: true, trim: true },
    price: { type: Number, min: 0, default: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["active", "canceled", "past_due", "trialing"],
      default: "trialing",
      index: true,
    },
  },
  { timestamps: true },
);

subscriptionSchema.index({ tenantId: 1, endDate: -1 });

const Subscription = mongoose.model("Subscription", subscriptionSchema);
export default Subscription;
