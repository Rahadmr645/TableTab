import mongoose from "mongoose";

const menuCommentSchema = new mongoose.Schema(
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
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Menu",
      required: true,
      index: true,
    },
    guestToken: { type: String, required: true, trim: true },
    customerName: { type: String, required: true, trim: true, maxlength: 80 },
    text: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

const MenuComment = mongoose.model("MenuComment", menuCommentSchema);
export default MenuComment;
