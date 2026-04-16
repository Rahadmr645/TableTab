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
  const [payment, setPayment] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigator = useNavigate();

  const subTotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  // Create order AFTER payment success
  const createOrder = async () => {
    try {
      setLoading(true);

      const res = await axios.post(`${URL}/api/order/create-order/`, {
        customerName,
        tableId,
        userID: user?._id || "",
        items: cart,
        totalPrice: subTotal,
      });

      alert("Order placed successfully");

      setQuantities({});
      setCart([]);
      setPopup(false);
      setPayment(false);

      navigator("/myOrders");
    } catch (error) {
      alert("Failed to place order");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOrder = () => {
    if (!customerName || !tableId) {
      alert("Please enter your name and table number");
      return;
    }

    setPayment(true);
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

      {/* POPUP */}
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

            {!payment ? (
              <button onClick={handleConfirmOrder}>
                Confirm Order
              </button>
            ) : (
              <StripePayment
                amount={subTotal * 100}
                onSuccess={createOrder}
              />
            )}
          </div>

          <div className="popup-buttons">
            <button
              onClick={() => {
                setPopup(false);
                setPayment(false);
              }}
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