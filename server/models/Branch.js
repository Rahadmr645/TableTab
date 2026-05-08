import mongoose from "mongoose";

/**
 * Restaurant branch / outlet (Foodics-style). Optional on documents; when set, data can be filtered by branch.
 */
const branchSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    location: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

branchSchema.index({ tenantId: 1, name: 1 });

const Branch = mongoose.model("Branch", branchSchema);
export default Branch;
