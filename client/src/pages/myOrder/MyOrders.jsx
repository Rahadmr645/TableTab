import React, { useContext, useEffect } from "react";
import "./MyOrders.css";
import { AuthContext } from "../../context/CartContext";
import axios from "axios";
import { SocketContext } from "../../context/SocketContext";

const MyOrders = () => {
  const { myOrders, setMyOrders, URL } = useContext(AuthContext);
  const { timers, setTimers, formatTime, socket } = useContext(SocketContext);

  // Fetch user's orders
  const fetchMyOrders = async (token) => {
    try {
      if (!token) return;
      const res = await axios.get(`${URL}/api/order/my-orders/${token}`);
      setMyOrders(res.data.orders);

      const now = Date.now();
      const newTimers = {};
      res.data.orders.forEach((order) => {
        const createdTime = new Date(order.createdAt).getTime();
        const elapsed = Math.floor((now - createdTime) / 1000);
        const remaining = Math.max(0, 600 - elapsed); // 10 min = 600s
        newTimers[order._id] = remaining;
      });
      setTimers(newTimers);
    } catch (error) {
      console.log("Failed to fetch orders:", error.message);
    }
  };

  useEffect(() => {
    const guestToken = localStorage.getItem("guestToken")?.trim();
    fetchMyOrders(guestToken);
  }, [URL]);

  // Live countdown timer update
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
  }, [myOrders]);

  // Listen for live order status updates
  useEffect(() => {
    if (!socket) return;
    socket.on("orderUpdated", (updatedOrder) => {
      setMyOrders((prev) =>
        prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
      );
    });
    return () => socket.off("orderUpdated");
  }, [socket]);

  return (
    <div className="my-orders-container">
      <h2>My Orders</h2>

      {myOrders && myOrders.length > 0 ? (
        myOrders.map((order) => (
          <div className="my-order-card" key={order._id}>
            <div className="order-header">
              <p>Customer: {order.customerName}</p>
              <p>Table: {order.tableId}</p>
              <p>Status: {order.status}</p>
              <p>Date: {new Date(order.createdAt).toLocaleString()}</p>

              <div className="timer">
                {timers[order._id] === undefined ? (
                  <span>Loading timer...</span>
                ) : timers[order._id] <= 0 ? (
                  <span>Time's up</span>
                ) : (
                  <span>{formatTime(timers[order._id])}</span>
                )}
              </div>
            </div>

            <div className="order-items">
              <strong>Items:</strong>
              {order.items.map((item, i) => (
                <div className="order-item" key={i}>
                  <span>{item.name}</span>
                  <span>{item.quantity}p</span>
                  <span>{item.price}/-</span>
                </div>
              ))}
              <div className="total">
                <strong>Total: {order.totalPrice} /-</strong>
              </div>
            </div>
          </div>
        ))
      ) : (
        <p className="no-orders">Oops, you don't have any orders yet!</p>
      )}
    </div>
  );
};

export default MyOrders;
