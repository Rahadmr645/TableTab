import React, {useContext, useEffect} from 'react'

import {AuthContext} from '../../context/CartContext.jsx'

const OrderBoard = () => {
     const { socket } = useContext (AuthContext);
     
     
     useEffect(() => {
       if (!socket) return ;
        socket.on("newOrder", (order) => {
          console.log("New Order Received:", order);
        });
        
        
        socket.on("orderUpdated", (updatedOrder) => {
          console.log("order updated:", updatedOrder)
        });
        
        return () => {
          socket.off("newOrder");
          socket.off("orderUpdated")
        }
     },[socket]);
     
     
     return <h2>OrderBoard (Listining for Order)</h2>
};


export default  OrderBoard;