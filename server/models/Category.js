import mongoose from "mongoose";

/**
 * Menu category per tenant (replaces hard-coded enum on Menu for SaaS flexibility).
 */
const categorySchema = new mongoose.Schema(
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
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, default: "" },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

categorySchema.index({ tenantId: 1, name: 1 });
categorySchema.index({ tenantId: 1, branchId: 1, name: 1 });

const Category = mongoose.model("Category", categorySchema);
export default Category;
