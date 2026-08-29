import React, { useState } from "react";
import { useCashier } from "../../context/CashierContext.jsx";

export default function StaffLoginModal() {
  const {
    showAuthModal,
    setShowAuthModal,
    currentUser,
    currentTenant,
    handleStaffLogin,
    handleStaffLogout,
    handleSwitchTenantSlug,
    lang,
    socketConnected,
    handleLockScreen,
    setShowLockPinModal
  } = useCashier();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantSlug, setTenantSlug] = useState(currentTenant?.slug || "");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [mode, setMode] = useState(currentUser ? "profile" : "login"); // 'login' | 'profile' | 'switch_slug'

  if (!showAuthModal) return null;
  const onClose = () => setShowAuthModal(false);

  const onSubmitLogin = async (e) => {
    e?.preventDefault?.();
    setErrorMsg("");
    if (!email.trim() || !password.trim()) {
      setErrorMsg(lang === "ar" ? "يرجى كتابة البريد وكلمة المرور" : "Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      const result = await handleStaffLogin(email.trim(), password, tenantSlug.trim());
      if (result.success) {
        setShowAuthModal(false);
      } else {
        setErrorMsg(result.message || (lang === "ar" ? "فشل تسجيل الدخول" : "Login failed"));
      }
    } catch (err) {
      setErrorMsg(err.message || (lang === "ar" ? "خطأ في الاتصال بالخادم" : "Server connection error"));
    } finally {
      setLoading(false);
    }
  };

  const onSwitchSlug = async (e) => {
    e?.preventDefault?.();
    if (!tenantSlug.trim()) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const ok = await handleSwitchTenantSlug(tenantSlug.trim());
      if (ok) {
        setMode("profile");
        setShowAuthModal(false);
      } else {
        setErrorMsg(lang === "ar" ? "لم يتم العثور على المطعم بهذا الرمز" : "Restaurant not found with this slug");
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content auth-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
        <div className="modal-header">
          <h3>
            {mode === "profile" 
              ? (lang === "ar" ? "🏢 بيانات المطعم والكاشير" : "🏢 Cashier & Restaurant Info")
              : (lang === "ar" ? "🔐 تسجيل دخول الكاشير" : "🔐 Cashier Staff Login")}
          </h3>
          <button
            style={{ border: "none", background: "none", fontSize: "18px", cursor: "pointer", color: "var(--text-muted)" }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {errorMsg && (
            <div style={{
              padding: "10px 14px",
              background: "rgba(239, 68, 68, 0.12)",
              color: "#ef4444",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "600",
              border: "1px solid rgba(239, 68, 68, 0.25)"
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {mode === "profile" && currentUser ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{
                padding: "14px",
                background: "var(--bg-card-hover, #242936)",
                borderRadius: "10px",
                border: "1px solid var(--border-color, #333d4e)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontWeight: "700", fontSize: "16px", color: "var(--text-primary, #fff)" }}>
                    {currentTenant?.businessName || (lang === "ar" ? "المتجر الحالي" : "Current Venue")}
                  </span>
                  <span style={{
                    fontSize: "12px",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    background: socketConnected ? "rgba(34, 197, 94, 0.2)" : "rgba(234, 179, 8, 0.2)",
                    color: socketConnected ? "#22c55e" : "#eab308",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                    ● {socketConnected ? (lang === "ar" ? "متصل بالخادم" : "Live Connected") : (lang === "ar" ? "جاري الاتصال" : "Connecting...")}
                  </span>
                </div>
                <div style={{ fontSize: "13px", color: "var(--text-muted, #94a3b8)" }}>
                  <div><strong>Slug:</strong> {currentTenant?.slug || "—"}</div>
                  <div><strong>Staff:</strong> {currentUser?.username || currentUser?.email} ({currentUser?.role || "cashier"})</div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    className="modal-btn"
                    style={{
                      flex: 1,
                      background: "rgba(239, 68, 68, 0.15)",
                      color: "#ef4444",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "5px",
                      padding: "10px"
                    }}
                    onClick={() => {
                      onClose();
                      handleLockScreen();
                    }}
                  >
                    🔒 {lang === "ar" ? "قفل الشاشة السريع" : "Lock Screen (PIN)"}
                  </button>
                  <button
                    type="button"
                    className="modal-btn"
                    style={{
                      flex: 1,
                      background: "rgba(59, 130, 246, 0.15)",
                      color: "#60a5fa",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "5px",
                      padding: "10px"
                    }}
                    onClick={() => {
                      onClose();
                      setShowLockPinModal(true);
                    }}
                  >
                    🔢 {lang === "ar" ? "تعيين رمز PIN" : "Set Lock PIN"}
                  </button>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    className="modal-btn"
                    style={{ flex: 1, background: "rgba(255, 255, 255, 0.08)", color: "#cbd5e1", border: "1px solid rgba(255, 255, 255, 0.15)" }}
                    onClick={() => {
                      handleStaffLogout();
                      setMode("login");
                    }}
                  >
                    🚪 {lang === "ar" ? "تسجيل خروج كامل" : "Full Log Out"}
                  </button>
                  <button
                    type="button"
                    className="modal-btn"
                    style={{ flex: 1, background: "var(--accent-color, #3b82f6)", color: "#fff" }}
                    onClick={() => setMode("login")}
                  >
                    🔄 {lang === "ar" ? "تبديل الحساب" : "Switch Account"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmitLogin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="form-group">
                <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted, #94a3b8)", marginBottom: "4px", display: "block" }}>
                  {lang === "ar" ? "معرّف المطعم (Slug) - اختياري" : "Restaurant Slug (Optional)"}
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                  placeholder="e.g. coffee-house"
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted, #94a3b8)", marginBottom: "4px", display: "block" }}>
                  {lang === "ar" ? "البريد الإلكتروني للكاشير" : "Cashier Staff Email"}
                </label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cashier@restaurant.com"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted, #94a3b8)", marginBottom: "4px", display: "block" }}>
                  {lang === "ar" ? "كلمة المرور" : "Password"}
                </label>
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  className="modal-btn cancel"
                  onClick={onClose}
                  style={{ flex: 1 }}
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="modal-btn confirm"
                  disabled={loading}
                  style={{ flex: 1, opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? (lang === "ar" ? "جاري الدخول..." : "Logging in...") : (lang === "ar" ? "دخول" : "Log In")}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
