/**
 * In-app chef notifications: localStorage, 24h TTL, unread count until viewed.
 */

const STORAGE_KEY = "tabletab_chef_notifications_v1";
const TTL_MS = 24 * 60 * 60 * 1000;

const listeners = new Set();

let storageListenerBound = false;
if (typeof window !== "undefined" && !storageListenerBound) {
  storageListenerBound = true;
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) emit();
  });
}

function emit() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
}

export function subscribeChefNotifications(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [] };
    const p = JSON.parse(raw);
    return { items: Array.isArray(p.items) ? p.items : [] };
  } catch {
    return { items: [] };
  }
}

function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
  emit();
}

function prune(state) {
  const now = Date.now();
  state.items = state.items.filter((i) => {
    const t = new Date(i.createdAt).getTime();
    return Number.isFinite(t) && now - t < TTL_MS;
  });
}

export function getChefNotificationsSnapshot() {
  const state = load();
  prune(state);
  save(state);
  const items = [...state.items].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const unreadCount = items.filter((i) => !i.readAt).length;
  return { items, unreadCount };
}

/**
 * Record a new order for the chef (deduped by order id).
 */
export function addChefNotificationFromOrder(order) {
  if (!order || typeof order !== "object" || !order._id) return;

  const state = load();
  prune(state);

  if (state.items.some((i) => i.orderId === order._id)) {
    save(state);
    return;
  }

  const n = order.dailyOrderNumber;
  const table = order.tableId;
  const name = order.customerName;
  const body =
    n != null
      ? `Order #${n}${table != null ? ` · Table ${table}` : ""}${name ? ` · ${name}` : ""}`
      : `New order${table != null ? ` · Table ${table}` : ""}${name ? ` · ${name}` : ""}`;

  state.items.unshift({
    id: `ord_${order._id}`,
    orderId: order._id,
    title: "New order",
    body,
    createdAt: new Date().toISOString(),
    readAt: null,
  });

  save(state);
}

/** Mark every current notification as read (e.g. when opening the panel). */
export function markAllChefNotificationsRead() {
  const state = load();
  prune(state);
  const now = new Date().toISOString();
  let changed = false;
  state.items.forEach((i) => {
    if (!i.readAt) {
      i.readAt = now;
      changed = true;
    }
  });
  if (changed) save(state);
}
