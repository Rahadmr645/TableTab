import { useEffect, useState, createContext } from "react";
import { io } from "socket.io-client";
import axios from 'axios'
export const SocketContext = createContext();

export const SocketContextProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [orderBox, setOrderBox] = useState([]);
  const [timers, setTimers] = useState({});


  const URL = "http://10.124.132.227:5000";

  useEffect(() => {
    const newSocket = io(URL, {
      transports: ["websocket"],
      upgrade: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on("connect", () => {
      console.log(" Socket connected:", newSocket.id);
    });

    //  THIS IS THE MISSING PART
    newSocket.on("newOrder", (order) => {
      console.log(" New order received globally:", order);
      setOrderBox((prev) => [order, ...prev]);
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected:", newSocket.id);
    });


    newSocket.on('orderUpdated', (updatedOrder) => {
      setOrderBox((prev) => prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
      );
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
    const fetchActiveOrders = async () => {
      const res = await axios.get(`${URL}/api/order/active-order`);

      if (!res) return console.log("active order not found");

      console.log('these all are the active orders:', res.data)

      setOrderBox(res.data.activeOrders);

    }

    fetchActiveOrders();
  }, [])



  // for timer 
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