/* eslint-disable react-refresh/only-export-components -- context + provider in one module */
import { useEffect, useState, createContext } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { API_BASE_URL } from "../utils/apiBaseUrl.js";

export const SocketContext = createContext();

function sortOrdersNewestFirst(orders) {
  if (!Array.isArray(orders)) return [];
  return [...orders].sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime(),
  );
}

export const SocketContextProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [orderBox, setOrderBox] = useState([]);
  const [timers, setTimers] = useState({});
  const [serverTimeOffset, setServerTimeOffset] = useState(0)


  const URL = API_BASE_URL;
  const socketOrigin =
    URL || (typeof window !== "undefined" ? window.location.origin : "");

  useEffect(() => {
    const newSocket = io(socketOrigin, {
      // Polling first works more reliably through Vite’s dev proxy; then upgrades to websocket.
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
        const serverDateHeader = res.headers.date
          ? new Date(res.headers.date).getTime()
          : Date.now();
        setServerTimeOffset(serverDateHeader - Date.now());
        setOrderBox(sortOrdersNewestFirst(res.data.activeOrders || []));
      } catch (e) {
        console.error("active-orders refetch failed:", e);
      }
    };

    newSocket.on("newOrder", () => {
      refetchActiveOrders();
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected:", newSocket.id);
    });


    newSocket.on("orderUpdated", () => {
      refetchActiveOrders();
    });


    newSocket.on('orderRemoved', (id) => {
      setOrderBox((prev) => prev.filter((o) => o._id !== id));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // fetch all active order
  useEffect(() => {
    const syncServerTime = async () => {
      const res = await axios.get(`${URL}/api/order/active-orders`);

      if (!res) return console.log("active order not found");

      const serverDateHeader = res.headers.date ?
        new Date(res.headers.date).getTime() : Date.now();


      // deff server and local time
      const offset = serverDateHeader - Date.now();
      setServerTimeOffset(offset);


      console.log('server time offset', offset, 'ms');



      console.log('these all are the active orders:', res.data)

      setOrderBox(sortOrdersNewestFirst(res.data.activeOrders || []));

    }

    syncServerTime();
  }, [])



  // for timer 
  useEffect(() => {
    if (!orderBox || orderBox.length === 0) return;

    const updateTimers = () => {

      const newTimers = {};
      const now = Date.now() + serverTimeOffset;

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
  }, [orderBox, serverTimeOffset]);



  //  Update timers every second — based on real time difference
  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };



  // socket context velu
  const socketContextValue = {
    socket,
    orderBox,
    setOrderBox,
    formatTime,
    timers,
    setTimers
  };


  return (
    <SocketContext.Provider value={socketContextValue}>
      {children}
    </SocketContext.Provider>
  );
};