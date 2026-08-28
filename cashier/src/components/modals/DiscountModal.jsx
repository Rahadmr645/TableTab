import React from "react";
import { useCashier } from "../../context/CashierContext.jsx";

export default function DiscountModal() {
  const { showDiscountModal, setShowDiscountModal, orderDiscount, setOrderDiscount, t } = useCashier();

  if (!showDiscountModal) return null;
  const onClose = () => setShowDiscountModal(false);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t.discount} (%)</h3>
          <button 
            style={{ border: "none", background: "none", fontSize: "16px", cursor: "pointer" }} 
            onClick={onClose}
          >✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <input 
              type="number" 
              className="form-input" 
              min="0"
              max="100"
              value={orderDiscount} 
              onChange={(e) => setOrderDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
              placeholder="0 - 100"
              autoFocus
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="modal-btn cancel" onClick={onClose}>{t.cancel}</button>
          <button className="modal-btn confirm" onClick={onClose}>{t.confirm}</button>
        </div>
      </div>
    </div>
  );
}
