import mongoose from "mongoose";

/**
 * Root restaurant account (tenant) for multi-tenant SaaS isolation.
 * All operational data is scoped by `tenantId`; cross-tenant access is forbidden at middleware + query level.
 */
const tenantSchema = new mongoose.Schema(
  {
    businessName: { type: String, required: true, trim: true },
    /** Public slug for login/signup resolution (e.g. subdomain or deep-link). */
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "expired", "trial"],
      default: "trial",
      index: true,
    },
    /** Plan key for billing (e.g. basic, pro) — keep flexible string. */
    plan: { type: String, default: "trial", trim: true },
    /** When the current subscription period ends (used with Subscription records). */
    expiresAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: true } },
);

const Tenant = mongoose.model("Tenant", tenantSchema);
export default Tenant;
