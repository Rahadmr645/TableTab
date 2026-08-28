import React from "react";
import { useCashier } from "../../context/CashierContext.jsx";

export default function CustomerModal() {
  const { showCustModal, setShowCustModal, customerName, setCustomerName, t } = useCashier();

  if (!showCustModal) return null;
  const onClose = () => setShowCustModal(false);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t.custName}</h3>
          <button 
            style={{ border: "none", background: "none", fontSize: "16px", cursor: "pointer" }} 
            onClick={onClose}
          >✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <input 
              type="text" 
              className="form-input" 
              value={customerName} 
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. John Doe"
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
