import OrderCounter from "../models/OrderCounter.js";

/**
 * Calendar day YYYY-MM-DD in ORDER_BUSINESS_TZ (default Asia/Riyadh).
 * The daily order # (1, 2, 3…) resets at **midnight** in that timezone, then starts at 1 again.
 * Set ORDER_BUSINESS_TZ in `.env` (e.g. Asia/Dubai, Asia/Kolkata) so “new day” matches your venue.
 *
 * Timezone is read at **runtime** (not at import time) so `dotenv` has already loaded.
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
    /* invalid TZ or no Intl — fall back to UTC calendar day */
  }
  return d.toISOString().slice(0, 10);
}

/**
 * Next global invoice serial (never resets) and next daily order # (resets each calendar day in ORDER_BUSINESS_TZ).
 */
export async function takeNextOrderNumbers() {
  const businessDay = getBusinessDayKey();

  const [globalDoc, dayDoc] = await Promise.all([
    OrderCounter.findOneAndUpdate(
      { _id: "invoice-global" },
      { $inc: { seq: 1 } },
      { upsert: true, new: true },
    )
      .lean()
      .exec(),
    OrderCounter.findOneAndUpdate(
      { _id: `day:${businessDay}` },
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
