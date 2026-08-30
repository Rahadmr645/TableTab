import React, { useState, useEffect } from "react";
import { useCashier } from "../../context/CashierContext.jsx";
import { api } from "../../utils/api.js";

export default function TerminalSettingsModal() {
  const {
    showTerminalModal,
    setShowTerminalModal,
    terminalConfig,
    setTerminalConfig,
    lang
  } = useCashier();

  const [terminalType, setTerminalType] = useState(terminalConfig?.type || "demo"); // "network" | "demo"
  const [ip, setIp] = useState(terminalConfig?.ip || "192.168.1.150");
  const [port, setPort] = useState(terminalConfig?.port || 5000);
  const [protocol, setProtocol] = useState(terminalConfig?.protocol || "mada_ecr");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (showTerminalModal) {
      setTerminalType(terminalConfig?.type || "demo");
      setIp(terminalConfig?.ip || "192.168.1.150");
      setPort(terminalConfig?.port || 5000);
      setProtocol(terminalConfig?.protocol || "mada_ecr");
      setTestResult(null);
    }
  }, [showTerminalModal, terminalConfig]);

  if (!showTerminalModal) return null;
  const onClose = () => setShowTerminalModal(false);

  const handleTestConnection = async () => {
    if (terminalType === "demo") {
      setTestResult({
        success: true,
        message: lang === "ar"
          ? "✓ وضع المحاكاة التجريبي مفعل وجاهز لاختبار الدفع السريع"
          : "✓ Demo simulation mode is ready for instant test transactions"
      });
      return;
    }

    if (!ip.trim()) {
      setTestResult({
        success: false,
        message: lang === "ar" ? "يرجى كتابة عنوان IP لجهاز مدى أولاً" : "Please enter POS terminal IP address first"
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await api.post("/api/terminal/test-connection", {
        ip: ip.trim(),
        port: Number(port) || 5000,
        terminalType: protocol
      });

      if (res.data?.success) {
        setTestResult({
          success: true,
          message: lang === "ar"
            ? `✓ تم الاتصال بنجاح مع جهاز مدى (${ip}:${port})!`
            : `✓ Connected successfully to POS Terminal at ${ip}:${port}!`
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: lang === "ar"
          ? `تعذر الاتصال بالجهاز (${ip}:${port}). تأكد أن الجهاز متصل بنفس شبكة الواي فاي.`
          : `Could not reach terminal at ${ip}:${port}. Ensure both devices are on the same Wi-Fi.`
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const newConfig = {
      type: terminalType,
      ip: ip.trim(),
      port: Number(port) || 5000,
      protocol,
      enabled: true
    };

    setTerminalConfig(newConfig);
    localStorage.setItem("cashier_terminal_config", JSON.stringify(newConfig));
    setShowTerminalModal(false);
  };

  const handleSetDemoAndClose = () => {
    const demoConfig = {
      type: "demo",
      ip: "192.168.1.150",
      port: 5000,
      protocol: "mada_ecr",
      enabled: true
    };
    setTerminalConfig(demoConfig);
    localStorage.setItem("cashier_terminal_config", JSON.stringify(demoConfig));
    setShowTerminalModal(false);
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose} 
      style={{ 
        zIndex: 100000,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px"
      }}
    >
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "500px",
          width: "100%",
          borderRadius: "20px",
          background: "#ffffff",
          color: "#0f172a",
          border: "1px solid #e2e8f0",
          boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.35)",
          overflow: "hidden",
          padding: 0,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
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
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              background: "rgba(79, 70, 229, 0.12)",
              color: "#4f46e5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px"
            }}>
              💳
            </div>
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: "800", margin: 0, color: "#1e293b" }}>
                {lang === "ar" ? "ربط جهاز مدى / POS Terminal (Foodics Style)" : "Connect Mada POS Terminal"}
              </h2>
              <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0", fontWeight: "600" }}>
                {lang === "ar" ? "إرسال المبالغ لشاشة جهاز مدى واستقبال الدفع آلياً" : "Send transaction totals to terminal IP automatically"}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "none",
              color: "#64748b",
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Connection Mode Toggle */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            background: "#f1f5f9",
            padding: "4px",
            borderRadius: "12px",
            gap: "6px"
          }}>
            <button
              type="button"
              onClick={() => setTerminalType("network")}
              style={{
                padding: "10px",
                borderRadius: "10px",
                border: "none",
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                background: terminalType === "network" ? "#4f46e5" : "transparent",
                color: terminalType === "network" ? "#ffffff" : "#64748b",
                boxShadow: terminalType === "network" ? "0 2px 8px rgba(79, 70, 229, 0.3)" : "none"
              }}
            >
              🌐 {lang === "ar" ? "جهاز حقيقي عبر IP" : "Physical IP Device"}
            </button>
            <button
              type="button"
              onClick={() => setTerminalType("demo")}
              style={{
                padding: "10px",
                borderRadius: "10px",
                border: "none",
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                background: terminalType === "demo" ? "#10b981" : "transparent",
                color: terminalType === "demo" ? "#ffffff" : "#64748b",
                boxShadow: terminalType === "demo" ? "0 2px 8px rgba(16, 185, 129, 0.3)" : "none"
              }}
            >
              ⚡ {lang === "ar" ? "تجريبي / محاكاة (Demo)" : "Simulation Demo"}
            </button>
          </div>

          {/* Foodics Setup Guide Box */}
          <div style={{
            background: "#f8fafc",
            borderRadius: "12px",
            padding: "12px 14px",
            border: "1px solid #e2e8f0",
            fontSize: "12px",
            color: "#334155",
            lineHeight: "1.6"
          }}>
            <div style={{ fontWeight: "800", color: "#1e293b", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>ℹ️</span>
              <span>{lang === "ar" ? "خطوات ربط جهاز مدى بنظام الكاشير:" : "How to connect your Mada POS:"}</span>
            </div>
            <div>1️⃣ {lang === "ar" ? "تأكد من اتصال جهاز الكاشير وجهاز مدى بنفس شبكة الواي فاي (Wi-Fi)." : "Ensure Cashier and POS Terminal are on the same Wi-Fi network."}</div>
            <div>2️⃣ {lang === "ar" ? "من جهاز مدى، ادخل الإعدادات لمعرفة عنوان الـ IP (مثال: 192.168.1.150)." : "Check the IP address on your Mada machine (e.g. 192.168.1.150)."}</div>
            <div>3️⃣ {lang === "ar" ? "اكتب عنوان IP بالأسفل واضغط (حفظ واختبار الاتصال)." : "Enter the IP below and click (Save & Test Connection)."}</div>
          </div>

          {/* Physical IP Fields */}
          {terminalType === "network" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                    {lang === "ar" ? "عنوان IP جهاز مدى:" : "POS Terminal IP Address:"}
                  </label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                    placeholder="192.168.1.150"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "#f8fafc",
                      border: "2px solid #cbd5e1",
                      borderRadius: "10px",
                      color: "#0f172a",
                      fontSize: "14px",
                      fontWeight: "700",
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                    {lang === "ar" ? "المنفذ (Port):" : "Port:"}
                  </label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="5000"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "#f8fafc",
                      border: "2px solid #cbd5e1",
                      borderRadius: "10px",
                      color: "#0f172a",
                      fontSize: "14px",
                      fontWeight: "700",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                  {lang === "ar" ? "نوع وموديل جهاز مدى:" : "Mada Terminal Brand / Model:"}
                </label>
                <select
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "#f8fafc",
                    border: "2px solid #cbd5e1",
                    borderRadius: "10px",
                    color: "#0f172a",
                    fontSize: "13px",
                    fontWeight: "600",
                    outline: "none"
                  }}
                >
                  <option value="mada_ecr">Saudi Mada ECR over IP (PAX A920 / Castles / Ingenico)</option>
                  <option value="geidea">Geidea POS Terminal (TCP ECR)</option>
                  <option value="nearpay">Nearpay SoftPOS / ECR</option>
                  <option value="generic">Generic ECR Socket (Port 5000 / 8080)</option>
                </select>
              </div>
            </div>
          ) : (
            <div style={{
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              padding: "14px",
              borderRadius: "12px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "24px", marginBottom: "4px" }}>⚡</div>
              <div style={{ fontWeight: "800", color: "#065f46", fontSize: "14px" }}>
                {lang === "ar" ? "وضع المحاكاة التجريبي جاهز للاختبار" : "Simulation Demo Mode Ready"}
              </div>
              <p style={{ fontSize: "12px", color: "#047857", margin: "4px 0 0" }}>
                {lang === "ar"
                  ? "يتيح لك تجربة الدفع والشاشة الحية فوراً بدون الحاجة لجهاز مدى حقيقي متصل بالشبكة."
                  : "Lets you test the live customer tap screen instantly without needing physical POS hardware."}
              </p>
            </div>
          )}

          {/* Test Status Message */}
          {testResult && (
            <div style={{
              padding: "10px 14px",
              borderRadius: "10px",
              fontSize: "12px",
              fontWeight: "600",
              background: testResult.success ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
              border: `1px solid ${testResult.success ? "#10b981" : "#ef4444"}`,
              color: testResult.success ? "#047857" : "#b91c1c"
            }}>
              {testResult.message}
            </div>
          )}

          {/* Test Connection Button */}
          {terminalType === "network" && (
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "10px",
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                color: "#4f46e5",
                fontWeight: "700",
                fontSize: "13px",
                cursor: testing ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
            >
              {testing ? "⏳ " + (lang === "ar" ? "جاري اختبار الاتصال بالجهاز..." : "Testing...") : "🔌 " + (lang === "ar" ? "فحص الاتصال بجهاز مدى" : "Test Connection to POS")}
            </button>
          )}

        </div>

        {/* Modal Footer */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 22px",
          borderTop: "1px solid #e5e7eb",
          background: "#f8fafc"
        }}>
          <button
            type="button"
            className="modal-btn cancel"
            onClick={onClose}
            style={{
              padding: "9px 16px",
              borderRadius: "10px",
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              color: "#475569",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer"
            }}
          >
            {lang === "ar" ? "إلغاء" : "Cancel"}
          </button>

          <div style={{ display: "flex", gap: "8px" }}>
            {terminalType === "network" && (
              <button
                type="button"
                onClick={handleSetDemoAndClose}
                style={{
                  padding: "9px 14px",
                  borderRadius: "10px",
                  background: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  color: "#059669",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                ⚡ {lang === "ar" ? "استخدام التجريبي" : "Use Demo Mode"}
              </button>
            )}

            <button
              type="button"
              className="modal-btn confirm"
              onClick={handleSave}
              style={{
                padding: "10px 20px",
                borderRadius: "10px",
                background: "#4f46e5",
                border: "none",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: "800",
                cursor: "pointer",
                boxShadow: "0 3px 10px rgba(79, 70, 229, 0.35)"
              }}
            >
              ✓ {lang === "ar" ? "حفظ وربط الجهاز" : "Save & Pair Terminal"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
