import React, { useState } from "react";
import { useCashier } from "../../context/CashierContext.jsx";

export default function MoreModal() {
  const {
    showMoreModal,
    setShowMoreModal,
    setShowPrinterModal,
    setShowTerminalModal,
    setShowDailySalesModal,
    printerConfig,
    terminalConfig,
    autoPrintEnabled,
    toggleAutoPrint,
    lang,
    setLang,
    t,
    deferredPrompt,
    isInstalled,
    isIos,
    handleInstallApp,
    socketConnected,
    currentUser,
    currentTenant,
    setShowAuthModal,
    handleLockScreen,
    placedOrders
  } = useCashier();

  // Accordion state: null (all collapsed) or "printer" | "language" | "staff" | "system"
  const [expandedSection, setExpandedSection] = useState(null);

  if (!showMoreModal) return null;
  const onClose = () => setShowMoreModal(false);

  const toggleSection = (id) => {
    setExpandedSection((prev) => (prev === id ? null : id));
  };

  const isNetwork = printerConfig?.type === "network" && printerConfig?.ip;

  // Calculate Today's quick sales preview
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const todayOrders = (placedOrders || []).filter((ord) => {
    if (!ord) return false;
    if (ord.businessDay && ord.businessDay === todayStr) return true;
    if (ord.createdAt) {
      const d = new Date(ord.createdAt);
      if (!isNaN(d.getTime())) {
        const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (ymd === todayStr || d.toISOString().slice(0, 10) === todayStr) return true;
      }
    }
    return false;
  });

  const isPaid = (ord) => {
    const pStatus = String(ord.paymentStatus || "").toLowerCase();
    const status = String(ord.status || "").toLowerCase().replace(/\s+/g, "");
    if (status === "cancelled") return false;
    return pStatus === "paid" || status === "finished" || status === "finised";
  };

  const todayPaid = todayOrders.filter(isPaid);
  const todayGross = todayPaid.reduce((sum, ord) => sum + (Number(ord.totalPrice) || 0), 0);
  const todayRefunded = todayOrders.reduce((sum, ord) => sum + (Number(ord.refundedAmount) || 0), 0);
  const todayNet = Math.max(0, todayGross - todayRefunded);

  const currencyLabel = "﷼";

  const fmtCurrency = (num) => {
    const n = Number(num) || 0;
    return n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 100000 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "520px",
          width: "95%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "20px",
          background: "#1e293b",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.65), 0 0 1px rgba(255, 255, 255, 0.2)",
          color: "#f8fafc",
          padding: 0,
          overflow: "hidden",
          boxSizing: "border-box"
        }}
      >
        {/* Modal Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "18px 22px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          background: "#182234"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "38px",
              height: "38px",
              borderRadius: "12px",
              background: "rgba(59, 130, 246, 0.2)",
              color: "#60a5fa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "19px",
              border: "1px solid rgba(59, 130, 246, 0.3)"
            }}>
              ⚙️
            </div>
            <div>
              <h3 style={{ fontSize: "17px", fontWeight: "800", margin: 0, color: "#ffffff", letterSpacing: "-0.01em" }}>
                {lang === "ar" ? "لوحة الإعدادات والخيارات" : "POS Settings & Options"}
              </h3>
              <p style={{ fontSize: "11px", color: "#94a3b8", margin: "2px 0 0 0" }}>
                {lang === "ar" ? "المبيعات اليومية، الطابعة، اللغة، والكاشير" : "Daily Sales, Printer, Language, and Staff"}
              </p>
            </div>
          </div>
          <button 
            type="button"
            style={{
              border: "1px solid rgba(255, 255, 255, 0.12)",
              background: "rgba(255, 255, 255, 0.06)",
              color: "#cbd5e1",
              width: "32px",
              height: "32px",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "15px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease"
            }} 
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Scrollable List */}
        <div style={{
          padding: "16px 20px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          flex: 1
        }}>

          {/* ITEM 1: DAILY SALES & SHIFT REPORT (FOODICS FULL MODAL LAUNCHER) */}
          <div 
            onClick={() => {
              onClose();
              setShowDailySalesModal(true);
            }}
            style={{
              background: "linear-gradient(135deg, rgba(59, 130, 246, 0.16) 0%, rgba(30, 41, 59, 0.7) 100%)",
              borderRadius: "14px",
              border: "1px solid rgba(59, 130, 246, 0.4)",
              padding: "14px 16px",
              cursor: "pointer",
              userSelect: "none",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              transition: "all 0.2s ease",
              boxShadow: "0 4px 14px rgba(59, 130, 246, 0.15)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "rgba(59, 130, 246, 0.25)",
                color: "#60a5fa",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px"
              }}>
                📊
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "800", color: "#ffffff", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>{lang === "ar" ? "تقرير مبيعات اليوم والوردية" : "Daily Sales & Shift Report"}</span>
                  <span style={{ fontSize: "10px", background: "rgba(59, 130, 246, 0.3)", color: "#93c5fd", padding: "1px 6px", borderRadius: "4px" }}>Foodics</span>
                </div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                  {lang === "ar" ? "عرض إجمالي المبيعات، الضريبة، الأصناف، وطباعة Z-Report" : "Full revenue, VAT 15%, products sold & Z-Report"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ textAlign: lang === "ar" ? "left" : "right" }}>
                <div style={{ fontSize: "13px", fontWeight: "900", color: "#4ade80" }}>
                  {fmtCurrency(todayNet)} {currencyLabel}
                </div>
                <div style={{ fontSize: "10px", color: "#94a3b8" }}>
                  {todayPaid.length} {lang === "ar" ? "فواتير اليوم" : "orders today"}
                </div>
              </div>
              <div style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "rgba(59, 130, 246, 0.2)",
                color: "#60a5fa",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                fontWeight: "bold"
              }}>
                {lang === "ar" ? "◀" : "▶"}
              </div>
            </div>
          </div>

          {/* ACCORDION 2: PRINTER */}
          <div style={{
            background: expandedSection === "printer" ? "#0f172a" : "#182234",
            borderRadius: "14px",
            border: expandedSection === "printer" ? "1px solid #3b82f6" : "1px solid rgba(255, 255, 255, 0.08)",
            transition: "all 0.2s ease",
            overflow: "hidden"
          }}>
            {/* Header Row (Click to toggle) */}
            <div 
              onClick={() => toggleSection("printer")}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 16px",
                cursor: "pointer",
                userSelect: "none"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "18px" }}>🖨️</span>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#f1f5f9" }}>
                    {lang === "ar" ? "الطابعة الحرارية والفواتير" : "Receipt & Thermal Printer"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>
                    {isNetwork ? (lang === "ar" ? `طابعة شبكة (${printerConfig.ip})` : `Network IP (${printerConfig.ip})`) : (lang === "ar" ? "طابعة النظام (USB / POS Driver)" : "System Printer / USB")}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: autoPrintEnabled ? "rgba(34, 197, 94, 0.2)" : "rgba(255, 255, 255, 0.08)",
                  color: autoPrintEnabled ? "#4ade80" : "#94a3b8"
                }}>
                  {autoPrintEnabled ? (lang === "ar" ? "طباعة تلقائية" : "Auto ON") : (lang === "ar" ? "طباعة يدوية" : "Auto OFF")}
                </span>
                <span style={{
                  fontSize: "14px",
                  color: "#94a3b8",
                  transform: expandedSection === "printer" ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease"
                }}>
                  ▼
                </span>
              </div>
            </div>

            {/* Collapsible Content */}
            {expandedSection === "printer" && (
              <div style={{
                padding: "0 16px 16px",
                borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                paddingTop: "14px"
              }}>
                {/* Auto Print Toggle */}
                <div 
                  onClick={toggleAutoPrint}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    background: "rgba(255, 255, 255, 0.04)",
                    borderRadius: "10px",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    cursor: "pointer"
                  }}
                >
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#f8fafc" }}>
                      {lang === "ar" ? "الطباعة التلقائية عند الدفع" : "Auto-Print on Payment"}
                    </div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                      {lang === "ar" ? "طباعة الفاتورة آلياً فور سداد الطلب" : "Print receipt automatically upon order payment"}
                    </div>
                  </div>
                  <span style={{
                    fontWeight: "800",
                    fontSize: "12px",
                    padding: "4px 12px",
                    borderRadius: "8px",
                    background: autoPrintEnabled ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.18)",
                    color: autoPrintEnabled ? "#4ade80" : "#f87171",
                    border: `1px solid ${autoPrintEnabled ? "rgba(34, 197, 94, 0.4)" : "rgba(239, 68, 68, 0.3)"}`
                  }}>
                    {autoPrintEnabled ? (lang === "ar" ? "مفعلة ✓" : "ON ✓") : (lang === "ar" ? "معطلة ✕" : "OFF ✕")}
                  </span>
                </div>

                {/* Configure Printer Button */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setShowPrinterModal(true);
                  }}
                  style={{
                    background: "rgba(59, 130, 246, 0.18)",
                    border: "1px solid rgba(59, 130, 246, 0.4)",
                    color: "#60a5fa",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                >
                  ⚙️ {lang === "ar" ? "إعدادات الطابعة والـ IP وتجربة الطباعة" : "Configure Printer & IP"}
                </button>
              </div>
            )}
          </div>

          {/* ACCORDION 2.5: POS PAYMENT TERMINAL */}
          <div style={{
            background: expandedSection === "terminal" ? "#0f172a" : "#182234",
            borderRadius: "14px",
            border: expandedSection === "terminal" ? "1px solid #3b82f6" : "1px solid rgba(255, 255, 255, 0.08)",
            transition: "all 0.2s ease",
            overflow: "hidden"
          }}>
            <div 
              onClick={() => toggleSection("terminal")}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 16px",
                cursor: "pointer",
                userSelect: "none"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "18px" }}>💳</span>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#f1f5f9" }}>
                    {lang === "ar" ? "جهاز مدى والدفع الإلكتروني (POS IP)" : "Mada POS Terminal & IP"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>
                    {terminalConfig?.type === "demo"
                      ? (lang === "ar" ? "وضع المحاكاة التجريبي (Demo Active)" : "Simulation Demo Mode")
                      : (terminalConfig?.enabled ? `${terminalConfig.ip}:${terminalConfig.port}` : (lang === "ar" ? "غير مهيأ" : "Not configured"))}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: terminalConfig?.enabled ? "rgba(34, 197, 94, 0.2)" : "rgba(255, 255, 255, 0.08)",
                  color: terminalConfig?.enabled ? "#4ade80" : "#94a3b8"
                }}>
                  {terminalConfig?.enabled ? (lang === "ar" ? "مفعل ✓" : "Active ✓") : (lang === "ar" ? "معطل" : "Disabled")}
                </span>
                <span style={{
                  fontSize: "14px",
                  color: "#94a3b8",
                  transform: expandedSection === "terminal" ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease"
                }}>
                  ▼
                </span>
              </div>
            </div>

            {expandedSection === "terminal" && (
              <div style={{
                padding: "0 16px 16px",
                borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                paddingTop: "14px"
              }}>
                <div style={{ fontSize: "12px", color: "#cbd5e1", lineHeight: "1.5" }}>
                  {lang === "ar"
                    ? "يتيح لك هذا الخيار ربط جهاز مدى عبر الـ IP لإرسال قيمة الطلبات مباشرة للشاشة واستقبال الموافقة آلياً."
                    : "Connect Mada POS machine via local IP socket to automatically push totals and accept card taps."}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setShowTerminalModal(true);
                  }}
                  style={{
                    background: "rgba(59, 130, 246, 0.18)",
                    border: "1px solid rgba(59, 130, 246, 0.4)",
                    color: "#60a5fa",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                >
                  ⚙️ {lang === "ar" ? "إعدادات عنوان الـ IP والاتصال بجهاز مدى" : "Configure POS Terminal IP & Port"}
                </button>
              </div>
            )}
          </div>

          {/* ACCORDION 3: LANGUAGE */}
          <div style={{
            background: expandedSection === "language" ? "#0f172a" : "#182234",
            borderRadius: "14px",
            border: expandedSection === "language" ? "1px solid #3b82f6" : "1px solid rgba(255, 255, 255, 0.08)",
            transition: "all 0.2s ease",
            overflow: "hidden"
          }}>
            {/* Header Row */}
            <div 
              onClick={() => toggleSection("language")}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 16px",
                cursor: "pointer",
                userSelect: "none"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "18px" }}>🌐</span>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#f1f5f9" }}>
                    {lang === "ar" ? "لغة الواجهة" : "Language"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>
                    {lang === "ar" ? "اللغة الحالية: العربية (RTL)" : "Current: English (LTR)"}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: "rgba(59, 130, 246, 0.2)",
                  color: "#60a5fa"
                }}>
                  {lang === "ar" ? "🇸🇦 العربية" : "🇬🇧 English"}
                </span>
                <span style={{
                  fontSize: "14px",
                  color: "#94a3b8",
                  transform: expandedSection === "language" ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease"
                }}>
                  ▼
                </span>
              </div>
            </div>

            {/* Collapsible Content */}
            {expandedSection === "language" && (
              <div style={{
                padding: "0 16px 16px",
                borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                paddingTop: "14px"
              }}>
                <button
                  type="button"
                  onClick={() => setLang("en")}
                  style={{
                    border: lang === "en" ? "2px solid #3b82f6" : "1px solid rgba(255, 255, 255, 0.1)",
                    background: lang === "en" ? "rgba(59, 130, 246, 0.25)" : "rgba(255, 255, 255, 0.03)",
                    padding: "12px 10px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    color: lang === "en" ? "#60a5fa" : "#e2e8f0",
                    fontWeight: "700",
                    fontSize: "13px"
                  }}
                >
                  <span>🇬🇧</span>
                  <span>English</span>
                  {lang === "en" && <span style={{ fontSize: "12px" }}>✓</span>}
                </button>

                <button
                  type="button"
                  onClick={() => setLang("ar")}
                  style={{
                    border: lang === "ar" ? "2px solid #3b82f6" : "1px solid rgba(255, 255, 255, 0.1)",
                    background: lang === "ar" ? "rgba(59, 130, 246, 0.25)" : "rgba(255, 255, 255, 0.03)",
                    padding: "12px 10px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    color: lang === "ar" ? "#60a5fa" : "#e2e8f0",
                    fontWeight: "700",
                    fontSize: "13px"
                  }}
                >
                  <span>🇸🇦</span>
                  <span>العربية</span>
                  {lang === "ar" && <span style={{ fontSize: "12px" }}>✓</span>}
                </button>
              </div>
            )}
          </div>

          {/* ACCORDION 4: CASHIER & STAFF */}
          <div style={{
            background: expandedSection === "staff" ? "#0f172a" : "#182234",
            borderRadius: "14px",
            border: expandedSection === "staff" ? "1px solid #3b82f6" : "1px solid rgba(255, 255, 255, 0.08)",
            transition: "all 0.2s ease",
            overflow: "hidden"
          }}>
            {/* Header Row */}
            <div 
              onClick={() => toggleSection("staff")}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 16px",
                cursor: "pointer",
                userSelect: "none"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "18px" }}>👤</span>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#f1f5f9" }}>
                    {lang === "ar" ? "موظف الكاشير والجلسة" : "Cashier & Staff"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>
                    {currentUser?.username || currentUser?.email || (lang === "ar" ? "موظف الكاشير" : "Cashier Staff")}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: "rgba(34, 197, 94, 0.15)",
                  color: "#4ade80"
                }}>
                  {lang === "ar" ? "نشط" : "Active"}
                </span>
                <span style={{
                  fontSize: "14px",
                  color: "#94a3b8",
                  transform: expandedSection === "staff" ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease"
                }}>
                  ▼
                </span>
              </div>
            </div>

            {/* Collapsible Content */}
            {expandedSection === "staff" && (
              <div style={{
                padding: "0 16px 16px",
                borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                paddingTop: "14px"
              }}>
                <div style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  fontSize: "12px",
                  color: "#94a3b8"
                }}>
                  {lang === "ar" ? "الفرع / المتجر:" : "Store / Branch:"} <strong style={{ color: "#ffffff" }}>{currentTenant?.businessName || "TableTab POS"} {currentTenant?.slug ? `(@${currentTenant.slug})` : ""}</strong>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setShowAuthModal(true);
                    }}
                    style={{
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#f1f5f9",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px"
                    }}
                  >
                    🔄 {lang === "ar" ? "تبديل الموظف" : "Switch Account"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      handleLockScreen();
                    }}
                    style={{
                      background: "rgba(239, 68, 68, 0.15)",
                      border: "1px solid rgba(239, 68, 68, 0.35)",
                      color: "#f87171",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px"
                    }}
                  >
                    🔒 {lang === "ar" ? "قفل الشاشة" : "Lock Terminal"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ACCORDION 5: SYSTEM & PWA */}
          <div style={{
            background: expandedSection === "system" ? "#0f172a" : "#182234",
            borderRadius: "14px",
            border: expandedSection === "system" ? "1px solid #3b82f6" : "1px solid rgba(255, 255, 255, 0.08)",
            transition: "all 0.2s ease",
            overflow: "hidden"
          }}>
            {/* Header Row */}
            <div 
              onClick={() => toggleSection("system")}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 16px",
                cursor: "pointer",
                userSelect: "none"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "18px" }}>ℹ️</span>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#f1f5f9" }}>
                    {lang === "ar" ? "النظام وتطبيق الكاشير" : "System & Cashier App"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>
                    {socketConnected ? (lang === "ar" ? "متصل مباشر (Socket Online)" : "Socket Online") : (lang === "ar" ? "جاري الاتصال..." : "Connecting...")}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: socketConnected ? "rgba(34, 197, 94, 0.15)" : "rgba(234, 179, 8, 0.15)",
                  color: socketConnected ? "#4ade80" : "#fbbf24"
                }}>
                  {socketConnected ? "Online ✓" : "Offline"}
                </span>
                <span style={{
                  fontSize: "14px",
                  color: "#94a3b8",
                  transform: expandedSection === "system" ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease"
                }}>
                  ▼
                </span>
              </div>
            </div>

            {/* Collapsible Content */}
            {expandedSection === "system" && (
              <div style={{
                padding: "0 16px 16px",
                borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                paddingTop: "14px"
              }}>
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  fontSize: "12px",
                  background: "rgba(255, 255, 255, 0.03)",
                  padding: "10px 12px",
                  borderRadius: "10px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#94a3b8" }}>{lang === "ar" ? "الاتصال المباشر:" : "Live Socket:"}</span>
                    <span style={{ fontWeight: "700", color: socketConnected ? "#4ade80" : "#fbbf24" }}>
                      ● {socketConnected ? (lang === "ar" ? "متصل مباشر ✓" : "Live Connected ✓") : (lang === "ar" ? "جاري الاتصال..." : "Connecting...")}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#94a3b8" }}>{lang === "ar" ? "نمط نقطة البيع:" : "POS Mode:"}</span>
                    <span style={{ fontWeight: "700", color: "#60a5fa" }}>Fast Cloud POS v2.0</span>
                  </div>
                </div>

                {/* PWA App Installation Details */}
                <div style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  borderRadius: "10px",
                  padding: "10px 12px"
                }}>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#f1f5f9", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>📥</span>
                    <span>{lang === "ar" ? "تثبيت تطبيق الكاشير (PWA)" : "Cashier App Installation"}</span>
                  </div>

                  {isInstalled ? (
                    <div style={{ color: "#4ade80", fontSize: "12px", fontWeight: "600" }}>
                      ✓ {lang === "ar" ? "التطبيق مثبت كبرنامج مستقل على الجهاز" : "App is installed as standalone desktop/tablet POS"}
                    </div>
                  ) : deferredPrompt ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleInstallApp();
                        onClose();
                      }}
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "8px",
                        background: "rgba(59, 130, 246, 0.2)",
                        border: "1px solid #3b82f6",
                        color: "#60a5fa",
                        fontWeight: "700",
                        fontSize: "12px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px"
                      }}
                    >
                      📥 {lang === "ar" ? "تثبيت التطبيق على الجهاز" : "Install Standalone App"}
                    </button>
                  ) : isIos ? (
                    <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: "1.4" }}>
                      {lang === "ar" ? "لتثبيت التطبيق على iOS: اضغط مشاركة 📤 ثم 'إضافة إلى الصفحة الرئيسية' ➕" : "To install on iOS: Tap Share 📤 then 'Add to Home Screen' ➕"}
                    </div>
                  ) : (
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                      {lang === "ar" ? "متوافق مع أجهزة الحواسب والتابلت والآيباد عبر المتصفح." : "Responsive PWA compatible across tablets, iPads, and PCs."}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div style={{
          padding: "14px 20px",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          background: "#182234"
        }}>
          <button 
            type="button"
            className="modal-btn confirm" 
            onClick={onClose}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "12px",
              background: "#3b82f6",
              color: "#ffffff",
              fontWeight: "700",
              fontSize: "14px",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(59, 130, 246, 0.4)",
              transition: "transform 0.1s ease"
            }}
          >
            {t.confirm || (lang === "ar" ? "تم / إغلاق" : "Done")}
          </button>
        </div>
      </div>
    </div>
  );
}



