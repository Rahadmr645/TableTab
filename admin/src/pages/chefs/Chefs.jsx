import React, { useContext, useEffect, useState } from "react";
import { SocketContext } from "../../context/SocketContext";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import "./Chefs.css";
import ChefNotificationBell from "../../components/chefNotifications/ChefNotificationBell.jsx";
import { FaUser, FaWifi, FaUtensils } from "react-icons/fa6";
import { MdOutlineTableRestaurant } from "react-icons/md";

function formatOrderCreatedAt(createdAt) {
  if (!createdAt) return "—";
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const Chefs = () => {
  const { chefOrders, serverClock } = useContext(SocketContext);
  const { admin, URL } = useContext(AuthContext);
  const [tickMs, setTickMs] = useState(Date.now());
  const prepWindowSeconds = Number(serverClock?.prepWindowSeconds) || 600;

  useEffect(() => {
    const interval = setInterval(() => setTickMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const getServerNowMs = () => {
    const syncedAt = Number(serverClock?.syncedAtMs) || Date.now();
    const baseServer = Number(serverClock?.serverNowMs) || Date.now();
    const drift = Math.max(0, tickMs - syncedAt);
    return baseServer + drift;
  };

  const getRemainingForOrder = (order) => {
    const endsAt = new Date(order?.countdownEndsAt).getTime();
    if (Number.isFinite(endsAt)) {
      return Math.max(0, Math.floor((endsAt - getServerNowMs()) / 1000));
    }
    const created = new Date(order?.createdAt).getTime();
    if (!Number.isFinite(created)) return 0;
    const elapsed = Math.floor((getServerNowMs() - created) / 1000);
    return Math.max(0, prepWindowSeconds - elapsed);
  };

  const getTimerClass = (time) => {
    if (time <= 0) return "chef-timer--red";
    if (time <= 60) return "chef-timer--orange";
    if (time <= 120) return "chef-timer--yellow";
    return "chef-timer--green";
  };

  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const handleStatusChange = async (id, status) => {
    try {
      await axios.put(
        `${URL}/api/order/${id}/status`,
        { status },
        { headers: { "Content-Type": "application/json" } }
      );
      alert(`order status changed to ${status}`);
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Failed to update order status. Please try again.");
    }
  };

  return (
    <div className="chef-page">
      <div className="chef-order-container admin-surface admin-surface--chef">
        <div className="chef-sub-container">
          <div className="chef-hero">
            <h2 className="chef-title">Kitchen queue</h2>
            <div className="chef-hero-aside">
              <ChefNotificationBell />
              <span className="chef-badge">
                Active · {chefOrders.length}
              </span>
            </div>
          </div>

          {chefOrders.length === 0 ? (
            <p className="chef-empty">No active orders right now.</p>
          ) : (
            <div className="chef-grid">
              {chefOrders.map((order) => {
                const remaining = getRemainingForOrder(order);
                const timerClass = getTimerClass(remaining);
                const isTimeUp = remaining <= 0;
                return (
                  <article className="chef-order-card" key={order._id}>
                    <div className="chef-timer-corner">
                      <span className={`chef-timer-dial ${timerClass}`} title="Server-driven prep countdown">
                        {formatTime(remaining)}
                      </span>
                      {isTimeUp ? <span className="chef-timeup-indicator">Time up</span> : null}
                    </div>

                    <div className="chef-card-head">
                      <div className="chef-card-head-row">
                        <h3 className="chef-order-label">
                          Order #
                          {order.dailyOrderNumber != null ? order.dailyOrderNumber : "—"}
                        </h3>
                        <span className="chef-order-status">{order.status}</span>
                      </div>
                      {order.businessDay ? (
                        <span className="chef-order-daykey">Day {order.businessDay}</span>
                      ) : null}
                      {order.createdAt && (
                        <time
                          className="chef-created-at"
                          dateTime={new Date(order.createdAt).toISOString()}
                        >
                          Placed {formatOrderCreatedAt(order.createdAt)}
                        </time>
                      )}
                    </div>

                    <div className="chef-meta">
                      <span className="chef-meta-chip">
                        <FaUser aria-hidden />
                        <strong>Guest</strong> {order.customerName || "Guest"}
                      </span>
                      <span className="chef-meta-chip">
                        <MdOutlineTableRestaurant aria-hidden />
                        <strong>Table</strong> {order.tableId}
                      </span>
                      <span className="chef-meta-chip chef-meta-chip--session">
                        <FaWifi aria-hidden />
                        <strong>Session</strong> {order.guestToken}
                      </span>
                      <span className="chef-meta-chip chef-meta-chip--total">
                        <FaUtensils aria-hidden />
                        <strong>Total</strong> SAR {Number(order.totalPrice || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="chef-items">
                      <span className="chef-items-title">Items</span>
                      {order.items.map((item) => (
                        <div className="chef-line" key={item._id}>
                          {item.name}{" "}
                          <span style={{ color: "var(--text-muted)" }}>
                            ×{item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>

                    {admin?.role === "chef" && (
                      <div className="status-btn">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(order._id, "Coking")}
                        >
                          Cooking
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(order._id, "Ready")}
                        >
                          Ready
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange(order._id, "Finished")
                          }
                        >
                          Finished
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chefs;
