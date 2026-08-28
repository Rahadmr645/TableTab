import React from "react";
import { useCashier } from "../context/CashierContext.jsx";

export default function CartPanel() {
  const {
    cart,
    selectedTable,
    lang,
    t,
    taxAmount,
    grandTotal,
    setShowTableModal,
    handleUpdateQuantity,
    handleSubmitOrder,
    setMobileView
  } = useCashier();

  return (
    <div className="cart-panel">
      <div className="cart-header">
        <button className="cart-back-to-menu-btn" onClick={() => setMobileView("catalog")}>
          {lang === "ar" ? "→ العودة للمنيو" : "← Back to Menu"}
        </button>
        <div className="cart-header-top">
          <button className="order-type-btn">
            {t.dineIn}
          </button>
          <div 
            className="table-indicator" 
            style={{ cursor: "pointer" }} 
            onClick={() => setShowTableModal(true)}
          >
            {t.table} #{selectedTable}
          </div>
        </div>
      </div>

      <div className="cart-items">
        {cart.length === 0 ? null : (
          cart.map((item, idx) => (
            <div className="cart-item" key={idx}>
              <div className="cart-item-row">
                <div className="cart-item-title">
                  <span>{lang === "ar" ? item.product.nameAr : item.product.nameEn}</span>
                  <span className="cart-item-subtitle">{item.product.price.toFixed(2)} ر.س</span>
                </div>
                <div className="cart-item-qty-price">
                  {(item.product.price * item.quantity).toFixed(2)} ر.س
                </div>
              </div>
              <div className="cart-item-note-row">
                <button className="item-action-btn">
                  💬 {t.notes}
                </button>
                <div className="qty-counter">
                  <button className="qty-btn" onClick={() => handleUpdateQuantity(item.product.id, -1)}>-</button>
                  <span className="qty-val">{item.quantity}</span>
                  <button className="qty-btn" onClick={() => handleUpdateQuantity(item.product.id, 1)}>+</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="cart-footer">
        <div className="bill-row">
          <span>{t.taxes}</span>
          <span>{taxAmount.toFixed(2)} ر.س</span>
        </div>
        <div className="bill-row total">
          <span>{t.total}</span>
          <span>{grandTotal.toFixed(2)} ر.س</span>
        </div>
        <button 
          className="pay-action-btn" 
          disabled={cart.length === 0} 
          onClick={() => handleSubmitOrder("cash")}
        >
          {t.pay}
        </button>
      </div>
    </div>
  );
}
