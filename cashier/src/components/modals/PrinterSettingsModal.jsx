import React, { useState } from "react";
import { useCashier } from "../../context/CashierContext.jsx";
import { api } from "../../utils/api.js";

export default function PrinterSettingsModal() {
  const {
    showPrinterModal,
    setShowPrinterModal,
    printerConfig,
    setPrinterConfig,
    autoPrintEnabled,
    setAutoPrintEnabled,
    currentTenant,
    lang
  } = useCashier();

  const [printerType, setPrinterType] = useState(printerConfig?.type || "system");
  const [ip, setIp] = useState(printerConfig?.ip || "");
  const [port, setPort] = useState(printerConfig?.port || 9100);
  const [paperWidth, setPaperWidth] = useState(printerConfig?.paperWidth || "80mm");
  const [autoPrint, setAutoPrint] = useState(autoPrintEnabled);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }

  if (!showPrinterModal) return null;

  const handleTestConnection = async () => {
    if (printerType === "network" && !ip.trim()) {
      setTestResult({
        success: false,
        message: lang === "ar" ? "يرجى كتابة عنوان IP الخاص بالطابعة أولاً" : "Please enter the printer IP address first"
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    if (printerType === "network") {
      try {
        const res = await api.post("/api/printer/test-connection", {
          ip: ip.trim(),
          port: Number(port) || 9100,
          businessName: currentTenant?.businessName || "TableTab POS"
        });

        if (res.data?.success) {
          setTestResult({
            success: true,
            message: lang === "ar" 
              ? `تم الاتصال بنجاح مع الطابعة (${ip}:${port}) وطباعة ورقة الاختبار!` 
              : `Connected successfully to printer (${ip}:${port}) and printed test slip!`
          });
        }
      } catch (err) {
        setTestResult({
          success: false,
          message: lang === "ar"
            ? `فشل الاتصال بالطابعة: ${err.response?.data?.message || err.message}`
            : `Printer connection failed: ${err.response?.data?.message || err.message}`
        });
      } finally {
        setTesting(false);
      }
    } else {
      // Browser test print
      window.print();
      setTesting(false);
      setTestResult({
        success: true,
        message: lang === "ar" ? "تم فتح نافذة الطباعة الافتراضية بنجاح" : "System print triggered successfully"
      });
    }
  };

  const handleSave = () => {
    const newConfig = {
      type: printerType,
      ip: ip.trim(),
      port: Number(port) || 9100,
      paperWidth
    };

    setPrinterConfig(newConfig);
    localStorage.setItem("cashier_printer_config", JSON.stringify(newConfig));

    setAutoPrintEnabled(autoPrint);
    localStorage.setItem("cashier_auto_print", autoPrint.toString());

    setShowPrinterModal(false);
  };

  return (
    <div className="modal-overlay" onClick={() => setShowPrinterModal(false)} style={{ zIndex: 100000 }}>
      <div 
        className="modal-content printer-settings-modal" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "480px",
          width: "95%",
          maxHeight: "90vh",
          overflowY: "auto",
          textAlign: "start",
          padding: "24px",
          borderRadius: "20px",
          background: "var(--bg-card, #1e2430)",
          border: "1px solid var(--border-color, #333d4e)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.6)",
          boxSizing: "border-box"
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "22px" }}>🖨️</span>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--text-primary, #ffffff)", margin: 0 }}>
              {lang === "ar" ? "إعدادات طابعة الإيصالات" : "Receipt Printer Settings"}
            </h2>
          </div>
          <button 
            type="button" 
            onClick={() => setShowPrinterModal(false)}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "none",
              color: "#94a3b8",
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px"
            }}
          >
            ✕
          </button>
        </div>

        {/* Printer Type Selector */}
        <div style={{ marginBottom: "18px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: "700", marginBottom: "8px", color: "var(--text-secondary, #94a3b8)" }}>
            {lang === "ar" ? "نوع الاتصال بالطابعة:" : "Printer Connection Type:"}
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div
              onClick={() => setPrinterType("network")}
              style={{
                border: printerType === "network" ? "2px solid #3b82f6" : "1px solid var(--border-color, #333d4e)",
                background: printerType === "network" ? "rgba(59, 130, 246, 0.15)" : "rgba(255, 255, 255, 0.03)",
                padding: "12px",
                borderRadius: "12px",
                cursor: "pointer",
                textAlign: "center"
              }}
            >
              <div style={{ fontSize: "20px", marginBottom: "4px" }}>🌐</div>
              <div style={{ fontWeight: "700", fontSize: "13px", color: printerType === "network" ? "#60a5fa" : "var(--text-primary, #ffffff)" }}>
                {lang === "ar" ? "طابعة شبكة (IP / Wi-Fi)" : "Network IP Printer"}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary, #94a3b8)", marginTop: "2px" }}>
                {lang === "ar" ? "عبر عنوان IP ومنفذ 9100" : "Direct RAW ESC/POS Socket"}
              </div>
            </div>

            <div
              onClick={() => setPrinterType("system")}
              style={{
                border: printerType === "system" ? "2px solid #3b82f6" : "1px solid var(--border-color, #333d4e)",
                background: printerType === "system" ? "rgba(59, 130, 246, 0.15)" : "rgba(255, 255, 255, 0.03)",
                padding: "12px",
                borderRadius: "12px",
                cursor: "pointer",
                textAlign: "center"
              }}
            >
              <div style={{ fontSize: "20px", marginBottom: "4px" }}>💻</div>
              <div style={{ fontWeight: "700", fontSize: "13px", color: printerType === "system" ? "#60a5fa" : "var(--text-primary, #ffffff)" }}>
                {lang === "ar" ? "طابعة النظام (USB / بلوتوث)" : "System / Browser Printer"}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary, #94a3b8)", marginTop: "2px" }}>
                {lang === "ar" ? "تعريف ويندوز أو كشك Kiosk" : "Windows Driver or Kiosk Mode"}
              </div>
            </div>
          </div>
        </div>

        {/* Network IP Specific Inputs */}
        {printerType === "network" && (
          <div style={{
            background: "rgba(255, 255, 255, 0.03)",
            padding: "14px",
            borderRadius: "12px",
            border: "1px solid var(--border-color, #333d4e)",
            marginBottom: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px"
          }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px", color: "var(--text-secondary, #94a3b8)" }}>
                {lang === "ar" ? "عنوان IP الخاص بالطابعة (IP Address):" : "Printer IP Address:"}
              </label>
              <input
                type="text"
                placeholder="192.168.1.100"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color, #4b5563)",
                  background: "#0f172a",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontFamily: "monospace",
                  boxSizing: "border-box"
                }}
              />
              <span style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", display: "block" }}>
                {lang === "ar" ? "💡 يمكنك معرفة الـ IP بالضغط المطول على زر Feed أثناء تشغيل الطابعة." : "💡 Tip: Hold the Feed button while turning on the printer to print its self-test IP."}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px", color: "var(--text-secondary, #94a3b8)" }}>
                  {lang === "ar" ? "منفذ الطباعة (Port):" : "Port (Default 9100):"}
                </label>
                <input
                  type="number"
                  placeholder="9100"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color, #4b5563)",
                    background: "#0f172a",
                    color: "#ffffff",
                    fontSize: "13px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px", color: "var(--text-secondary, #94a3b8)" }}>
                  {lang === "ar" ? "عرض الورق:" : "Paper Width:"}
                </label>
                <select
                  value={paperWidth}
                  onChange={(e) => setPaperWidth(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color, #4b5563)",
                    background: "#0f172a",
                    color: "#ffffff",
                    fontSize: "13px",
                    boxSizing: "border-box"
                  }}
                >
                  <option value="80mm">80 mm (Standard POS)</option>
                  <option value="58mm">58 mm (Small Roll)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Auto Print Setting */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: "rgba(255, 255, 255, 0.04)",
          borderRadius: "10px",
          marginBottom: "16px",
          cursor: "pointer"
        }}
        onClick={() => setAutoPrint(!autoPrint)}
        >
          <div>
            <div style={{ fontWeight: "700", fontSize: "13px", color: "var(--text-primary, #ffffff)" }}>
              {lang === "ar" ? "طباعة الإيصال تلقائياً فور إتمام الدفع" : "Auto-Print Receipt Upon Payment"}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary, #94a3b8)" }}>
              {lang === "ar" ? "يطبع الإيصال فوراً دون الحاجة للضغط على زر الطباعة" : "Automatically prints receipt as soon as payment is settled"}
            </div>
          </div>
          <input
            type="checkbox"
            checked={autoPrint}
            onChange={(e) => setAutoPrint(e.target.checked)}
            style={{ width: "18px", height: "18px", cursor: "pointer" }}
          />
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div style={{
            padding: "10px 14px",
            borderRadius: "10px",
            marginBottom: "16px",
            fontSize: "12px",
            fontWeight: "600",
            background: testResult.success ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
            color: testResult.success ? "#4ade80" : "#f87171",
            border: `1px solid ${testResult.success ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`
          }}>
            {testResult.success ? "✅ " : "❌ "} {testResult.message}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            className="modal-btn"
            disabled={testing}
            onClick={handleTestConnection}
            style={{
              flex: 1,
              background: "rgba(59, 130, 246, 0.15)",
              color: "#60a5fa",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              padding: "12px",
              borderRadius: "12px",
              fontWeight: "700",
              cursor: testing ? "wait" : "pointer"
            }}
          >
            {testing 
              ? (lang === "ar" ? "جاري الاختبار..." : "Testing...") 
              : (lang === "ar" ? "⚡ تجربة الطباعة" : "⚡ Test Print")}
          </button>

          <button
            type="button"
            className="modal-btn"
            onClick={handleSave}
            style={{
              flex: 1.2,
              background: "var(--accent-color, #3b82f6)",
              color: "#ffffff",
              border: "none",
              padding: "12px",
              borderRadius: "12px",
              fontWeight: "700",
              boxShadow: "0 4px 14px rgba(59, 130, 246, 0.4)",
              cursor: "pointer"
            }}
          >
            ✓ {lang === "ar" ? "حفظ الإعدادات" : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
