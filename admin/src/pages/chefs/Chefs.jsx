import React, { useContext, useEffect, useState } from "react";
import { SocketContext } from "../../context/SocketContext";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import { getStaffTenantHeaders } from "../../utils/apiBaseUrl.js";
import "./Chefs.css";
import ChefNotificationBell from "../../components/chefNotifications/ChefNotificationBell.jsx";
import defaultProfilePic from "../../assets/icons/profileTabletab.png";
import { FaUser, FaWifi, FaUtensils, FaClock, FaCircleCheck, FaArrowLeft } from "react-icons/fa6";
import { MdOutlineTableRestaurant } from "react-icons/md";
import { PiChefHat } from "react-icons/pi";

function formatOrderCreatedAt(createdAt) {
  if (!createdAt) return "—";
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatTimeOnly(dateString) {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const Chefs = () => {
  const { chefOrders, serverClock } = useContext(SocketContext);
  const { admin, URL } = useContext(AuthContext);
  const [tickMs, setTickMs] = useState(Date.now());
  const prepWindowSeconds = Number(serverClock?.prepWindowSeconds) || 600;

  // New State variables for admin performance views
  const [activeTab, setActiveTab] = useState("queue"); // "queue" | "performance"
  const [staff, setStaff] = useState([]);
  const [selectedChef, setSelectedChef] = useState(null);
  const [chefOrdersToday, setChefOrdersToday] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [loadingChefOrders, setLoadingChefOrders] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setTickMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch staff list when performance tab is selected (only for owners/managers)
  useEffect(() => {
    if (activeTab === "performance" && (admin?.role === "owner" || admin?.role === "manager")) {
      const fetchStaff = async () => {
        try {
          setLoadingStaff(true);
          const token = localStorage.getItem("token");
          const res = await axios.get(`${URL}/api/admin/staff`, {
            headers: {
              Authorization: `Bearer ${token}`,
              ...getStaffTenantHeaders(),
            },
          });
          // Filter to chefs and baristas (kitchen preparation staff)
          const filtered = (res.data.staff || []).filter(
            (s) => s.role === "chef" || s.role === "barista"
          );
          setStaff(filtered);
        } catch (error) {
          console.error("Failed to fetch staff list:", error);
        } finally {
          setLoadingStaff(false);
        }
      };
      fetchStaff();
    }
  }, [activeTab, URL, admin]);

  const handleChefClick = async (chef) => {
    setSelectedChef(chef);
    try {
      setLoadingChefOrders(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${URL}/api/admin/staff/${chef._id}/completed-today`, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...getStaffTenantHeaders(),
        },
      });
      setChefOrdersToday(res.data.orders || []);
    } catch (error) {
      console.error("Failed to fetch chef completed orders:", error);
    } finally {
      setLoadingChefOrders(false);
    }
  };

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
      const token = localStorage.getItem("token");
      await axios.put(
        `${URL}/api/order/${id}/status`,
        { status },
        { 
          headers: { 
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...getStaffTenantHeaders()
          } 
        }
      );
      alert(`order status changed to ${status}`);
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Failed to update order status. Please try again.");
    }
  };

  const isAdmin = admin?.role === "owner" || admin?.role === "manager";

  return (
    <div className="chef-page">
      {/* Admin views dual-tabs, regular chefs just see active kitchen queue directly */}
      {isAdmin && (
        <div className="chef-tab-navigation">
          <button 
            className={`chef-tab-btn ${activeTab === "queue" ? "active" : ""}`}
            onClick={() => setActiveTab("queue")}
          >
            <MdOutlineTableRestaurant />
            Kitchen Queue
          </button>
          <button 
            className={`chef-tab-btn ${activeTab === "performance" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("performance");
              setSelectedChef(null);
              setChefOrdersToday([]);
            }}
          >
            <PiChefHat />
            Chefs Performance
          </button>
        </div>
      )}

      {activeTab === "queue" ? (
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

                      {(admin?.role === "chef" || admin?.role === "barista" || admin?.role === "owner" || admin?.role === "manager") && (
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
      ) : (
        /* Chefs Performance Dashboard for admins */
        <div className="chef-performance-container">
          <div className="chef-perf-split">
            {/* Left list pane */}
            <div className="chef-perf-list-pane admin-surface">
              <div className="chef-sub-container">
                <div className="chef-hero">
                  <h2 className="chef-title">Venue Chefs & Stats</h2>
                </div>

                {loadingStaff ? (
                  <p className="chef-empty">Loading chefs list...</p>
                ) : staff.length === 0 ? (
                  <p className="chef-empty">No preparation staff members found.</p>
                ) : (
                  <div className="chef-perf-list">
                    {staff.map((s) => {
                      const isSelected = selectedChef?._id === s._id;
                      return (
                        <div 
                          key={s._id} 
                          className={`chef-perf-card ${isSelected ? "selected" : ""}`}
                          onClick={() => handleChefClick(s)}
                        >
                          <div className="chef-perf-card-avatar">
                            <img src={s.profilePic || defaultProfilePic} alt={s.username} />
                          </div>
                          <div className="chef-perf-card-info">
                            <h3>{s.username}</h3>
                            <span className="chef-perf-card-role">{s.role}</span>
                            <span className="chef-perf-card-email">{s.email}</span>
                          </div>
                          <div className="chef-perf-card-metric">
                            <div className="chef-metric-badge">
                              <span className="chef-metric-value">{s.completedToday ?? 0}</span>
                              <span className="chef-metric-label">Completed Today</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right details pane */}
            <div className="chef-perf-details-pane admin-surface">
              <div className="chef-sub-container">
                {selectedChef ? (
                  <div className="chef-detail-view">
                    <div className="chef-detail-header">
                      <div className="chef-detail-profile">
                        <img 
                          src={selectedChef.profilePic || defaultProfilePic} 
                          alt={selectedChef.username} 
                          className="chef-detail-avatar"
                        />
                        <div>
                          <h2>{selectedChef.username}</h2>
                          <p>{selectedChef.role} · {selectedChef.email}</p>
                        </div>
                      </div>
                      <div className="chef-detail-stat">
                        <span className="num">{chefOrdersToday.length}</span>
                        <span className="lbl">Completed Today</span>
                      </div>
                    </div>

                    <div className="chef-detail-body">
                      <h3 className="chef-section-title">Today's Completed Orders</h3>
                      {loadingChefOrders ? (
                        <p className="chef-empty">Loading orders...</p>
                      ) : chefOrdersToday.length === 0 ? (
                        <div className="chef-empty-detail">
                          <FaCircleCheck className="faded-icon" />
                          <p>No completed orders today yet.</p>
                        </div>
                      ) : (
                        <div className="chef-completed-orders-list">
                          {chefOrdersToday.map((order) => (
                            <div key={order._id} className="chef-completed-order-item">
                              <div className="chef-co-header">
                                <span className="chef-co-number">Order #{order.dailyOrderNumber != null ? order.dailyOrderNumber : "—"}</span>
                                <span className="chef-co-time">
                                  <FaClock /> Ready at {formatTimeOnly(order.completedAt || order.readyAt)}
                                </span>
                              </div>
                              <div className="chef-co-meta">
                                <span><strong>Guest:</strong> {order.customerName || "Guest"}</span>
                                <span><strong>Table:</strong> {order.tableId}</span>
                                <span className="price">SAR {Number(order.totalPrice || 0).toLocaleString()}</span>
                              </div>
                              <div className="chef-co-items">
                                {order.items.map((it) => (
                                  <div key={it._id} className="chef-co-line">
                                    {it.name} <span className="qty">×{it.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="chef-detail-empty">
                    <PiChefHat className="faded-hat" />
                    <h3>No Chef Selected</h3>
                    <p>Select a chef from the list to view the log of orders they completed today.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chefs;
