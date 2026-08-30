import React, { useContext, useState, useEffect, useRef } from "react";
import CartItem from "../../components/CartItem/CartItem.jsx";
import { AuthContext } from "../../context/CartContext";
import { useLanguage } from "../../context/LanguageContext.jsx";
import "./Checkout.css";
import { api } from "../../utils/api.js";
import { useNavigate } from "react-router-dom";
import {
  IoChevronBack,
  IoPersonOutline,
  IoRestaurantOutline,
  IoCheckmarkCircleOutline,
  IoReceiptOutline,
} from "react-icons/io5";
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
  const { t, language } = useLanguage();

  const [popup, setPopup] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [tableId, setTableId] = useState("");
  const [loading, setLoading] = useState(false);
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

  const totalItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleConfirmOrder = async (e) => {
    if (e) e.preventDefault();
    const trimmedName = customerName.trim();
    const trimmedTable = tableId.toString().trim();

    if (!trimmedName || !trimmedTable) {
      alert(
        language === "ar"
          ? "يرجى إدخال اسمك ورقم الطاولة لتأكيد الطلب."
          : "Please enter your name and table number to confirm your order."
      );
      return;
    }

    try {
      setLoading(true);
      await requestNotificationPermissionIfNeeded();

      // Remember table for future orders on this device
      localStorage.setItem(TABLE_PREFILL_KEY, trimmedTable);

      const existingGuestToken =
        localStorage.getItem("guestToken")?.trim() || "";

      const res = await api.post("/api/order/create-order/", {
        customerName: trimmedName,
        tableId: trimmedTable,
        userID: user?._id || "",
        guestToken: existingGuestToken,
        items: cart,
        totalPrice: subTotal,
        paymentMethod: "cash",
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
            language === "ar"
              ? `تم تأكيد الطلب! رقم طلبك اليوم: #${n}` +
                (inv ? `\nرقم الفاتورة: ${inv}` : "")
              : `Order placed! Today’s restaurant order number: #${n}` +
                (inv ? `\nInvoice: ${inv}` : "") +
                "\n\nThis is the same number the kitchen and order board use for your order."
          );
        } else {
          alert(
            t("order_placed_success") + (inv ? `\nInvoice: ${inv}` : "")
          );
        }
      }

      setQuantities({});
      setCart([]);
      setPopup(false);

      navigator("/myOrders");
    } catch (error) {
      alert(t("order_placed_error"));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-page">
      <AsyncLoadingOverlay open={loading} message={t("order_placing")} />
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
        <h1>{t("checkout_title")}</h1>
        <p className="checkout-hero-tagline">
          {t("checkout_hero_tagline")}
        </p>
      </header>

      <div className="checkout-inner">
        <div className="checkout_nav">
          <ul>
            <li>{t("col_image")}</li>
            <li>{t("col_name")}</li>
            <li>{t("col_qty")}</li>
            <li>{t("col_price")}</li>
            <li>{t("col_total")}</li>
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
          <p className="checkout-empty">{t("checkout_empty")}</p>
        )}

        <div className="subtotal">
          <h3>
            {t("subtotal")}{" "}
            <span className="subtotal-amt-inline">
              <span className="subtotal-number">{subTotal.toFixed(2)}</span>
              <SaudiRiyalSymbol />
            </span>
          </h3>
        </div>

        {cart.length > 0 && (
          <div className="pobtn">
            <button type="button" onClick={() => setPopup(true)}>
              {t("place_order_btn")}
            </button>
          </div>
        )}
      </div>

      {/* CONFIRM ORDER POPUP */}
      {popup && (
        <div
          className="popup"
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-dialog-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !loading) {
              setPopup(false);
            }
          }}
        >
          <div className="popup-content order-confirm-dialog">
            <div className="order-dialog-header">
              <div className="order-dialog-icon">
                <IoReceiptOutline />
              </div>
              <h3 id="checkout-dialog-title">{t("confirm_dialog_title")}</h3>
              <p className="order-dialog-subtitle">
                {t("confirm_dialog_sub")}
              </p>
            </div>

            {/* Quick Summary Pill */}
            <div className="order-summary-card">
              <div className="summary-item">
                <span className="summary-label">{t("summary_items")}</span>
                <span className="summary-val">
                  {totalItemCount}{" "}
                  {totalItemCount === 1
                    ? t("summary_item_single")
                    : t("summary_item_plural")}
                </span>
              </div>
              <div className="summary-divider" />
              <div className="summary-item">
                <span className="summary-label">{t("summary_total_amt")}</span>
                <span className="summary-val highlight">
                  {subTotal.toFixed(2)} <SaudiRiyalSymbol />
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmOrder} className="checkout-details-form">
              <div className="checkout-field-group">
                <div
                  className={`checkout-input-wrapper ${
                    focusedFields["customerName"]
                      ? "checkout-input-wrapper--focused"
                      : ""
                  } ${customerName ? "checkout-input-wrapper--has-value" : ""}`}
                >
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
                    placeholder=" "
                    required
                  />
                  <label htmlFor="customerNameInput" className="checkout-label">
                    {t("field_name")}
                  </label>
                </div>
              </div>

              <div className="checkout-field-group">
                <div
                  className={`checkout-input-wrapper ${
                    focusedFields["tableId"]
                      ? "checkout-input-wrapper--focused"
                      : ""
                  } ${tableId ? "checkout-input-wrapper--has-value" : ""}`}
                >
                  <span className="checkout-input-icon">
                    <IoRestaurantOutline />
                  </span>
                  <input
                    type="text"
                    id="tableIdInput"
                    className="checkout-input"
                    value={tableId}
                    onChange={(e) => setTableId(e.target.value)}
                    onFocus={() => handleFocus("tableId")}
                    onBlur={() => handleBlur("tableId")}
                    placeholder=" "
                    required
                  />
                  <label htmlFor="tableIdInput" className="checkout-label">
                    {t("field_table")}
                  </label>
                </div>
              </div>

              <div className="order-dialog-actions">
                <button
                  type="submit"
                  className="checkout-primary-btn confirm-btn"
                  disabled={loading}
                >
                  <IoCheckmarkCircleOutline className="btn-icon" />
                  <span>{t("confirm_order_btn")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPopup(false)}
                  className="cancel-btn"
                  disabled={loading}
                >
                  {t("cancel_btn")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;