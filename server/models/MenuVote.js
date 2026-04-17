import mongoose from "mongoose";

const menuVoteSchema = new mongoose.Schema(
  {
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Menu",
      required: true,
      index: true,
    },
    guestToken: { type: String, required: true, trim: true },
    vote: { type: String, enum: ["like", "dislike"], required: true },
  },
  { timestamps: true }
);

menuVoteSchema.index({ menuItemId: 1, guestToken: 1 }, { unique: true });

const MenuVote = mongoose.model("MenuVote", menuVoteSchema);
export default MenuVote;
