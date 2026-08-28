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
    cart,
    lang,
    t,
    filteredProducts,
    setSelectedCategory,
    setSearchQuery,
    setActiveTab,
    handleAddToCart,
    handleClearCart,
    setShowDiscountModal,
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
    grandTotal
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
    }, 1500); // 1.5 seconds hold is much more user friendly than 4s
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
      
      {/* Top action row */}
      <div className="action-row">
        <button className="action-btn" onClick={() => { if (cart.length) setShowPrintModal(true); }}>
          <span className="action-btn-icon">🖨️</span>
          <span className="action-btn-label">{t.print}</span>
        </button>
        <button className="action-btn" onClick={() => handleClearCart(false) /* Chef hat trigger order send */}>
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
        <button className="action-btn" onClick={() => setShowDiscountModal(true)}>
          <span className="action-btn-icon">🏷️</span>
          <span className="action-btn-label">{t.discount}</span>
        </button>
        <button className="action-btn">
          <span className="action-btn-icon">📝</span>
          <span className="action-btn-label">{t.notes}</span>
        </button>
        <button className="action-btn" onClick={() => setShowMoreModal(true)}>
          <span className="action-btn-icon">⋯</span>
          <span className="action-btn-label">{t.more}</span>
        </button>

      </div>

      {/* Product Search Bar */}
      <div className="search-wrapper">
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            className="search-input" 
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Back navigation trace if category selected */}
      {selectedCategory && (
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
                {categories.map((cat, idx) => (
                  <div 
                    className={`grid-item category-item ${activeHoldId === cat.id ? "editing" : ""}`} 
                    key={idx}
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
                      <span className="grid-item-title-ar">{cat.nameAr}</span>
                      <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>{cat.nameEn}</span>
                    </div>
                    <div className="grid-item-actions">
                      <button className="grid-action-btn edit" onClick={(e) => { e.stopPropagation(); setShowCatModal(cat); setActiveHoldId(null); }}>✏️</button>
                      <button className="grid-action-btn delete" onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); setActiveHoldId(null); }}>🗑️</button>
                    </div>
                  </div>
                ))}
                <div className="grid-item add-grid-item" onClick={() => setShowCatModal(true)}>
                  <div className="add-grid-item-icon">+</div>
                  <div className="add-grid-item-label">{lang === "ar" ? "إضافة تصنيف" : "Add Category"}</div>
                </div>
              </>
            ) : (
              // Else, render products of that category
              <>
                {filteredProducts.map((prod, idx) => (
                  <div 
                    className={`grid-item product-item ${activeHoldId === prod.id ? "editing" : ""}`} 
                    key={idx}
                    onMouseDown={(e) => handlePressStart(e, prod.id)}
                    onMouseMove={handlePressMove}
                    onMouseUp={(e) => handlePressEnd(e, () => { handleAddToCart(prod); setActiveHoldId(null); })}
                    onMouseLeave={handlePressCancel}
                    onTouchStart={(e) => handlePressStart(e, prod.id)}
                    onTouchMove={handlePressMove}
                    onTouchEnd={(e) => handlePressEnd(e, () => { handleAddToCart(prod); setActiveHoldId(null); })}
                    onTouchCancel={handlePressCancel}
                  >
                    <div className="grid-item-icon" style={{ fontSize: "18px" }}>☕</div>
                    <div className="grid-item-title">
                      <span className="grid-item-title-ar">{prod.nameAr}</span>
                      <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>{prod.nameEn}</span>
                    </div>
                    <div className="grid-item-price">
                      {prod.price.toFixed(2)} ر.س
                    </div>
                    <div className="grid-item-actions">
                      <button className="grid-action-btn edit" onClick={(e) => { e.stopPropagation(); setShowProdModal(prod); setActiveHoldId(null); }}>✏️</button>
                      <button className="grid-action-btn delete" onClick={(e) => { e.stopPropagation(); handleDeleteProduct(prod.id); setActiveHoldId(null); }}>🗑️</button>
                    </div>
                  </div>
                ))}
                <div className="grid-item add-grid-item" onClick={() => setShowProdModal(true)}>
                  <div className="add-grid-item-icon">+</div>
                  <div className="add-grid-item-label">{lang === "ar" ? "إضافة منتج" : "Add Product"}</div>
                </div>
              </>
            )}
          </div>
        )}


        {activeTab === "orders" && (() => {
          const getStatusEn = (status) => {
            const s = String(status || "pending").toLowerCase().replace(/\s+/g, "");
            if (s === "finished" || s === "finised") return "Completed";
            if (s === "cancelled") return "Cancelled";
            if (s === "ready") return "Ready";
            if (s === "inprogress") return "In Progress";
            return "Pending";
          };

          const getStatusAr = (status) => {
            const s = String(status || "pending").toLowerCase().replace(/\s+/g, "");
            if (s === "finished" || s === "finised") return "مكتمل";
            if (s === "cancelled") return "ملغي";
            if (s === "ready") return "جاهز";
            if (s === "inprogress") return "قيد التحضير";
            return "قيد الانتظار";
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
                filteredOrders.map((ord, idx) => (
                  <div className="pos-order-card" key={ord._id || idx}>
                    <div className="pos-order-info">
                      <div className="pos-order-title">
                        #{ord.dailyOrderNumber} - {ord.customerName}
                      </div>
                      <div className="pos-order-meta">
                        {t.table} {ord.tableId} · {ord.items.length} {lang === "ar" ? "أصناف" : "items"} · {new Date(ord.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="pos-order-actions">
                      <span className={`status-badge ${String(ord.status || "pending").toLowerCase().replace(/\s+/g, "")}`} style={{ margin: "0 8px" }}>
                        {lang === "ar" ? getStatusAr(ord.status) : getStatusEn(ord.status)}
                      </span>

                      <span style={{ fontWeight: "700", color: "var(--accent)", margin: "0 12px" }}>
                        {ord.totalPrice.toFixed(2)} ر.س
                      </span>

                      {isOrderUncompleted(ord) && (
                        <button 
                          className="item-action-btn complete-btn" 
                          onClick={() => handleUpdateOrderStatus(ord._id, "Finished")}
                          style={{ margin: "0 4px" }}
                        >
                          ✔️ {t.complete}
                        </button>
                      )}

                      <button 
                        className="item-action-btn" 
                        onClick={() => {
                          setShowPrintModal(ord);
                        }}
                        style={{ margin: "0 4px" }}
                      >
                        🖨️ {t.print}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        })()}

        {activeTab === "tables" && (
          <div className="tables-grid-view">
            {Array.from({ length: 24 }, (_, i) => i + 1).map(num => {
              const isOccupied = occupiedTables.includes(num);
              const isSelected = selectedTable === num;
              return (
                <div 
                  key={num} 
                  className={`table-grid-cell ${isOccupied ? "occupied" : ""} ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    setSelectedTable(num);
                    setActiveTab("home");
                  }}
                >
                  <div>{t.table} {num}</div>
                  <div className="table-status-dot"></div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile Cart Summary Bar */}
      {cart.length > 0 && (
        <div className="mobile-cart-summary-bar" onClick={() => setMobileView("cart")}>
          <div className="mobile-cart-summary-left">
            <span className="cart-icon-badge">🛒 {cart.reduce((sum, item) => sum + item.quantity, 0)} {lang === "ar" ? "أصناف" : "items"}</span>
          </div>
          <div className="mobile-cart-summary-right">
            <span>{grandTotal.toFixed(2)} ر.س</span>
            <span className="view-cart-btn-text">
              {lang === "ar" ? " ← عرض الطلب" : "View Order →"}
            </span>
          </div>
        </div>
      )}

      {/* Bottom Nav Menu */}
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
        <button className="nav-item" onClick={() => handleClearCart(false) /* triggers new cart reset */}>
          <span className="nav-item-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </span>
          <span>{t.new}</span>
        </button>
      </div>
    </div>
  );
}
