import mongoose from "mongoose";

/**
 * Menu item isolated per tenant (and optionally per branch for outlet-specific menus).
 */
const menuSchema = new mongoose.Schema(
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
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    image: { type: String },
    /** Cloudinary public_id for replace/delete */
    imagePublicId: { type: String, default: "" },
    /** Structured category for multi-tenant menus */
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    /**
     * Legacy fixed categories (pre-SaaS). Kept for backward compatibility when `categoryId` is null.
     * Prefer `Category` documents going forward.
     */
    /** @deprecated Prefer `categoryId`; retained for legacy rows. */
    category: {
      type: String,
      enum: [
        "Hot Drinks",
        "Cold Drinks",
        "Tea",
        "Arabic Coffee",
        "Desserts",
        "Snacks",
        "Cakes",
        "Others",
      ],
      default: "Others",
    },

    // extra Options for customization
    options: [
      {
        name: { type: String },
        values: [String],
      },
    ],

    soldCount: { type: Number, default: 0, min: 0 },
    likeCount: { type: Number, default: 0, min: 0 },
    dislikeCount: { type: Number, default: 0, min: 0 },
    commentCount: { type: Number, default: 0, min: 0 },
    ratingSum: { type: Number, default: 0, min: 0 },
    ratingCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

menuSchema.index({ tenantId: 1, name: 1 });

const Menu = mongoose.model("Menu", menuSchema);

export default Menu;
