import React, { useState } from "react";
import { useCashier } from "../../context/CashierContext.jsx";
import "./CashierSuspendedScreen.css";

export default function CashierSuspendedScreen() {
  const {
    lang,
    setLang,
    currentUser,
    currentTenant,
    handleStaffLogout,
    checkStaffStatus,
  } = useCashier();

  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const toggleLang = () => {
    setLang(lang === "ar" ? "en" : "ar");
  };

  const handleRecheck = async () => {
    setChecking(true);
    setFeedback(null);
    try {
      const res = await checkStaffStatus();
      if (res?.active) {
        setFeedback({
          type: "success",
          msg:
            lang === "ar"
              ? "تم إلغاء تعليق الحساب بنجاح! جاري الدخول..."
              : "Account reinstated! Entering POS...",
        });
      } else {
        setFeedback({
          type: "warning",
          msg:
            lang === "ar"
              ? "لا يزال الحساب موقوفاً من قبل مالك المطعم."
              : "Account is still suspended by the restaurant owner.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        msg:
          lang === "ar"
            ? "تعذر التحقق من حالة الحساب. تأكد من اتصال الإنترنت."
            : "Could not verify account status. Please check your network.",
      });
    } finally {
      setChecking(false);
    }
  };

  const staffName = currentUser?.username || currentUser?.name || (lang === "ar" ? "كاشير" : "Cashier");
  const staffEmail = currentUser?.email || "—";
  const venueName = currentTenant?.businessName || currentTenant?.name || (currentTenant?.slug ? `@${currentTenant.slug}` : "TableTab Venue");

  return (
    <div className={`suspended-screen-wrapper ${lang === "ar" ? "rtl" : "ltr"}`}>
      <div className="suspended-bg-glow-1"></div>
      <div className="suspended-bg-glow-2"></div>

      {/* Top Bar */}
      <header className="suspended-top-bar">
        <div className="suspended-brand">
          <span className="suspended-brand-emoji">🍽️</span>
          <span className="suspended-brand-title">
            TableTab <span className="suspended-brand-accent">POS</span>
          </span>
          <span className="suspended-badge-restricted">
            {lang === "ar" ? "وصول مقيد" : "RESTRICTED ACCESS"}
          </span>
        </div>

        <button type="button" className="suspended-lang-btn" onClick={toggleLang}>
          🌐 {lang === "ar" ? "English" : "العربية"}
        </button>
      </header>

      {/* Main Glass Card */}
      <main className="suspended-card-container">
        <div className="suspended-glass-card">
          {/* Pulsing Lock / Shield Icon */}
          <div className="suspended-icon-wrapper">
            <div className="suspended-icon-halo"></div>
            <div className="suspended-icon-core">
              <span className="suspended-icon-symbol">🔒</span>
            </div>
          </div>

          <div className="suspended-status-pill">
            <span className="suspended-status-dot"></span>
            <span>{lang === "ar" ? "حساب موقوف بواسطة الإدارة" : "Suspended by Restaurant Owner"}</span>
          </div>

          <h1 className="suspended-title">
            {lang === "ar" ? "تم تعليق وصول الكاشير" : "Cashier Access Suspended"}
          </h1>

          <p className="suspended-description">
            {lang === "ar"
              ? "تم إيقاف صلاحيات هذا الحساب مؤقتاً من قبل مالك أو مدير المطعم. لا يمكنك تنفيذ عمليات البيع أو إدخال الطلبات في الوقت الحالي."
              : "Your cashier staff profile has been deactivated by the restaurant owner or manager. You are prevented from processing orders, taking payments, or accessing register data."}
          </p>

          {/* Staff & Venue Info Box */}
          <div className="suspended-info-box">
            <div className="suspended-info-row">
              <span className="suspended-info-label">
                {lang === "ar" ? "اسم الكاشير:" : "Staff Member:"}
              </span>
              <strong className="suspended-info-value">{staffName}</strong>
            </div>
            <div className="suspended-info-row">
              <span className="suspended-info-label">
                {lang === "ar" ? "البريد الإلكتروني:" : "Email Address:"}
              </span>
              <span className="suspended-info-value suspended-mono">{staffEmail}</span>
            </div>
            <div className="suspended-info-row">
              <span className="suspended-info-label">
                {lang === "ar" ? "الفرع / المطعم:" : "Restaurant Venue:"}
              </span>
              <span className="suspended-info-value">{venueName}</span>
            </div>
            <div className="suspended-info-row">
              <span className="suspended-info-label">
                {lang === "ar" ? "الحالة الحالية:" : "Current Status:"}
              </span>
              <span className="suspended-info-badge">
                🚫 {lang === "ar" ? "موقوف (Suspended)" : "Suspended"}
              </span>
            </div>
          </div>

          {/* Feedback Alert */}
          {feedback && (
            <div className={`suspended-feedback-alert ${feedback.type}`}>
              <span>{feedback.type === "success" ? "✅" : "⚠️"}</span>
              <span>{feedback.msg}</span>
            </div>
          )}

          {/* Realtime note */}
          <div className="suspended-sync-note">
            <span className="suspended-pulse-dot"></span>
            <span>
              {lang === "ar"
                ? "المزامنة المباشرة مفعلة — سيتم فك الحظر تلقائياً فور تفعيل الحساب من قبل الإدارة."
                : "Real-time sync active — screen will automatically unlock once reinstated by the owner."}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="suspended-actions-group">
            <button
              type="button"
              className="suspended-btn suspended-btn-primary"
              onClick={handleRecheck}
              disabled={checking}
            >
              {checking ? (
                <>
                  <span className="suspended-spinner"></span>
                  <span>{lang === "ar" ? "جاري التحقق..." : "Checking Status..."}</span>
                </>
              ) : (
                <>
                  <span>🔄</span>
                  <span>{lang === "ar" ? "إعادة التحقق من الحالة" : "Check Reinstatement"}</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="suspended-btn suspended-btn-secondary"
              onClick={handleStaffLogout}
            >
              <span>🚪</span>
              <span>{lang === "ar" ? "تسجيل الخروج / تبديل الحساب" : "Sign Out / Switch Account"}</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="suspended-footer">
          <span>TableTab Cloud Point of Sale • Security & Role Management</span>
        </div>
      </main>
    </div>
  );
}
