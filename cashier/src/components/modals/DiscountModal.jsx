import React, { useState, useEffect } from "react";
import { useCashier } from "../../context/CashierContext.jsx";
import "./DiscountModal.css";

export default function DiscountModal() {
  const {
    showDiscountModal,
    setShowDiscountModal,
    orderDiscount,
    discountType,
    discountReason,
    itemsSubtotal,
    handleApplyDiscount,
    handleClearDiscount,
    lang,
    t
  } = useCashier();

  const [mode, setMode] = useState("percent"); // "percent" | "fixed"
  const [valInput, setValInput] = useState("");
  const [reasonInput, setReasonInput] = useState("");

  // Sync internal state when modal opens
  useEffect(() => {
    if (showDiscountModal) {
      setMode(discountType || "percent");
      setValInput(orderDiscount && orderDiscount > 0 ? orderDiscount.toString() : "");
      setReasonInput(discountReason || "");
    }
  }, [showDiscountModal, orderDiscount, discountType, discountReason]);

  if (!showDiscountModal) return null;
  const onClose = () => setShowDiscountModal(false);

  const handleInputChange = (e) => {
    let raw = e.target.value;
    if (raw === "") {
      setValInput("");
      return;
    }
    // Remove leading zeros when followed by other digits (e.g. "01" -> "1", "005" -> "5")
    if (/^0+[0-9]/.test(raw)) {
      raw = raw.replace(/^0+/, "");
    }
    setValInput(raw);
  };

  const numVal = Math.max(0, Number(valInput) || 0);

  // Live preview calculation
  const previewDiscountAmt = mode === "fixed"
    ? Math.min(itemsSubtotal, numVal)
    : itemsSubtotal * (Math.min(100, numVal) / 100);

  const previewNetBeforeTax = Math.max(0, itemsSubtotal - previewDiscountAmt) / 1.15;
  const previewTaxAmt = Math.max(0, (itemsSubtotal - previewDiscountAmt) - previewNetBeforeTax);
  const previewGrandTotal = Math.max(0, itemsSubtotal - previewDiscountAmt);

  const handleConfirm = () => {
    let finalVal = numVal;
    if (mode === "percent") {
      finalVal = Math.min(100, finalVal);
    } else {
      finalVal = Math.min(itemsSubtotal, finalVal);
    }
    handleApplyDiscount(finalVal, mode, reasonInput.trim());
    onClose();
  };

  const handleReset = () => {
    handleClearDiscount();
    onClose();
  };

  const percentPresets = [5, 10, 15, 20, 25, 50, 100];
  const fixedPresets = [5, 10, 15, 20, 50];

  const quickReasons = lang === "ar"
    ? ["خصم عميل VIP", "خصم موظف / ضيافة", "عرض ترويجي", "موافقة الإدارة", "تعويض خدمة"]
    : ["VIP Customer", "Staff / Hospitality", "Promo Campaign", "Manager Approval", "Service Compensation"];

  return (
    <div className="discount-modal-overlay" onClick={onClose}>
      <div 
        className={`discount-modal-card ${lang === "ar" ? "rtl" : "ltr"}`} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="discount-modal-header">
          <div className="discount-header-info">
            <div className="discount-header-icon">
              🏷️
            </div>
            <div>
              <h3 className="discount-header-title">
                {lang === "ar" ? "تطبيق خصم على الطلب" : "Apply Order Discount"}
              </h3>
              <p className="discount-header-sub">
                {lang === "ar" ? `مجموع الطلب: ${itemsSubtotal.toFixed(2)} ﷼` : `Order Subtotal: ${itemsSubtotal.toFixed(2)} ﷼`}
              </p>
            </div>
          </div>
          <button 
            type="button"
            className="discount-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="discount-modal-body">
          
          {/* Mode Switch (Percentage vs Fixed) */}
          <div className="discount-mode-grid">
            <button
              type="button"
              className={`discount-mode-btn ${mode === "percent" ? "active" : ""}`}
              onClick={() => {
                setMode("percent");
                if (mode !== "percent") setValInput("");
              }}
            >
              <span>%</span>
              <span>{lang === "ar" ? "نسبة مئوية" : "Percentage"}</span>
            </button>
            <button
              type="button"
              className={`discount-mode-btn ${mode === "fixed" ? "active" : ""}`}
              onClick={() => {
                setMode("fixed");
                if (mode !== "fixed") setValInput("");
              }}
            >
              <span>﷼</span>
              <span>{lang === "ar" ? "مبلغ ثابت" : "Fixed Amount"}</span>
            </button>
          </div>

          {/* Discount Value Input */}
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: "12px", fontWeight: "700", color: "#334155", display: "block", marginBottom: "6px" }}>
              {mode === "percent"
                ? (lang === "ar" ? "نسبة الخصم (%):" : "Discount Percentage (%):")
                : (lang === "ar" ? "قيمة الخصم (﷼):" : "Discount Amount (﷼):")}
            </label>
            <div className="discount-input-wrapper">
              <input 
                type="number" 
                className="discount-value-input" 
                min="0"
                max={mode === "percent" ? 100 : itemsSubtotal}
                step="any"
                inputMode="decimal"
                value={valInput} 
                onChange={handleInputChange}
                onFocus={(e) => e.target.select()}
                placeholder={mode === "percent" ? "0" : "0.00"}
                autoFocus
              />
              <span className="discount-currency-badge">
                {mode === "percent" ? "%" : "﷼"}
              </span>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", display: "block", marginBottom: "6px" }}>
              {lang === "ar" ? "خيارات سريعة:" : "Quick Presets:"}
            </span>
            <div className="discount-presets-grid">
              {(mode === "percent" ? percentPresets : fixedPresets).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`discount-preset-chip ${numVal === preset ? "active" : ""}`}
                  onClick={() => setValInput(preset.toString())}
                >
                  {preset} {mode === "percent" ? "%" : "﷼"}
                </button>
              ))}
            </div>
          </div>

          {/* Discount Reason Tag Selector */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: "700", color: "#334155", display: "block", marginBottom: "6px" }}>
              {lang === "ar" ? "سبب الخصم (اختياري):" : "Discount Reason (Optional):"}
            </label>
            <div className="discount-reasons-wrap">
              {quickReasons.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`discount-reason-pill ${reasonInput === r ? "active" : ""}`}
                  onClick={() => setReasonInput(r)}
                >
                  {r}
                </button>
              ))}
            </div>
            <input
              type="text"
              className="discount-reason-input"
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder={lang === "ar" ? "أو اكتب سبباً مخصصاً..." : "Or type custom reason..."}
            />
          </div>

          {/* Live Impact Preview Card */}
          <div className="discount-summary-card">
            <div className="discount-summary-row">
              <span>{lang === "ar" ? "مجموع الأصناف:" : "Items Subtotal:"}</span>
              <span style={{ fontWeight: "700", color: "#1e293b" }}>{itemsSubtotal.toFixed(2)} ﷼</span>
            </div>
            <div className="discount-summary-row discount-val">
              <span>{lang === "ar" ? "قيمة الخصم:" : "Discount Deducted:"}</span>
              <span>-{previewDiscountAmt.toFixed(2)} ﷼</span>
            </div>
            <div className="discount-summary-row">
              <span>{lang === "ar" ? "الضريبة (15%):" : "VAT (15%):"}</span>
              <span style={{ fontWeight: "600" }}>{previewTaxAmt.toFixed(2)} ﷼</span>
            </div>
            <div className="discount-summary-row total-val">
              <span>{lang === "ar" ? "الإجمالي الجديد:" : "New Total:"}</span>
              <span className="new-total-amount">{previewGrandTotal.toFixed(2)} ﷼</span>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="discount-modal-footer">
          {orderDiscount > 0 ? (
            <button 
              type="button"
              className="discount-btn-remove"
              onClick={handleReset}
            >
              🗑️ {lang === "ar" ? "إلغاء الخصم" : "Remove"}
            </button>
          ) : (
            <button 
              type="button" 
              className="discount-btn-cancel" 
              onClick={onClose}
            >
              {t.cancel}
            </button>
          )}

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {orderDiscount > 0 && (
              <button 
                type="button" 
                className="discount-btn-cancel" 
                onClick={onClose}
              >
                {t.cancel}
              </button>
            )}
            <button 
              type="button" 
              className="discount-btn-confirm" 
              onClick={handleConfirm}
            >
              ✓ {lang === "ar" ? "تطبيق الخصم" : "Apply Discount"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
