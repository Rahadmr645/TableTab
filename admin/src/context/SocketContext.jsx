import { createContext, useEffect, useState } from "react"
import { io } from "socket.io-client";
import axios from "axios";
import { API_BASE_URL } from "../utils/apiBaseUrl.js";
import { playNewOrderAlert, showNewOrderNotification } from "../utils/orderAlerts.js";
import { addChefNotificationFromOrder } from "../utils/chefNotificationStore.js";
export const SocketContext = createContext();

function sortOrdersNewestFirst(orders) {
  if (!Array.isArray(orders)) return [];
  return [...orders].sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime(),
  );
}

function upsertOrderNewestFirst(prev, order) {
  if (!order || typeof order !== "object") return prev;
  const withoutCurrent = (Array.isArray(prev) ? prev : []).filter(
    (o) => o?._id !== order?._id,
  );
  return sortOrdersNewestFirst([order, ...withoutCurrent]);
}

export const SocketProvider = ({ children }) => {

  const [socket, setSocket] = useState(null)
  const [chefOrders, setChefOrders] = useState([]);
  const [serverClock, setServerClock] = useState({
    serverNowMs: Date.now(),
    syncedAtMs: Date.now(),
    prepWindowSeconds: 600,
  });
  const URL = API_BASE_URL;
  const socketOrigin =
    URL || (typeof window !== "undefined" ? window.location.origin : "");

  const syncServerClock = (payload) => {
    const serverNowMs = Number(payload?.serverNow);
    const prepWindowSeconds = Number(payload?.prepWindowSeconds);
    setServerClock({
      serverNowMs: Number.isFinite(serverNowMs) ? serverNowMs : Date.now(),
      syncedAtMs: Date.now(),
      prepWindowSeconds:
        Number.isFinite(prepWindowSeconds) && prepWindowSeconds > 0
          ? prepWindowSeconds
          : 600,
    });
  };

  useEffect(() => {
    const newSocket = io(socketOrigin, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on("connect", () => {
      console.log(" Socket connected:", newSocket.id);
      refetchActiveOrders();
    });

    newSocket.on("connect_error", (err) => {
      console.error("Socket connect error:", err?.message || err);
    });

    const refetchActiveOrders = async () => {
      try {
        const res = await axios.get(`${URL}/api/order/active-orders`);
        const activeOrders = sortOrdersNewestFirst(res.data.activeOrders || []);
        setChefOrders(activeOrders);
        syncServerClock(res.data);

        // Keep unread badge accurate even if socket payload is partial/missed:
        // any active order not yet recorded in notification store is added once.
        activeOrders.forEach((order) => {
          addChefNotificationFromOrder(order);
        });
      } catch (e) {
        console.error("active-orders refetch failed:", e);
      }
    };

    newSocket.on("newOrder", (order) => {
      if (order && typeof order === "object") {
        // Instant UI update first, then refetch for server truth.
        setChefOrders((prev) => upsertOrderNewestFirst(prev, order));
        showNewOrderNotification(order);
        addChefNotificationFromOrder(order);
      }
      refetchActiveOrders();
      playNewOrderAlert();
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected:", newSocket.id);
    });


    newSocket.on("orderUpdated", (order) => {
      if (order && typeof order === "object") {
        const statusNorm = String(order.status || "").toLowerCase();
        const isFinished = statusNorm === "finished" || statusNorm === "finised";
        if (isFinished) {
          setChefOrders((prev) => prev.filter((o) => o?._id !== order?._id));
        } else {
          setChefOrders((prev) => upsertOrderNewestFirst(prev, order));
        }
      }
      refetchActiveOrders();
    });


    newSocket.on('orderRemoved', (id) => {
      setChefOrders((prev) => prev.filter((o) => o._id !== id));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Keep countdown anchored to server time even during quiet periods.
  useEffect(() => {
    const syncClockOnly = async () => {
      try {
        const res = await axios.get(`${URL}/api/order/server-clock`);
        syncServerClock(res.data);
      } catch (e) {
        console.error("server-clock sync failed:", e);
      }
    };

    syncClockOnly();
    const interval = setInterval(syncClockOnly, 30000);
    return () => clearInterval(interval);
  }, []);

  // fetch all active order
  useEffect(() => {
    const fetchActiveOrders = async () => {
      try {
        const res = await axios.get(`${URL}/api/order/active-orders`);
        if (!res) return console.log("active order not found ");

        const activeOrders = sortOrdersNewestFirst(res.data.activeOrders || []);
        setChefOrders(activeOrders);
        syncServerClock(res.data);
        activeOrders.forEach((order) => {
          addChefNotificationFromOrder(order);
        });
      } catch (e) {
        console.error("initial active-orders fetch failed:", e);
      }
    };

    fetchActiveOrders();
  }, [URL])

  const contextValue = {
    socket,
    chefOrders,
    serverClock,
  }

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>

  )
}