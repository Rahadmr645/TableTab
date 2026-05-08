import mongoose from "mongoose";
import OrderCounter from "../models/OrderCounter.js";

/**
 * Calendar day YYYY-MM-DD in ORDER_BUSINESS_TZ (default Asia/Riyadh).
 * The daily order # (1, 2, 3…) resets at **midnight** in that timezone, then starts at 1 again.
 */
export function getBusinessDayKey(d = new Date()) {
  const tz = process.env.ORDER_BUSINESS_TZ || "Asia/Riyadh";
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);
    const y = parts.find((p) => p.type === "year")?.value;
    const mo = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    if (y && mo && day) return `${y}-${mo}-${day}`;
  } catch {
    /* invalid TZ */
  }
  return d.toISOString().slice(0, 10);
}

/**
 * Next invoice serial and daily order # — **scoped per tenant + branch bucket** so outlets don’t collide.
 * `branchKey` must match orders (`"default"` when no outlet).
 */
export async function takeNextOrderNumbers(tenantId, branchKey = "default") {
  if (!tenantId || !mongoose.Types.ObjectId.isValid(String(tenantId))) {
    throw new Error("takeNextOrderNumbers: invalid tenantId");
  }
  const tid = String(tenantId);
  const bk = String(branchKey || "default");
  const businessDay = getBusinessDayKey();

  const invoiceId = `tenant:${tid}:branch:${bk}:invoice-global`;
  const dayId = `tenant:${tid}:branch:${bk}:day:${businessDay}`;

  const [globalDoc, dayDoc] = await Promise.all([
    OrderCounter.findOneAndUpdate(
      { _id: invoiceId },
      { $inc: { seq: 1 } },
      { upsert: true, new: true },
    )
      .lean()
      .exec(),
    OrderCounter.findOneAndUpdate(
      { _id: dayId },
      { $inc: { seq: 1 } },
      { upsert: true, new: true },
    )
      .lean()
      .exec(),
  ]);

  const invoiceSerial = `TT-${String(globalDoc.seq).padStart(7, "0")}`;
  const dailyOrderNumber = dayDoc.seq;

  return { businessDay, dailyOrderNumber, invoiceSerial };
}
