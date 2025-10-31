import { createContext, useEffect, useState } from "react"
import { io } from "socket.io-client";
import axios from 'axios'
export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {

  const [socket, setSocket] = useState(null)
  const [chefOrders, setChefOrders] = useState([]);
  const URL = "http://192.168.8.225:5000"

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
      setChefOrders((prev) => [order, ...prev]);
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected:", newSocket.id);
    });


    newSocket.on('orderUpdated', (updatedOrder) => {
      setChefOrders((prev) => prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
      );
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

      setChefOrders(res.data.activeOrders);

    }

    fetchActiveOrders();
  }, [])
  console.log("fetched active orders:", chefOrders)
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