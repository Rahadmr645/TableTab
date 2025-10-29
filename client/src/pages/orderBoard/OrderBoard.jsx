import React, { useContext, useEffect, useState } from "react";
import { SocketContext } from "../../context/SocketContext.jsx";
import { AuthContext } from "../../context/CartContext.jsx";
import axios from "axios";
import './OrderBoard.css'

const OrderBoard = () => {
  const { orderBox } = useContext(SocketContext);
  const { URL } = useContext(AuthContext);
  const [timers, setTimers] = useState({});

  //  Update timers every second — based on real time difference
  useEffect(() => {
    if (!orderBox || orderBox.length === 0) return;

    const updateTimers = () => {
      const newTimers = {};
      const now = Date.now();

      orderBox.forEach((order) => {
        const created = new Date(order.createdAt).getTime();
        const elapsed = Math.floor((now - created) / 1000);
        const remaining = Math.max(0, 600 - elapsed); // 5 minutes total
        newTimers[order._id] = remaining;
      });

      setTimers(newTimers);
    };

    // Run immediately + every second
    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [orderBox]);

  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };


  return (
    <div>
      <h2>OrderBoard</h2>
      <p>Listening to new orders... (Total Orders: {orderBox.length})</p>

      <div
        style={{
          border: "1px solid #ccc",
          padding: "10px",
          marginTop: "10px",
        }}
      >
        {orderBox.length === 0 ? (
          <p>No new orders yet.</p>
        ) : (
          orderBox.map((order, index) => {
            const timeLeft = timers[order._id] ?? 0;
            return (
              <div
                key={order._id}
                style={{
                  borderBottom: "1px solid #eee",
                  padding: "5px",
                  marginBottom: "5px",
                }}
              >
                <strong>Order #{orderBox.length - index}</strong> | Customer:{" "}
                <strong>{order.customerName}</strong> | Total: $
                <strong>{order.totalPrice}</strong>
                <br />
                <strong>{new Date(order.createdAt).toLocaleString()}</strong>
                <br />
                <strong>Status: {order.status}</strong>
                <br />
                Timer:{" "}
                <strong>
                  {timeLeft > 0 ? formatTime(timeLeft) : "Time’s up "}
                </strong>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default OrderBoard;
