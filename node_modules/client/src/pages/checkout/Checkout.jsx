import React, { useContext, useState, useEffect, useRef } from "react";
import CartItem from "../../components/CartItem/CartItem.jsx";
import { AuthContext } from "../../context/CartContext";
import "./Checkout.css";
import { api } from "../../utils/api.js";
import { useNavigate } from "react-router-dom";
import { IoChevronBack } from "react-icons/io5";
import StripePayment from "../payment/PaymentForm.jsx";
import {
  playOrderPlacedChime,
  requestNotificationPermissionIfNeeded,
  showOrderPlacedNotification,
} from "../../utils/orderAlerts.js";
import SaudiRiyalSymbol from "../../components/currency/SaudiRiyalSymbol.jsx";
import AsyncLoadingOverlay from "../../components/common/AsyncLoadingOverlay.jsx";

const TABLE_PREFILL_KEY = "tabletab_prefill_table";

const Checkout = () => {
  const { cart, setCart, setQuantities, user } = useContext(AuthContext);

  const [popup, setPopup] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [tableId, setTableId] = useState("");
  const [payment, setPayment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [selectedMethodConfirm, setSelectedMethodConfirm] = useState(false);

  const navigator = useNavigate();
  const namePrefillUserIdRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem(TABLE_PREFILL_KEY)?.trim();
    if (stored) {
      setTableId((prev) => (prev?.trim() ? prev : stored));
    }
  }, []);

  useEffect(() => {
    const id = user?._id != null ? String(user._id) : "";
    const fromAccount =
      (typeof user?.username === "string" && user.username.trim()) ||
      (typeof user?.name === "string" && user.name.trim()) ||
      "";
    if (!id || !fromAccount) {
      if (!id) namePrefillUserIdRef.current = null;
      return;
    }
    if (namePrefillUserIdRef.current !== id) {
      namePrefillUserIdRef.current = id;
      setCustomerName(fromAccount);
      return;
    }
    setCustomerName((prev) => (prev.trim() ? prev : fromAccount));
  }, [user]);

  const subTotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  // Create order AFTER payment success
  const createOrder = async (method = "card", paymentIntentId = null) => {
    try {
      setLoading(true);
      await requestNotificationPermissionIfNeeded();

      const existingGuestToken = localStorage.getItem("guestToken")?.trim() || "";

      const res = await api.post("/api/order/create-order/", {
        customerName,
        tableId,
        userID: user?._id || "",
        guestToken: existingGuestToken,
        items: cart,
        totalPrice: subTotal,
        paymentMethod: method,
        paymentIntentId,
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
      setSelectedMethodConfirm(false);

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
      <AsyncLoadingOverlay
        open={loading}
        message="Placing your order…"
      />
      <header className="checkout-hero">
        <button
          type="button"
          className="checkout-back-btn"
          onClick={() =>
            navigator("/menu", {
              replace: false,
              preventScrollReset: true,
            })
          }
          aria-label="Back to menu"
        >
          <IoChevronBack aria-hidden />
        </button>
        <h1>Your cart</h1>
        <p className="checkout-hero-tagline">
          Review items, then confirm details and pay securely.
        </p>
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
            Subtotal:{" "}
            <span className="subtotal-amt-inline">
              <span className="subtotal-number">{subTotal.toFixed(2)}</span>
              <SaudiRiyalSymbol />
            </span>
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
            <h3 id="checkout-dialog-title">
              {!payment 
                ? "Table & name" 
                : !selectedMethodConfirm 
                  ? "Select Payment Method" 
                  : paymentMethod === "card" 
                    ? "Secure payment" 
                    : "Confirm cash order"}
            </h3>

            {!payment && (
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
                  placeholder="Look on your table for your table number (sticker or stand)"
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                />

                <button type="button" onClick={handleConfirmOrder}>
                  Continue to payment
                </button>
              </>
            )}

            {payment && !selectedMethodConfirm && (
              <div className="payment-method-selector">
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "18px" }}>
                  Choose how you'd like to pay for your meal:
                </p>
                <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    style={{
                      flex: 1,
                      padding: "16px 12px",
                      borderRadius: "10px",
                      border: paymentMethod === "card" ? "2px solid var(--accent)" : "1px solid rgba(255,255,255,0.1)",
                      background: paymentMethod === "card" ? "rgba(240, 180, 41, 0.1)" : "rgba(0,0,0,0.2)",
                      color: "#fff",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "8px",
                      fontWeight: "700",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <span style={{ fontSize: "1.4rem" }}>💳</span>
                    Pay Online
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    style={{
                      flex: 1,
                      padding: "16px 12px",
                      borderRadius: "10px",
                      border: paymentMethod === "cash" ? "2px solid var(--accent)" : "1px solid rgba(255,255,255,0.1)",
                      background: paymentMethod === "cash" ? "rgba(240, 180, 41, 0.1)" : "rgba(0,0,0,0.2)",
                      color: "#fff",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "8px",
                      fontWeight: "700",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <span style={{ fontSize: "1.4rem" }}>💵</span>
                    Pay at Table
                  </button>
                </div>
                
                <button
                  type="button"
                  onClick={() => setSelectedMethodConfirm(true)}
                  style={{
                    width: "100%",
                    padding: "14px",
                    border: "none",
                    borderRadius: "999px",
                    fontWeight: "700",
                    cursor: "pointer",
                    color: "#1a1204",
                    background: "linear-gradient(145deg, var(--accent), #c9890a)",
                    boxShadow: "0 10px 28px rgba(240, 180, 41, 0.25)"
                  }}
                >
                  Continue
                </button>
              </div>
            )}

            {payment && selectedMethodConfirm && paymentMethod === "card" && (
              <StripePayment
                amount={subTotal * 100}
                onSuccess={(piId) => createOrder("card", piId)}
              />
            )}

            {payment && selectedMethodConfirm && paymentMethod === "cash" && (
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <p style={{ margin: "0 0 20px", color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: "1.5" }}>
                  Confirm your order of <strong style={{ color: "var(--accent)" }}>SAR {subTotal.toFixed(2)}</strong>. You will pay in cash or card at the table or counter once served.
                </p>
                <button
                  type="button"
                  onClick={() => createOrder("cash")}
                  style={{
                    width: "100%",
                    padding: "14px",
                    border: "none",
                    borderRadius: "999px",
                    fontWeight: "700",
                    cursor: "pointer",
                    color: "#1a1204",
                    background: "linear-gradient(145deg, var(--teal), #14b8a6)",
                    boxShadow: "0 10px 28px rgba(45, 212, 191, 0.25)"
                  }}
                >
                  Confirm & Place Order
                </button>
              </div>
            )}
          </div>

          <div className="popup-buttons">
            <button
              type="button"
              onClick={() => {
                setPopup(false);
                setPayment(false);
                setSelectedMethodConfirm(false);
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