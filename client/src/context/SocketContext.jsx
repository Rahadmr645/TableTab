import { useEffect, useState, createContext } from "react";
import { io } from "socket.io-client";
import axios from 'axios'
export const SocketContext = createContext();

export const SocketContextProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [orderBox, setOrderBox] = useState([]);

  const URL = "http://192.168.8.225:5000";

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


  const socketContextValue = {
    socket,
    orderBox,
    setOrderBox,
  };

  return (
    <SocketContext.Provider value={socketContextValue}>
      {children}
    </SocketContext.Provider>
  );
};