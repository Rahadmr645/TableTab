import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
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
  /**
   * Stable string for indexing when `branchId` is absent (Mongo unique indexes + null branchId collide).
   * Set to `String(branchId)` when scoped to an outlet, else `"default"`.
   */
  branchKey: { type: String, default: "default", index: true },
  tableId: { type: String, reqired: true },
  customerName: { type: String, required: true },

  // if user is logged in
  userID: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

  // if user is guest store a gust token
  guestToken: {
    type: String,
    default: null,
  },

  items: [
    {
      menuItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Menu",
        default: null,
      },
      name: String,
      price: Number,
      quantity: Number,
      refundedQuantity: {
        type: Number,
        default: 0,
      },
      refundedAmount: {
        type: Number,
        default: 0,
      },
      cancelledQuantity: {
        type: Number,
        default: 0,
      },
      cancelReason: {
        type: String,
        default: null,
      },
    },
  ],

  totalPrice: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  discountType: { type: String, enum: ["percent", "fixed"], default: "percent" },
  discountReason: { type: String, default: "" },
  status: {
    type: String,
    enum: ["pending", "In Progress", "Ready", "Finised", "Finished", "Cancelled"],
    default: "pending",
  },
  paymentMethod: {
    type: String,
    enum: ["card", "cash", "split"],
    default: "card",
    index: true,
  },
  cashAmount: { type: Number, default: 0 },
  cardAmount: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ["paid", "unpaid", "refunded"],
    default: "unpaid",
    index: true,
  },
  paymentIntentId: {
    type: String,
    default: null,
    index: true,
  },
  cancelledAt: {
    type: Date,
    default: null,
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
    index: true,
  },
  cancelReason: {
    type: String,
    default: null,
  },
  refundStatus: {
    type: String,
    enum: ["none", "pending", "succeeded", "failed"],
    default: "none",
  },
  refundedAmount: {
    type: Number,
    default: 0,
  },
  refundMethod: {
    type: String,
    enum: ["cash", "card", "split", "none"],
    default: "none",
  },
  refundCashAmount: {
    type: Number,
    default: 0,
  },
  refundCardAmount: {
    type: Number,
    default: 0,
  },
  refundedItems: [
    {
      name: { type: String },
      quantity: { type: Number },
      price: { type: Number },
    },
  ],
  cancellationRequests: [
    {
      requestedBy: {
        type: String,
        enum: ["customer", "staff"],
        required: true,
      },
      requestedAt: {
        type: Date,
        default: Date.now,
      },
      items: [
        {
          menuItemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Menu",
          },
          name: String,
          quantityToCancel: {
            type: Number,
            required: true,
          },
        },
      ],
      cancelReason: String,
      status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending",
      },
      resolvedAt: Date,
      resolvedBy: mongoose.Schema.Types.ObjectId,
    },
  ],

  /** Calendar day YYYY-MM-DD in ORDER_BUSINESS_TZ — dailyOrderNumber resets at midnight there */
  businessDay: { type: String, trim: true },
  /** 1-based sequence for that calendar day; unique together with businessDay + tenant scope */
  dailyOrderNumber: { type: Number, min: 1 },
  /** Global invoice-style id per tenant — indexed via schema.index() below */
  invoiceSerial: { type: String, trim: true },
  /** Official Tax / VAT Registration Number snapshot */
  taxNumber: { type: String, default: "", trim: true },
  /** Cafe / Business name snapshot at order creation */
  businessName: { type: String, default: "", trim: true },
  cafeName: { type: String, default: "", trim: true },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  readyAt: {
    type: Date,
    default: null,
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
    index: true,
  },
  completedAt: {
    type: Date,
    default: null,
  },
});

/** One daily sequence # per business day within tenant + outlet (`branchKey`) */
orderSchema.index(
  { tenantId: 1, branchKey: 1, businessDay: 1, dailyOrderNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      businessDay: { $exists: true, $type: "string" },
      dailyOrderNumber: { $exists: true, $type: "number" },
    },
  },
);

/** Invoice serial unique per tenant + outlet */
orderSchema.index(
  { tenantId: 1, branchKey: 1, invoiceSerial: 1 },
  {
    unique: true,
    partialFilterExpression: {
      invoiceSerial: { $exists: true, $type: "string" },
    },
  },
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
