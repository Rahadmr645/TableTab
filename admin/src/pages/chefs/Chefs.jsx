import React, { useContext } from "react";
import { SocketContext } from "../../context/SocketContext";

const Chefs = () => {
  const { chefOrders } = useContext(SocketContext);

  return (
    <div>
      <div>
        <h2>Active Orders</h2>
        {chefOrders.length === 0 ? (
          <p>No Orders</p>
        ) : (
          chefOrders.map((order, i) => (
            <div key={order._id} style={{ borderBottom: "1px solid #ccc", marginBottom: "10px", padding: "8px" }}>
              <strong>Order #{i + 1}</strong> — {order.customerName}
              <br />
              <strong>Total:</strong> ${order.totalPrice}
              <br />
              <strong>Status:</strong> {order.status}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Chefs;