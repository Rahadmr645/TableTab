import { api } from "./api.js";

export const MY_ORDERS_EMPTY_MSG = "You haven't placed an order yet.";

/**
 * Fetches orders for nav prefetch: logged-in customers use account orders (any device);
 * guests use browser guestToken only.
 */
export async function loadGuestOrdersForNav(token) {
  const authToken =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("token")?.trim()
      : "";
  if (authToken) {
    try {
      const res = await api.get("/api/order/my-orders-for-account");
      const orders = Array.isArray(res.data?.orders) ? res.data.orders : [];
      return { allowNav: true, orders };
    } catch {
      return { allowNav: false, orders: [] };
    }
  }

  const t = token?.trim();
  if (!t) {
    return { allowNav: false, orders: [] };
  }
  try {
    const res = await api.get(
      `/api/order/my-orders/${encodeURIComponent(t)}`,
    );
    const orders = Array.isArray(res.data?.orders) ? res.data.orders : [];
    return { allowNav: orders.length > 0, orders };
  } catch {
    return { allowNav: false, orders: [] };
  }
}
