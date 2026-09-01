import React, { useState, useEffect, useMemo } from "react";
import { useCashier } from "../../context/CashierContext.jsx";
import "./RefundOrderModal.css";

export default function RefundOrderModal() {
  const {
    showRefundModal,
    setShowRefundModal,
    activeRefundOrder,
    setActiveRefundOrder,
    handleRefundOrder,
    lang,
    t
  } = useCashier();

  const [refundScope, setRefundScope] = useState("all"); // "all" | "partial"
  const [itemQuantities, setItemQuantities] = useState({}); // { [itemIndex]: refundQty }
  const [refundMethod, setRefundMethod] = useState("cash");
  const [reason, setReason] = useState("");
  const [selectedReasonTag, setSelectedReasonTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isArabic = lang === "ar";

  const orderItems = useMemo(() => {
    return activeRefundOrder?.items || [];
  }, [activeRefundOrder]);

  const orderTotal = Number(activeRefundOrder?.totalPrice) || 0;
  const currentRefundedAmount = Number(activeRefundOrder?.refundedAmount) || 0;
  const remainingOrderValue = Math.max(0, orderTotal - currentRefundedAmount);
  const origPaymentMethod = (activeRefundOrder?.paymentMethod || "").toLowerCase();

  // Initialize or reset modal state when activeRefundOrder changes
  useEffect(() => {
    if (activeRefundOrder) {
      const origMethod = (activeRefundOrder.paymentMethod || "").toLowerCase();
      setRefundMethod(origMethod === "card" ? "card" : "cash");
      setReason("");
      setSelectedReasonTag(isArabic ? "طلب العميل" : "Customer Request");
      setErrorMsg("");
      setRefundScope("all");

      // Default all items to max quantity
      const initMap = {};
      (activeRefundOrder.items || []).forEach((it, idx) => {
        initMap[idx] = Math.max(1, Number(it.quantity) || 1);
      });
      setItemQuantities(initMap);
    }
  }, [activeRefundOrder, isArabic]);

  // Handle quantity adjustments
  const handleQtyChange = (idx, newQty, maxQty) => {
    const clamped = Math.max(0, Math.min(maxQty, newQty));
    setItemQuantities((prev) => ({
      ...prev,
      [idx]: clamped
    }));
  };

  const handleSelectAllItems = () => {
    const allMap = {};
    orderItems.forEach((it, idx) => {
      allMap[idx] = Math.max(1, Number(it.quantity) || 1);
    });
    setItemQuantities(allMap);
  };

  const handleDeselectAllItems = () => {
    const emptyMap = {};
    orderItems.forEach((_, idx) => {
      emptyMap[idx] = 0;
    });
    setItemQuantities(emptyMap);
  };

  // Calculate refund amount based on scope & selected items
  const { calculatedRefundAmount, selectedItemsCount, isAllSelected, refundItemsPayload } = useMemo(() => {
    if (!activeRefundOrder || orderItems.length === 0) {
      return {
        calculatedRefundAmount: remainingOrderValue,
        selectedItemsCount: 0,
        isAllSelected: true,
        refundItemsPayload: []
      };
    }

    if (refundScope === "all") {
      const payload = orderItems.map((it) => ({
        name: it.name || it.nameAr || it.nameEn || "Item",
        quantity: Math.max(1, Number(it.quantity) || 1),
        price: Number(it.price) || 0
      }));
      return {
        calculatedRefundAmount: remainingOrderValue,
        selectedItemsCount: orderItems.length,
        isAllSelected: true,
        refundItemsPayload: payload
      };
    }

    let itemsGross = 0;
    let selectedGross = 0;
    let count = 0;
    let allFull = true;
    const payload = [];

    orderItems.forEach((it, idx) => {
      const maxQ = Math.max(1, Number(it.quantity) || 1);
      const selQ = itemQuantities[idx] !== undefined ? itemQuantities[idx] : maxQ;
      const unitPrice = Number(it.price) || 0;

      itemsGross += unitPrice * maxQ;
      selectedGross += unitPrice * selQ;

      if (selQ > 0) {
        count += selQ;
        payload.push({
          name: it.name || it.nameAr || it.nameEn || "Item",
          quantity: selQ,
          price: unitPrice
        });
      }

      if (selQ < maxQ) {
        allFull = false;
      }
    });

    if (allFull && itemsGross > 0) {
      return {
        calculatedRefundAmount: remainingOrderValue,
        selectedItemsCount: count,
        isAllSelected: true,
        refundItemsPayload: payload
      };
    }

    // Proportional discount factor if applicable
    const discountRatio = itemsGross > 0 ? remainingOrderValue / itemsGross : 1;
    const calculated = Math.min(remainingOrderValue, Math.round(selectedGross * discountRatio * 100) / 100);

    return {
      calculatedRefundAmount: calculated,
      selectedItemsCount: count,
      isAllSelected: allFull,
      refundItemsPayload: payload
    };
  }, [refundScope, itemQuantities, orderItems, activeRefundOrder, remainingOrderValue]);

  if (!showRefundModal || !activeRefundOrder) return null;

  const reasonOptions = isArabic
    ? ["طلب العميل", "خطأ في الطلب", "جودة الوجبة", "تأخير في التحضير", "أخرى"]
    : ["Customer Request", "Order Mistake", "Food Quality", "Preparation Delay", "Other"];

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (calculatedRefundAmount <= 0) {
      setErrorMsg(isArabic ? "يرجى تحديد عنصر واحد على الأقل للاسترجاع" : "Please select at least one item to refund");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    const finalReason = reason.trim() ? `${selectedReasonTag}: ${reason.trim()}` : selectedReasonTag;

    try {
      const success = await handleRefundOrder(
        activeRefundOrder._id,
        refundMethod,
        calculatedRefundAmount,
        finalReason,
        refundItemsPayload
      );

      if (success) {
        setShowRefundModal(false);
        setActiveRefundOrder(null);
      } else {
        setErrorMsg(isArabic ? "تعذر إتمام عملية الاسترجاع، يرجى المحاولة ثانية" : "Failed to process refund, please try again");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || "Refund error");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setShowRefundModal(false);
    setActiveRefundOrder(null);
  };

  return (
    <div className="refund-modal-overlay" onClick={handleClose}>
      <div className="refund-modal-card" onClick={(e) => e.stopPropagation()} dir={isArabic ? "rtl" : "ltr"}>
        {/* Fixed Header */}
        <div className="refund-modal-header">
          <div className="refund-header-icon-wrapper">
            <span className="refund-header-icon">↩️</span>
          </div>
          <div className="refund-header-text">
            <h3>{isArabic ? "إلغاء واسترجاع الطلب" : "Refund & Cancel Order"}</h3>
            <p>
              {isArabic ? `طلب رقم #${activeRefundOrder.dailyOrderNumber || activeRefundOrder._id}` : `Order #${activeRefundOrder.dailyOrderNumber || activeRefundOrder._id}`}
              {activeRefundOrder.tableId ? ` • ${t.table} ${activeRefundOrder.tableId}` : ""}
              {activeRefundOrder.customerName ? ` • 👤 ${activeRefundOrder.customerName}` : ""}
            </p>
          </div>
          <button type="button" className="refund-close-btn" onClick={handleClose} disabled={loading} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form id="refund-order-form" onSubmit={handleSubmit} className="refund-modal-scroll-content">
          {/* Order Summary Info Box */}
          <div className="refund-summary-box">
            <div className="refund-summary-row">
              <span className="summary-label">{isArabic ? "مبلغ الفاتورة الأصلي:" : "Original Order Total:"}</span>
              <span className="summary-val-original">{orderTotal.toFixed(2)} ﷼</span>
            </div>
            
            <div className="refund-summary-row sub-meta">
              <span className="summary-label">{isArabic ? "مبلغ الاسترجاع المحسوب:" : "Refund Amount:"}</span>
              <span className="summary-val-highlight">{calculatedRefundAmount.toFixed(2)} ﷼</span>
            </div>

            <div className="refund-summary-row sub-meta">
              <span className="summary-label">{isArabic ? "طريقة الدفع الأصلية:" : "Original Payment Method:"}</span>
              <span className="summary-method-badge">
                {origPaymentMethod === "cash"
                  ? (isArabic ? "💵 نقدي (كاش)" : "💵 Cash")
                  : origPaymentMethod === "split"
                  ? (isArabic ? "🔀 دفع مجزأ (كاش + شبكة)" : "🔀 Split Payment")
                  : (isArabic ? "💳 شبكة / بطاقة" : "💳 Card / POS")}
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="refund-error-banner">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Step 1: Refund Scope Toggle (All Items vs Select Specific Items) */}
          <div className="refund-form-section">
            <label className="refund-section-label">
              {isArabic ? "1. نوع الاسترجاع وتحديد الأصناف:" : "1. Select Refund Scope & Items:"}
            </label>
            
            <div className="refund-scope-toggle-group">
              <button
                type="button"
                className={`scope-toggle-btn ${refundScope === "all" ? "active" : ""}`}
                onClick={() => {
                  setRefundScope("all");
                  handleSelectAllItems();
                }}
              >
                <span>📦 {isArabic ? "استرجاع كامل الطلب" : "Full Order Refund"}</span>
                <span className="scope-subtext">{isArabic ? "استرجاع كل الأصناف بالكامل" : "All items & full amount"}</span>
              </button>

              <button
                type="button"
                className={`scope-toggle-btn ${refundScope === "partial" ? "active" : ""}`}
                onClick={() => setRefundScope("partial")}
              >
                <span>🔍 {isArabic ? "استرجاع أصناف محددة" : "Select Specific Items"}</span>
                <span className="scope-subtext">{isArabic ? "تحديد كمية كل صنف مسترجع" : "Partial item-level refund"}</span>
              </button>
            </div>

            {/* Item Selection List (Visible when partial is chosen) */}
            {refundScope === "partial" && (
              <div className="refund-items-container">
                <div className="refund-items-header">
                  <span>{isArabic ? `الأصناف (${orderItems.length})` : `Items (${orderItems.length})`}</span>
                  <div className="refund-items-quick-actions">
                    <button type="button" onClick={handleSelectAllItems}>
                      {isArabic ? "تحديد الكل" : "Select All"}
                    </button>
                    <span>•</span>
                    <button type="button" onClick={handleDeselectAllItems}>
                      {isArabic ? "إلغاء التحديد" : "Deselect All"}
                    </button>
                  </div>
                </div>

                <div className="refund-items-list">
                  {orderItems.map((item, idx) => {
                    const itemName = isArabic ? (item.nameAr || item.name || item.nameEn) : (item.nameEn || item.name || item.nameAr);
                    const unitPrice = Number(item.price) || 0;
                    const maxQty = Math.max(1, Number(item.quantity) || 1);
                    const selQty = itemQuantities[idx] !== undefined ? itemQuantities[idx] : maxQty;
                    const itemTotal = unitPrice * selQty;
                    const isSelected = selQty > 0;

                    return (
                      <div key={idx} className={`refund-item-card ${isSelected ? "selected" : "unselected"}`}>
                        <div className="refund-item-info">
                          <span className="refund-item-name">{itemName}</span>
                          <span className="refund-item-meta">
                            {unitPrice.toFixed(2)} ﷼ {isArabic ? "لكل قطعة" : "each"} • {isArabic ? `الأصلي: ${maxQty}` : `Orig: ${maxQty}`}
                          </span>
                        </div>

                        <div className="refund-item-stepper-wrapper">
                          <div className="refund-stepper">
                            <button
                              type="button"
                              className="stepper-btn minus"
                              disabled={selQty <= 0}
                              onClick={() => handleQtyChange(idx, selQty - 1, maxQty)}
                            >
                              −
                            </button>
                            <span className="stepper-count">{selQty}</span>
                            <button
                              type="button"
                              className="stepper-btn plus"
                              disabled={selQty >= maxQty}
                              onClick={() => handleQtyChange(idx, selQty + 1, maxQty)}
                            >
                              +
                            </button>
                          </div>
                          <span className="refund-item-subtotal">
                            {itemTotal.toFixed(2)} ﷼
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Select Refund Method (Cash vs Card) */}
          <div className="refund-form-section">
            <label className="refund-section-label">
              {isArabic ? "2. طريقة استرجاع المبلغ للعميل:" : "2. Select Refund Method:"}
            </label>
            <div className="refund-methods-grid">
              {/* Cash Refund Option */}
              <div
                className={`refund-method-card ${refundMethod === "cash" ? "selected" : ""}`}
                onClick={() => setRefundMethod("cash")}
                role="button"
                tabIndex={0}
              >
                <div className="method-icon-title">
                  <span className="method-icon">💵</span>
                  <span className="method-title">{isArabic ? "استرجاع نقدي (كاش)" : "Cash Refund"}</span>
                </div>
                <p className="method-desc">
                  {isArabic
                    ? "يتم خصم المبلغ فوراً من مبيعات الكاش / الصندوق في تقرير اليوم"
                    : "Deducts amount directly from Cash Drawer sales in daily report"}
                </p>
                {refundMethod === "cash" && <span className="method-check-tag">✓ {isArabic ? "محدد" : "Selected"}</span>}
              </div>

              {/* Card Refund Option */}
              <div
                className={`refund-method-card ${refundMethod === "card" ? "selected" : ""}`}
                onClick={() => setRefundMethod("card")}
                role="button"
                tabIndex={0}
              >
                <div className="method-icon-title">
                  <span className="method-icon">💳</span>
                  <span className="method-title">{isArabic ? "استرجاع شبكة / بطاقة" : "Card / POS Refund"}</span>
                </div>
                <p className="method-desc">
                  {isArabic
                    ? "يتم خصم المبلغ من مبيعات الشبكة / نقاط البيع في تقرير اليوم"
                    : "Deducts amount directly from Card / POS sales in daily report"}
                </p>
                {refundMethod === "card" && <span className="method-check-tag">✓ {isArabic ? "محدد" : "Selected"}</span>}
              </div>
            </div>
          </div>

          {/* Step 3: Reason for Cancellation / Refund */}
          <div className="refund-form-section">
            <label className="refund-section-label">
              {isArabic ? "3. سبب الإلغاء والاسترجاع:" : "3. Refund / Cancel Reason:"}
            </label>
            <div className="reason-pills-row">
              {reasonOptions.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  className={`reason-pill-btn ${selectedReasonTag === opt ? "active" : ""}`}
                  onClick={() => setSelectedReasonTag(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
            <input
              type="text"
              className="refund-reason-input"
              placeholder={isArabic ? "ملاحظات إضافية حول سبب الاسترجاع (اختياري)..." : "Additional refund notes (optional)..."}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {/* Dynamic Notice Alert */}
          <div className="refund-notice-card">
            <span>
              ℹ️ {isArabic
                ? isAllSelected
                  ? `سيتم إلغاء الطلب بالكامل وخصم مبلغ (${calculatedRefundAmount.toFixed(2)} ﷼) من مبيعات (${refundMethod === "cash" ? "الكاش" : "الشبكة"}) لليوم تلقائياً.`
                  : `سيتم استرجاع الأصناف المحددة بقيمة (${calculatedRefundAmount.toFixed(2)} ﷼) وخصمها من مبيعات (${refundMethod === "cash" ? "الكاش" : "الشبكة"}) لليوم.`
                : isAllSelected
                  ? `Order will be fully cancelled and (${calculatedRefundAmount.toFixed(2)} SAR) deducted from today's (${refundMethod === "cash" ? "Cash" : "Card"}) sales.`
                  : `Selected items will be refunded for (${calculatedRefundAmount.toFixed(2)} SAR) and deducted from today's (${refundMethod === "cash" ? "Cash" : "Card"}) sales.`}
            </span>
          </div>
        </form>

        {/* Fixed Sticky Footer Actions */}
        <div className="refund-modal-footer">
          <button
            type="button"
            className="refund-btn-cancel"
            onClick={handleClose}
            disabled={loading}
          >
            {isArabic ? "تراجع" : "Cancel"}
          </button>
          <button
            type="submit"
            form="refund-order-form"
            className="refund-btn-confirm"
            disabled={loading || calculatedRefundAmount <= 0}
          >
            {loading
              ? (isArabic ? "جاري معالجة الاسترجاع..." : "Processing Refund...")
              : (isArabic ? `تأكيد الاسترجاع (${calculatedRefundAmount.toFixed(2)} ﷼)` : `Confirm Refund (${calculatedRefundAmount.toFixed(2)} SAR)`)}
          </button>
        </div>
      </div>
    </div>
  );
}
