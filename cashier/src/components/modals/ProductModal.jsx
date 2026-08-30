import React, { useState, useEffect, useRef } from "react";
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
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef(null);

  const isEdit = typeof showProdModal === "object" && showProdModal !== null;

  useEffect(() => {
    if (isEdit) {
      setNameEn(showProdModal.nameEn || "");
      setNameAr(showProdModal.nameAr || "");
      setPrice(showProdModal.price || "");
      setCatId(showProdModal.categoryId || "");
      setImagePreview(showProdModal.image || "");
      setImageFile(null);
    } else {
      setNameEn("");
      setNameAr("");
      setPrice("");
      setCatId(selectedCategory ? selectedCategory.id : categories[0]?.id || "");
      setImagePreview("");
      setImageFile(null);
    }
  }, [showProdModal, isEdit, selectedCategory, categories]);

  if (!showProdModal) return null;

  const onClose = () => {
    if (isSubmitting) return;
    setShowProdModal(false);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert(lang === "ar" ? "يرجى اختيار ملف صورة صالح (PNG, JPG, WEBP)" : "Please select a valid image file (PNG, JPG, WEBP)");
        return;
      }
      setImageFile(file);
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
    }
  };

  const handleRemoveImage = (e) => {
    e.stopPropagation();
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleConfirm = async () => {
    const trimmedEn = nameEn.trim();
    const trimmedAr = nameAr.trim();
    if (!trimmedEn && !trimmedAr) {
      alert(lang === "ar" ? "يرجى إدخال اسم المنتج!" : "Please enter item name!");
      return;
    }
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      alert(lang === "ar" ? "يرجى إدخال سعر صحيح!" : "Please enter valid price!");
      return;
    }
    if (!catId) {
      alert(lang === "ar" ? "يرجى اختيار التصنيف أولاً!" : "Please select a category!");
      return;
    }

    const finalEn = trimmedEn || trimmedAr;
    const finalAr = trimmedAr || trimmedEn;

    try {
      setIsSubmitting(true);
      let result;
      if (isEdit) {
        result = await handleEditProduct(showProdModal.id, finalEn, finalAr, parseFloat(price), catId, imageFile);
      } else {
        result = await handleAddProduct(finalEn, finalAr, parseFloat(price), catId, imageFile);
      }
      if (result?.success) {
        onClose();
      }
    } catch (err) {
      console.error("Product submission failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 100000 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "480px",
          width: "100%",
          borderRadius: "20px",
          background: "#ffffff",
          color: "#0f172a",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          padding: 0,
          overflow: "hidden"
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "18px 22px",
          borderBottom: "1px solid #e5e7eb",
          background: "#f8fafc"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>🍽️</span>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#1e293b" }}>
              {isEdit
                ? lang === "ar" ? "تعديل الصنف" : "Edit Product"
                : lang === "ar" ? "إضافة صنف جديد للقائمة" : "Add New Product"}
            </h3>
          </div>
          <button 
            style={{ 
              border: "none", 
              background: "#f1f5f9", 
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              fontSize: "14px", 
              cursor: "pointer",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }} 
            onClick={onClose}
          >✕</button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: "14px" }}>
          
          {/* Image Uploader */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
              📷 {lang === "ar" ? "صورة الصنف (Cloudinary)" : "Product Image (Cloudinary)"}
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleImageChange}
            />

            {imagePreview ? (
              <div 
                style={{
                  position: "relative",
                  width: "100%",
                  height: "140px",
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: "2px solid #e2e8f0",
                  background: "#f8fafc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  opacity: 0,
                  transition: "opacity 0.2s ease"
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                >
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: "#3b82f6",
                      color: "#fff",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer"
                    }}
                  >
                    ✏️ {lang === "ar" ? "تغيير" : "Change"}
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    style={{
                      background: "#ef4444",
                      color: "#fff",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer"
                    }}
                  >
                    🗑️ {lang === "ar" ? "حذف" : "Remove"}
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: "100%",
                  height: "100px",
                  borderRadius: "12px",
                  border: "2px dashed #cbd5e1",
                  background: "#f8fafc",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  gap: "4px"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#4f46e5";
                  e.currentTarget.style.background = "rgba(79, 70, 229, 0.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#cbd5e1";
                  e.currentTarget.style.background = "#f8fafc";
                }}
              >
                <span style={{ fontSize: "24px" }}>📸</span>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#4f46e5" }}>
                  {lang === "ar" ? "اضغط لرفع صورة الصنف" : "Click to upload product image"}
                </span>
                <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                  PNG, JPG, WEBP (Auto-saved to Cloudinary)
                </span>
              </div>
            )}
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
              {lang === "ar" ? "الاسم بالإنجليزي" : "Name (English)"}
            </label>
            <input 
              type="text" 
              className="form-input"
              value={nameEn} 
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Flat White"
              autoFocus
              style={{ width: "100%", boxSizing: "border-box" }}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
              {lang === "ar" ? "الاسم بالعربي" : "Name (Arabic)"}
            </label>
            <input 
              type="text" 
              className="form-input"
              value={nameAr} 
              onChange={(e) => setNameAr(e.target.value)}
              placeholder="مثال: فلات وايت"
              style={{ width: "100%", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "10px" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                {lang === "ar" ? "السعر (﷼)" : "Price (﷼)"}
              </label>
              <input 
                type="number" 
                className="form-input"
                value={price} 
                onChange={(e) => setPrice(e.target.value)}
                placeholder="16.00"
                step="0.01"
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                {lang === "ar" ? "التصنيف" : "Category"}
              </label>
              <select
                className="form-input"
                value={catId}
                onChange={(e) => setCatId(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box" }}
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
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "14px 22px",
          borderTop: "1px solid #e5e7eb",
          background: "#f8fafc"
        }}>
          <button 
            type="button"
            className="modal-btn cancel" 
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: "9px 18px",
              borderRadius: "10px",
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              color: "#475569",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer"
            }}
          >
            {t.cancel}
          </button>
          <button 
            type="button"
            className="modal-btn confirm" 
            onClick={handleConfirm}
            disabled={isSubmitting}
            style={{
              padding: "10px 22px",
              borderRadius: "10px",
              background: "#4f46e5",
              border: "none",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: "800",
              cursor: isSubmitting ? "wait" : "pointer",
              boxShadow: "0 3px 10px rgba(79, 70, 229, 0.35)",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            {isSubmitting 
              ? (lang === "ar" ? "⏳ جاري الرفع والحفظ..." : "⏳ Uploading...")
              : (lang === "ar" ? "✓ حفظ الصنف والصورة" : "✓ Save Product & Image")}
          </button>
        </div>
      </div>
    </div>
  );
}
