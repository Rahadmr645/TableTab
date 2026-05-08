/**
 * @deprecated Legacy staff collection (pre–multi-tenant). Staff users now live in `User`
 * with roles `owner | manager | chef | cashier` and required `tenantId`.
 * Kept only so existing MongoDB collections remain readable during migrations.
 */
import mongoose from "mongoose";
const adminSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
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
    role: {
      type: String,
      enum: ["chef", "admin"],
      required: true,
    },
  },
  { timestamps: true },
);

const Admin = mongoose.model("admin", adminSchema);

export default Admin;
