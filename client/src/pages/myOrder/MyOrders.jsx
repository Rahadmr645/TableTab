import React from 'react'

import './MyOrders.css'
import { useContext } from 'react'
import { AuthContext } from '../../context/CartContext'
import axios from 'axios'
import { useEffect } from 'react'
import { SocketContext } from '../../context/SocketContext'
const MyOrders = () => {
    const { myOrders, setMyOrders, URL } = useContext(AuthContext);
    const { timers, formatTime } = useContext(SocketContext);

    //    fetch my orders
    const fetchMyOrders = async (token) => {


        try {
            if (!token) return;

            const res = await axios.get(`${URL}/api/order/my-orders/${token}`);

            setMyOrders(res.data.orders);
        } catch (error) {
            console.log("Faild to fetch orders:", error.message)
        }
    }

    useEffect(() => {
        const guestToken = localStorage.getItem('guestToken')?.trim();
        fetchMyOrders(guestToken);

    }, [URL])


    return (
        <div className='my-orders-container'>
            <h2>My Orders</h2>
            {myOrders && myOrders.length > 0 ? (
                myOrders.map((order) => (
                    <div className='my-order-card' key={order._id}>
                        <div className="order-header">
                            <p>Customer: {order.customerName}</p>
                            <p>Table: {order.tableId}</p>
                            <p>Status: {order.status}</p>
                            <p>Date: {new Date(order.createdAt).toLocaleString()} </p>

                            {/* timere calculatine locally */}
                            <p>Time Remaining: {timers[order._id] !== undefined ? formatTime(timers[order._id]) : "times up"} </p>
                        </div>
                        <div className='order-items'>
                            <strong>Items : </strong>
                            {order.items.map((item, i) => (
                                <div className='order-item' key={item._id}>
                                    <p>{item.name}</p>
                                    <p>{item.quantity}p</p>
                                    <p>{item.price}/-</p>
                                </div>
                            ))}
                            <div className='total'>
                                <strong>Total: {order.totalPrice} /-</strong>
                            </div>

                        </div>
                    </div>
                ))

            ) : (
                <p className='no-orders'>Opps you dont have any order yet !</p>
            )
            }

        </div>
    )
}

export default MyOrders