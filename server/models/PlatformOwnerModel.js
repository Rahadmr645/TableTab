import mongoose from "mongoose";

/** Single global platform operator (not tenant-scoped). Used when env credentials are unset. */
const platformOwnerSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("PlatformOwner", platformOwnerSchema);
