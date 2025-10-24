import React, { useContext, useEffect, useState } from "react";
import { SocketContext } from "../../context/SocketContext.jsx";
import { AuthContext } from "../../context/CartContext.jsx";
import axios from 'axios'
const OrderBoard = () => {
  const { orderBox } = useContext(SocketContext);
  const { URL } = useContext(AuthContext);

  const [timers, setTimers] = useState({});


  // Initialize timer for new orders safely
  useEffect(() => {
    if (orderBox.length === 0) return;

    setTimers((prev) => {
      const updated = { ...prev };
      orderBox.forEach((order) => {
        if (!updated[order._id]) {
          updated[order._id] = 300; // 5 minutes
        }
      });
      return updated;
    });
  }, [orderBox]);

  //  Countdown every second
  useEffect(() => {
    if (Object.keys(timers).length === 0) return;
    const interval = setInterval(() => {
      setTimers((prev) => {
        const updated = {};
        for (let id in prev) {
          updated[id] = Math.max(prev[id] - 1, 0);
        }
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timers]); //  add dependency so it starts when timers exist

  //  Format time MM:SS
  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };


  const handleStatusChange = async (id, status) => {
    await axios.put(
      `${URL}/api/order/${id}/status`,
      { status },
      { headers: { "Content-Type": "application/json" } }
    );
    alert(`Order status changed to ${status}`);
  }


 
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
            const timeLeft = timers[order._id];
            return (
              <div
                key={order._id || index}
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
                <strong>{order.status}</strong>
                <button onClick={() => handleStatusChange(order._id, "Cooking")}>Cooking</button>
                <button onClick={() => handleStatusChange(order._id, "Ready")}>Ready</button>
                <button onClick={() => handleStatusChange(order._id, "Finished")}>Finished</button>

                <br />
                Timer:{" "}
                <strong>
                  {timeLeft === undefined
                    ? "Starting..."
                    : timeLeft > 0
                      ? formatTime(timeLeft)
                      : "Time’s up ⏰"}
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