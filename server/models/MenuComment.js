import mongoose from "mongoose";

const menuCommentSchema = new mongoose.Schema(
  {
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
  { timestamps: true }
);

const MenuComment = mongoose.model("MenuComment", menuCommentSchema);
export default MenuComment;
