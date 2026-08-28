import React from "react";
import { useCashier } from "../../context/CashierContext.jsx";

export default function MoreModal() {
  const {
    showMoreModal,
    setShowMoreModal,
    lang,
    setLang,
    t,
    deferredPrompt,
    isInstalled,
    isIos,
    handleInstallApp
  } = useCashier();

  if (!showMoreModal) return null;
  const onClose = () => setShowMoreModal(false);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{lang === "ar" ? "خيارات إضافية" : "More Options"}</h3>
          <button 
            style={{ border: "none", background: "none", fontSize: "16px", cursor: "pointer" }} 
            onClick={onClose}
          >✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "14px", fontWeight: "700", marginBottom: "8px", display: "block" }}>
              {lang === "ar" ? "اللغة (Language)" : "Language"}
            </label>
            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                className={`modal-btn ${lang === "en" ? "confirm" : "cancel"}`}
                style={{ flex: 1, padding: "12px", fontSize: "14px" }}
                onClick={() => setLang("en")}
              >
                English
              </button>
              <button 
                className={`modal-btn ${lang === "ar" ? "confirm" : "cancel"}`}
                style={{ flex: 1, padding: "12px", fontSize: "14px" }}
                onClick={() => setLang("ar")}
              >
                عربي
              </button>
            </div>
          </div>
          
          <div style={{ padding: "12px", background: "var(--bg-tertiary)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                {lang === "ar" ? "حالة النظام:" : "System Status:"}
              </span>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--success)" }}>
                {lang === "ar" ? "متصل (قيد التشغيل)" : "Connected (Live)"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                {lang === "ar" ? "محاكاة دون اتصال:" : "Offline Fallback:"}
              </span>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--accent)" }}>
                {lang === "ar" ? "نشط" : "Enabled"}
              </span>
            </div>
          </div>

          {/* PWA App Installation Management */}
          <div style={{ marginTop: "16px", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-tertiary)" }}>
            <div style={{ fontSize: "13px", fontWeight: "700", marginBottom: "8px", color: "var(--text-primary)" }}>
              {lang === "ar" ? "تثبيت التطبيق" : "App Installation"}
            </div>

            {isInstalled ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--success)", fontSize: "13px", fontWeight: "600" }}>
                <span>✓</span>
                <span>{lang === "ar" ? "التطبيق مثبت بالفعل" : "App is already installed"}</span>
              </div>
            ) : deferredPrompt ? (
              <button
                className="modal-btn confirm"
                style={{ width: "100%", padding: "10px", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                onClick={() => {
                  handleInstallApp();
                  onClose();
                }}
              >
                <span>📥</span>
                <span>{lang === "ar" ? "تثبيت التطبيق على الجهاز" : "Install App on Device"}</span>
              </button>
            ) : isIos ? (
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                <div>{lang === "ar" ? "لتثبيت التطبيق على جهاز الآيفون/الآيباد:" : "To install the app on iOS/iPadOS:"}</div>
                <ul style={{ margin: "6px 0 0 0", paddingLeft: lang === "ar" ? "0" : "18px", paddingRight: lang === "ar" ? "18px" : "0" }}>
                  <li>{lang === "ar" ? "اضغط على زر المشاركة 📤 في متصفح سفاري." : "Tap the Share button 📤 in Safari."}</li>
                  <li>{lang === "ar" ? "اختر 'إضافة إلى الصفحة الرئيسية' ➕ من القائمة." : "Select 'Add to Home Screen' ➕ from the options."}</li>
                </ul>
              </div>
            ) : (
              <div style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>
                {lang === "ar" 
                  ? "تثبيت التطبيق متاح عند التصفح من Chrome/Edge على الأجهزة المتوافقة." 
                  : "Standalone app installation is available when using Chrome or Edge on compatible devices."}
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="modal-btn confirm" onClick={onClose}>{t.confirm}</button>
        </div>
      </div>
    </div>
  );
}
