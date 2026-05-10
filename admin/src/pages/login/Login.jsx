import React, { useEffect, useContext, useState } from "react";
import { flushSync } from "react-dom";
import "./Login.css";
import { AuthContext } from "../../context/AuthContext";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";

function inferSlugFromHostname() {
  try {
    const host = window.location.hostname;
    if (!host || host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      return "";
    }
    const parts = host.split(".").filter(Boolean);
    if (parts.length >= 3 && parts[0] !== "www") {
      return parts[0];
    }
  } catch {
    /* ignore */
  }
  return "";
}

const Login = () => {
  const { setShowLogin, URL, setExpiresAt } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState("staff");
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    tenantSlug: "",
  });

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("tabletab_trial_login_prefill");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      sessionStorage.removeItem("tabletab_trial_login_prefill");
      const email = parsed.email ? String(parsed.email).trim() : "";
      const password = parsed.password != null ? String(parsed.password) : "";
      const tenantSlug = parsed.tenantSlug ? String(parsed.tenantSlug) : "";
      const tenantId = parsed.tenantId ? String(parsed.tenantId) : "";
      if (email && password) {
        setFormData((f) => ({
          ...f,
          email,
          password,
          ...(tenantSlug ? { tenantSlug } : {}),
        }));
        setLoginMode("admin");
        if (tenantSlug || tenantId) {
          window.alert(
            `Account ready. Use Owner / admin sign-in below.\n\nRestaurant code (slug): ${tenantSlug || "—"}\nTenant id: ${tenantId || "—"}`,
          );
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /** Owner / admin: send email OTP, then VerifyOtp completes sign-in with password. */
  const sendOtpHandler = async () => {
    flushSync(() => setLoading(true));
    try {
      const email = formData.email.trim();
      if (!email) {
        alert("Enter your owner or manager email.");
        return;
      }
      if (!formData.password) {
        alert("Enter your password.");
        return;
      }
      if (URL == null || URL === "") {
        alert(
          "Missing VITE_API_URL in admin/.env. Set your API base URL and rebuild the admin app.",
        );
        return;
      }
      const slugHint =
        formData.tenantSlug.trim() || inferSlugFromHostname();

      localStorage.setItem(
        "otpFormData",
        JSON.stringify({
          email,
          password: formData.password,
          tenantSlug: slugHint,
          loginMode: "admin",
        }),
      );

      const res = await axios.post(
        `${URL}/api/otp/send-otp`,
        {
          email,
          ...(slugHint ? { tenantSlug: slugHint } : {}),
        },
        { headers: { "Content-Type": "application/json" } },
      );

      if (res.status === 200) {
        const backendExpiry = res.data.expiresAt;
        const tenantIdFromApi = res.data.tenantId;
        if (tenantIdFromApi) {
          try {
            const prev = JSON.parse(
              localStorage.getItem("otpFormData") || "{}",
            );
            localStorage.setItem(
              "otpFormData",
              JSON.stringify({
                ...prev,
                tenantId: String(tenantIdFromApi),
              }),
            );
          } catch {
            /* ignore */
          }
        }
        if (backendExpiry) {
          localStorage.setItem("otpExpiresAt", String(backendExpiry));
          setExpiresAt(Number(backendExpiry));
        }
        navigate("/verify-otp");
      }
    } catch (error) {
      const code = error.response?.data?.code;
      if (code === "TENANT_REQUIRED") {
        alert(
          "Enter your restaurant code (slug) — this email is registered at more than one venue.",
        );
      }
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to send OTP";
      if (code !== "TENANT_REQUIRED") {
        alert(msg);
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const adminDirectSignInHandler = async () => {
    flushSync(() => setLoading(true));
    try {
      const email = formData.email.trim();
      if (!email) {
        alert(
          loginMode === "staff"
            ? "Enter the email address your owner registered for you."
            : "Enter your owner or manager email.",
        );
        return;
      }
      if (!formData.password) {
        alert("Enter your password.");
        return;
      }
      if (URL == null) {
        alert(
          "Missing VITE_API_URL in admin/.env. Set your API base URL and rebuild the admin app.",
        );
        return;
      }
      const slugHint =
        formData.tenantSlug.trim() || inferSlugFromHostname();

      const loginRes = await axios.post(
        `${URL}/api/admin/login`,
        {
          email,
          password: formData.password,
          ...(slugHint ? { tenantSlug: slugHint } : {}),
        },
        { headers: { "Content-Type": "application/json" } },
      );

      const token = loginRes.data.token;
      if (token) {
        localStorage.setItem("token", token);
      }
      if (loginRes.data?.tenant && typeof loginRes.data.tenant === "object") {
        try {
          sessionStorage.setItem(
            "tabletab_staff_tenant",
            JSON.stringify(loginRes.data.tenant),
          );
        } catch {
          /* ignore */
        }
      }
      localStorage.removeItem("otpFormData");
      localStorage.removeItem("otpExpiresAt");

      navigate("/", { replace: true });
      window.location.reload();
    } catch (error) {
      const code = error.response?.data?.code;
      if (code === "TENANT_REQUIRED") {
        alert(
          "Enter your restaurant code (slug) — your email is linked to more than one venue.",
        );
        return;
      }
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Sign in failed";
      alert(msg);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowLogin(false);
    if (location.pathname === "/login") {
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="loginForm-container">
      <form className="lgoinForm" onSubmit={(e) => e.preventDefault()}>
        <div className="login-header">
          <div className="login-header-text">
            <p className="login-title">
              {loginMode === "staff" ? "Staff sign in" : "Owner / admin sign in"}
            </p>
            <p className="login-subtitle">
              {loginMode === "staff"
                ? "Invite-only access — your owner must add your account before you can sign in. Use the email and password they set for you."
                : "Sign in with the owner or manager account. We’ll email you a code to verify it’s you, then you’re signed in."}
            </p>
          </div>
          <button
            type="button"
            className="login-close"
            onClick={handleClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="login-mode-switch" role="tablist" aria-label="Sign-in type">
          <button
            type="button"
            role="tab"
            id="login-tab-staff"
            aria-selected={loginMode === "staff"}
            aria-controls="login-panel-staff"
            className={`login-mode-button${loginMode === "staff" ? " login-mode-button--active" : ""}`}
            onClick={() => setLoginMode("staff")}
          >
            Staff
          </button>
          <button
            type="button"
            role="tab"
            id="login-tab-admin"
            aria-selected={loginMode === "admin"}
            aria-controls="login-panel-admin"
            className={`login-mode-button${loginMode === "admin" ? " login-mode-button--active" : ""}`}
            onClick={() => setLoginMode("admin")}
          >
            Owner / admin
          </button>
        </div>

        {loginMode === "staff" ? (
          <div
            id="login-panel-staff"
            role="tabpanel"
            aria-labelledby="login-tab-staff"
            className="login-help login-help--info"
          >
            Need access? Ask your restaurant owner or manager to create your
            staff profile first, then sign in here with your work email and
            password.
          </div>
        ) : (
          <div
            id="login-panel-admin"
            role="tabpanel"
            aria-labelledby="login-tab-admin"
            className="login-help login-help--admin"
          >
            For restaurant owners and managers only. Enter your email and
            password, then we&apos;ll send a one-time code to your email before
            signing you in.
          </div>
        )}

        <div className="mb-3">
          <label htmlFor="login-email" className="form-label">
            Work email
          </label>
          <input
            type="email"
            className="form-control"
            id="login-email"
            autoComplete="email"
            onChange={handleChange}
            name="email"
            value={formData.email}
            placeholder="you@restaurant.com"
          />
        </div>

        <div className="mb-3">
          <label htmlFor="login-password" className="form-label">
            Password
          </label>
          <input
            type="password"
            className="form-control"
            id="login-password"
            autoComplete="current-password"
            onChange={handleChange}
            name="password"
            value={formData.password}
            placeholder="••••••••"
          />
        </div>

        <div className="mb-3">
          <label htmlFor="login-tenant-slug" className="form-label">
            Restaurant code <span className="text-muted">(slug)</span>
          </label>
          <input
            type="text"
            className="form-control"
            id="login-tenant-slug"
            autoComplete="organization"
            onChange={handleChange}
            name="tenantSlug"
            value={formData.tenantSlug}
            placeholder="e.g. my-restaurant — optional if your email is unique"
          />
          <p className="login-help login-help--slug-hint">
            Shown on signup materials or in your venue URL. Required only if we
            prompt you (same email at multiple venues), or use a subdomain like{" "}
            <code>slug.yourdomain.com</code>.
          </p>
        </div>

        {loginMode === "admin" ? (
          <p className="login-subscribe-prompt">
            <button
              type="button"
              className="login-subscribe-link"
              onClick={() => navigate("/subscription-plans")}
            >
              Haven&apos;t subscribed yet? View plans
            </button>
          </p>
        ) : null}

        {loginMode === "staff" ? (
          <button
            type="button"
            onClick={adminDirectSignInHandler}
            disabled={loading}
            aria-busy={loading}
            className="btn submitn-btn btn-primary submit-btn"
          >
            {loading ? (
              <>
                <span className="login-btn-spinner" aria-hidden />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={sendOtpHandler}
            disabled={loading}
            aria-busy={loading}
            className="btn submitn-btn btn-primary submit-btn"
          >
            {loading ? (
              <>
                <span className="login-btn-spinner" aria-hidden />
                Sending code…
              </>
            ) : (
              "Send verification code"
            )}
          </button>
        )}
      </form>
    </div>
  );
};

export default Login;
