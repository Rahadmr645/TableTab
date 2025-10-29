import React, { useContext } from "react";
import { SocketContext } from "../../context/SocketContext.jsx";
import './OrderBoard.css'

const OrderBoard = () => {
  const { orderBox, formatTime, timers } = useContext(SocketContext);
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
