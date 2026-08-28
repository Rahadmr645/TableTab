import React, { useState, useEffect } from "react";
import { useCashier } from "../../context/CashierContext.jsx";

export default function CategoryModal() {
  const {
    showCatModal,
    setShowCatModal,
    handleAddCategory,
    handleEditCategory,
    lang,
    t
  } = useCashier();

  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");

  const isEdit = typeof showCatModal === "object" && showCatModal !== null;

  useEffect(() => {
    if (isEdit) {
      setNameEn(showCatModal.nameEn || "");
      setNameAr(showCatModal.nameAr || "");
    } else {
      setNameEn("");
      setNameAr("");
    }
  }, [showCatModal, isEdit]);

  if (!showCatModal) return null;

  const onClose = () => setShowCatModal(false);

  const handleConfirm = () => {
    if (!nameEn.trim() || !nameAr.trim()) {
      alert(lang === "ar" ? "يرجى ملء جميع الحقول!" : "Please fill in all fields!");
      return;
    }
    if (isEdit) {
      handleEditCategory(showCatModal.id, nameEn.trim(), nameAr.trim());
    } else {
      handleAddCategory(nameEn.trim(), nameAr.trim());
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
                ? "تعديل التصنيف"
                : "Edit Category"
              : lang === "ar"
              ? "إضافة تصنيف جديد"
              : "Add New Category"}
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
              placeholder="e.g. Hot Drinks"
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
              placeholder="مثال: مشروبات ساخنة"
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
