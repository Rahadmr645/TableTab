import React, { useState, useEffect, useCallback } from "react";
import { useCashier } from "../../context/CashierContext.jsx";
import "./CashierLockScreen.css";

export default function CashierLockScreen() {
  const {
    currentUser,
    currentTenant,
    lang,
    setLang,
    handleUnlockScreen,
    handleStaffLogout,
    screenLockPin,
    handleSetLockPin
  } = useCashier();

  const [pin, setPin] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [shake, setShake] = useState(false);
  const isSettingInitialPin = !currentUser?.posPin && !screenLockPin;
  const [firstEnteredPin, setFirstEnteredPin] = useState("");

  const handleDigit = useCallback((digit) => {
    setErrorMsg("");
    setPin((prev) => {
      if (prev.length < 4) {
        return prev + digit;
      }
      return prev;
    });
  }, []);

  const handleBackspace = useCallback(() => {
    setErrorMsg("");
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setErrorMsg("");
    setPin("");
  }, []);

  // Keyboard support for POS keyboards and numeric keypads
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Escape" || e.key === "Delete") {
        handleClear();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDigit, handleBackspace, handleClear]);

  // Check PIN when 4 digits are entered
  useEffect(() => {
    if (pin.length === 4) {
      // If no PIN was configured yet, guide user to set initial PIN
      if (isSettingInitialPin) {
        if (!firstEnteredPin) {
          setFirstEnteredPin(pin);
          setPin("");
          setErrorMsg(lang === "ar" ? "أعد إدخال الرمز لتأكيده" : "Confirm your 4-digit PIN");
        } else {
          if (pin === firstEnteredPin) {
            handleSetLockPin(pin);
            handleUnlockScreen(pin);
          } else {
            setShake(true);
            setErrorMsg(lang === "ar" ? "الرمزان غير متطابقين، حاول ثانية" : "PINs do not match, try again");
            setTimeout(() => setShake(false), 500);
            setPin("");
            setFirstEnteredPin("");
          }
        }
        return;
      }

      // Normal Unlock check
      const result = handleUnlockScreen(pin);
      if (!result.success) {
        setShake(true);
        setErrorMsg(result.message || (lang === "ar" ? "رمز القفل غير صحيح" : "Incorrect PIN"));
        setTimeout(() => setShake(false), 500);
        setTimeout(() => setPin(""), 400);
      }
    }
  }, [pin, isSettingInitialPin, firstEnteredPin, handleUnlockScreen, handleSetLockPin, lang]);

  const displayName = currentUser?.username || currentUser?.email || "Cashier Staff";
  const venueName = currentTenant?.businessName || (lang === "ar" ? "مطعم تيبل تاب" : "TableTab Venue");
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className={`lock-screen-container ${lang === "ar" ? "rtl" : "ltr"}`}>
      <div className="lock-screen-card">
        {/* Language switch */}
        <div style={{ alignSelf: "flex-end", marginBottom: "-10px" }}>
          <button
            type="button"
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#94a3b8",
              borderRadius: "8px",
              padding: "3px 8px",
              fontSize: "11px",
              cursor: "pointer"
            }}
          >
            {lang === "ar" ? "English" : "العربية"}
          </button>
        </div>

        {/* User & Restaurant Header */}
        <div className="lock-screen-header">
          <div className="lock-avatar-wrapper">
            <div className="lock-avatar">{initial}</div>
            <div className="lock-badge-icon">🔒</div>
          </div>
          <h2 className="lock-user-name">{displayName}</h2>
          <p className="lock-venue-name">
            <span>🏢</span> {venueName}
          </p>
          <p className="lock-pin-prompt">
            {isSettingInitialPin
              ? (!firstEnteredPin
                  ? (lang === "ar" ? "عيّن رمز قفل مكون من 4 أرقام" : "Set a 4-digit Screen Lock PIN")
                  : (lang === "ar" ? "أعد إدخال الرمز لتأكيده" : "Re-enter to confirm PIN"))
              : (lang === "ar" ? "أدخل رمز القفل لفتح الشاشة" : "Enter PIN to Unlock Terminal")}
          </p>
        </div>

        {/* 4 PIN Dots */}
        <div className={`lock-pin-dots ${shake ? "shake" : ""}`}>
          <div className={`lock-pin-dot ${pin.length >= 1 ? "filled" : ""}`} />
          <div className={`lock-pin-dot ${pin.length >= 2 ? "filled" : ""}`} />
          <div className={`lock-pin-dot ${pin.length >= 3 ? "filled" : ""}`} />
          <div className={`lock-pin-dot ${pin.length >= 4 ? "filled" : ""}`} />
        </div>

        {/* Error message */}
        <div className="lock-error-msg">{errorMsg}</div>

        {/* Numeric Keypad */}
        <div className="lock-keypad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              type="button"
              className="lock-key-btn"
              onClick={() => handleDigit(num)}
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            className="lock-key-btn action-key"
            onClick={handleClear}
          >
            {lang === "ar" ? "مسح" : "Clear"}
          </button>
          <button
            type="button"
            className="lock-key-btn"
            onClick={() => handleDigit("0")}
          >
            0
          </button>
          <button
            type="button"
            className="lock-key-btn action-key"
            onClick={handleBackspace}
          >
            ⌫
          </button>
        </div>

        {/* Footer Actions */}
        <div className="lock-footer-actions">
          <button
            type="button"
            className="lock-switch-btn"
            onClick={handleStaffLogout}
          >
            <span>🚪</span>
            <span>{lang === "ar" ? "تسجيل خروج كامل (Gmail وكلمة المرور)" : "Full Logout (Gmail & Password)"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
