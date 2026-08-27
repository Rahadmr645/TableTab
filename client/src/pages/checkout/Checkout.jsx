import React, { useContext, useState, useEffect, useRef } from "react";
import CartItem from "../../components/CartItem/CartItem.jsx";
import { AuthContext } from "../../context/CartContext";
import "./Checkout.css";
import { api } from "../../utils/api.js";
import { useNavigate } from "react-router-dom";
import { IoChevronBack, IoPersonOutline, IoRestaurantOutline } from "react-icons/io5";
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
  const [onlineSubMethod, setOnlineSubMethod] = useState("card");
  const [selectedMethodConfirm, setSelectedMethodConfirm] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [focusedFields, setFocusedFields] = useState({});

  const handleFocus = (name) => {
    setFocusedFields((prev) => ({ ...prev, [name]: true }));
  };

  const handleBlur = (name) => {
    setFocusedFields((prev) => ({ ...prev, [name]: false }));
  };

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

  useEffect(() => {
    if (popup) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [popup]);

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
      setPaymentProcessing(false);

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

  const handleBackStep = () => {
    if (selectedMethodConfirm) {
      setSelectedMethodConfirm(false);
      setPaymentProcessing(false);
    } else if (payment) {
      setPayment(false);
    } else {
      setPopup(false);
    }
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
            <button
              type="button"
              className="popup-back-btn"
              onClick={handleBackStep}
              aria-label="Go back"
              disabled={loading || paymentProcessing}
            >
              <IoChevronBack aria-hidden />
            </button>

            {/* Step Indicators */}
            <div className="popup-steps-indicator">
              <div 
                className="popup-step-progress-line" 
                style={{ 
                  width: !payment 
                    ? "0%" 
                    : !selectedMethodConfirm 
                      ? "50%" 
                      : "100%" 
                }} 
              />
              <div className={`step-dot ${!payment ? "active" : "completed"}`}>
                <span className="step-number">{payment ? "✓" : "1"}</span>
                <span className="step-label">Details</span>
              </div>
              <div className={`step-dot ${payment && !selectedMethodConfirm ? "active" : selectedMethodConfirm ? "completed" : ""}`}>
                <span className="step-number">{selectedMethodConfirm ? "✓" : "2"}</span>
                <span className="step-label">Method</span>
              </div>
              <div className={`step-dot ${payment && selectedMethodConfirm ? "active" : ""}`}>
                <span className="step-number">3</span>
                <span className="step-label">Confirm</span>
              </div>
            </div>

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
              <div className="checkout-details-form">
                <div className="checkout-field-group">
                  <div className={`checkout-input-wrapper ${focusedFields["customerName"] ? "checkout-input-wrapper--focused" : ""} ${customerName ? "checkout-input-wrapper--has-value" : ""}`}>
                    <span className="checkout-input-icon">
                      <IoPersonOutline />
                    </span>
                    <input
                      type="text"
                      id="customerNameInput"
                      className="checkout-input"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      onFocus={() => handleFocus("customerName")}
                      onBlur={() => handleBlur("customerName")}
                      autoComplete="name"
                      required
                    />
                    <label htmlFor="customerNameInput" className="checkout-label">
                      Your name
                    </label>
                  </div>
                </div>

                <div className="checkout-field-group">
                  <div className={`checkout-input-wrapper ${focusedFields["tableId"] ? "checkout-input-wrapper--focused" : ""} ${tableId ? "checkout-input-wrapper--has-value" : ""}`}>
                    <span className="checkout-input-icon">
                      <IoRestaurantOutline />
                    </span>
                    <input
                      type="number"
                      id="tableIdInput"
                      className="checkout-input"
                      value={tableId}
                      onChange={(e) => setTableId(e.target.value)}
                      onFocus={() => handleFocus("tableId")}
                      onBlur={() => handleBlur("tableId")}
                      required
                    />
                    <label htmlFor="tableIdInput" className="checkout-label">
                      Table number (on table sticker/stand)
                    </label>
                  </div>
                </div>

                <button type="button" className="checkout-primary-btn" onClick={handleConfirmOrder}>
                  Continue to payment
                </button>
              </div>
            )}

            {payment && !selectedMethodConfirm && (
              <div className="payment-method-selector">
                <p className="payment-selector-intro">
                  Choose how you'd like to pay for your meal:
                </p>
                <div className="payment-main-options">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`payment-main-btn ${paymentMethod === "card" ? "active" : ""}`}
                  >
                    <span className="payment-main-icon">💳</span>
                    <span className="payment-main-text">Pay Online</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`payment-main-btn ${paymentMethod === "cash" ? "active" : ""}`}
                  >
                    <span className="payment-main-icon">💵</span>
                    <span className="payment-main-text">Pay at Table</span>
                  </button>
                </div>

                {paymentMethod === "card" && (
                  <div className="online-payment-options-container">
                    <p className="online-payment-subtitle">
                      Select online payment option:
                    </p>
                    <div className="online-payment-grid">
                      <button
                        type="button"
                        onClick={() => setOnlineSubMethod("card")}
                        className={`online-sub-btn ${onlineSubMethod === "card" ? "active" : ""}`}
                      >
                        <span>💳</span> Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setOnlineSubMethod("mada")}
                        className={`online-sub-btn ${onlineSubMethod === "mada" ? "active" : ""}`}
                      >
                        <span>🇸🇦</span> Mada
                      </button>
                      <button
                        type="button"
                        onClick={() => setOnlineSubMethod("apple_pay")}
                        className={`online-sub-btn ${onlineSubMethod === "apple_pay" ? "active" : ""}`}
                      >
                        <span>🍏</span> Apple Pay
                      </button>
                      <button
                        type="button"
                        onClick={() => setOnlineSubMethod("samsung_pay")}
                        className={`online-sub-btn ${onlineSubMethod === "samsung_pay" ? "active" : ""}`}
                      >
                        <span>📱</span> Samsung Pay
                      </button>
                      <button
                        type="button"
                        onClick={() => setOnlineSubMethod("google_pay")}
                        className={`online-sub-btn ${onlineSubMethod === "google_pay" ? "active" : ""}`}
                      >
                        <span>🤖</span> Google Pay
                      </button>
                      <button
                        type="button"
                        onClick={() => setOnlineSubMethod("stc_pay")}
                        className={`online-sub-btn ${onlineSubMethod === "stc_pay" ? "active" : ""}`}
                      >
                        <span>🇸🇦</span> STC Pay
                      </button>
                    </div>
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={() => setSelectedMethodConfirm(true)}
                  className="checkout-primary-btn accent"
                >
                  Continue
                </button>
              </div>
            )}

            {payment && selectedMethodConfirm && paymentMethod === "card" && (
              <StripePayment
                amount={subTotal * 100}
                onSuccess={(piId) => createOrder("card", piId)}
                onLoadingChange={setPaymentProcessing}
                onlineSubMethod={onlineSubMethod}
              />
            )}

            {payment && selectedMethodConfirm && paymentMethod === "cash" && (
              <div className="cash-confirm-container">
                <p className="cash-confirm-text">
                  Confirm your order of <strong className="cash-accent-price">SAR {subTotal.toFixed(2)}</strong>. You will pay in cash or card at the table or counter once served.
                </p>
                <button
                  type="button"
                  onClick={() => createOrder("cash")}
                  className="checkout-primary-btn teal"
                >
                  Confirm & Place Order
                </button>
              </div>
            )}
            <div className="popup-buttons">
              <button
                type="button"
                onClick={() => {
                  setPopup(false);
                  setPayment(false);
                  setSelectedMethodConfirm(false);
                  setPaymentProcessing(false);
                }}
                className="cancel-btn"
                disabled={loading || paymentProcessing}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;