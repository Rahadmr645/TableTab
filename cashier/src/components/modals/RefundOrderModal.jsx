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

  // Helper date generator (YYYY-MM-DD)
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const orderItems = useMemo(() => {
    return activeRefundOrder?.items || [];
  }, [activeRefundOrder]);

  const orderTotal = Number(activeRefundOrder?.totalPrice) || 0;
  const currentRefundedAmount = Number(activeRefundOrder?.refundedAmount) || 0;
  const remainingOrderValue = Math.max(0, orderTotal - currentRefundedAmount);
  const origPaymentMethod = (activeRefundOrder?.paymentMethod || "").toLowerCase();

  // Closed day detection
  const orderBusinessDay = activeRefundOrder?.businessDay || (activeRefundOrder?.createdAt ? new Date(activeRefundOrder.createdAt).toISOString().slice(0, 10) : "");
  const todayDay = getTodayString();
  const isDayClosed = Boolean(orderBusinessDay && orderBusinessDay !== todayDay);

  // Initialize or reset modal state when activeRefundOrder changes
  useEffect(() => {
    if (activeRefundOrder) {
      const origMethod = (activeRefundOrder.paymentMethod || "").toLowerCase();
      setRefundMethod(origMethod === "card" ? "card" : "cash");
      setReason("");
      setSelectedReasonTag(isArabic ? "طلب العميل" : "Customer Request");
      setErrorMsg("");
      setRefundScope("all");

      // Default remaining items to their max remaining quantity (excluding already refunded ones)
      const initMap = {};
      (activeRefundOrder.items || []).forEach((it, idx) => {
        const origQty = Math.max(1, Number(it.quantity) || 1);
        const alreadyRefundedQty = Number(it.refundedQuantity) || 0;
        const remainingRefundable = Math.max(0, origQty - alreadyRefundedQty);
        initMap[idx] = remainingRefundable;
      });
      setItemQuantities(initMap);
    }
  }, [activeRefundOrder, isArabic]);

  // Handle quantity adjustments (cannot exceed remaining refundable quantity)
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
      const origQty = Math.max(1, Number(it.quantity) || 1);
      const alreadyRefundedQty = Number(it.refundedQuantity) || 0;
      allMap[idx] = Math.max(0, origQty - alreadyRefundedQty);
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
  const { calculatedRefundAmount, selectedItemsCount, isAllSelected, refundItemsPayload, totalRemainingItemsCount } = useMemo(() => {
    if (!activeRefundOrder || orderItems.length === 0) {
      return {
        calculatedRefundAmount: remainingOrderValue,
        selectedItemsCount: 0,
        isAllSelected: true,
        refundItemsPayload: [],
        totalRemainingItemsCount: 0
      };
    }

    let totalRemainingQty = 0;
    orderItems.forEach((it) => {
      const origQ = Math.max(1, Number(it.quantity) || 1);
      const alreadyRefQ = Number(it.refundedQuantity) || 0;
      totalRemainingQty += Math.max(0, origQ - alreadyRefQ);
    });

    if (refundScope === "all") {
      const payload = orderItems
        .map((it) => {
          const origQ = Math.max(1, Number(it.quantity) || 1);
          const alreadyRefQ = Number(it.refundedQuantity) || 0;
          const remQ = Math.max(0, origQ - alreadyRefQ);
          return {
            itemId: it._id,
            menuItemId: it.menuItemId,
            name: it.name || it.nameAr || it.nameEn || "Item",
            quantity: remQ,
            price: Number(it.price) || 0
          };
        })
        .filter((it) => it.quantity > 0);

      return {
        calculatedRefundAmount: remainingOrderValue,
        selectedItemsCount: totalRemainingQty,
        isAllSelected: true,
        refundItemsPayload: payload,
        totalRemainingItemsCount: totalRemainingQty
      };
    }

    let itemsGross = 0;
    let selectedGross = 0;
    let count = 0;
    let allFull = true;
    const payload = [];

    orderItems.forEach((it, idx) => {
      const origQ = Math.max(1, Number(it.quantity) || 1);
      const alreadyRefQ = Number(it.refundedQuantity) || 0;
      const maxQ = Math.max(0, origQ - alreadyRefQ);
      const selQ = itemQuantities[idx] !== undefined ? Math.min(itemQuantities[idx], maxQ) : maxQ;
      const unitPrice = Number(it.price) || 0;

      itemsGross += unitPrice * maxQ;
      selectedGross += unitPrice * selQ;

      if (selQ > 0) {
        count += selQ;
        payload.push({
          itemId: it._id,
          menuItemId: it.menuItemId,
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
        refundItemsPayload: payload,
        totalRemainingItemsCount: totalRemainingQty
      };
    }

    // Proportional discount factor if applicable
    const discountRatio = itemsGross > 0 ? remainingOrderValue / itemsGross : 1;
    const calculated = Math.min(remainingOrderValue, Math.round(selectedGross * discountRatio * 100) / 100);

    return {
      calculatedRefundAmount: calculated,
      selectedItemsCount: count,
      isAllSelected: allFull,
      refundItemsPayload: payload,
      totalRemainingItemsCount: totalRemainingQty
    };
  }, [refundScope, itemQuantities, orderItems, activeRefundOrder, remainingOrderValue]);

  if (!showRefundModal || !activeRefundOrder) return null;

  const reasonOptions = isArabic
    ? ["طلب العميل", "خطأ في الطلب", "جودة الوجبة", "تأخير في التحضير", "أخرى"]
    : ["Customer Request", "Order Mistake", "Food Quality", "Preparation Delay", "Other"];

  const handleSubmit = async (e) => {
    e?.preventDefault?.();

    if (isDayClosed) {
      setErrorMsg(
        isArabic
          ? `لا يمكن استرجاع هذا الطلب لأنه يتبع ليوم عمل مغلق (${orderBusinessDay}).`
          : `Cannot refund this order because it belongs to a closed business day (${orderBusinessDay}).`
      );
      return;
    }

    if (calculatedRefundAmount <= 0 || refundItemsPayload.length === 0) {
      setErrorMsg(
        isArabic
          ? "يرجى تحديد عنصر واحد على الأقل متبقي للاسترجاع"
          : "Please select at least one available item to refund"
      );
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
        setErrorMsg(
          isArabic
            ? "تعذر إتمام عملية الاسترجاع، يرجى المحاولة ثانية"
            : "Failed to process refund, please try again"
        );
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

  const isFullyRefundedOrder = remainingOrderValue <= 0 || totalRemainingItemsCount === 0;

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
          {/* Day Closed Warning Banner */}
          {isDayClosed && (
            <div className="refund-closed-day-banner">
              <span className="closed-icon">🔒</span>
              <div className="closed-text">
                <strong>{isArabic ? "يوم العمل مغلق" : "Business Day Closed"}</strong>
                <p>
                  {isArabic
                    ? `هذا الطلب مسجل بتاريخ (${orderBusinessDay}). لا يمكن استرجاع أو تعديل مبالغ من أيام عمل سابقة ومغلقة.`
                    : `This order is registered under closed business day (${orderBusinessDay}). Refunds and cancellations are not permitted for past business days.`}
                </p>
              </div>
            </div>
          )}

          {/* Already Fully Refunded Banner */}
          {isFullyRefundedOrder && !isDayClosed && (
            <div className="refund-fully-done-banner">
              <span>✅ {isArabic ? "تم استرجاع كامل عناصر ومبالغ هذا الطلب مسبقاً." : "This order has already been 100% refunded."}</span>
            </div>
          )}

          {/* Order Summary Info Box */}
          <div className="refund-summary-box">
            <div className="refund-summary-row">
              <span className="summary-label">{isArabic ? "مبلغ الفاتورة الأصلي:" : "Original Order Total:"}</span>
              <span className="summary-val-original">{orderTotal.toFixed(2)} ﷼</span>
            </div>

            {currentRefundedAmount > 0 && (
              <div className="refund-summary-row sub-meta">
                <span className="summary-label">{isArabic ? "المبلغ المسترجع سابقاً:" : "Previously Refunded:"}</span>
                <span className="summary-val-refunded" style={{ color: "#ef4444", fontWeight: "700" }}>
                  -{currentRefundedAmount.toFixed(2)} ﷼
                </span>
              </div>
            )}
            
            <div className="refund-summary-row sub-meta">
              <span className="summary-label">{isArabic ? "مبلغ الاسترجاع للعملية الحالية:" : "Current Refund Amount:"}</span>
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
                disabled={isFullyRefundedOrder || isDayClosed}
                onClick={() => {
                  setRefundScope("all");
                  handleSelectAllItems();
                }}
              >
                <span>📦 {isArabic ? "استرجاع المتبقي بالكامل" : "Refund All Remaining"}</span>
                <span className="scope-subtext">
                  {isArabic ? `استرجاع كل الأصناف المتبقية (${remainingOrderValue.toFixed(2)} ﷼)` : `All remaining items (${remainingOrderValue.toFixed(2)} SAR)`}
                </span>
              </button>

              <button
                type="button"
                className={`scope-toggle-btn ${refundScope === "partial" ? "active" : ""}`}
                disabled={isFullyRefundedOrder || isDayClosed}
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
                    <button type="button" onClick={handleSelectAllItems} disabled={isFullyRefundedOrder || isDayClosed}>
                      {isArabic ? "تحديد الكل" : "Select All"}
                    </button>
                    <span>•</span>
                    <button type="button" onClick={handleDeselectAllItems} disabled={isFullyRefundedOrder || isDayClosed}>
                      {isArabic ? "إلغاء التحديد" : "Deselect All"}
                    </button>
                  </div>
                </div>

                <div className="refund-items-list">
                  {orderItems.map((item, idx) => {
                    const itemName = isArabic ? (item.nameAr || item.name || item.nameEn) : (item.nameEn || item.name || item.nameAr);
                    const unitPrice = Number(item.price) || 0;
                    const origQty = Math.max(1, Number(item.quantity) || 1);
                    const alreadyRefundedQty = Number(item.refundedQuantity) || 0;
                    const maxRefundableQty = Math.max(0, origQty - alreadyRefundedQty);
                    const isFullyRefundedItem = maxRefundableQty === 0;

                    const selQty = itemQuantities[idx] !== undefined ? Math.min(itemQuantities[idx], maxRefundableQty) : maxRefundableQty;
                    const itemTotal = unitPrice * selQty;
                    const isSelected = selQty > 0;

                    return (
                      <div
                        key={idx}
                        className={`refund-item-card ${isFullyRefundedItem ? "fully-refunded disabled" : isSelected ? "selected" : "unselected"}`}
                      >
                        <div className="refund-item-info">
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            <span className="refund-item-name" style={{ textDecoration: isFullyRefundedItem ? "line-through" : "none" }}>
                              {itemName}
                            </span>
                            {isFullyRefundedItem ? (
                              <span className="item-badge-refunded">
                                {isArabic ? "تم الاسترجاع بالكامل" : "Refunded"}
                              </span>
                            ) : alreadyRefundedQty > 0 ? (
                              <span className="item-badge-partial">
                                {isArabic ? `مسترجع سابقاً: ${alreadyRefundedQty}` : `Prev Refunded: ${alreadyRefundedQty}`}
                              </span>
                            ) : null}
                          </div>
                          <span className="refund-item-meta">
                            {unitPrice.toFixed(2)} ﷼ {isArabic ? "للقطعة" : "each"} • {isArabic ? `الكمية الأصلية: ${origQty}` : `Orig: ${origQty}`}
                            {!isFullyRefundedItem && alreadyRefundedQty > 0 ? ` • ${isArabic ? `المتاح للاسترجاع: ${maxRefundableQty}` : `Available: ${maxRefundableQty}`}` : ""}
                          </span>
                        </div>

                        <div className="refund-item-stepper-wrapper">
                          <div className={`refund-stepper ${isFullyRefundedItem ? "disabled" : ""}`}>
                            <button
                              type="button"
                              className="stepper-btn minus"
                              disabled={isFullyRefundedItem || selQty <= 0 || isDayClosed}
                              onClick={() => handleQtyChange(idx, selQty - 1, maxRefundableQty)}
                            >
                              −
                            </button>
                            <span className="stepper-count">{isFullyRefundedItem ? 0 : selQty}</span>
                            <button
                              type="button"
                              className="stepper-btn plus"
                              disabled={isFullyRefundedItem || selQty >= maxRefundableQty || isDayClosed}
                              onClick={() => handleQtyChange(idx, selQty + 1, maxRefundableQty)}
                            >
                              +
                            </button>
                          </div>
                          <span className="refund-item-subtotal" style={{ textDecoration: isFullyRefundedItem ? "line-through" : "none" }}>
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
              {isArabic ? "2. طريقة استرجاع وإرجاع المبلغ للعميل:" : "2. Select Refund Method:"}
            </label>
            <div className="refund-methods-grid">
              {/* Cash Refund Option */}
              <div
                className={`refund-method-card ${refundMethod === "cash" ? "selected" : ""} ${isDayClosed || isFullyRefundedOrder ? "disabled" : ""}`}
                onClick={() => !isDayClosed && !isFullyRefundedOrder && setRefundMethod("cash")}
                role="button"
                tabIndex={0}
              >
                <div className="method-icon-title">
                  <span className="method-icon">💵</span>
                  <span className="method-title">{isArabic ? "استرجاع نقدي (كاش)" : "Cash Refund"}</span>
                </div>
                <p className="method-desc">
                  {isArabic
                    ? "يتم إرجاع المبلغ نقداً للعميل وخصمه فوراً من مبيعات الكاش / الصندوق في تقرير اليوم"
                    : "Return cash to customer and deduct directly from Cash Drawer sales in daily report"}
                </p>
                {refundMethod === "cash" && <span className="method-check-tag">✓ {isArabic ? "محدد" : "Selected"}</span>}
              </div>

              {/* Card Refund Option */}
              <div
                className={`refund-method-card ${refundMethod === "card" ? "selected" : ""} ${isDayClosed || isFullyRefundedOrder ? "disabled" : ""}`}
                onClick={() => !isDayClosed && !isFullyRefundedOrder && setRefundMethod("card")}
                role="button"
                tabIndex={0}
              >
                <div className="method-icon-title">
                  <span className="method-icon">💳</span>
                  <span className="method-title">{isArabic ? "استرجاع شبكة / بطاقة" : "Card / POS Refund"}</span>
                </div>
                <p className="method-desc">
                  {isArabic
                    ? "يتم إرجاع المبلغ لبطاقة العميل وخصمه من مبيعات الشبكة / نقاط البيع في تقرير اليوم"
                    : "Refund to customer card/account and deduct from Card / POS sales in daily report"}
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
                  disabled={isDayClosed || isFullyRefundedOrder}
                  onClick={() => setSelectedReasonTag(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
            <input
              type="text"
              className="refund-reason-input"
              disabled={isDayClosed || isFullyRefundedOrder}
              placeholder={isArabic ? "ملاحظات إضافية حول سبب الاسترجاع (اختياري)..." : "Additional refund notes (optional)..."}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {/* Dynamic Notice Alert */}
          {!isDayClosed && !isFullyRefundedOrder && (
            <div className="refund-notice-card">
              <span>
                ℹ️ {isArabic
                  ? isAllSelected
                    ? `سيتم استرجاع المتبقي بالكامل وإرجاع مبلغ (${calculatedRefundAmount.toFixed(2)} ﷼) للعميل وخصمه من مبيعات (${refundMethod === "cash" ? "الكاش" : "الشبكة"}) لليوم تلقائياً.`
                    : `سيتم استرجاع الأصناف المحددة وإرجاع مبلغ (${calculatedRefundAmount.toFixed(2)} ﷼) للعميل وخصمه من مبيعات (${refundMethod === "cash" ? "الكاش" : "الشبكة"}) لليوم.`
                  : isAllSelected
                    ? `Remaining items will be fully refunded and (${calculatedRefundAmount.toFixed(2)} SAR) returned to customer and deducted from today's (${refundMethod === "cash" ? "Cash" : "Card"}) sales.`
                    : `Selected items will be refunded and (${calculatedRefundAmount.toFixed(2)} SAR) returned to customer and deducted from today's (${refundMethod === "cash" ? "Cash" : "Card"}) sales.`}
              </span>
            </div>
          )}
        </form>

        {/* Fixed Sticky Footer Actions */}
        <div className="refund-modal-footer">
          <button
            type="button"
            className="refund-btn-cancel"
            onClick={handleClose}
            disabled={loading}
          >
            {isArabic ? "إغلاق" : "Close"}
          </button>
          <button
            type="submit"
            form="refund-order-form"
            className="refund-btn-confirm"
            disabled={loading || isDayClosed || isFullyRefundedOrder || calculatedRefundAmount <= 0}
          >
            {loading
              ? (isArabic ? "جاري معالجة الاسترجاع..." : "Processing Refund...")
              : isDayClosed
              ? (isArabic ? "اليوم مغلق - الاسترجاع غير متاح" : "Day Closed - Refund Disabled")
              : isFullyRefundedOrder
              ? (isArabic ? "الطلب مسترجع بالكامل" : "Order Fully Refunded")
              : (isArabic ? `تأكيد إرجاع (${calculatedRefundAmount.toFixed(2)} ﷼)` : `Confirm Refund (${calculatedRefundAmount.toFixed(2)} SAR)`)}
          </button>
        </div>
      </div>
    </div>
  );
}
