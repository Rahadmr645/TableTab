import mongoose from "mongoose";

export const STAFF_ROLES = ["owner", "manager", "chef", "cashier"];
export const ALL_USER_ROLES = ["customer", ...STAFF_ROLES];

/**
 * End-customers and staff share one User collection, isolated per tenant.
 * Email uniqueness is **per tenant** (`{ email, tenantId }`), not global.
 */
const usersSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    profilePic: {
      type: String,
      default: "",
    },
    profilePicId: {
      type: String,
      default: "",
    },
    /** Snapshot `{ cart, quantities }` synced across devices when logged in */
    savedCart: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    /** Optional outlet assignment for branch-scoped staff; managers/owners may omit. */
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },
    role: {
      type: String,
      enum: ALL_USER_ROLES,
      required: true,
      default: "customer",
      index: true,
    },
    /** Staff login / OTP eligibility — owner may suspend without deleting the user. */
    staffStatus: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true },
);

usersSchema.index({ email: 1, tenantId: 1 }, { unique: true });

const User = mongoose.model("User", usersSchema);

export default User;
