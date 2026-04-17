import React, { useContext, useState, useEffect } from "react";
import CartItem from "../../components/CartItem/CartItem.jsx";
import { AuthContext } from "../../context/CartContext";
import "./Checkout.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import StripePayment from "../payment/PaymentForm.jsx";
import {
  playOrderPlacedChime,
  requestNotificationPermissionIfNeeded,
  showOrderPlacedNotification,
} from "../../utils/orderAlerts.js";

const TABLE_PREFILL_KEY = "tabletab_prefill_table";

const Checkout = () => {
  const { cart, setCart, setQuantities, URL, user } =
    useContext(AuthContext);

  const [popup, setPopup] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [tableId, setTableId] = useState("");
  const [payment, setPayment] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigator = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem(TABLE_PREFILL_KEY)?.trim();
    if (stored) {
      setTableId((prev) => (prev?.trim() ? prev : stored));
    }
  }, []);

  const subTotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  // Create order AFTER payment success
  const createOrder = async () => {
    try {
      setLoading(true);
      await requestNotificationPermissionIfNeeded();

      const existingGuestToken = localStorage.getItem("guestToken")?.trim() || "";

      const res = await axios.post(`${URL}/api/order/create-order/`, {
        customerName,
        tableId,
        userID: user?._id || "",
        guestToken: existingGuestToken,
        items: cart,
        totalPrice: subTotal,
      });

      const placed = res.data?.order;
      const returnedToken = placed?.guestToken;
      if (returnedToken) {
        localStorage.setItem("guestToken", returnedToken);
      }

      const n = placed?.dailyOrderNumber;
      const inv = placed?.invoiceSerial;

      playOrderPlacedChime();
      const notified = showOrderPlacedNotification(placed);
      if (!notified) {
        if (n != null) {
          alert(
            `Order placed! Today’s restaurant order number: #${n}` +
              (inv ? `\nInvoice: ${inv}` : "") +
              "\n\nThis is the same number the kitchen and order board use for your order.",
          );
        } else {
          alert(
            "Order placed successfully" + (inv ? `\nInvoice: ${inv}` : ""),
          );
        }
      }

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
    <div className="checkout-page">
      <header className="checkout-hero">
        <h1>Your cart</h1>
        <p>Review items, then confirm details and pay securely.</p>
      </header>

      <div className="checkout-inner">
        <div className="checkout_nav">
          <ul>
            <li>Image</li>
            <li>Name</li>
            <li>Qty</li>
            <li>Price</li>
            <li>Total</li>
            <li></li>
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
          <p className="checkout-empty">Your cart is empty. Add something delicious from the menu.</p>
        )}

        <div className="subtotal">
          <h3>
            Subtotal: <span>{subTotal.toFixed(2)}</span> /-
          </h3>
        </div>

        {cart.length > 0 && (
          <div className="pobtn">
            <button type="button" onClick={() => setPopup(true)}>
              Place order
            </button>
          </div>
        )}
      </div>

      {/* POPUP */}
      {popup && (
        <div className="popup" role="dialog" aria-modal="true" aria-labelledby="checkout-dialog-title">
          <div className="popup-content">
            <h3 id="checkout-dialog-title">{!payment ? "Table & name" : "Secure payment"}</h3>

            {!payment ? (
              <>
                <input
                  type="text"
                  placeholder="Your name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  autoComplete="name"
                />

                <input
                  type="number"
                  placeholder="Table number"
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                />

                <button type="button" onClick={handleConfirmOrder}>
                  Continue to payment
                </button>
              </>
            ) : (
              <StripePayment
                amount={subTotal * 100}
                onSuccess={createOrder}
              />
            )}
          </div>

          <div className="popup-buttons">
            <button
              type="button"
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