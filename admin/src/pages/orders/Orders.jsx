import React from "react";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext";
import { SocketContext } from "../../context/SocketContext";
import axios from "axios";
import "./Orders.css";

function normalizeStatusKey(status) {
  const s = String(status || "").toLowerCase();
  if (/(finish|done|complete|served)/.test(s)) return "done";
  if (s.includes("ready")) return "ready";
  if (/(cok|cook)/.test(s)) return "cooking";
  if (/(pending|new|placed|received)/.test(s)) return "pending";
  return "default";
}

const Orders = () => {
  const { URL } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const [allOrderList, setAllOrderList] = useState([]);
  const [tickMs, setTickMs] = useState(Date.now());

  const isFinishedStatus = (status) => {
    const s = String(status || "").toLowerCase();
    return s === "finished" || s === "finised";
  };

  const sortNewestFirst = (orders) =>
    [...orders].sort(
      (a, b) =>
        new Date(b?.createdAt || 0).getTime() -
        new Date(a?.createdAt || 0).getTime(),
    );

  const fetchAllTimeOrder = async () => {
    try {
      const res = await axios.get(`${URL}/api/order/active-orders`);
      const activeOnly = (res.data.activeOrders || []).filter(
        (order) => !isFinishedStatus(order.status),
      );
      setAllOrderList(sortNewestFirst(activeOnly));
    } catch (error) {
      console.error("faild to fetch all order", error);
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
    socket.on("orderRemoved", handleRemoved);

    return () => {
      socket.off("newOrder", handleRefresh);
      socket.off("orderUpdated", handleRefresh);
      socket.off("orderRemoved", handleRemoved);
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

  return (
    <div className="orders-page">
      <div className="orders-container">
        <div className="orders-header">
          <h3 className="orders-title">All orders</h3>
          <span className="orders-count">{allOrderList.length}</span>
        </div>

        {allOrderList.length === 0 ? (
          <p className="orders-empty">No orders yet.</p>
        ) : (
          <div className="orders-list">
            <p className="orders-subline">
              Showing {allOrderList.length} order
              {allOrderList.length !== 1 ? "s" : ""}
            </p>

            {allOrderList
              .filter((order) => !isFinishedStatus(order.status))
              .map((order) => {
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
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
