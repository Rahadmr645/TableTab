import React, { useContext, useEffect, useState } from "react";
import { SocketContext } from "../../context/SocketContext";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import "./Chefs.css";
import ChefNotificationBell from "../../components/chefNotifications/ChefNotificationBell.jsx";

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
  const { chefOrders } = useContext(SocketContext);
  const { admin, URL } = useContext(AuthContext);
  const [timers, setTimers] = useState({});

  useEffect(() => {
    if (!chefOrders || chefOrders.length === 0) return;

    const updateTimers = () => {
      const now = Date.now();
      setTimers((prevTime) => {
        const newTimers = {};
        chefOrders.forEach((order) => {
          const created = new Date(order.createdAt).getTime();
          const elapsed = Math.floor((now - created) / 1000);
          const remaining = Math.max(0, 600 - elapsed);
          newTimers[order._id] = remaining;
        });
        return newTimers;
      });
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [chefOrders]);

  const getTimerClass = (time) => {
    if (time <= 0) return "chef-timer chef-timer--red";
    if (time <= 60) return "chef-timer chef-timer--orange";
    if (time <= 120) return "chef-timer chef-timer--yellow";
    return "chef-timer chef-timer--green";
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
                const remaining = timers[order._id] ?? 0;
                return (
                  <article className="chef-order-card" key={order._id}>
                    <div className="chef-card-head">
                      <div className="chef-card-head-row">
                        <span
                          className="chef-order-label"
                          title="Today’s sequence # (same all day); not list position"
                        >
                          Order #
                          {order.dailyOrderNumber != null
                            ? order.dailyOrderNumber
                            : "—"}
                        </span>
                        <span className="chef-order-status">{order.status}</span>
                      </div>
                      {order.businessDay ? (
                        <span className="chef-order-daykey" title="Counter resets at midnight (business timezone)">
                          Day {order.businessDay}
                        </span>
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
                      <span>
                        <strong>Guest</strong> {order.customerName}
                      </span>
                      <span>
                        <strong>Table</strong> {order.tableId}
                      </span>
                      <span>
                        <strong>Session</strong> {order.guestToken}
                      </span>
                      <span>
                        <strong>Total</strong> ${order.totalPrice}
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

                    <div className="chef-timer-row">
                      <span className={getTimerClass(remaining)}>
                        {remaining > 0
                          ? formatTime(remaining)
                          : "Time's up"}
                      </span>
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
