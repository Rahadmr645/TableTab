import React, { useContext, useEffect } from 'react';
import { SocketContext } from '../../context/SocketContext.jsx';

const OrderBoard = () => {
  const { socket } = useContext(SocketContext);

  useEffect(() => {
    if (!socket) return;

    console.log("Socket sockinmg way:", socket.id);

    socket.on("orderAdded", (order) => {
      console.log("🔥 New Order Received:", order);
    });

    // cleanup listener
    return () => {
      socket.off("orderAdded");
    };
  }, [socket]);

  return (
    <div>
      OrderBoard
      <p>Listening to new orders... Check console</p>
    </div>
  );
};

export default OrderBoard;
