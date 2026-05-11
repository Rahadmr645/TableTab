import React from "react";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext";
import { SocketContext } from "../../context/SocketContext";
import axios from "axios";
import { getStaffTenantHeaders } from "../../utils/apiBaseUrl.js";
import ReceiptPreviewModal from "@shared/ReceiptPreviewModal.jsx";
import "./Orders.css";

function normalizeStatusKey(status) {
  const s = String(status || "").toLowerCase();
  if (/(finish|done|complete|served)/.test(s)) return "done";
  if (s.includes("ready")) return "ready";
  if (/(cok|cook|progress)/.test(s)) return "cooking";
  if (/(pending|new|placed|received)/.test(s)) return "pending";
  return "default";
}

const Orders = () => {
  const { URL, admin } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const [allOrderList, setAllOrderList] = useState([]);
  const [tickMs, setTickMs] = useState(Date.now());
  const [activeTab, setActiveTab] = useState("waiting"); // 'waiting', 'current', 'finished'
  const [previewOrder, setPreviewOrder] = useState(null);

  const sortNewestFirst = (orders) =>
    [...orders].sort(
      (a, b) =>
        new Date(b?.createdAt || 0).getTime() -
        new Date(a?.createdAt || 0).getTime(),
    );

  const fetchAllTimeOrder = async () => {
    try {
      const token = localStorage.getItem("token");
      // Fetch all orders so we can display finished orders too
      const res = await axios.get(`${URL}/api/order/all-orders`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...getStaffTenantHeaders()
        }
      });
      setAllOrderList(sortNewestFirst(res.data.orders || []));
    } catch (error) {
      console.error("failed to fetch all order", error);
    }
  };

  useEffect(() => {
    fetchAllTimeOrder();
  }, [URL]);

  useEffect(() => {
    if (!socket) return;

    const handleRefresh = () => {
      fetchAllTimeOrder();
    };

    const handleRemoved = (id) => {
      setAllOrderList((prev) => prev.filter((order) => order._id !== id));
    };

    socket.on("newOrder", handleRefresh);
    socket.on("orderUpdated", handleRefresh);
    socket.on("orderRemoved", handleRefresh); // Refresh on remove to see if it moved to Finished

    return () => {
      socket.off("newOrder", handleRefresh);
      socket.off("orderUpdated", handleRefresh);
      socket.off("orderRemoved", handleRefresh);
    };
  }, [socket, URL]);

  useEffect(() => {
    const interval = setInterval(() => setTickMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const getRemainingForOrder = (order) => {
    const endsAt = new Date(order?.countdownEndsAt).getTime();
    if (Number.isFinite(endsAt)) {
      return Math.max(0, Math.floor((endsAt - tickMs) / 1000));
    }
    const created = new Date(order?.createdAt).getTime();
    if (!Number.isFinite(created)) return 0;
    const prepWindowSeconds = 600;
    const elapsed = Math.floor((tickMs - created) / 1000);
    return Math.max(0, prepWindowSeconds - elapsed);
  };

  const getTimerClass = (time) => {
    if (time <= 0) return "order-row-timer--red";
    if (time <= 60) return "order-row-timer--orange";
    if (time <= 120) return "order-row-timer--yellow";
    return "order-row-timer--green";
  };

  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  // Categorize orders
  const waitingOrders = allOrderList.filter((order) => {
    const statusKey = normalizeStatusKey(order.status);
    return statusKey === "pending" || statusKey === "default";
  });

  const currentOrders = allOrderList.filter((order) => {
    const statusKey = normalizeStatusKey(order.status);
    return statusKey === "cooking" || statusKey === "ready";
  });

  const finishedOrders = allOrderList.filter((order) => {
    const statusKey = normalizeStatusKey(order.status);
    return statusKey === "done";
  });

  const getVisibleOrders = () => {
    if (activeTab === "waiting") return waitingOrders;
    if (activeTab === "current") return currentOrders;
    return finishedOrders;
  };

  const visibleOrders = getVisibleOrders();

  const isChef = admin?.role === "chef";

  const printSlip = (order) => {
    setPreviewOrder(order);
  };

  if (!isChef) {
    return (
      <div className="orders-page">
        <div className="orders-container">
          <div className="orders-header" style={{ marginBottom: "20px" }}>
            <h1 className="orders-title">All Orders</h1>
          </div>
          {allOrderList.length === 0 ? (
            <p className="orders-empty">No orders found.</p>
          ) : (
            <div className="orders-list">
              <p className="orders-subline">
                Showing {allOrderList.length} order{allOrderList.length !== 1 ? "s" : ""}
              </p>

              {allOrderList.map((order) => {
                const statusKey = normalizeStatusKey(order.status);
                
                return (
                  <article
                    key={order._id}
                    className="order-row order-row--owner"
                    data-status={statusKey}
                  >
                    <div className="order-row-col">
                      <span className="order-row-label">Order #</span>
                      <strong className="order-row-value">
                        {order.dailyOrderNumber != null
                          ? order.dailyOrderNumber
                          : order._id.slice(-6).toUpperCase()}
                      </strong>
                    </div>

                    <div className="order-row-col">
                      <span className="order-row-label">Name</span>
                      <strong className="order-row-value">
                        {order.customerName || "Guest"}
                      </strong>
                    </div>

                    <div className="order-row-col">
                      <span className="order-row-label">Status</span>
                      <span className={`order-status order-status--${statusKey}`}>
                        {order.status}
                      </span>
                    </div>
                    
                    <div className="order-row-col">
                      <span className="order-row-label">Total</span>
                      <strong className="order-row-value" style={{ color: "#a5f3fc" }}>
                        ${Number(order.totalPrice || 0).toFixed(2)}
                      </strong>
                    </div>

                    <div className="order-row-col" style={{ alignItems: "flex-end", justifyContent: "center" }}>
                      <button 
                        className="order-print-btn" 
                        onClick={() => printSlip(order)}
                      >
                        Preview Slip
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
        {previewOrder && (
          <ReceiptPreviewModal
            order={previewOrder}
            onClose={() => setPreviewOrder(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="orders-container">
        <div className="orders-header">
          <div className="orders-tabs">
            <button
              className={`orders-tab ${activeTab === "waiting" ? "orders-tab--active" : ""}`}
              onClick={() => setActiveTab("waiting")}
            >
              Waiting Order
              {waitingOrders.length > 0 && (
                <span className="orders-tab-badge">{waitingOrders.length}</span>
              )}
            </button>
            <button
              className={`orders-tab ${activeTab === "current" ? "orders-tab--active" : ""}`}
              onClick={() => setActiveTab("current")}
            >
              Current Order
              {currentOrders.length > 0 && (
                <span className="orders-tab-badge">{currentOrders.length}</span>
              )}
            </button>
            <button
              className={`orders-tab ${activeTab === "finished" ? "orders-tab--active" : ""}`}
              onClick={() => setActiveTab("finished")}
            >
              Finished Order
            </button>
          </div>
        </div>

        {visibleOrders.length === 0 ? (
          <p className="orders-empty">No orders in this category.</p>
        ) : (
          <div className="orders-list">
            <p className="orders-subline">
              Showing {visibleOrders.length} order{visibleOrders.length !== 1 ? "s" : ""}
            </p>

            {visibleOrders.map((order) => {
              const statusKey = normalizeStatusKey(order.status);
              const remaining = getRemainingForOrder(order);
              const isTimeUp = remaining <= 0;
              const timerClass = getTimerClass(remaining);
              
              return (
                <article
                  key={order._id}
                  className="order-row"
                  data-status={statusKey}
                >
                  <div className="order-row-col">
                    <span className="order-row-label">Order #</span>
                    <strong className="order-row-value">
                      {order.dailyOrderNumber != null
                        ? order.dailyOrderNumber
                        : order._id.slice(-6).toUpperCase()}
                    </strong>
                  </div>

                  <div className="order-row-col">
                    <span className="order-row-label">Name</span>
                    <strong className="order-row-value">
                      {order.customerName || "Guest"}
                    </strong>
                  </div>

                  <div className="order-row-col">
                    <span className="order-row-label">Status</span>
                    <span className={`order-status order-status--${statusKey}`}>
                      {order.status}
                    </span>
                  </div>

                  {activeTab !== "finished" && (
                    <div className="order-row-col">
                      <span className="order-row-label">Timer</span>
                      <div className="order-row-timer-wrap">
                        <span className={`order-row-timer ${timerClass}`}>
                          {formatTime(remaining)}
                        </span>
                        {isTimeUp ? (
                          <span className="order-row-timeup">Time up</span>
                        ) : null}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
      {previewOrder && (
        <ReceiptPreviewModal
          order={previewOrder}
          onClose={() => setPreviewOrder(null)}
        />
      )}
    </div>
  );
};

export default Orders;
