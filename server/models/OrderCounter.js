import mongoose from "mongoose";

/** Atomic sequence buckets: `invoice-global` and `day:YYYY-MM-DD`. */
const orderCounterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { collection: "ordercounters" },
);

export default mongoose.model("OrderCounter", orderCounterSchema);
