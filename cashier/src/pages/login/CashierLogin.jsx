import React, { useState } from "react";
import { useCashier } from "../../context/CashierContext.jsx";
import "./CashierLogin.css";

export default function CashierLogin() {
  const {
    lang,
    setLang,
    handleStaffLogin,
    currentTenant,
    currentUser,
    handleStaffLogout
  } = useCashier();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [tenantSlug, setTenantSlug] = useState(() => {
    return currentTenant?.slug || localStorage.getItem("cashier_tenant_slug") || "";
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setErrorMsg("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      setErrorMsg(
        lang === "ar"
          ? "يرجى إدخال البريد الإلكتروني وكلمة المرور"
          : "Please enter your email and password"
      );
      return;
    }

    setLoading(true);
    try {
      const result = await handleStaffLogin(cleanEmail, cleanPass, tenantSlug.trim());
      if (!result.success) {
        setErrorMsg(
          result.message ||
            (lang === "ar"
              ? "فشل تسجيل الدخول. يرجى التأكد من صحة البيانات."
              : "Login failed. Please check your credentials.")
        );
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
          err.message ||
          (lang === "ar" ? "تعذر الاتصال بالخادم" : "Server connection failed")
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleLang = () => {
    const nextLang = lang === "ar" ? "en" : "ar";
    setLang(nextLang);
  };

  return (
    <div className={`cashier-login-wrapper ${lang === "ar" ? "rtl" : "ltr"}`}>
      <div className="login-bg-glow-1"></div>
      <div className="login-bg-glow-2"></div>

      {/* Top Navbar */}
      <div className="login-top-bar">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "20px" }}>🍽️</span>
          <span style={{ fontWeight: "800", fontSize: "16px", color: "#f8fafc" }}>
            TableTab <span style={{ color: "#3b82f6", fontWeight: "600" }}>POS</span>
          </span>
        </div>

        <button type="button" className="lang-switch-btn" onClick={toggleLang}>
          🌐 {lang === "ar" ? "English" : "العربية"}
        </button>
      </div>

      {/* Glassmorphic Login Card */}
      <div className="login-glass-card">
        <div className="login-header-area">
          <div className="login-brand-icon">
            📟
          </div>
          <h1 className="login-title">
            {lang === "ar" ? "تسجيل دخول الكاشير" : "Cashier Portal Login"}
          </h1>
          <p className="login-subtitle">
            {lang === "ar"
              ? "قم بتسجيل الدخول لبدء استلام وتجهيز الطلبات"
              : "Sign in with your staff account to start managing orders"}
          </p>
        </div>

        {errorMsg && (
          <div className="login-error-alert">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          {/* Email / Gmail Field */}
          <div className="login-field-group">
            <label className="login-field-label">
              {lang === "ar" ? "البريد الإلكتروني (Gmail / Staff)" : "Email Address"}
            </label>
            <div className="login-input-box">
              <span className="login-input-icon">✉️</span>
              <input
                type="email"
                className="login-input-field"
                placeholder={lang === "ar" ? "cashier@restaurant.com" : "cashier@restaurant.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="login-field-group">
            <label className="login-field-label">
              {lang === "ar" ? "كلمة المرور" : "Password"}
            </label>
            <div className="login-input-box">
              <span className="login-input-icon">🔒</span>
              <input
                type={showPassword ? "text" : "password"}
                className="login-input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide" : "Show"}
              >
                {showPassword ? "👁️" : "🙈"}
              </button>
            </div>
          </div>

          {/* Optional Venue Slug / Code */}
          <div className="login-field-group">
            <label className="login-field-label">
              {lang === "ar" ? "معرّف المطعم (Slug / كود المتجر)" : "Restaurant Slug / Venue Code"}
            </label>
            <div className="login-input-box">
              <span className="login-input-icon">🏢</span>
              <input
                type="text"
                className="login-input-field"
                placeholder="e.g. coffee-house (Optional)"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
              />
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            className="login-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="login-btn-spinner"></span>
                <span>{lang === "ar" ? "جاري تسجيل الدخول..." : "Authenticating..."}</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>{lang === "ar" ? "دخول إلى نقطة البيع" : "Enter POS Terminal"}</span>
              </>
            )}
          </button>
        </form>

        <div className="login-footer-info">
          <span>
            {lang === "ar"
              ? "نظام نقطة البيع السحابي متعدد المتاجر"
              : "Multi-Tenant Cloud Point of Sale Engine"}
          </span>
          <strong>TableTab SaaS Platform v2.0</strong>
        </div>
      </div>
    </div>
  );
}
