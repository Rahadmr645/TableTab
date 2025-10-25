import React from 'react'
import { useContext, useState, useEffect } from 'react'
import { AuthContext } from '../../context/AuthContext'
import axios from 'axios'

import './Orders.css'
const Orders = () => {


  const { URL } = useContext(AuthContext);

  const [allOrderList, setAllOrderList] = useState([]);


  const fetchAllTimeOrder = async () => {

    try {
      const res = await axios.get(`${URL}/api/order/all-orders`);
      console.log(res.data);
      setAllOrderList(res.data.orders)
    } catch (error) {
      console.error("faild to fetch all order", error)
    }
  }

  // delete order by id 
  const deleteHandler = async (id) => {
    try {

      const res = await axios.delete(`${URL}/api/order/delete-order/${id}`);

      alert(res.data.message);

      setAllOrderList((prev) => prev.filter((order) => order._id !== id));
    } catch (error) {
      console.error("Error deleting order: ", err);
      alert("failed to delete order");
    }
  }



  useEffect(() => {
    fetchAllTimeOrder();
  }, [])

  console.log("all list", allOrderList)
  return (
    <div className='orders-container'>
      <div style={{display:'flex',alignItems:'center', gap:'30px'}}>
        <h3 className="orders-title">All Orders</h3>
        <h3>{allOrderList.length}</h3>
      </div>

      {allOrderList.length === 0 ? (
        <p>No ordres found yet</p>

      ) : (
        <div className="orders-list">



          {allOrderList.map((order) => (

            <div key={order._id} className="order-card">
              <p>order id {order._id}</p>
              <h3>Order ID: {order._id.slice(-6)}</h3>
              <p><strong>Customer: </strong> {order.customerName}</p>
              <p><strong>TableId: </strong> {order.tableId}</p>
              <p><strong>Total Price: </strong> {order.totalPrice}sar</p>

              <div className="order-items">
                <h4>Items:</h4>
                <ul>
                  {order.items.map((item, i) => (
                    <li key={i}>
                      {item.name} : {item.quantity} * {item.price} = {" "}
                      <strong>{item.quantity * item.price}/-</strong>

                    </li>
                  ))}
                </ul>
              </div>
              <p className="order-date">
                <strong>Date:</strong>
                {new Date(order.createdAt).toLocaleString()}
              </p>
              <p>{order.status}</p>

              <button onClick={() => deleteHandler(order._id)} className='btn btn-outline-danger'>Delete</button>
            </div>
          )

          )}
        </div>
      )
      }
    </div>
  )
}

export default Orders