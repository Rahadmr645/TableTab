import React, { useContext, useState } from "react";
import CartItem from "../../components/CartItem/CartItem.jsx";
import { AuthContext } from "../../context/CartContext";
import "./Checkout.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import StripePayment from "../payment/PaymentForm.jsx";

const Checkout = () => {
  const { cart, setCart, setQuantities, URL, user } =
    useContext(AuthContext);

  const [popup, setPopup] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [tableId, setTableId] = useState("");
  const [loading, setLoading] = useState(false);

  const navigator = useNavigate();

  // Calculate total
  const subTotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  // Create Order AFTER payment success
  const createOrder = async () => {
    if (!customerName || !tableId) {
      alert("Please enter your name and table number");
      return;
    }

    let guestToken = localStorage.getItem("guestToken");
    setLoading(true);

    try {
      const res = await axios.post(`${URL}/api/order/create-order/`, {
        customerName,
        tableId,
        userID: user?._id || "",
        guestToken: guestToken || "",
        items: cart,
        totalPrice: subTotal,
      });

      // Save guest token if backend sends one
      if (!guestToken && res.data?.order?.guestToken) {
        localStorage.setItem("guestToken", res.data.order.guestToken);
      }

      alert("Order placed successfully");

      // Clear states
      setQuantities({});
      setCart([]);
      setPopup(false);

      navigator("/myOrders");
    } catch (error) {
      alert("Failed to place order");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cartItem">
      <div className="checkout_nav">
        <ul>
          <li>Image</li>
          <li>Name</li>
          <li>Quantity</li>
          <li>Price</li>
          <li>Total</li>
          <li>Cancel</li>
        </ul>
      </div>

      <hr className="hr" />

      {cart.length > 0 ? (
        <div className="cart-container">
          {cart.map((item, index) => (
            <CartItem
              key={index}
              name={item.name}
              price={item.price}
              id={item._id}
              quantity={item.quantity}
              image={item.image}
            />
          ))}
        </div>
      ) : (
        <p>You don't have any orders yet</p>
      )}

      <div className="subtotal">
        <h3>SubTotal: {subTotal.toFixed(2)} /-</h3>
      </div>

      {cart.length > 0 && (
        <div className="pobtn">
          <button onClick={() => setPopup(true)}>Place Order</button>
        </div>
      )}

      {/* Popup */}
      {popup && (
        <div className="popup">
          <div className="popup-content">
            <h3>Enter your Name and Table Number</h3>

            <input
              type="text"
              placeholder="Your name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />

            <input
              type="number"
              placeholder="Your table number"
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
            />
          </div>

          {/* Stripe Payment appears ONLY when required data exists */}
          {customerName && tableId && cart.length > 0 && (
            <StripePayment
              amount={subTotal * 100} // Stripe requires cents
              onSuccess={createOrder}
              onError={(msg) => alert("Payment failed: " + msg)}
            />
          )}

          <div className="popup-buttons">
            <button
              onClick={() => setPopup(false)}
              className="cancel-btn"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;