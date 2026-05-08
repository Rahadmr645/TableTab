import mongoose from "mongoose";

/**
 * Physical table (or service area) for QR ordering. Orders reference `tableId` as string in legacy API;
 * we store stable codes for URLs and optional link to Branch.
 */
const tableSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },
    /** Short code used in routes like `/menu/:tableCode` if adopted by clients. */
    code: { type: String, trim: true, default: "" },
    label: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

tableSchema.index({ tenantId: 1, label: 1 });
tableSchema.index({ tenantId: 1, code: 1 });

const Table = mongoose.model("Table", tableSchema);
export default Table;
