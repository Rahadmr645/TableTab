import React from "react";
import { useCashier } from "../../context/CashierContext.jsx";

export default function CustomDishModal() {
  const { 
    showCustomDishModal, 
    setShowCustomDishModal, 
    customDishName, 
    setCustomDishName, 
    customDishPrice, 
    setCustomDishPrice, 
    handleAddToCart, 
    lang, 
    t 
  } = useCashier();

  if (!showCustomDishModal) return null;
  const onClose = () => setShowCustomDishModal(false);

  const handleConfirm = () => {
    if (customDishName && customDishPrice) {
      handleAddToCart({
        id: "custom_" + Date.now(),
        categoryId: "custom",
        nameEn: customDishName,
        nameAr: customDishName,
        price: parseFloat(customDishPrice)
      });
      setCustomDishName("");
      setCustomDishPrice("");
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t.addDish}</h3>
          <button 
            style={{ border: "none", background: "none", fontSize: "16px", cursor: "pointer" }} 
            onClick={onClose}
          >✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>{lang === "ar" ? "اسم الصنف" : "Item Name"}</label>
            <input 
              type="text" 
              className="form-input"
              value={customDishName} 
              onChange={(e) => setCustomDishName(e.target.value)}
              placeholder="e.g. Traditional Karak"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>{lang === "ar" ? "السعر (ر.س)" : "Price (SAR)"}</label>
            <input 
              type="number" 
              className="form-input"
              value={customDishPrice} 
              onChange={(e) => setCustomDishPrice(e.target.value)}
              placeholder="15.00"
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="modal-btn cancel" onClick={onClose}>{t.cancel}</button>
          <button className="modal-btn confirm" onClick={handleConfirm}>{t.confirm}</button>
        </div>
      </div>
    </div>
  );
}
