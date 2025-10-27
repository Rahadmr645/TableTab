import React from 'react'
import { useContext } from 'react'
import { AuthContext } from '../../context/AuthContext'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'

const socket = io('http://192.168.8.225:5000')
const Chefs = () => {
  const { URL } = useContext(AuthContext);

  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      const res = await axios.get(`${URL}/api/order/all-orders`);
      setOrders(res.data.orders);
    };
    fetchOrders();


    // listen for new orders
    socket.on("newOrder", (order) => setOrders((prev) => [order, ...prev]));

    // listen for status
    socket.on('statusUpdated', ({ orderId, itemIndex, status }) => {
      setOrders((prev) =>
        prev.map((order) => {
          if (order._id === orderId) {
            const items = [...order.items];
            items[itemIndex].status = status;
            return { ...orders, items };
          }
          return order;
        })
      );
    });
    return () => socket.off("newOrder");
  });

  // fetch the orders from d
  const fetchingOrder = async () => {
    try {
      const res = await axios.get(`${URL}/api/order/all-Orders`);

      console.log(res.data);

    } catch (error) {
      console.error("faild get order", error)
    }
  }

  useEffect(() => {
    fetchingOrder()
  }, [])
  return (
    <div>



    </div>
  )
}

export default Chefs