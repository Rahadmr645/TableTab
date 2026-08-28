import React, { useState, useEffect } from "react";
import { useCashier } from "../../context/CashierContext.jsx";

export default function ProductModal() {
  const {
    showProdModal,
    setShowProdModal,
    categories,
    selectedCategory,
    handleAddProduct,
    handleEditProduct,
    lang,
    t
  } = useCashier();

  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [price, setPrice] = useState("");
  const [catId, setCatId] = useState("");

  const isEdit = typeof showProdModal === "object" && showProdModal !== null;

  useEffect(() => {
    if (isEdit) {
      setNameEn(showProdModal.nameEn || "");
      setNameAr(showProdModal.nameAr || "");
      setPrice(showProdModal.price || "");
      setCatId(showProdModal.categoryId || "");
    } else {
      setNameEn("");
      setNameAr("");
      setPrice("");
      setCatId(selectedCategory ? selectedCategory.id : categories[0]?.id || "");
    }
  }, [showProdModal, isEdit, selectedCategory, categories]);

  if (!showProdModal) return null;

  const onClose = () => setShowProdModal(false);

  const handleConfirm = () => {
    if (!nameEn.trim() || !nameAr.trim() || !price || !catId) {
      alert(lang === "ar" ? "يرجى ملء جميع الحقول!" : "Please fill in all fields!");
      return;
    }
    if (isEdit) {
      handleEditProduct(showProdModal.id, nameEn.trim(), nameAr.trim(), parseFloat(price), catId);
    } else {
      handleAddProduct(nameEn.trim(), nameAr.trim(), parseFloat(price), catId);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            {isEdit
              ? lang === "ar"
                ? "تعديل المنتج"
                : "Edit Product"
              : lang === "ar"
              ? "إضافة منتج جديد"
              : "Add New Product"}
          </h3>
          <button 
            style={{ border: "none", background: "none", fontSize: "16px", cursor: "pointer" }} 
            onClick={onClose}
          >✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>{lang === "ar" ? "الاسم بالإنجليزي" : "Name (English)"}</label>
            <input 
              type="text" 
              className="form-input"
              value={nameEn} 
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Flat White"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>{lang === "ar" ? "الاسم بالعربي" : "Name (Arabic)"}</label>
            <input 
              type="text" 
              className="form-input"
              value={nameAr} 
              onChange={(e) => setNameAr(e.target.value)}
              placeholder="مثال: فلات وايت"
            />
          </div>
          <div className="form-group">
            <label>{lang === "ar" ? "السعر (ر.س)" : "Price (SAR)"}</label>
            <input 
              type="number" 
              className="form-input"
              value={price} 
              onChange={(e) => setPrice(e.target.value)}
              placeholder="16.00"
              step="0.01"
            />
          </div>
          <div className="form-group">
            <label>{lang === "ar" ? "التصنيف" : "Category"}</label>
            <select
              className="form-input"
              value={catId}
              onChange={(e) => setCatId(e.target.value)}
            >
              <option value="">{lang === "ar" ? "اختر التصنيف" : "Select Category"}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {lang === "ar" ? c.nameAr : c.nameEn}
                </option>
              ))}
            </select>
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
