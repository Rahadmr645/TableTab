import React, { useEffect, useContext, useState } from "react";
import { flushSync } from "react-dom";
import "./Login.css";
import { AuthContext } from "../../context/AuthContext";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import {
  TENANT_ID,
  TENANT_SLUG,
  otpApiHeaders,
} from "../../utils/apiBaseUrl.js";

const Login = () => {
  const { setShowLogin, URL, setExpiresAt } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState("staff");
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

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
        setFormData((f) => ({ ...f, email, password }));
        setLoginMode("admin");
        if (tenantSlug || tenantId) {
          window.alert(
            `Account ready. Use Owner / admin sign-in below.\n\nAdd to admin/.env (then restart dev server):\nVITE_TENANT_SLUG=${tenantSlug || "your-slug"}\nVITE_TENANT_ID=${tenantId || "your-tenant-id"}`,
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

  const sendOtpHandler = async () => {
    const email = formData.email.trim();
    if (!email) {
      alert("Enter the email address your owner registered for you.");
      return;
    }
    if (!formData.password) {
      alert("Enter your password.");
      return;
    }
    if (!TENANT_ID) {
      alert(
        "Missing VITE_TENANT_ID in admin/.env. Add your tenant MongoDB id and restart the dev server.",
      );
      return;
    }
    if (!TENANT_SLUG) {
      alert(
        "Missing VITE_TENANT_SLUG in admin/.env (must match your restaurant slug in the database). Restart Vite after saving.",
      );
      return;
    }

    try {
      flushSync(() => setLoading(true));

      localStorage.setItem(
        "otpFormData",
        JSON.stringify({
          email,
          password: formData.password,
        }),
      );

      const res = await axios.post(
        `${URL}/api/otp/send-otp`,
        { email },
        { headers: otpApiHeaders() },
      );

      if (res.status === 200) {
        const backendExpiry = res.data.expiresAt;
        if (backendExpiry) {
          localStorage.setItem("otpExpiresAt", String(backendExpiry));
          setExpiresAt(Number(backendExpiry));
        }
        navigate("/verify-otp");
      }
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to send OTP";
      alert(msg);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const adminDirectSignInHandler = async () => {
    const email = formData.email.trim();
    if (!email) {
      alert("Enter your owner or manager email.");
      return;
    }
    if (!formData.password) {
      alert("Enter your password.");
      return;
    }
    if (!TENANT_SLUG) {
      alert(
        "Missing VITE_TENANT_SLUG in admin/.env (must match your restaurant slug in the database). Restart Vite after saving.",
      );
      return;
    }

    try {
      flushSync(() => setLoading(true));

      const loginRes = await axios.post(
        `${URL}/api/admin/login`,
        {
          email,
          password: formData.password,
          tenantSlug: TENANT_SLUG,
        },
        { headers: { "Content-Type": "application/json" } },
      );

      const token = loginRes.data.token;
      if (token) {
        localStorage.setItem("token", token);
      }
      localStorage.removeItem("otpFormData");
      localStorage.removeItem("otpExpiresAt");

      navigate("/", { replace: true });
      window.location.reload();
    } catch (error) {
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
                ? "Invite-only access — your owner must add your account before you can sign in."
                : "Sign in with the owner or manager account for this restaurant. No email code required."}
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
            staff profile first. We&apos;ll email you a code to finish signing
            in.
          </div>
        ) : (
          <div
            id="login-panel-admin"
            role="tabpanel"
            aria-labelledby="login-tab-admin"
            className="login-help login-help--admin"
          >
            For restaurant owners and managers only. Use the email and password
            for your admin account.
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
        ) : (
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
        )}
      </form>
    </div>
  );
};

export default Login;
