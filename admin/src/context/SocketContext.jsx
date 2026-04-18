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

export const SocketProvider = ({ children }) => {

  const [socket, setSocket] = useState(null)
  const [chefOrders, setChefOrders] = useState([]);
  const URL = API_BASE_URL;
  const socketOrigin =
    URL || (typeof window !== "undefined" ? window.location.origin : "");

  useEffect(() => {
    const newSocket = io(socketOrigin, {
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on("connect", () => {
      console.log(" Socket connected:", newSocket.id);
    });

    const refetchActiveOrders = async () => {
      try {
        const res = await axios.get(`${URL}/api/order/active-orders`);
        setChefOrders(sortOrdersNewestFirst(res.data.activeOrders || []));
      } catch (e) {
        console.error("active-orders refetch failed:", e);
      }
    };

    newSocket.on("newOrder", (order) => {
      refetchActiveOrders();
      playNewOrderAlert();
      if (order && typeof order === "object") {
        showNewOrderNotification(order);
        addChefNotificationFromOrder(order);
      }
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected:", newSocket.id);
    });


    newSocket.on("orderUpdated", () => {
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

  // fetch all active order
  useEffect(() => {
    const fetchActiveOrders = async () => {
      const res = await axios.get(`${URL}/api/order/active-orders`);



      if (!res) return console.log("active order not found ");

      setChefOrders(sortOrdersNewestFirst(res.data.activeOrders || []));

    }

    fetchActiveOrders();
  }, [])

  const contextValue = {
    socket,
    chefOrders,
  }

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>

  )
}