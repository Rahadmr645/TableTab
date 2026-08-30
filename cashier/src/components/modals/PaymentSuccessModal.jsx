import React, { useEffect } from "react";
import { useCashier } from "../../context/CashierContext.jsx";

export default function PaymentSuccessModal() {
  const {
    paymentSuccessData,
    setPaymentSuccessData,
    lang
  } = useCashier();

  useEffect(() => {
    if (!paymentSuccessData) return;
    // Disappear after exactly 1 second as requested
    const timer = setTimeout(() => {
      setPaymentSuccessData(null);
    }, 1000);
    return () => clearTimeout(timer);
  }, [paymentSuccessData, setPaymentSuccessData]);

  if (!paymentSuccessData) return null;

  const orderNo = paymentSuccessData.dailyOrderNumber || (paymentSuccessData._id ? String(paymentSuccessData._id).slice(-4) : "1");
  const totalAmt = Number(paymentSuccessData.totalPrice || 0).toFixed(2);

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100000,
        pointerEvents: "none",
        display: "flex",
        justifyContent: "center",
        animation: "slideDownToast 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
      }}
    >
      <style>{`
        @keyframes slideDownToast {
          from { transform: translate(-50%, -20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
      <div
        style={{
          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          color: "#ffffff",
          padding: "12px 24px",
          borderRadius: "50px",
          boxShadow: "0 10px 25px -5px rgba(16, 185, 129, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.15)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontWeight: "800",
          fontSize: "15px",
          letterSpacing: "-0.01em",
          border: "1px solid rgba(255, 255, 255, 0.25)"
        }}
      >
        <span style={{ fontSize: "20px" }}>✅</span>
        <span>
          {lang === "ar"
            ? `تم الدفع بنجاح! ${totalAmt} ﷼ (طلب #${orderNo})`
            : `Payment Successful! ${totalAmt} ﷼ (Order #${orderNo})`}
        </span>
      </div>
    </div>
  );
}
