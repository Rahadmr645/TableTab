import React, { useState, useEffect } from "react";
import { useCashier } from "../../context/CashierContext.jsx";

export default function LiveTerminalPaymentModal() {
  const {
    terminalActiveTransaction,
    handleCancelTerminalPayment,
    handleTerminalSuccess,
    setShowTerminalModal,
    lang
  } = useCashier();

  const [step, setStep] = useState("waiting"); // "waiting" | "processing" | "error" | "approved"
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!terminalActiveTransaction) {
      setStep("waiting");
      setErrorMsg("");
      return;
    }

    setStep("waiting");
    setErrorMsg("");

    // If Demo mode is active, simulate realistic POS terminal communication flow
    if (terminalActiveTransaction.isDemo) {
      const timer1 = setTimeout(() => {
        setStep("processing");
      }, 1200);

      const timer2 = setTimeout(() => {
        setStep("approved");
        setTimeout(() => {
          handleTerminalSuccess();
        }, 600);
      }, 2200);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [terminalActiveTransaction]);

  if (!terminalActiveTransaction) return null;

  const amt = Number(terminalActiveTransaction.amount || 0).toFixed(2);
  const ip = terminalActiveTransaction.ip || "";
  const isDemo = terminalActiveTransaction.isDemo;

  const handleSimulateApprove = () => {
    setStep("approved");
    setTimeout(() => {
      handleTerminalSuccess();
    }, 400);
  };

  const handleOpenPairing = () => {
    handleCancelTerminalPayment();
    setShowTerminalModal(true);
  };

  return (
    <div 
      className="modal-overlay" 
      style={{ 
        zIndex: 100001,
        backgroundColor: "rgba(15, 23, 42, 0.8)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px"
      }}
    >
      <style>{`
        @keyframes pulseGlow {
          0% { transform: scale(0.96); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.6); }
          70% { transform: scale(1); box-shadow: 0 0 0 22px rgba(79, 70, 229, 0); }
          100% { transform: scale(0.96); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
        }
        @keyframes tapCardFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(-4deg); }
        }
      `}</style>

      <div 
        className="modal-content"
        style={{
          maxWidth: "440px",
          width: "100%",
          textAlign: "center",
          padding: "36px 26px 28px",
          borderRadius: "24px",
          background: "#ffffff",
          color: "#0f172a",
          border: "1px solid #e2e8f0",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.4)",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        }}
      >
        {/* Animated POS Terminal / Card Icon */}
        <div style={{
          width: "90px",
          height: "90px",
          borderRadius: "50%",
          background: step === "approved" 
            ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
            : "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "40px",
          margin: "0 auto 20px",
          animation: step === "waiting" ? "pulseGlow 2s infinite, tapCardFloat 3s ease-in-out infinite" : "none",
          boxShadow: step === "approved"
            ? "0 10px 30px rgba(16, 185, 129, 0.5)"
            : "0 10px 30px rgba(79, 70, 229, 0.45)",
          color: "#ffffff"
        }}>
          {step === "approved" ? "✅" : "💳"}
        </div>

        {/* Amount Badge */}
        <div style={{
          display: "inline-block",
          padding: "6px 22px",
          borderRadius: "30px",
          background: "rgba(79, 70, 229, 0.1)",
          border: "1px solid rgba(79, 70, 229, 0.25)",
          color: "#4f46e5",
          fontSize: "26px",
          fontWeight: "900",
          marginBottom: "12px",
          letterSpacing: "-0.02em"
        }}>
          {amt} ﷼
        </div>

        {step === "approved" ? (
          <div>
            <h3 style={{ fontSize: "20px", fontWeight: "900", color: "#16a34a", margin: "0 0 6px" }}>
              {lang === "ar" ? "تمت الموافقة بنجاح!" : "Payment Approved!"}
            </h3>
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
              {lang === "ar" ? "جاري حفظ الطلب وإصدار الفاتورة..." : "Saving order and printing receipt..."}
            </p>
          </div>
        ) : (
          <div>
            <h3 style={{ fontSize: "19px", fontWeight: "800", margin: "0 0 6px", color: "#1e293b" }}>
              {lang === "ar" ? "مرر أو أدخل البطاقة على جهاز مدى" : "Tap or Insert Card on POS Terminal"}
            </h3>

            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 20px", lineHeight: "1.5" }}>
              {isDemo
                ? (lang === "ar" ? "محاكاة فورية لتمرير بطاقة العميل (وضع تجريبي)" : "Simulating customer card tap (Demo Mode)...")
                : (lang === "ar" ? `المبلغ معروض على شاشة جهاز مدى (${ip}). بانتظار العميل...` : `Amount is sent to terminal (${ip}). Waiting for customer...`)}
            </p>

            {/* Status Pill */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "10px 16px",
              background: "#f1f5f9",
              borderRadius: "12px",
              fontSize: "12px",
              color: "#4f46e5",
              fontWeight: "700",
              marginBottom: "22px"
            }}>
              <span style={{ fontSize: "14px" }}>
                {step === "processing" ? "⏳" : "📡"}
              </span>
              <span>
                {step === "processing"
                  ? (lang === "ar" ? "جاري قراءة البطاقة والتحقق من البنك..." : "Reading card & verifying with bank...")
                  : (lang === "ar" ? "بانتظار تمرير بطاقة مدى / Apple Pay..." : "Awaiting Mada / Apple Pay tap...")}
              </span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
              {!isDemo && (
                <button
                  type="button"
                  onClick={handleSimulateApprove}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "10px",
                    background: "rgba(16, 185, 129, 0.12)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    color: "#059669",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer"
                  }}
                  title={lang === "ar" ? "اعتماد فوري تجريبي في حال تأخر الجهاز" : "Instant approve for test"}
                >
                  ⚡ {lang === "ar" ? "اعتماد تجريبي" : "Simulate Approval"}
                </button>
              )}

              <button
                type="button"
                onClick={handleOpenPairing}
                style={{
                  padding: "9px 14px",
                  borderRadius: "10px",
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  color: "#475569",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                ⚙️ {lang === "ar" ? "إعداد الـ IP" : "Pairing"}
              </button>

              <button
                type="button"
                onClick={handleCancelTerminalPayment}
                style={{
                  padding: "9px 18px",
                  borderRadius: "10px",
                  background: "#fee2e2",
                  border: "1px solid #fca5a5",
                  color: "#dc2626",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                ✕ {lang === "ar" ? "إلغاء" : "Cancel"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
