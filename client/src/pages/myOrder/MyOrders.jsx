import React, { useContext, useEffect, useCallback, useState } from "react";
import "./MyOrders.css";
import { AuthContext } from "../../context/CartContext";
import axios from "axios";
import { SocketContext } from "../../context/SocketContext";

function orderIsFinished(status) {
  const s = (status || "").toLowerCase().replace(/\s+/g, "");
  return s === "finished" || s === "finised";
}

function reviewKey(orderId, menuItemId) {
  return `${orderId}:${String(menuItemId)}`;
}

function statusPillClass(status) {
  const s = (status || "").toLowerCase().replace(/\s+/g, "");
  if (s === "pending") return "status-pill status-pill--pending";
  if (s === "inprogress") return "status-pill status-pill--progress";
  if (s === "ready") return "status-pill status-pill--ready";
  if (s === "finished" || s === "finised") return "status-pill status-pill--finished";
  return "status-pill";
}

const MyOrders = () => {
  const { myOrders, setMyOrders, URL } = useContext(AuthContext);
  const { timers, setTimers, formatTime, socket } = useContext(SocketContext);

  const [reviewedKeys, setReviewedKeys] = useState(() => new Set());
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [reviewSubmitting, setReviewSubmitting] = useState(null);

  useEffect(() => {
    const gt = localStorage.getItem("guestToken")?.trim();
    if (!gt) return;
    axios
      .get(`${URL}/api/menu/my-reviews/${encodeURIComponent(gt)}`)
      .then((res) => {
        const pairs = res.data.pairs || [];
        setReviewedKeys(
          new Set(pairs.map((p) => reviewKey(p.orderId, p.menuItemId))),
        );
      })
      .catch(() => {});
  }, [URL, myOrders]);

  const fetchMyOrders = useCallback(
    async (token) => {
      try {
        if (!token) return;
        const res = await axios.get(`${URL}/api/order/my-orders/${token}`);
        setMyOrders(res.data.orders);

        const now = Date.now();
        const newTimers = {};
        res.data.orders.forEach((order) => {
          const createdTime = new Date(order.createdAt).getTime();
          const elapsed = Math.floor((now - createdTime) / 1000);
          const remaining = Math.max(0, 600 - elapsed);
          newTimers[order._id] = remaining;
        });
        setTimers(newTimers);
      } catch (error) {
        console.log("Failed to fetch orders:", error.message);
      }
    },
    [URL, setMyOrders, setTimers],
  );

  useEffect(() => {
    const guestToken = localStorage.getItem("guestToken")?.trim();
    fetchMyOrders(guestToken);
  }, [fetchMyOrders]);

  useEffect(() => {
    if (!myOrders || myOrders.length === 0) return;

    const interval = setInterval(() => {
      setTimers((prev) => {
        const updated = {};
        Object.keys(prev).forEach((id) => {
          updated[id] = Math.max(0, prev[id] - 1);
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [myOrders, setTimers]);

  useEffect(() => {
    if (!socket) return;
    const onUpdated = () => {
      const guestToken = localStorage.getItem("guestToken")?.trim();
      if (guestToken) fetchMyOrders(guestToken);
    };
    socket.on("orderUpdated", onUpdated);
    return () => socket.off("orderUpdated", onUpdated);
  }, [socket, fetchMyOrders]);

  useEffect(() => {
    if (!socket) return;
    const guestToken = localStorage.getItem("guestToken")?.trim();
    const onNew = (order) => {
      if (!guestToken || order.guestToken !== guestToken) return;
      fetchMyOrders(guestToken);
    };
    socket.on("newOrder", onNew);
    return () => socket.off("newOrder", onNew);
  }, [socket, fetchMyOrders]);

  const hasToken = Boolean(localStorage.getItem("guestToken")?.trim());

  const setDraft = (key, patch) => {
    setReviewDrafts((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  };

  const submitOrderReview = async (order, item) => {
    const mid = item.resolvedMenuItemId || item.menuItemId;
    if (!mid) {
      alert(
        "Could not match this line to a menu dish. Try again after refreshing the page.",
      );
      return;
    }
    const key = reviewKey(order._id, mid);
    const guestToken = localStorage.getItem("guestToken")?.trim();
    const d = reviewDrafts[key] || {};
    const rating = Number(d.rating) || 0;
    if (rating < 1 || rating > 5) {
      alert("Pick a star rating from 1 to 5.");
      return;
    }
    setReviewSubmitting(key);
    try {
      const res = await axios.post(`${URL}/api/menu/order-review`, {
        menuItemId: String(mid),
        orderId: order._id,
        guestToken,
        rating,
        comment: (d.comment || "").trim(),
        customerName: order.customerName,
      });
      setReviewedKeys((prev) => new Set([...prev, key]));
      const n = res.data?.ratingCount;
      const avgOut = res.data?.averageRating;
      if (n != null && avgOut != null) {
        alert(
          `Thanks! This dish is now ${avgOut}★ from ${n} review${n === 1 ? "" : "s"} on the menu.`,
        );
      } else {
        alert("Thanks for your review!");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Could not save review.";
      alert(msg);
    } finally {
      setReviewSubmitting(null);
    }
  };

  return (
    <div className="my-orders-page">
      <header className="my-orders-hero">
        <h1>My orders</h1>
        <p>
          Track preparation in real time. <strong>Order #</strong> is
          today&apos;s restaurant serial—the same number the kitchen uses, not
          “your 2nd order ever.” When an order is finished, you can rate
          dishes—your feedback appears on the menu for everyone.
        </p>
      </header>

      <div className="my-orders-container">
        {myOrders && myOrders.length > 0 ? (
          myOrders.map((order) => (
            <article className="my-order-card" key={order._id}>
              <div className="order-ticket-strip">
                <div className="order-serial-block">
                  <span className="order-serial-kicker">
                    Today&apos;s restaurant order
                  </span>
                  <span className="order-serial-value">
                    #
                    {order.dailyOrderNumber != null
                      ? order.dailyOrderNumber
                      : "—"}
                  </span>
                  {order.businessDay ? (
                    <span className="order-serial-day">{order.businessDay}</span>
                  ) : null}
                  <p className="order-serial-hint">
                    Same # as the kitchen queue and live board for today.
                  </p>
                </div>
                <span className={statusPillClass(order.status)}>
                  {order.status}
                </span>
              </div>

              <div className="order-header">
                <div className="order-meta">
                  <p>
                    <span className="meta-value">{order.customerName}</span>
                    {" · "}
                    Table <span className="meta-value">{order.tableId}</span>
                  </p>
                  {order.invoiceSerial ? (
                    <p className="my-order-nums">
                      Invoice {order.invoiceSerial}
                    </p>
                  ) : null}
                  <p>{new Date(order.createdAt).toLocaleString()}</p>
                </div>

                <div className="timer">
                  <span>Window</span>
                  {timers[order._id] === undefined ? (
                    "…"
                  ) : timers[order._id] <= 0 ? (
                    "Done"
                  ) : (
                    formatTime(timers[order._id])
                  )}
                </div>
              </div>

              <div className="order-items">
                <strong>Items</strong>
                {order.items.map((item, i) => {
                  const mid = item.resolvedMenuItemId || item.menuItemId;
                  const rk = mid ? reviewKey(order._id, mid) : null;
                  const finished = orderIsFinished(order.status);
                  const showReview = finished && mid && hasToken;
                  const done = rk && reviewedKeys.has(rk);
                  const draft = (rk && reviewDrafts[rk]) || {};

                  return (
                    <div className="order-item-block" key={i}>
                      <div className="order-item">
                        <span>{item.name}</span>
                        <span>×{item.quantity}</span>
                        <span>{item.price}/-</span>
                      </div>
                      {showReview && (
                        <div className="order-review-slot">
                          {done ? (
                            <p className="order-review-done">
                              You reviewed this dish — thanks.
                            </p>
                          ) : (
                            <>
                              <p className="order-review-title">
                                Rate this dish (shown on the menu)
                              </p>
                              <div
                                className="order-review-stars"
                                role="group"
                                aria-label="Star rating"
                              >
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <button
                                    key={n}
                                    type="button"
                                    className={
                                      (draft.rating || 0) >= n
                                        ? "is-active"
                                        : ""
                                    }
                                    onClick={() =>
                                      rk &&
                                      setDraft(rk, { rating: n })
                                    }
                                    aria-label={`${n} stars`}
                                  >
                                    ★
                                  </button>
                                ))}
                              </div>
                              <textarea
                                className="order-review-textarea"
                                rows={2}
                                maxLength={800}
                                placeholder="Optional comment for other guests…"
                                value={draft.comment || ""}
                                onChange={(e) =>
                                  rk &&
                                  setDraft(rk, { comment: e.target.value })
                                }
                              />
                              <button
                                type="button"
                                className="order-review-submit"
                                disabled={reviewSubmitting === rk}
                                onClick={() =>
                                  submitOrderReview(order, item)
                                }
                              >
                                {reviewSubmitting === rk
                                  ? "Saving…"
                                  : "Submit review"}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="total">
                  <strong>Total: {order.totalPrice} /-</strong>
                </div>
              </div>
            </article>
          ))
        ) : (
          <p className="no-orders">
            {hasToken
              ? "No orders found for this device yet."
              : "Place an order to see it here. Your session is saved after checkout."}
            <span className="no-orders-hint">
              {hasToken
                ? "When you order again, it will appear in this list."
                : "Complete a purchase once to link this browser to your orders."}
            </span>
          </p>
        )}
      </div>
    </div>
  );
};

export default MyOrders;
