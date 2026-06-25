import React, { useContext } from "react";
import { SocketContext } from "../../context/SocketContext.jsx";
import "./OrderBoard.css";

const OrderBoard = () => {
  const { orderBox, formatTime, timers } = useContext(SocketContext);

  return (
    <div className="order-board-page">
      <header className="order-board-hero">
        <h1>Live order board</h1>
        <p>
          Stream of active tickets from the kitchen socket.{" "}
          <strong>{orderBox.length}</strong> in view.
        </p>
      </header>

      <div className="order-board-grid">
        {orderBox.length === 0 ? (
          <div className="order-board-empty">
            <div className="order-board-empty-icon" aria-hidden />
            <p>No tickets yet. Waiting for the next order…</p>
          </div>
        ) : (
          orderBox.map((order) => {
            const timeLeft = timers[order._id] ?? 0;
            return (
              <article className="ob-card" key={order._id}>
                <div className="ob-card-top">
                  <span
                    className="ob-ticket"
                    title="Today’s order sequence # (not position in this list)"
                  >
                    #
                    {order.dailyOrderNumber != null
                      ? order.dailyOrderNumber
                      : "—"}
                  </span>
                  <span className="ob-status">{order.status}</span>
                </div>
                {order.invoiceSerial ? (
                  <p className="ob-invoice">{order.invoiceSerial}</p>
                ) : null}
                <h2 className="ob-customer">{order.customerName}</h2>
                <p className="ob-meta">
                  {new Date(order.createdAt).toLocaleString()}
                </p>
                <div className="ob-stats">
                  <div>
                    <span className="ob-label">Total</span>
                    <strong>{order.totalPrice}</strong>
                  </div>
                  <div>
                    <span className="ob-label">Timer</span>
                    <strong>
                      {timeLeft > 0 ? formatTime(timeLeft) : "Time's up"}
                    </strong>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};

export default OrderBoard;
