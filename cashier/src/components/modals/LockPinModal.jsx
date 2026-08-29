import React, { useState } from "react";
import { useCashier } from "../../context/CashierContext.jsx";

export default function LockPinModal() {
  const {
    showLockPinModal,
    setShowLockPinModal,
    screenLockPin,
    handleSetLockPin,
    handleLockScreen,
    lang
  } = useCashier();

  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!showLockPinModal) return null;

  const handleSavePin = (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setErrorMsg(lang === "ar" ? "يجب أن يتكون رمز القفل من 4 أرقام" : "PIN must be exactly 4 digits");
      return;
    }

    if (newPin !== confirmPin) {
      setErrorMsg(lang === "ar" ? "الرمزان غير متطابقين" : "PINs do not match");
      return;
    }

    handleSetLockPin(newPin);
    setSuccessMsg(lang === "ar" ? "تم تعيين رمز القفل بنجاح!" : "Lock PIN saved successfully!");
    setTimeout(() => {
      setShowLockPinModal(false);
      setSuccessMsg("");
      setNewPin("");
      setConfirmPin("");
    }, 1200);
  };

  return (
    <div className="pos-modal-backdrop" onClick={() => setShowLockPinModal(false)}>
      <div className="pos-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "400px" }}>
        <div className="pos-modal-header">
          <h3>🔢 {lang === "ar" ? "تعيين رمز القفل السريع (PIN)" : "Set Screen Lock PIN"}</h3>
          <button className="pos-modal-close" onClick={() => setShowLockPinModal(false)}>×</button>
        </div>

        <form onSubmit={handleSavePin} style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
            {lang === "ar"
              ? "عيّن رمز قفل مكون من 4 أرقام لتتمكن من قفل الشاشة وفتحها فوراً بدون الحاجة لكتابة Gmail وكلمة المرور كل مرة."
              : "Set a 4-digit PIN to quickly lock and unlock the POS screen without typing your full Gmail & password."}
          </p>

          <div className="pos-form-group">
            <label>{lang === "ar" ? "رمز القفل الجديد (4 أرقام)" : "New 4-Digit PIN"}</label>
            <input
              type="password"
              maxLength={4}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
              autoFocus
              style={{ textAlign: "center", fontSize: "22px", letterSpacing: "8px" }}
              required
            />
          </div>

          <div className="pos-form-group">
            <label>{lang === "ar" ? "تأكيد رمز القفل" : "Confirm PIN"}</label>
            <input
              type="password"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
              style={{ textAlign: "center", fontSize: "22px", letterSpacing: "8px" }}
              required
            />
          </div>

          {errorMsg && (
            <div style={{ color: "#f87171", fontSize: "13px", textAlign: "center" }}>
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{ color: "#4ade80", fontSize: "13px", textAlign: "center", fontWeight: "600" }}>
              {successMsg}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button
              type="button"
              className="pos-btn pos-btn-secondary"
              style={{ flex: 1 }}
              onClick={() => setShowLockPinModal(false)}
            >
              {lang === "ar" ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              className="pos-btn pos-btn-primary"
              style={{ flex: 1 }}
            >
              {lang === "ar" ? "حفظ الرمز" : "Save PIN"}
            </button>
          </div>

          {screenLockPin && (
            <button
              type="button"
              onClick={() => {
                setShowLockPinModal(false);
                handleLockScreen();
              }}
              style={{
                background: "rgba(239, 68, 68, 0.12)",
                color: "#f87171",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                padding: "8px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "600",
                marginTop: "4px"
              }}
            >
              🔒 {lang === "ar" ? "قفل الشاشة الآن" : "Lock Screen Now"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
