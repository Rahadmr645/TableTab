import { useEffect, useState, createContext } from "react";
import { io } from "socket.io-client";

export const SocketContext = createContext();

export const SocketContextProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [orderBox, setOrderBox] = useState([]);

  const URL = "http://10.93.67.227:5000";

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