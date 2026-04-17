/**
 * Kitchen / staff: sound + optional desktop notification on new orders (socket).
 * Shared AudioContext — unlock with unlockOrderAudio() on first user gesture.
 */

let sharedCtx = null;

export function unlockOrderAudio() {
  const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return;
  if (!sharedCtx) sharedCtx = new AC();
  if (sharedCtx.state === "suspended") {
    sharedCtx.resume().catch(() => {});
  }
}

function getCtx() {
  const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return null;
  if (!sharedCtx) sharedCtx = new AC();
  return sharedCtx;
}

/** Two-tone “new ticket” alert. */
export function playNewOrderAlert() {
  const ctx = getCtx();
  if (!ctx) return;

  const run = () => {
    const base = ctx.currentTime;
    const tones = [
      { f: 880, at: 0 },
      { f: 1108, at: 0.14 },
    ];
    tones.forEach(({ f, at }) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = f;
      osc.connect(g);
      g.connect(ctx.destination);
      const t0 = base + at;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.14, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
      osc.start(t0);
      osc.stop(t0 + 0.4);
    });
  };

  if (ctx.state === "suspended") {
    ctx.resume().then(run).catch(() => {});
  } else {
    run();
  }
}

export function showNewOrderNotification(order) {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission !== "granted") return false;

  const n = order?.dailyOrderNumber;
  const table = order?.tableId;
  const name = order?.customerName;
  const title = "New order";
  const body =
    n != null
      ? `Order #${n}${table != null ? ` · Table ${table}` : ""}${name ? ` · ${name}` : ""}`
      : "A new order was placed";

  try {
    new Notification(title, {
      body,
      tag: order?._id ? `new-order-${order._id}` : "new-order",
      silent: true,
    });
    return true;
  } catch {
    return false;
  }
}

export async function requestNotificationPermissionIfNeeded() {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "default") return;
  try {
    await Notification.requestPermission();
  } catch {
    /* ignore */
  }
}
