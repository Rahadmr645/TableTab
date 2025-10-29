import React, { useContext } from "react";
import { SocketContext } from "../../context/SocketContext";
import { useEffect } from "react";
import { useState } from "react";
import axios from 'axios';
import { AuthContext } from "../../context/AuthContext";
import './Chefs.css'
const Chefs = () => {
  const { chefOrders } = useContext(SocketContext);
  const { user, URL } = useContext(AuthContext);
  const [timers, setTimers] = useState({});

  useEffect(() => {
    if (!chefOrders || chefOrders.length === 0) return;


    const updateTimers = () => {
      const now = Date.now();
      setTimers((prevTime) => {
        const newTimers = {};
        chefOrders.forEach((order) => {
          const created = new Date(order.createdAt).getTime();
          const elapsed = Math.floor((now - created) / 1000);
          const remaining = Math.max(0, 600 - elapsed); // 10 minutes 
          newTimers[order._id] = remaining;
        })
        return newTimers;
      })
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [chefOrders]);


  // color logic
  const getTimerColor = (time) => {
    if (time <= 0) return "red";
    if (time <= 60) return "orange";
    if (time <= 120) return "yellow";
    return "green";
  }

  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`
  };




  // handle status change
  const handleStatusChange = async (id, status) => {

    try {
      await axios.put(`${URL}/api/order/${id}/status`,
        { status },
        { headers: { "Content-Type": "application/json" } }
      );
      alert(`order status changed to ${status}`);

    } catch (error) {
      console.error("Error updating order status:", error)
      alert("Failed to update order status. Please try again.")
    }
  }

  return (
    <div className="chef-order-container">
      <div className="chef-sub-container">
        <h2>{`Active Orders :  ${chefOrders.length}`}</h2>
        {chefOrders.length === 0 ? (
          <p>No Orders</p>
        ) : (

          chefOrders.map((order, i) => {
            const remaining = timers[order._id] || 0;
            const color = getTimerColor(remaining);
            return (

              <div className="chef-order-card" key={order._id} style={{ borderBottom: "1px solid #ccc", marginBottom: "10px", padding: "8px" }}>
                <strong>Order #{i + 1}</strong> — <strong>C.N. </strong> {order.customerName}
                <br />
                <strong>TableId: </strong> {order.tableId}
                <br />
                <strong>UserId: </strong> {order.guestToken}
                <br />
                <strong>Total:</strong> ${order.totalPrice}
                <br />
                <strong>Status:</strong> {order.status}
                <br />
                <div className="items">
                  <strong>Items :</strong>
                  {order.items.map((item, i) => (
                    <div key={item._id} >
                      <span>{item.name}: {item.quantity}p</span>
                    </div>
                  ))}
                </div>
                <br />
                <strong>Timer : </strong> <span>  {remaining > 0 ? formatTime(remaining) : "Time's up !"} </span>
                {user ? user.role === 'chef' &&
                  <div className="status-btn">
                    <button onClick={() => handleStatusChange(order._id, "Coking")}>Cooking</button>
                    <button onClick={() => handleStatusChange(order._id, "Ready")}>Ready</button>
                    <button onClick={() => handleStatusChange(order._id, "Finished")}>Finished</button>
                  </div>
                  : <></>
                }

              </div>
            );
          })
        )}

      </div>

    </div>

  );
};

export default Chefs;