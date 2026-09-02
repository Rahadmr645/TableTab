import React, { useState, useRef, useEffect } from "react";
import { useCashier } from "../context/CashierContext.jsx";

export default function CartPanel() {
  const {
    cart,
    selectedTable,
    customerName,
    setCustomerName,
    setShowCustModal,
    setShowTableModal,
    setShowCustomDishModal,
    lang,
    t,
    taxAmount,
    grandTotal,
    itemsSubtotal,
    orderDiscount,
    discountAmount,
    discountType,
    discountReason,
    setShowDiscountModal,
    handleClearDiscount,
    handleUpdateQuantity,
    setMobileView,
    activeTab,
    setActiveTab,
    activeEditingOrderId,
    handleNewOrder,
    placedOrders,
    setShowPrintModal,
    handlePrintReceipt,
    handleOpenRefundModal,
    handleClearCart
  } = useCashier();

  const [showOrderMenu, setShowOrderMenu] = useState(false);
  const orderMenuRef = useRef(null);

  const editingOrder = placedOrders.find(ord => ord._id === activeEditingOrderId);
  const isOrderRefunded = editingOrder && (editingOrder.paymentStatus === "refunded" || (Number(editingOrder.refundedAmount) > 0 && editingOrder.status === "Cancelled"));
  const isOrderPaid = editingOrder && !isOrderRefunded && (editingOrder.paymentStatus === "paid" || editingOrder.status === "Finished" || editingOrder.status === "Finised");
  const isOrderCancelled = editingOrder && editingOrder.status === "Cancelled";
  const isOrderLocked = isOrderPaid || isOrderRefunded || isOrderCancelled;
  const refMethod = (editingOrder?.refundMethod || editingOrder?.paymentMethod || "cash").toUpperCase();

  // Close 3-dot dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (orderMenuRef.current && !orderMenuRef.current.contains(e.target)) {
        setShowOrderMenu(false);
      }
    };
    if (showOrderMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showOrderMenu]);

  return (
    <div className="cart-panel">
      <div className="cart-header">
        <button className="cart-back-to-menu-btn" onClick={() => { setActiveTab("home"); setMobileView("catalog"); }}>
          {lang === "ar" ? "→ العودة للمنيو" : "← Back to Menu"}
        </button>

        {activeEditingOrderId && (
          <div className={`active-editing-order-banner ${isOrderRefunded ? "refunded-banner" : isOrderPaid ? "paid-banner" : ""}`}>
            <span>
              {isOrderRefunded ? "↩️ " : isOrderPaid ? "✅ " : "📝 "}
              {lang === "ar"
                ? `طلب #${editingOrder?.dailyOrderNumber || ""}${isOrderRefunded ? ` (مسترجع - ${refMethod === "CASH" ? "كاش" : "شبكة"})` : isOrderPaid ? " (مدفوع)" : " (قيد التعديل)"}`
                : `Order #${editingOrder?.dailyOrderNumber || ""}${isOrderRefunded ? ` (REFUNDED - ${refMethod})` : isOrderPaid ? " (PAID)" : " (Editing)"}`}
            </span>
            <button className="new-order-chip-btn" onClick={handleNewOrder}>
              + {lang === "ar" ? "طلب جديد" : "New Order"}
            </button>
          </div>
        )}

        {/* Header Top Controls */}
        <div className="cart-header-top-controls">
          <span className={`status-pill ${isOrderRefunded ? "refunded-status" : isOrderPaid ? "paid-status" : "active-status"}`}>
            {isOrderRefunded
              ? (lang === "ar" ? "مسترجع" : "REFUNDED")
              : isOrderPaid
                ? (lang === "ar" ? "مدفوع" : "PAID")
                : (t.active || "نشط")}
          </span>
          <span className="order-num-box" onClick={() => !isOrderLocked && setShowTableModal(true)}>
            {selectedTable || 25}
          </span>
          <button className="order-type-btn-pill" onClick={() => !isOrderLocked && setShowTableModal(true)}>
            {t.dineIn}
          </button>

          {/* Three-dots order actions dropdown menu */}
          <div className="order-more-menu-wrapper" ref={orderMenuRef}>
            <button
              type="button"
              className={`order-dots-menu-btn ${showOrderMenu ? "active" : ""}`}
              onClick={() => setShowOrderMenu(!showOrderMenu)}
              title={lang === "ar" ? "خيارات الطلب" : "Order Options"}
            >
              ⋯
            </button>

            {showOrderMenu && (
              <div className="order-dropdown-menu" dir={lang === "ar" ? "rtl" : "ltr"}>
                {/* 1. Customer Name option */}
                <div
                  className="order-dropdown-item"
                  onClick={() => {
                    setShowOrderMenu(false);
                    if (!isOrderLocked) setShowCustModal(true);
                  }}
                >
                  <span className="dropdown-item-icon">👤</span>
                  <div className="dropdown-item-info">
                    <span className="dropdown-item-title">
                      {customerName ? customerName : (lang === "ar" ? "إضافة اسم العميل" : "Add Customer Name")}
                    </span>
                    <span className="dropdown-item-sub">
                      {lang === "ar" ? "اسم العميل المسجل" : "Customer name"}
                    </span>
                  </div>
                </div>

                {/* 2. Preview Slip / Print Receipt option */}
                <div
                  className="order-dropdown-item"
                  onClick={() => {
                    setShowOrderMenu(false);
                    if (editingOrder) {
                      handlePrintReceipt(editingOrder);
                    } else if (cart.length > 0) {
                      setShowPrintModal(true);
                    } else {
                      setShowPrintModal(true);
                    }
                  }}
                >
                  <span className="dropdown-item-icon">🖨️</span>
                  <div className="dropdown-item-info">
                    <span className="dropdown-item-title">
                      {lang === "ar" ? "معاينة وطباعة الفاتورة" : "Preview Slip / Print"}
                    </span>
                    <span className="dropdown-item-sub">
                      {lang === "ar" ? "إيصال الدفع والطباعة" : "Receipt preview & print"}
                    </span>
                  </div>
                </div>

                {/* 3. Refund and Cancel Order (or Void if unpaid) */}
                {isOrderRefunded ? (
                  <div className="order-dropdown-item disabled">
                    <span className="dropdown-item-icon">↩️</span>
                    <div className="dropdown-item-info">
                      <span className="dropdown-item-title" style={{ color: "#ef4444" }}>
                        {lang === "ar" ? `تم الاسترجاع (${refMethod === "CASH" ? "كاش" : "شبكة"})` : `Refunded (${refMethod})`}
                      </span>
                      <span className="dropdown-item-sub">
                        {lang === "ar" ? "تم استرجاع وإلغاء الطلب" : "Order already refunded"}
                      </span>
                    </div>
                  </div>
                ) : isOrderPaid ? (
                  <div
                    className="order-dropdown-item danger"
                    onClick={() => {
                      setShowOrderMenu(false);
                      handleOpenRefundModal(editingOrder);
                    }}
                  >
                    <span className="dropdown-item-icon">↩️</span>
                    <div className="dropdown-item-info">
                      <span className="dropdown-item-title">
                        {lang === "ar" ? "استرجاع وإلغاء الطلب" : "Refund & Cancel Order"}
                      </span>
                      <span className="dropdown-item-sub">
                        {lang === "ar" ? "استرجاع كاش أو شبكة وخصم من المبيعات" : "Cash/Card refund & sales deduction"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    className="order-dropdown-item danger"
                    onClick={() => {
                      setShowOrderMenu(false);
                      handleClearCart(true);
                    }}
                  >
                    <span className="dropdown-item-icon">🚫</span>
                    <div className="dropdown-item-info">
                      <span className="dropdown-item-title">
                        {lang === "ar" ? "إلغاء الطلب (Void)" : "Void / Cancel Order"}
                      </span>
                      <span className="dropdown-item-sub">
                        {lang === "ar" ? "إلغاء وتفريغ الطلب الحالي" : "Cancel & clear this order"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="cart-items">
        {cart.length === 0 ? (
          <div className="empty-cart-message">
            <span>🛒 {lang === "ar" ? "السلة فارغة" : "Cart is empty"}</span>
          </div>
        ) : (
          cart.map((item, idx) => (
            <div className={`cart-item ${activeTab === "payment" ? "checkout-item" : ""}`} key={idx}>
              <div className="cart-item-row">
                <div className="cart-item-title">
                  <span className="cart-item-name">{lang === "ar" ? item.product.nameAr : item.product.nameEn}</span>
                  {!isOrderLocked && activeTab !== "payment" ? (
                    <div className="qty-counter cart-inline-stepper">
                      <button type="button" className="qty-btn" onClick={() => handleUpdateQuantity(item.product.id, -1)} aria-label="Decrease">−</button>
                      <span className="qty-val">{item.quantity}</span>
                      <button type="button" className="qty-btn" onClick={() => handleUpdateQuantity(item.product.id, 1)} aria-label="Increase">+</button>
                    </div>
                  ) : (
                    <span className="cart-item-qty-badge">{item.quantity}x</span>
                  )}
                </div>
                <div className="cart-item-price-qty-section">
                  <div className="cart-item-price-val">
                    {(item.product.price * item.quantity).toFixed(2)} ﷼
                  </div>
                  <span className="cart-item-unit-price">{item.quantity} × {item.product.price.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="cart-footer">
        {discountAmount > 0 && (
          <div className="bill-row subtotal">
            <span>{lang === "ar" ? "المجموع الفرعي" : "Subtotal"}</span>
            <span>{itemsSubtotal.toFixed(2)} ﷼</span>
          </div>
        )}
        {discountAmount > 0 && (
          <div className="bill-row discount" style={{ color: "#4ade80", fontWeight: "700" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                onClick={() => !isOrderPaid && setShowDiscountModal(true)}
                style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                title={lang === "ar" ? "تعديل الخصم" : "Edit discount"}
              >
                🏷️ {t.discount} ({discountType === "fixed" ? `${orderDiscount} ﷼` : `${orderDiscount}%`})
              </span>
              {discountReason && (
                <span style={{ fontSize: "10px", background: "rgba(74, 222, 128, 0.2)", padding: "1px 5px", borderRadius: "4px" }}>
                  {discountReason}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span>-{discountAmount.toFixed(2)} ﷼</span>
              {!isOrderPaid && (
                <button
                  type="button"
                  onClick={handleClearDiscount}
                  title={lang === "ar" ? "إزالة الخصم" : "Remove discount"}
                  style={{
                    border: "none",
                    background: "rgba(239, 68, 68, 0.2)",
                    color: "#f87171",
                    borderRadius: "50%",
                    width: "18px",
                    height: "18px",
                    fontSize: "10px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}
        <div className="bill-row">
          <span>{t.taxes}</span>
          <span>{taxAmount.toFixed(2)} ﷼</span>
        </div>
        <div className="bill-row total">
          <span>{t.total}</span>
          <span>{grandTotal.toFixed(2)} ﷼</span>
        </div>

        {isOrderRefunded ? (
          <div className="refunded-order-locked-notice">
            <span>↩️ {lang === "ar" ? `هذا الطلب مسترجع بالكامل (${refMethod === "CASH" ? "كاش" : "شبكة"}) ولا يمكن سداده ثانية` : `Order fully refunded (${refMethod}) — cannot be paid again`}</span>
          </div>
        ) : isOrderCancelled ? (
          <div className="refunded-order-locked-notice">
            <span>🚫 {lang === "ar" ? "هذا الطلب ملغي" : "This order is cancelled"}</span>
          </div>
        ) : !isOrderLocked && activeTab !== "payment" && (
          <button
            className="pay-action-btn"
            disabled={cart.length === 0}
            onClick={() => {
              setActiveTab("payment");
              setMobileView("catalog");
            }}
          >
            {t.pay}
          </button>
        )}
      </div>
    </div>
  );
}
