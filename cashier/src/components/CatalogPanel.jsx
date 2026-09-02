import React, { useState, useRef } from "react";
import { useCashier } from "../context/CashierContext.jsx";

export default function CatalogPanel() {
  const {
    categories,
    selectedCategory,
    searchQuery,
    activeTab,
    placedOrders,
    occupiedTables,
    selectedTable,
    tables,
    cart,
    lang,
    t,
    filteredProducts,
    setSelectedCategory,
    setSearchQuery,
    setActiveTab,
    handleAddToCart,
    handleClearCart,
    orderDiscount,
    discountType,
    setShowDiscountModal,
    isPaymentProcessing,
    setLang,
    setShowPrintModal,
    setSelectedTable,
    setShowCatModal,
    setShowProdModal,
    handleDeleteCategory,
    handleDeleteProduct,
    setShowMoreModal,
    handleUpdateOrderStatus,
    setMobileView,
    grandTotal,
    activeEditingOrderId,
    handleOpenOrder,
    handlePayOrderDirect,
    handleNewOrder,
    handleSendToKitchen,
    currentTenant,
    currentUser,
    isManagerOrOwner,
    socketConnected,
    setShowAuthModal,
    handleLockScreen,
    setShowLockPinModal,
    handlePrintReceipt,
    autoPrintEnabled,
    toggleAutoPrint,
    setShowPrinterModal,
    printerConfig,
    handleOpenRefundModal
  } = useCashier();

  const [activeHoldId, setActiveHoldId] = useState(null);
  const [orderFilter, setOrderFilter] = useState("uncompleted");
  const timerRef = useRef(null);
  const isLongPressRef = useRef(false);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const isScrollingRef = useRef(false);

  const handlePressStart = (e, id) => {
    isLongPressRef.current = false;
    isScrollingRef.current = false;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    touchStartRef.current = { x: clientX, y: clientY };

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!isScrollingRef.current) {
        isLongPressRef.current = true;
        setActiveHoldId(prev => prev === id ? null : id);
      }
    }, 1500); // 1.5 seconds hold
  };

  const handlePressMove = (e) => {
    if (isScrollingRef.current) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const diffX = Math.abs(clientX - touchStartRef.current.x);
    const diffY = Math.abs(clientY - touchStartRef.current.y);

    if (diffX > 10 || diffY > 10) {
      isScrollingRef.current = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handlePressEnd = (e, action) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (isScrollingRef.current) {
      return;
    }
    if (e && e.type && e.type.startsWith("touch")) {
      e.preventDefault();
    }
    if (!isLongPressRef.current) {
      action();
    }
  };

  const handlePressCancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };


  return (
    <div className="catalog-panel">
      {/* Multi-Tenant Restaurant Brand & Status Header */}
      <div className="pos-brand-header-bar">
        <div
          onClick={() => setShowAuthModal(true)}
          style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
        >
          <span style={{ fontSize: "16px" }}>🏢</span>
          <span style={{ fontWeight: "700", color: "var(--text-primary, #ffffff)" }}>
            {currentTenant?.businessName || (lang === "ar" ? "اختر المتجر / تسجيل الدخول" : "Select Venue / Login")}
          </span>
          {currentTenant?.slug && (
            <span style={{
              fontSize: "11px",
              padding: "1px 6px",
              borderRadius: "6px",
              background: "rgba(59, 130, 246, 0.2)",
              color: "#60a5fa"
            }}>
              @{currentTenant.slug}
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            onClick={() => setShowAuthModal(true)}
            style={{
              fontSize: "11px",
              padding: "3px 8px",
              borderRadius: "10px",
              background: socketConnected ? "rgba(34, 197, 94, 0.15)" : "rgba(234, 179, 8, 0.15)",
              color: socketConnected ? "#22c55e" : "#eab308",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            ● {socketConnected ? (lang === "ar" ? "متصل مباشر" : "Live Socket") : (lang === "ar" ? "جاري الاتصال" : "Offline")}
          </span>

          <button
            type="button"
            onClick={() => setShowAuthModal(true)}
            style={{
              border: "1px solid rgba(255, 255, 255, 0.25)",
              background: "#1e293b",
              color: "#ffffff",
              padding: "5px 12px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            👤 <span style={{ color: "#ffffff", fontWeight: "700" }}>{currentUser ? (currentUser.username || currentUser.email) : (lang === "ar" ? "دخول الكاشير" : "Staff Login")}</span>
          </button>
        </div>
      </div>

      {/* Top action row */}
      {activeTab !== "payment" && (
        <div className="action-row">
          <button className="action-btn" onClick={() => { if (cart.length) setShowPrintModal(true); }}>
            <span className="action-btn-icon">🖨️</span>
            <span className="action-btn-label">{t.print}</span>
          </button>
          <button className="action-btn" onClick={handleSendToKitchen} title={lang === "ar" ? "إرسال الطلب للمطبخ (طلب مفتوح)" : "Send to kitchen (Open Order)"}>
            <span className="action-btn-icon">👨‍🍳</span>
            <span className="action-btn-label">{t.kitchen}</span>
          </button>
          <button className="action-btn" onClick={() => handleClearCart(true)}>
            <span className="action-btn-icon">🚫</span>
            <span className="action-btn-label">{t.disable}</span>
          </button>
          <button className="action-btn">
            <span className="action-btn-icon">🕒</span>
            <span className="action-btn-label">{t.activity}</span>
          </button>
          <button
            className={`action-btn ${orderDiscount > 0 ? "active-discount" : ""}`}
            onClick={() => setShowDiscountModal(true)}
            style={orderDiscount > 0 ? { border: "1px solid #4ade80", background: "rgba(74, 222, 128, 0.15)", color: "#4ade80" } : {}}
            title={orderDiscount > 0 ? (lang === "ar" ? "خصم مفعل على الطلب" : "Active Discount") : (lang === "ar" ? "تطبيق خصم" : "Apply Discount")}
          >
            <span className="action-btn-icon">🏷️</span>
            <span className="action-btn-label">
              {t.discount} {orderDiscount > 0 ? `(${discountType === "fixed" ? orderDiscount + " ﷼" : orderDiscount + "%"})` : ""}
            </span>
          </button>
          <button className="action-btn" onClick={() => setShowMoreModal(true)}>
            <span className="action-btn-icon">⋯</span>
            <span className="action-btn-label">{t.more}</span>
          </button>
        </div>
      )}

      {/* Product Search Bar */}
      {activeTab !== "payment" && (
        <div className="search-wrapper">
          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button className="search-clear-btn" onClick={() => setSearchQuery("")}>✕</button>
            )}
          </div>
        </div>
      )}

      {/* Back navigation trace if category selected */}
      {activeTab !== "payment" && selectedCategory && (
        <div className="breadcrumb-row">
          <button className="back-btn" onClick={() => setSelectedCategory(null)}>
            ← {t.back}
          </button>
          <span className="breadcrumb-label">
            {lang === "ar" ? selectedCategory.nameAr : selectedCategory.nameEn}
          </span>
        </div>
      )}

      {/* Main Grid View */}
      <div className="grid-container">
        {activeTab === "home" && (
          <div className="catalog-grid">
            {/* If no category is selected, render categories */}
            {!selectedCategory ? (
              <>
                {categories.length === 0 && (
                  <div style={{
                    gridColumn: "1 / -1",
                    textAlign: "center",
                    padding: "36px 16px",
                    color: "var(--text-secondary, #94a3b8)",
                    background: "rgba(255, 255, 255, 0.02)",
                    borderRadius: "12px",
                    border: "1px dashed var(--border-color, #333d4e)",
                    marginBottom: "10px"
                  }}>
                    <div style={{ fontSize: "36px", marginBottom: "8px" }}>📂</div>
                    <div style={{ fontWeight: "700", fontSize: "16px", color: "var(--text-primary, #ffffff)" }}>
                      {lang === "ar" ? "لا توجد تصنيفات في هذا المتجر" : "No categories in this venue"}
                    </div>
                    <div style={{ fontSize: "13px", marginTop: "4px" }}>
                      {lang === "ar" ? "اضغط على زر (إضافة تصنيف) لإنشاء أول تصنيف على الخادم" : "Click (+ Add Category) to add a category directly to server"}
                    </div>
                  </div>
                )}

                {categories.map((cat, idx) => (
                  <div
                    className={`grid-item category-item ${activeHoldId === cat.id ? "editing" : ""}`}
                    key={cat.id || idx}
                    onMouseDown={(e) => handlePressStart(e, cat.id)}
                    onMouseMove={handlePressMove}
                    onMouseUp={(e) => handlePressEnd(e, () => { setSelectedCategory(cat); setActiveHoldId(null); })}
                    onMouseLeave={handlePressCancel}
                    onTouchStart={(e) => handlePressStart(e, cat.id)}
                    onTouchMove={handlePressMove}
                    onTouchEnd={(e) => handlePressEnd(e, () => { setSelectedCategory(cat); setActiveHoldId(null); })}
                    onTouchCancel={handlePressCancel}
                  >
                    <div className="grid-item-icon">❄️</div>
                    <div className="grid-item-title">
                      <span className="grid-item-title-ar">{cat.nameAr || cat.nameEn}</span>
                      {cat.nameEn && cat.nameEn !== cat.nameAr && (
                        <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>{cat.nameEn}</span>
                      )}
                    </div>
                    {isManagerOrOwner && (
                      <div className="grid-item-actions">
                        <button className="grid-action-btn edit" onClick={(e) => { e.stopPropagation(); setShowCatModal(cat); setActiveHoldId(null); }}>✏️</button>
                        <button className="grid-action-btn delete" onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); setActiveHoldId(null); }}>🗑️</button>
                      </div>
                    )}
                  </div>
                ))}
                {isManagerOrOwner && (
                  <div className="grid-item add-grid-item" onClick={() => setShowCatModal(true)}>
                    <div className="add-grid-item-icon">+</div>
                    <div className="add-grid-item-label">{lang === "ar" ? "إضافة تصنيف" : "Add Category"}</div>
                  </div>
                )}
              </>
            ) : (
              // Else, render products of that category
              <>
                {filteredProducts.length === 0 && (
                  <div style={{
                    gridColumn: "1 / -1",
                    textAlign: "center",
                    padding: "36px 16px",
                    color: "var(--text-secondary, #94a3b8)",
                    background: "rgba(255, 255, 255, 0.02)",
                    borderRadius: "12px",
                    border: "1px dashed var(--border-color, #333d4e)",
                    marginBottom: "10px"
                  }}>
                    <div style={{ fontSize: "36px", marginBottom: "8px" }}>🍽️</div>
                    <div style={{ fontWeight: "700", fontSize: "16px", color: "var(--text-primary, #ffffff)" }}>
                      {lang === "ar" ? "لا توجد أطباق في هذا التصنيف" : "No dishes in this category"}
                    </div>
                    <div style={{ fontSize: "13px", marginTop: "4px" }}>
                      {lang === "ar" ? "اضغط على زر (إضافة منتج) لإنشاء طبق جديد على الخادم" : "Click (+ Add Product) to create a dish on the server"}
                    </div>
                  </div>
                )}

                {filteredProducts.map((prod, idx) => (
                  <div
                    className={`grid-item product-item ${activeHoldId === prod.id ? "editing" : ""}`}
                    key={prod.id || idx}
                    onMouseDown={(e) => handlePressStart(e, prod.id)}
                    onMouseMove={handlePressMove}
                    onMouseUp={(e) => handlePressEnd(e, () => { handleAddToCart(prod); setActiveHoldId(null); })}
                    onMouseLeave={handlePressCancel}
                    onTouchStart={(e) => handlePressStart(e, prod.id)}
                    onTouchMove={handlePressMove}
                    onTouchEnd={(e) => handlePressEnd(e, () => { handleAddToCart(prod); setActiveHoldId(null); })}
                    onTouchCancel={handlePressCancel}
                  >
                    {prod.image ? (
                      <img
                        src={prod.image}
                        alt={prod.nameEn || prod.nameAr}
                        style={{ width: "36px", height: "36px", objectFit: "cover", borderRadius: "8px", marginBottom: "4px" }}
                      />
                    ) : (
                      <div className="grid-item-icon" style={{ fontSize: "18px" }}>☕</div>
                    )}
                    <div className="grid-item-title">
                      <span className="grid-item-title-ar">{prod.nameAr || prod.nameEn}</span>
                      {prod.nameEn && prod.nameEn !== prod.nameAr && (
                        <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>{prod.nameEn}</span>
                      )}
                    </div>
                    <div className="grid-item-price">
                      {Number(prod.price || 0).toFixed(2)} ﷼
                    </div>
                    {isManagerOrOwner && (
                      <div className="grid-item-actions">
                        <button className="grid-action-btn edit" onClick={(e) => { e.stopPropagation(); setShowProdModal(prod); setActiveHoldId(null); }}>✏️</button>
                        <button className="grid-action-btn delete" onClick={(e) => { e.stopPropagation(); handleDeleteProduct(prod.id); setActiveHoldId(null); }}>🗑️</button>
                      </div>
                    )}
                  </div>
                ))}
                {isManagerOrOwner && (
                  <div className="grid-item add-grid-item" onClick={() => setShowProdModal(true)}>
                    <div className="add-grid-item-icon">+</div>
                    <div className="add-grid-item-label">{lang === "ar" ? "إضافة منتج" : "Add Product"}</div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "orders" && (() => {
          const getStatusAr = (status) => {
            switch (status) {
              case "In Progress": return "قيد التحضير";
              case "Ready": return "جاهز";
              case "Finished": case "Finised": return "مكتمل";
              case "Cancelled": return "ملغي";
              default: return "نشط";
            }
          };

          const getStatusEn = (status) => {
            switch (status) {
              case "In Progress": return "IN PROGRESS";
              case "Ready": return "READY";
              case "Finished": case "Finised": return "COMPLETED";
              case "Cancelled": return "CANCELLED";
              default: return "PENDING";
            }
          };

          const isOrderUncompleted = (ord) => {
            const s = String(ord.status || "pending").toLowerCase().replace(/\s+/g, "");
            return s !== "finished" && s !== "finised" && s !== "cancelled";
          };

          const filteredOrders = placedOrders.filter(ord => {
            if (orderFilter === "uncompleted") {
              return isOrderUncompleted(ord);
            }
            return true;
          });

          return (
            <div className="orders-list-view">
              <div className="orders-filter-bar">
                <button
                  className={`orders-filter-btn ${orderFilter === "uncompleted" ? "active" : ""}`}
                  onClick={() => setOrderFilter("uncompleted")}
                >
                  {t.uncompletedOrders}
                </button>
                <button
                  className={`orders-filter-btn ${orderFilter === "all" ? "active" : ""}`}
                  onClick={() => setOrderFilter("all")}
                >
                  {t.allOrders}
                </button>
              </div>

              {filteredOrders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
                  {lang === "ar" ? "لا توجد طلبات لعرضها" : "No orders found"}
                </div>
              ) : (
                filteredOrders.map((ord, idx) => {
                  const isRefunded = ord.paymentStatus === "refunded" || (Number(ord.refundedAmount) > 0 && ord.status === "Cancelled");
                  const isPartialRefund = !isRefunded && Number(ord.refundedAmount) > 0;
                  const isPaid = ord.paymentStatus === "paid" || String(ord.status || "").toLowerCase() === "finished" || String(ord.status || "").toLowerCase() === "finised";
                  const isCancelled = String(ord.status || "").toLowerCase() === "cancelled";
                  const refMethod = (ord.refundMethod || ord.paymentMethod || "cash").toUpperCase();

                  return (
                    <div
                      className={`pos-order-card ${activeEditingOrderId === ord._id ? "active-editing-card" : ""} ${isRefunded ? "pos-order-refunded-card" : ""}`}
                      key={ord._id || idx}
                      onClick={() => handleOpenOrder(ord)}
                      title={lang === "ar" ? "انقر لفتح الطلب في الكاشير" : "Click to open order in register"}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="pos-order-info">
                        <div className="pos-order-title">
                          #{ord.dailyOrderNumber} - {ord.customerName}
                          {activeEditingOrderId === ord._id && (
                            <span className="editing-tag-badge">
                              {lang === "ar" ? "قيد التعديل" : "Editing"}
                            </span>
                          )}
                        </div>
                        <div className="pos-order-meta">
                          {t.table} {ord.tableId} · {ord.items.length} {lang === "ar" ? "أصناف" : "items"} · {new Date(ord.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="pos-order-actions" onClick={(e) => e.stopPropagation()}>
                        {/* Status Badge */}
                        {isRefunded ? (
                          <span className="status-badge refunded" style={{ margin: "0 4px" }}>
                            ↩️ {lang === "ar" ? `مسترجع (${refMethod === "CASH" ? "كاش" : "شبكة"})` : `REFUNDED (${refMethod})`}
                          </span>
                        ) : isCancelled ? (
                          <span className="status-badge cancelled" style={{ margin: "0 4px" }}>
                            {lang === "ar" ? "ملغي" : "CANCELLED"}
                          </span>
                        ) : isPartialRefund ? (
                          <span className="status-badge partial-refund" style={{ margin: "0 4px" }}>
                            ↩️ {lang === "ar" ? "مسترجع جزئياً" : "PARTIAL REFUND"}
                          </span>
                        ) : (
                          <span className={`status-badge ${String(ord.status || "pending").toLowerCase().replace(/\s+/g, "")}`} style={{ margin: "0 4px" }}>
                            {lang === "ar" ? getStatusAr(ord.status) : getStatusEn(ord.status)}
                          </span>
                        )}

                        {/* Payment Pill Tag */}
                        {isRefunded ? (
                          <span className="payment-pill-tag refunded" style={{ margin: "0 4px" }}>
                            {lang === "ar" ? "مسترجع" : "REFUNDED"}
                          </span>
                        ) : isPartialRefund ? (
                          <span className="payment-pill-tag partial-refund" style={{ margin: "0 4px" }}>
                            {lang === "ar" ? "مدفوع (استرجاع جزئي)" : "PAID (PARTIAL)"}
                          </span>
                        ) : isPaid ? (
                          <span className="payment-pill-tag paid" style={{ margin: "0 4px" }}>
                            {lang === "ar" ? "مدفوع" : "PAID"}
                          </span>
                        ) : isCancelled ? (
                          <span className="payment-pill-tag cancelled" style={{ margin: "0 4px" }}>
                            {lang === "ar" ? "ملغي" : "CANCELLED"}
                          </span>
                        ) : (
                          <span className="payment-pill-tag unpaid" style={{ margin: "0 4px" }}>
                            {lang === "ar" ? "غير مدفوع" : "UNPAID"}
                          </span>
                        )}

                        <span style={{ fontWeight: "700", color: isRefunded ? "#ef4444" : "var(--accent)", margin: "0 10px", textDecoration: isRefunded ? "line-through" : "none" }}>
                          {ord.totalPrice.toFixed(2)} ﷼
                        </span>

                        {/* Pay Button: Only for active unpaid orders that are NOT cancelled/refunded */}
                        {!isPaid && !isCancelled && !isRefunded && ord.paymentStatus === "unpaid" && (
                          <button
                            className="item-action-btn pay-btn"
                            onClick={() => handlePayOrderDirect(ord)}
                            style={{
                              margin: "0 4px",
                              backgroundColor: "#10b981",
                              color: "#ffffff",
                              border: "none",
                              fontWeight: "700",
                              padding: "4px 10px",
                              borderRadius: "6px"
                            }}
                            title={lang === "ar" ? "سداد قيمة الطلب فوراً" : "Pay Order Now"}
                          >
                            💳 {lang === "ar" ? "سداد" : "Pay"}
                          </button>
                        )}

                        <button
                          className="item-action-btn open-btn"
                          onClick={() => handleOpenOrder(ord)}
                          style={{ margin: "0 4px", backgroundColor: "#7065db", color: "#ffffff", border: "none" }}
                        >
                          📂 {lang === "ar" ? "فتح الطلب" : "Open"}
                        </button>

                        {isOrderUncompleted(ord) && !isCancelled && !isRefunded && (
                          <button
                            className="item-action-btn complete-btn"
                            onClick={() => handleUpdateOrderStatus(ord._id, "Finished")}
                            style={{ margin: "0 4px" }}
                          >
                            ✔️ {t.complete}
                          </button>
                        )}

                        {/* Refund Button: For paid orders that have NOT yet been fully refunded or cancelled */}
                        {(isPaid || isPartialRefund) && !isRefunded && !isCancelled && (
                          <button
                            className="item-action-btn"
                            onClick={() => handleOpenRefundModal(ord)}
                            style={{
                              margin: "0 4px",
                              backgroundColor: "rgba(239, 68, 68, 0.15)",
                              color: "#ef4444",
                              border: "1px solid rgba(239, 68, 68, 0.35)",
                              fontWeight: "700"
                            }}
                            title={lang === "ar" ? "استرجاع وإلغاء الطلب (كاش أو شبكة)" : "Refund & Cancel Order (Cash or Card)"}
                          >
                            ↩️ {lang === "ar" ? "استرجاع" : "Refund"}
                          </button>
                        )}

                        <button
                          className="item-action-btn"
                          onClick={() => handlePrintReceipt(ord)}
                          style={{ margin: "0 4px" }}
                        >
                          🖨️ {t.print}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          );
        })()}

        {activeTab === "tables" && (() => {
          const isOrderUncompleted = (ord) => {
            const s = String(ord.status || "pending").toLowerCase().replace(/\s+/g, "");
            return s !== "finished" && s !== "finised" && s !== "cancelled";
          };

          const tableList = tables && tables.length > 0
            ? tables.map(tb => ({
              id: tb._id,
              label: tb.label,
              num: Number(tb.label) || tb.label
            }))
            : Array.from({ length: 24 }, (_, i) => ({ id: i + 1, label: (i + 1).toString(), num: i + 1 }));

          return (
            <div className="tables-grid-view">
              {tableList.map(tbItem => {
                const num = tbItem.num;
                const isOccupied = occupiedTables.includes(Number(num)) || occupiedTables.includes(String(num));
                const isSelected = selectedTable === num || selectedTable === Number(num);
                const activeOrderForTable = placedOrders.find(ord => (ord.tableId === num || String(ord.tableId) === String(num)) && isOrderUncompleted(ord));

                return (
                  <div
                    key={tbItem.id || num}
                    className={`table-grid-cell ${isOccupied ? "occupied" : ""} ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      if (activeOrderForTable) {
                        handleOpenOrder(activeOrderForTable);
                      } else {
                        setSelectedTable(num);
                        setActiveTab("home");
                      }
                    }}
                    title={activeOrderForTable ? (lang === "ar" ? `فتح طلب طاولة ${num}` : `Open Order for Table ${num}`) : ""}
                  >
                    <div>{t.table} {tbItem.label || num}</div>
                    {activeOrderForTable && (
                      <div className="table-active-order-tag">
                        #{activeOrderForTable.dailyOrderNumber} ({activeOrderForTable.totalPrice.toFixed(0)} ﷼)
                      </div>
                    )}
                    <div className="table-status-dot"></div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {activeTab === "payment" && (
          <PaymentMethodsView />
        )}
      </div>

      {/* Mobile Cart Summary Bar */}
      {cart.length > 0 && (
        <div className="mobile-cart-summary-bar" onClick={() => setMobileView("cart")}>
          <div className="mobile-cart-summary-left">
            <span className="cart-icon-badge">🛒 {cart.reduce((sum, item) => sum + item.quantity, 0)} {lang === "ar" ? "أصناف" : "items"}</span>
          </div>
          <div className="mobile-cart-summary-right">
            <span>{grandTotal.toFixed(2)} ﷼</span>
            <span className="view-cart-btn-text">
              {lang === "ar" ? " ← عرض الطلب" : "View Order →"}
            </span>
          </div>
        </div>
      )}

      {/* Bottom Nav Menu */}
      {activeTab !== "payment" && (
        <div className="bottom-nav">
          <button className={`nav-item ${activeTab === "home" ? "active" : ""}`} onClick={() => { setActiveTab("home"); setSelectedCategory(null); }}>
            <span className="nav-item-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 3h13a5 5 0 0 1 5 5v2a5 5 0 0 1-5 5H11v6H6V3zm5 5v3h7a1.5 1.5 0 0 0 1.5-1.5v-1A1.5 1.5 0 0 0 18 8h-7z" />
              </svg>
            </span>
            <span>{t.home}</span>
          </button>
          <button className={`nav-item ${activeTab === "orders" ? "active" : ""}`} onClick={() => setActiveTab("orders")}>
            <span className="nav-item-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </span>
            <span>{t.orders}</span>
          </button>
          <button className={`nav-item ${activeTab === "tables" ? "active" : ""}`} onClick={() => setActiveTab("tables")}>
            <span className="nav-item-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </span>
            <span>{t.tables}</span>
          </button>
          <button className="nav-item" onClick={handleNewOrder} title={lang === "ar" ? "طلب جديد" : "New Order"}>
            <span className="nav-item-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </span>
            <span>{t.new}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function PaymentMethodsView() {
  const {
    grandTotal,
    lang,
    t,
    handleSubmitOrder,
    setShowCustModal,
    setShowMoreModal,
    setActiveTab,
    cart,
    activeEditingOrderId,
    placedOrders,
    setShowPrintModal,
    handlePrintReceipt,
    isPaymentProcessing,
    terminalConfig,
    terminalHealth,
    checkTerminalHealth,
    setShowTerminalModal,
    handlePayWithTerminal
  } = useCashier();

  const editingOrder = placedOrders.find(ord => ord._id === activeEditingOrderId);
  const isOrderRefunded = editingOrder && (editingOrder.paymentStatus === "refunded" || (Number(editingOrder.refundedAmount) > 0 && editingOrder.status === "Cancelled"));
  const isOrderPaid = editingOrder && !isOrderRefunded && (editingOrder.paymentStatus === "paid" || editingOrder.status === "Finished" || editingOrder.status === "Finised");
  const isOrderCancelled = editingOrder && editingOrder.status === "Cancelled";

  const [paidCash, setPaidCash] = useState(0);
  const [paidCard, setPaidCard] = useState(0);
  const [activeModal, setActiveModal] = useState(null); // "cash" | "card" | null
  const [modalInput, setModalInput] = useState("");

  if (isOrderRefunded || isOrderCancelled) {
    return (
      <div className="payment-screen-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "350px", textAlign: "center", padding: "24px" }}>
        <div style={{ background: "#ffffff", padding: "32px", borderRadius: "16px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", maxWidth: "420px", width: "100%", border: "1px solid #fecaca" }}>
          <span style={{ fontSize: "48px", display: "block", marginBottom: "12px" }}>↩️</span>
          <h2 style={{ color: "#dc2626", marginBottom: "8px" }}>{lang === "ar" ? "الطلب مسترجع وملغي" : "Order Fully Refunded"}</h2>
          <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>
            {lang === "ar"
              ? `تم استرجاع قيمة هذا الطلب #${editingOrder?.dailyOrderNumber || ""} وإلغاؤه، ولا يمكن سداده ثانية.`
              : `Order #${editingOrder?.dailyOrderNumber || ""} is refunded & closed and cannot be paid again.`}
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button className="payment-purple-btn" onClick={() => handlePrintReceipt(editingOrder)}>
              🖨️ {lang === "ar" ? "طباعة الفاتورة" : "Print Receipt"}
            </button>
            <button className="payment-purple-btn" onClick={() => setActiveTab("home")}>
              ← {lang === "ar" ? "العودة للرئيسية" : "Back to Home"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isOrderPaid) {
    return (
      <div className="payment-screen-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "350px", textAlign: "center", padding: "24px" }}>
        <div style={{ background: "#ffffff", padding: "32px", borderRadius: "16px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", maxWidth: "400px", width: "100%" }}>
          <span style={{ fontSize: "48px", display: "block", marginBottom: "12px" }}>✅</span>
          <h2 style={{ color: "#166534", marginBottom: "8px" }}>{lang === "ar" ? "الطلب مدفوع بالكامل" : "Order Already Paid"}</h2>
          <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>
            {lang === "ar"
              ? `تم سداد قيمة هذا الطلب #${editingOrder?.dailyOrderNumber || ""} مسبقاً.`
              : `Order #${editingOrder?.dailyOrderNumber || ""} is already settled and closed.`}
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button className="payment-purple-btn" onClick={() => handlePrintReceipt(editingOrder)}>
              🖨️ {lang === "ar" ? "طباعة الفاتورة" : "Print Receipt"}
            </button>
            <button className="payment-purple-btn" onClick={() => setActiveTab("home")}>
              ← {lang === "ar" ? "العودة للرئيسية" : "Back to Home"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const remaining = Math.max(0, parseFloat((grandTotal - paidCash - paidCard).toFixed(2)));
  const totalPaid = parseFloat((paidCash + paidCard).toFixed(2));
  const isFullyPaid = (totalPaid >= grandTotal && grandTotal > 0);

  const handleTerminalClick = () => {
    if (terminalHealth === "disconnected" || !terminalConfig?.enabled) {
      setShowTerminalModal(true);
      return;
    }
    const amountToSend = remaining > 0 ? remaining : grandTotal;
    handlePayWithTerminal(amountToSend);
  };

  const openAmountModal = (method) => {
    // Default modal input to the current remaining amount
    const currentMethodVal = method === "cash" ? paidCash : paidCard;
    const initialVal = remaining > 0 ? remaining : (currentMethodVal > 0 ? currentMethodVal : grandTotal);
    setModalInput(initialVal > 0 ? initialVal.toFixed(2) : "");
    setActiveModal(method);
  };

  const handleExactConfirm = () => {
    const amountToApply = remaining > 0 ? remaining : grandTotal;
    if (activeModal === "cash") {
      setPaidCash(prev => parseFloat((prev + amountToApply).toFixed(2)));
    } else if (activeModal === "card") {
      setPaidCard(prev => parseFloat((prev + amountToApply).toFixed(2)));
    }
    setActiveModal(null);
  };

  const handleCustomConfirm = () => {
    const val = parseFloat(modalInput) || 0;
    if (val <= 0) {
      alert(lang === "ar" ? "يرجى إدخال مبلغ صالح أكبر من صفر" : "Please enter a valid amount greater than zero");
      return;
    }
    if (activeModal === "cash") {
      setPaidCash(val);
    } else if (activeModal === "card") {
      setPaidCard(val);
    }
    setActiveModal(null);
  };

  const handleClearMethod = (e, method) => {
    e.stopPropagation();
    if (method === "cash") setPaidCash(0);
    if (method === "card") setPaidCard(0);
  };

  const handlePay = async () => {
    if (!cart.length || isPaymentProcessing || !isFullyPaid || remaining > 0) {
      if (remaining > 0) {
        alert(lang === "ar" ? `يرجى تغطية كامل المبلغ المتبقي (${remaining.toFixed(2)} ﷼) لتفعيل الدفع` : `Please cover the remaining amount (${remaining.toFixed(2)} ﷼) to complete payment`);
      }
      return;
    }

    const finalCash = paidCash;
    const finalCard = paidCard;
    const finalMethod = (finalCash > 0 && finalCard > 0) ? "split" : (finalCard > 0 ? "card" : "cash");
    try {
      await handleSubmitOrder(finalMethod, { cash: finalCash, card: finalCard });
    } catch (err) {
      console.error("Payment execution error:", err);
    }
  };

  return (
    <div className="payment-screen-container">
      {/* Top action row with purple buttons split to left and right */}
      <div className="payment-top-row">
        <div className="payment-top-left">
          <button className="payment-purple-btn" onClick={() => setActiveTab("home")}>
            {lang === "ar" ? "رجوع" : "Back"}
          </button>
        </div>
        <div className="payment-top-right">
          <button className="payment-purple-btn">
            {lang === "ar" ? "العملة" : "Currency"}
          </button>
          <button className="payment-purple-btn" onClick={() => setShowCustModal(true)}>
            {lang === "ar" ? "العميل" : "Customer"}
          </button>
        </div>
      </div>

      {/* Center Wrapper Column */}
      <div className="payment-methods-wrapper">
        {/* Heading */}
        <h2 className="payment-title-heading">
          {t.paymentMethods}
        </h2>

        {/* Payment methods list */}
        <div className="payment-methods-list">
          {/* Terminal Method - Active & Configurable */}
          <div
            className="payment-method-card terminal-card"
            onClick={handleTerminalClick}
            style={{
              cursor: "pointer",
              border: terminalConfig?.enabled ? "1px solid #3b82f6" : "1px solid rgba(255, 255, 255, 0.12)"
            }}
          >
            <span className="payment-method-card-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              💳 {lang === "ar" ? "جهاز مدى / POS Terminal" : "Mada POS Terminal"}
            </span>
            <div
              className="terminal-status-group"
              onClick={(e) => {
                e.stopPropagation();
                setShowTerminalModal(true);
              }}
              title={lang === "ar" ? "إعدادات وفحص الـ IP لجهاز مدى" : "Configure & Test Terminal IP"}
              style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <span
                className="terminal-status-text"
                style={{
                  color: terminalHealth === "connected"
                    ? "#22c55e"
                    : terminalHealth === "demo"
                      ? "#38bdf8"
                      : terminalHealth === "checking"
                        ? "#eab308"
                        : "#ef4444",
                  fontWeight: "800",
                  fontSize: "12px"
                }}
              >
                ● {terminalHealth === "connected"
                  ? (lang === "ar" ? `متصل (${terminalConfig?.ip})` : `Connected (${terminalConfig?.ip})`)
                  : terminalHealth === "demo"
                    ? (lang === "ar" ? "وضع تجريبي (Demo)" : "Demo Mode")
                    : terminalHealth === "checking"
                      ? (lang === "ar" ? "جاري الفحص..." : "Checking...")
                      : (lang === "ar" ? `غير متصل (${terminalConfig?.ip || "انقر للربط"})` : `Disconnected (${terminalConfig?.ip || "Setup"})`)}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  checkTerminalHealth();
                }}
                title={lang === "ar" ? "إعادة فحص الاتصال بالجهاز" : "Re-check connection"}
                style={{
                  background: "rgba(59, 130, 246, 0.15)",
                  color: "#60a5fa",
                  border: "none",
                  borderRadius: "6px",
                  padding: "2px 6px",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                🔄
              </button>
              <span className="terminal-info-circle" style={{ background: "rgba(59, 130, 246, 0.3)", color: "#60a5fa" }}>⚙️</span>
            </div>
          </div>

          {/* Cash Method */}
          <div
            className={`payment-method-card ${paidCash > 0 ? "method-has-payment" : "center-label-card"}`}
            onClick={() => openAmountModal("cash")}
          >
            <span className="payment-method-card-label">
              {t.cash}
            </span>
            {paidCash > 0 && (
              <div className="paid-method-badge cash-badge">
                <span>💵 {paidCash.toFixed(2)} ﷼</span>
                <button
                  className="clear-paid-btn"
                  title={lang === "ar" ? "إلغاء" : "Clear"}
                  onClick={(e) => handleClearMethod(e, "cash")}
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Network / Card Method */}
          <div
            className={`payment-method-card ${paidCard > 0 ? "method-has-payment" : "center-label-card"}`}
            onClick={() => openAmountModal("card")}
          >
            <span className="payment-method-card-label">
              {t.network}
            </span>
            {paidCard > 0 && (
              <div className="paid-method-badge card-badge">
                <span>💳 {paidCard.toFixed(2)} ﷼</span>
                <button
                  className="clear-paid-btn"
                  title={lang === "ar" ? "إلغاء" : "Clear"}
                  onClick={(e) => handleClearMethod(e, "card")}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Area */}
        <div className="payment-bottom-section">
          <div className={`remaining-to-pay-box ${isFullyPaid ? "fully-covered-box" : ""}`}>
            {isFullyPaid ? (
              <span>✓ {lang === "ar" ? "تم تغطية كامل المبلغ" : "Fully Covered"}: {grandTotal.toFixed(2)} ﷼</span>
            ) : (
              <span>{t.remainingToPay} {remaining.toFixed(2)} ﷼</span>
            )}
          </div>
          <div className="payment-action-row">
            <button
              className={`payment-submit-btn ${isFullyPaid && remaining === 0 ? "ready-to-pay active-ready" : "disabled-remaining"}`}
              onClick={handlePay}
              disabled={!cart.length || isPaymentProcessing || !isFullyPaid || remaining > 0}
            >
              {isPaymentProcessing ? (
                <span>⏳ {lang === "ar" ? "جاري الدفع..." : "Processing..."}</span>
              ) : isFullyPaid && remaining === 0 ? (
                lang === "ar" ? `دفع ${grandTotal.toFixed(2)} ﷼` : `Pay ${grandTotal.toFixed(2)} ﷼`
              ) : (
                lang === "ar" ? `دفع (${remaining.toFixed(2)} ﷼ متبقي)` : `Pay (${remaining.toFixed(2)} ﷼ remaining)`
              )}
            </button>
            <button className="payment-more-options-btn" onClick={() => setShowMoreModal(true)}>
              ⋯
            </button>
          </div>
        </div>
      </div>

      {/* Amount Selection Modal for Cash and Card */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content payment-amount-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {activeModal === "cash"
                  ? (lang === "ar" ? "💵 الدفع النقدي (كاش)" : "💵 Cash Payment")
                  : (lang === "ar" ? "💳 الدفع بالشبكة / البطاقة" : "💳 Network / Card Payment")}
              </h3>
              <button
                style={{ border: "none", background: "none", fontSize: "16px", cursor: "pointer" }}
                onClick={() => setActiveModal(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Remaining Banner */}
              <div className="amount-modal-banner">
                <span className="banner-label">{lang === "ar" ? "المبلغ المتبقي للطلب" : "Remaining to Pay"}:</span>
                <span className="banner-value">{remaining.toFixed(2)} ﷼</span>
              </div>

              {/* Exact Amount Quick Button */}
              {remaining > 0 && (
                <div className="quick-exact-section">
                  <button
                    type="button"
                    className="quick-exact-btn"
                    onClick={handleExactConfirm}
                  >
                    <span className="exact-icon">⚡</span>
                    <span className="exact-text">
                      {lang === "ar" ? "المبلغ المتبقي بالضبط" : "Exact Remaining Amount"}
                    </span>
                    <span className="exact-amt-badge">
                      {remaining.toFixed(2)} ﷼
                    </span>
                  </button>
                </div>
              )}

              {/* Custom Amount Form */}
              <div className="custom-amount-section">
                <label className="amount-input-label">
                  {lang === "ar" ? "أو أدخل مبلغاً مخصصاً:" : "Or enter custom amount:"}
                </label>
                <div className="amount-input-wrapper">
                  <input
                    type="number"
                    step="0.01"
                    className="form-input custom-amt-input"
                    value={modalInput}
                    onChange={(e) => setModalInput(e.target.value)}
                    placeholder={remaining > 0 ? remaining.toFixed(2) : grandTotal.toFixed(2)}
                    autoFocus
                  />
                  <span className="amount-input-currency">﷼</span>
                </div>

                {/* Quick bill presets */}
                <div className="amount-preset-chips">
                  {[5, 10, 20, 50, 100, 200, 500].map(val => (
                    <button
                      key={val}
                      type="button"
                      className="preset-chip-btn"
                      onClick={() => setModalInput(val.toString())}
                    >
                      {val} ﷼
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="modal-btn cancel" onClick={() => setActiveModal(null)}>
                {t.cancel}
              </button>
              <button className="modal-btn confirm" onClick={handleCustomConfirm}>
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
