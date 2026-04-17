import mongoose from "mongoose";

const orderItemReviewSchema = new mongoose.Schema(
  {
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Menu",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    guestToken: { type: String, required: true, trim: true },
    customerName: { type: String, trim: true, maxlength: 80 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 800, default: "" },
  },
  { timestamps: true }
);

orderItemReviewSchema.index(
  { orderId: 1, menuItemId: 1, guestToken: 1 },
  { unique: true }
);

const OrderItemReview = mongoose.model("OrderItemReview", orderItemReviewSchema);
export default OrderItemReview;
