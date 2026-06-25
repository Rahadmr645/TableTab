/**
 * Sound + browser notification when the customer successfully places an order.
 * Uses Web Audio (no asset files). Notifications require permission.
 */

function createCtx() {
  const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
  return AC ? new AC() : null;
}

/** Short ascending chime — runs in the user-gesture chain after checkout. */
export function playOrderPlacedChime() {
  const ctx = createCtx();
  if (!ctx) return;
  const notes = [523.25, 659.25, 783.99];
  const step = 0.11;
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(g);
    g.connect(ctx.destination);
    const t0 = ctx.currentTime + i * step;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.11, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
    osc.start(t0);
    osc.stop(t0 + 0.2);
  });
}

/**
 * @returns {boolean} true if a Notification was shown
 */
export function showOrderPlacedNotification(order) {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission !== "granted") return false;

  const n = order?.dailyOrderNumber;
  const inv = order?.invoiceSerial;
  const table = order?.tableId;
  const body =
    n != null
      ? `Today's order #${n}${table != null ? ` · Table ${table}` : ""}${inv ? ` · ${inv}` : ""}`
      : `Order received${inv ? ` · ${inv}` : ""}`;

  try {
    new Notification("Order confirmed", {
      body,
      tag: order?._id ? `placed-${order._id}` : "order-placed",
      silent: true,
    });
    return true;
  } catch {
    return false;
  }
}

/** Call from a click handler before placing order so the prompt is allowed. */
export async function requestNotificationPermissionIfNeeded() {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "default") return;
  try {
    await Notification.requestPermission();
  } catch {
    /* ignore */
  }
}
