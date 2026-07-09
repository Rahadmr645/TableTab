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
  if (s.includes("cancel")) return "cancelled";
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
    return statusKey === "done" || statusKey === "cancelled";
  });

  const visibleOrders = 
    activeTab === "waiting" ? waitingOrders :
    activeTab === "current" ? currentOrders :
    finishedOrders;

  const isChef = admin?.role === "chef" || admin?.role === "barista";

  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [quantitiesToCancel, setQuantitiesToCancel] = useState({});
  const [cancelReason, setCancelReason] = useState("");
  const [processRefund, setProcessRefund] = useState(true);
  const [submittingCancel, setSubmittingCancel] = useState(false);

  const handleAdminCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancellingOrder) return;

    const itemsToCancel = [];
    let isPartial = false;
    let anySelected = false;

    cancellingOrder.items.forEach((item, index) => {
      const qty = Number(quantitiesToCancel[index]) || 0;
      if (qty > 0) {
        anySelected = true;
        itemsToCancel.push({
          menuItemId: item.menuItemId,
          name: item.name,
          quantityToCancel: qty,
        });
      }
      if (qty < item.quantity) {
        isPartial = true;
      }
    });

    let confirmMsg = "Are you sure you want to request cancellation for this entire order?";
    if (anySelected && isPartial) {
      confirmMsg = "Are you sure you want to request cancellation for the selected items?";
    } else if (anySelected && !isPartial) {
      confirmMsg = "Are you sure you want to request cancellation for all items (full order)?";
    }

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setSubmittingCancel(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        itemsToCancel: anySelected ? itemsToCancel : [],
        cancelReason: cancelReason || "Cancelled by admin",
        processRefund,
      };

      const res = await axios.post(
        `${URL}/api/order/${cancellingOrder._id}/request-cancel`,
        payload,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...getStaffTenantHeaders(),
          },
        }
      );

      alert(res.data.message || "Cancellation request submitted!");
      setCancellingOrder(null);
      setQuantitiesToCancel({});
      setCancelReason("");
      setProcessRefund(true);
      fetchAllTimeOrder();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.response?.data?.error || err.message;
      alert(`Failed to submit cancellation request: ${msg}`);
    } finally {
      setSubmittingCancel(false);
    }
  };

  const handleResolveRequest = async (orderId, requestId, action) => {
    const confirmMsg = action === "accept" 
      ? "Are you sure you want to ACCEPT the customer's cancellation request? This will modify the order and trigger card refunds."
      : "Are you sure you want to REJECT the customer's cancellation request?";
    
    if (!window.confirm(confirmMsg)) return;

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${URL}/api/order/${orderId}/resolve-cancel-request/${requestId}`,
        { action },
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...getStaffTenantHeaders(),
          },
        }
      );
      alert(`Request ${action}ed!`);
      fetchAllTimeOrder();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.response?.data?.error || err.message;
      alert(`Failed to resolve request: ${msg}`);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${URL}/api/order/${orderId}/status`,
        { status: newStatus },
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...getStaffTenantHeaders()
          }
        }
      );
    } catch (err) {
      console.error("Failed to update status", err);
      alert("Failed to update status");
    }
  };

  const handleMarkAsPaid = async (orderId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${URL}/api/order/${orderId}/mark-paid`,
        {},
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...getStaffTenantHeaders()
          }
        }
      );
      setAllOrderList((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, paymentStatus: "paid" } : o))
      );
    } catch (err) {
      console.error("Failed to mark order as paid", err);
      alert("Failed to mark order as paid");
    }
  };

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
                      <span className="order-row-date">
                        {new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                      {order.readyAt && (
                        <span className="order-row-date" style={{ color: '#a5f3fc', marginTop: '4px' }}>
                          Ready at {new Date(order.readyAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      )}
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
                      <span className="order-row-label">Payment</span>
                      <span className={`order-status order-status--${order.paymentStatus === 'paid' ? 'done' : 'cooking'}`}>
                        {order.paymentMethod === 'cash' ? '💵 Cash' : '💳 Card'} - {order.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                      </span>
                    </div>
                    
                    <div className="order-row-col">
                      <span className="order-row-label">Total</span>
                      <strong className="order-row-value" style={{ color: "#a5f3fc" }}>
                        SAR {Number(order.totalPrice || 0).toFixed(2)}
                      </strong>
                    </div>

                    <div className="order-row-col" style={{ alignItems: "flex-end", justifyContent: "center", gap: "6px" }}>
                      {order.paymentStatus !== "paid" && order.status !== "Cancelled" && (
                        <button 
                          className="order-print-btn" 
                          onClick={() => handleMarkAsPaid(order._id)}
                          style={{
                            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                            color: "white",
                            borderColor: "#059669"
                          }}
                        >
                          Mark Paid
                        </button>
                      )}
                      <button 
                        className="order-print-btn" 
                        onClick={() => printSlip(order)}
                      >
                        Preview Slip
                      </button>

                      {(() => {
                        const customerPending = (order.cancellationRequests || []).find(r => r.status === "pending" && r.requestedBy === "customer");
                        const staffPending = (order.cancellationRequests || []).find(r => r.status === "pending" && r.requestedBy === "staff");

                        if (customerPending) {
                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end", marginTop: "4px" }}>
                              <span style={{ fontSize: "0.72rem", color: "#f87171", fontWeight: "700" }}>⚠️ Customer Request Pending</span>
                              <div style={{ display: "flex", gap: "4px" }}>
                                <button
                                  className="order-print-btn"
                                  onClick={() => handleResolveRequest(order._id, customerPending._id, "accept")}
                                  style={{ background: "#dc2626", color: "white", borderColor: "#dc2626", padding: "4px 8px", fontSize: "0.72rem" }}
                                >
                                  Accept
                                </button>
                                <button
                                  className="order-print-btn"
                                  onClick={() => handleResolveRequest(order._id, customerPending._id, "reject")}
                                  style={{ padding: "4px 8px", fontSize: "0.72rem" }}
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          );
                        }

                        if (staffPending) {
                          return (
                            <span style={{ fontSize: "0.72rem", color: "#60a5fa", fontWeight: "700", textAlign: "right" }}>
                              ⌛ Awaiting Cust. Approval
                            </span>
                          );
                        }

                        if (order.status !== "Cancelled") {
                          return (
                            <button 
                              className="order-print-btn" 
                              onClick={() => setCancellingOrder(order)}
                              style={{
                                background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
                                color: "white",
                                borderColor: "#b91c1c"
                              }}
                            >
                              Cancel
                            </button>
                          );
                        }

                        return null;
                      })()}
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
            businessName={admin?.companyName}
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
                  className={`order-row ${expandedOrderId === order._id ? "order-row--expanded" : ""}`}
                  data-status={statusKey}
                >
                  <div 
                    className="order-row-header" 
                    onClick={() => setExpandedOrderId(prev => prev === order._id ? null : order._id)}
                    style={{ cursor: "pointer", display: "flex", flexWrap: "wrap", width: "100%", gap: "10px 14px", alignItems: "center" }}
                  >
                    <div className="order-row-col">
                      <span className="order-row-label">Order #</span>
                      <strong className="order-row-value">
                        {order.dailyOrderNumber != null
                          ? order.dailyOrderNumber
                          : order._id.slice(-6).toUpperCase()}
                      </strong>
                      <span className="order-row-date">
                        {new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                      {order.readyAt && (
                        <span className="order-row-date" style={{ color: '#a5f3fc', marginTop: '4px' }}>
                          Ready at {new Date(order.readyAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      )}
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
                  </div>

                  {expandedOrderId === order._id && (() => {
                    const customerPending = (order.cancellationRequests || []).find(r => r.status === "pending" && r.requestedBy === "customer");
                    const staffPending = (order.cancellationRequests || []).find(r => r.status === "pending" && r.requestedBy === "staff");

                    return (
                      <div className="order-details-pane">
                        {customerPending && (
                          <div className="admin-pending-request admin-pending-request--incoming" style={{ marginBottom: "16px", padding: "14px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)" }}>
                            <strong style={{ color: "#f87171", display: "block", marginBottom: "6px" }}>⚠️ Customer Requested Cancellation:</strong>
                            <p style={{ margin: "4px 0 8px", fontStyle: "italic", fontSize: "0.85rem", color: "#94a3b8" }}>Reason: {customerPending.cancelReason}</p>
                            <ul style={{ margin: "6px 0 12px", paddingLeft: "20px", fontSize: "0.85rem" }}>
                              {customerPending.items.map((it, idx) => (
                                <li key={idx} style={{ marginBottom: "2px" }}>{it.name} (Qty to cancel: {it.quantityToCancel})</li>
                              ))}
                            </ul>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button 
                                type="button" 
                                className="order-action-btn"
                                onClick={(e) => { e.stopPropagation(); handleResolveRequest(order._id, customerPending._id, "accept"); }}
                                style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white", border: "none" }}
                              >
                                Accept Cancellation
                              </button>
                              <button 
                                type="button" 
                                className="order-action-btn"
                                onClick={(e) => { e.stopPropagation(); handleResolveRequest(order._id, customerPending._id, "reject"); }}
                                style={{ background: "rgba(255, 255, 255, 0.08)", border: "1px solid rgba(255, 255, 255, 0.15)", color: "#cbd5e1" }}
                              >
                                Reject Request
                              </button>
                            </div>
                          </div>
                        )}

                        {staffPending && (
                          <div className="admin-pending-request admin-pending-request--outgoing" style={{ marginBottom: "16px", padding: "14px", borderRadius: "8px", background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.25)" }}>
                            <strong style={{ color: "#60a5fa", display: "block", marginBottom: "6px" }}>⌛ Awaiting Customer Approval:</strong>
                            <p style={{ margin: "4px 0", fontSize: "0.85rem" }}>Staff requested cancellation for:</p>
                            <ul style={{ margin: "6px 0 12px", paddingLeft: "20px", fontSize: "0.85rem" }}>
                              {staffPending.items.map((it, idx) => (
                                <li key={idx} style={{ marginBottom: "2px" }}>{it.name} (Qty to cancel: {it.quantityToCancel})</li>
                              ))}
                            </ul>
                            <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#93c5fd" }}>Pending customer response...</p>
                          </div>
                        )}

                        <div className="order-details-items">
                          <h4 className="order-details-title">Order Items</h4>
                          <ul className="order-item-list">
                            {(order.items || []).map((item, idx) => {
                              const isFullyCancelled = item.quantity === 0;
                              return (
                                <li key={idx} className={`order-item ${isFullyCancelled ? 'order-item--fully-cancelled' : ''}`} style={isFullyCancelled ? { opacity: 0.5 } : {}}>
                                  <span className="order-item-qty" style={isFullyCancelled ? { textDecoration: 'line-through' } : {}}>{item.quantity}x</span>
                                  <div className="order-item-info">
                                    <span className="order-item-name" style={isFullyCancelled ? { textDecoration: 'line-through' } : {}}>{item.menuItemName || item.name}</span>
                                    {item.cancelledQuantity > 0 && (
                                      <span className="order-item-cancelled-label" style={{ color: "#f87171", fontSize: "0.75rem", fontWeight: "700", marginLeft: "8px" }}>
                                        ({item.cancelledQuantity} Cancelled)
                                      </span>
                                    )}
                                    {item.modifiers && item.modifiers.length > 0 && (
                                      <div className="order-item-mods">
                                        {item.modifiers.map((m, midx) => (
                                          <span key={midx} className="order-item-mod">{m.name}</span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                          {order.note && (
                            <div className="order-details-note">
                              <strong>Note:</strong> {order.note}
                            </div>
                          )}
                          {order.refundedAmount > 0 && (
                            <div style={{ marginTop: "8px", fontSize: "0.85rem", color: "#34d399" }}>
                              <strong>Refunded:</strong> SAR {Number(order.refundedAmount || 0).toFixed(2)}
                            </div>
                          )}
                          <div style={{ marginTop: "12px", fontSize: "0.85rem", color: "#e2e8f0" }}>
                             <strong>Payment: </strong>
                             <span className={`order-status order-status--${order.paymentStatus === 'paid' ? 'done' : 'cooking'}`} style={{ display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem", marginLeft: "6px" }}>
                               {order.paymentMethod === 'cash' ? '💵 Cash' : '💳 Card'} - {order.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                             </span>
                          </div>
                        </div>
                        
                        <div className="order-details-actions">
                          {order.paymentStatus !== "paid" && order.status !== "Cancelled" && (
                            <button 
                              className="order-action-btn"
                              onClick={(e) => { e.stopPropagation(); handleMarkAsPaid(order._id); }}
                              style={{
                                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                color: "white",
                                border: "none"
                              }}
                            >
                              Mark Paid
                            </button>
                          )}
                          {statusKey === "pending" && (
                            <button 
                              className="order-action-btn btn-start-cooking"
                              onClick={(e) => { e.stopPropagation(); handleUpdateStatus(order._id, "Cooking"); }}
                            >
                              Start Cooking
                            </button>
                          )}
                          {statusKey === "cooking" && (
                            <button 
                              className="order-action-btn btn-ready"
                              onClick={(e) => { e.stopPropagation(); handleUpdateStatus(order._id, "Ready"); }}
                            >
                              Ready to Serve
                            </button>
                          )}
                          {statusKey === "ready" && (
                            <button 
                              className="order-action-btn btn-finish"
                              onClick={(e) => { e.stopPropagation(); handleUpdateStatus(order._id, "Finished"); }}
                            >
                              Finish Order
                            </button>
                          )}
                          <button 
                            className="order-action-btn btn-print"
                            onClick={(e) => { e.stopPropagation(); printSlip(order); }}
                          >
                            Print Slip
                          </button>
                          {order.status !== "Cancelled" && !customerPending && !staffPending && (
                            <button 
                              className="order-action-btn"
                              onClick={(e) => { e.stopPropagation(); setCancellingOrder(order); }}
                              style={{
                                background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
                                color: "white",
                                border: "none"
                              }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </article>
              );
            })}
          </div>
        )}
      </div>
      {cancellingOrder && (
        <div className="cancel-modal-overlay">
          <div className="cancel-modal-content">
            <header className="cancel-modal-header">
              <h2>Cancel Order / Items (Admin)</h2>
              <button 
                type="button" 
                className="cancel-modal-close" 
                onClick={() => {
                  setCancellingOrder(null);
                  setQuantitiesToCancel({});
                  setCancelReason("");
                  setProcessRefund(true);
                }}
              >
                &times;
              </button>
            </header>

            <form onSubmit={handleAdminCancelSubmit}>
              <p className="cancel-modal-desc">
                Select quantities to cancel. Leave all at 0 to cancel the entire order #
                {cancellingOrder.dailyOrderNumber || cancellingOrder._id.slice(-6).toUpperCase()}.
              </p>

              <div className="cancel-modal-items">
                {cancellingOrder.items.map((item, index) => {
                  const currentSelected = quantitiesToCancel[index] || 0;
                  return (
                    <div className="cancel-modal-item-row" key={index}>
                      <div className="cancel-modal-item-info">
                        <span className="cancel-modal-item-name">{item.name}</span>
                        <span className="cancel-modal-item-price">
                          SAR {Number(item.price || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="cancel-modal-item-controls">
                        <span className="cancel-modal-item-avail">Max: {item.quantity}</span>
                        <div className="cancel-qty-stepper">
                          <button
                            type="button"
                            disabled={currentSelected <= 0}
                            onClick={() => setQuantitiesToCancel(prev => ({
                              ...prev,
                              [index]: Math.max(0, currentSelected - 1)
                            }))}
                          >
                            -
                          </button>
                          <span className="cancel-qty-value">{currentSelected}</span>
                          <button
                            type="button"
                            disabled={currentSelected >= item.quantity}
                            onClick={() => setQuantitiesToCancel(prev => ({
                              ...prev,
                              [index]: Math.min(item.quantity, currentSelected + 1)
                            }))}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="cancel-modal-reason">
                <label htmlFor="admin-cancel-reason">Reason for cancellation:</label>
                <textarea
                  id="admin-cancel-reason"
                  rows={2}
                  maxLength={200}
                  placeholder="e.g., Customer requested, Out of stock, Kitchen issue..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                />
              </div>

              {cancellingOrder.paymentMethod === "card" && cancellingOrder.paymentStatus === "paid" && (
                <div className="cancel-modal-refund-notice-admin" style={{ marginBottom: "16px", padding: "12px", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "8px", background: "rgba(56, 189, 248, 0.05)" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.85rem", color: "#93c5fd" }}>
                    <input
                      type="checkbox"
                      checked={processRefund}
                      onChange={(e) => setProcessRefund(e.target.checked)}
                    />
                    <strong>Refund customer's card automatically via Stripe</strong>
                  </label>
                  <p style={{ margin: "6px 0 0 22px", fontSize: "0.78rem", color: "#cbd5e1" }}>
                    Est. refund:{" "}
                    <strong>
                      SAR{" "}
                      {(() => {
                        let totalRefund = 0;
                        let anySelected = false;
                        cancellingOrder.items.forEach((item, index) => {
                          const qty = quantitiesToCancel[index] || 0;
                          if (qty > 0) {
                            anySelected = true;
                            totalRefund += item.price * qty;
                          }
                        });
                        if (!anySelected) {
                          return Number(cancellingOrder.totalPrice).toFixed(2);
                        }
                        return totalRefund.toFixed(2);
                      })()}
                    </strong>
                  </p>
                </div>
              )}

              <div className="cancel-modal-actions">
                <button
                  type="button"
                  className="cancel-modal-btn-secondary"
                  onClick={() => {
                    setCancellingOrder(null);
                    setQuantitiesToCancel({});
                    setCancelReason("");
                    setProcessRefund(true);
                  }}
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="cancel-modal-btn-primary"
                  disabled={submittingCancel}
                >
                  {submittingCancel ? "Processing..." : "Confirm Cancel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {previewOrder && (
        <ReceiptPreviewModal
          order={previewOrder}
          businessName={admin?.companyName}
          onClose={() => setPreviewOrder(null)}
        />
      )}
    </div>
  );
};

export default Orders;
