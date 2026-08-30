import React from "react";
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
    handlePrintReceipt
  } = useCashier();

  const editingOrder = placedOrders.find(ord => ord._id === activeEditingOrderId);
  const isOrderPaid = editingOrder && (editingOrder.paymentStatus === "paid" || editingOrder.status === "Finished" || editingOrder.status === "Finised");

  return (
    <div className="cart-panel">
      <div className="cart-header">
        <button className="cart-back-to-menu-btn" onClick={() => { setActiveTab("home"); setMobileView("catalog"); }}>
          {lang === "ar" ? "→ العودة للمنيو" : "← Back to Menu"}
        </button>

        {activeEditingOrderId && (
          <div className={`active-editing-order-banner ${isOrderPaid ? "paid-banner" : ""}`}>
            <span>{isOrderPaid ? "✅ " : "📝 "}{lang === "ar" ? `طلب #${editingOrder?.dailyOrderNumber || ""}${isOrderPaid ? " (مدفوع)" : " (قيد التعديل)"}` : `Order #${editingOrder?.dailyOrderNumber || ""}${isOrderPaid ? " (PAID)" : " (Editing)"}`}</span>
            <button className="new-order-chip-btn" onClick={handleNewOrder}>
              + {lang === "ar" ? "طلب جديد" : "New Order"}
            </button>
          </div>
        )}
        
        {/* Header Top Controls as shown in the screenshot */}
        <div className="cart-header-top-controls">
          <span className="status-pill active-status">
            {isOrderPaid ? (lang === "ar" ? "مدفوع" : "PAID") : (t.active || "نشط")}
          </span>
          <span className="order-num-box" onClick={() => !isOrderPaid && setShowTableModal(true)}>
            {selectedTable || 25}
          </span>
          <button className="order-type-btn-pill" onClick={() => !isOrderPaid && setShowTableModal(true)}>
            {t.dineIn}
          </button>
          <button className="manual-mode-btn">
            {lang === "ar" ? "يدوي" : "Manual"}
          </button>
        </div>

        {/* Customer section */}
        <div className="customer-selection-area">
          {customerName ? (
            <div className="selected-customer-badge">
              <span>👤 {customerName}</span>
              {!isOrderPaid && (
                <button className="clear-customer-btn" onClick={() => setCustomerName("")}>✕</button>
              )}
            </div>
          ) : (
            <button className="add-customer-dashed-btn" onClick={() => setShowCustModal(true)}>
              + {t.addCustomer}
            </button>
          )}
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
                  {/* Table Tag under the item name */}
                  <span className="item-table-tag" onClick={() => !isOrderPaid && setShowTableModal(true)}>
                    {t.table} {selectedTable}
                  </span>
                </div>
                <div className="cart-item-price-qty-section">
                  <div className="cart-item-price-val">
                    {(item.product.price * item.quantity).toFixed(2)} ﷼
                  </div>
                  <span className="cart-item-unit-price">{item.quantity} x {item.product.price.toFixed(2)}</span>
                </div>
              </div>
              {!isOrderPaid && activeTab !== "payment" && (
                <div className="cart-item-note-row">
                  <button className="item-action-btn-note">
                    💬 {t.notes}
                  </button>
                  <div className="qty-counter">
                    <button className="qty-btn" onClick={() => handleUpdateQuantity(item.product.id, -1)}>-</button>
                    <span className="qty-val">{item.quantity}</span>
                    <button className="qty-btn" onClick={() => handleUpdateQuantity(item.product.id, 1)}>+</button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Custom Dish Button inside the cart list area, at the bottom of the list */}
      {!isOrderPaid && (
        <button className="add-dish-btn" onClick={() => setShowCustomDishModal(true)}>
          + {t.addDish}
        </button>
      )}

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
        
        {isOrderPaid ? (
          <div className="paid-order-action-container">
            <button 
              className="print-paid-order-btn"
              onClick={() => handlePrintReceipt(editingOrder)}
            >
              🖨️ {lang === "ar" ? "طباعة الفاتورة (مدفوع)" : "Print Receipt (PAID)"}
            </button>
            <button 
              className="start-new-from-paid-btn"
              onClick={handleNewOrder}
            >
              + {lang === "ar" ? "طلب جديد" : "New Order"}
            </button>
          </div>
        ) : (
          activeTab !== "payment" && (
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
          )
        )}
      </div>
    </div>
  );
}
