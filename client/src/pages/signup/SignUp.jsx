import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../../utils/api.js";
import {
  IoChevronBack,
  IoPersonOutline,
  IoMailOutline,
  IoLockClosedOutline,
  IoRestaurantOutline,
  IoEyeOutline,
  IoEyeOffOutline,
  IoTerminalOutline,
  IoCloseOutline,
  IoAlertCircleOutline,
  IoCheckmarkCircleOutline,
  IoChevronDownOutline,
} from "react-icons/io5";
import { AuthContext } from "../../context/CartContext.jsx";
import "./SignUp.css";
import AsyncLoadingOverlay from "../../components/common/AsyncLoadingOverlay.jsx";
import {
  getStoredTenantSlug,
  inferTenantSlugFromHostname,
} from "../../utils/tenantContext.js";

const SignUp = () => {
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const background = location.state?.background;
  const isModal = Boolean(background);

  const [authMode, setAuthMode] = useState("signup");
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    tenantSlug:
      typeof sessionStorage !== "undefined"
        ? getStoredTenantSlug() || inferTenantSlugFromHostname()
        : "",
  });
  
  // Custom enhanced UI states
  const [showPassword, setShowPassword] = useState(false);
  const [focusedFields, setFocusedFields] = useState({});
  const [statusMsg, setStatusMsg] = useState({ type: null, text: "" });
  const [logs, setLogs] = useState([]);
  const [showLogsConsole, setShowLogsConsole] = useState(false);

  const dialogRef = useRef(null);
  const logsEndRef = useRef(null);
  const isLogin = authMode === "login";

  // System Log helper
  const addLog = useCallback((message, level = "info") => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs((prev) => [...prev, { time: timeStr, level, message }]);
    console.log(`[AUTH-LOGGER] [${level.toUpperCase()}] ${message}`);
  }, []);

  // Initialize logs
  useEffect(() => {
    addLog("System initialized. Welcome to TableTab Auth portal.", "info");
    const storedSlug = getStoredTenantSlug();
    const inferredSlug = inferTenantSlugFromHostname();
    if (storedSlug) {
      addLog(`Loaded restaurant code from session: "${storedSlug}"`, "info");
    } else if (inferredSlug) {
      addLog(`Inferred restaurant code from hostname: "${inferredSlug}"`, "info");
    } else {
      addLog("No pre-defined restaurant code. Input field unlocked.", "info");
    }
  }, [addLog]);

  // Scroll to bottom of logs when console is open
  useEffect(() => {
    if (showLogsConsole && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, showLogsConsole]);

  const handleClose = useCallback(() => {
    addLog("Closing authentication page.", "info");
    if (isModal) {
      navigate(-1);
      return;
    }
    navigate("/menu", { replace: true });
  }, [isModal, navigate, addLog]);

  useEffect(() => {
    if (!isModal) return;
    document.body.classList.add("signup-modal-active");
    return () => {
      document.body.classList.remove("signup-modal-active");
    };
  }, [isModal]);

  useEffect(() => {
    if (!isModal) return;

    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const mobile = window.matchMedia("(max-width: 768px)").matches;

    const prevHtml = {
      overflow: html.style.overflow,
      overscrollBehavior: html.style.overscrollBehavior,
      height: html.style.height,
    };
    const prevBody = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
      overscrollBehavior: body.style.overscrollBehavior,
      touchAction: body.style.touchAction,
    };

    const isInsideDialog = (target) =>
      Boolean(target && dialogRef.current?.contains(target));

    const blockScrollBehind = (e) => {
      if (isInsideDialog(e.target)) return;
      e.preventDefault();
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKeyDown);

    document.addEventListener("touchmove", blockScrollBehind, {
      passive: false,
    });
    document.addEventListener("wheel", blockScrollBehind, { passive: false });

    if (mobile) {
      html.style.overflow = "hidden";
      html.style.overscrollBehavior = "none";
      html.style.height = "100%";

      body.style.position = "fixed";
      body.style.top = `-${scrollY}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
      body.style.overflow = "hidden";
      body.style.overscrollBehavior = "none";
      body.style.touchAction = "none";
    } else {
      html.style.overflow = "hidden";
      html.style.overscrollBehavior = "none";
      body.style.overflow = "hidden";
      body.style.overscrollBehavior = "none";
    }

    return () => {
      document.removeEventListener("touchmove", blockScrollBehind);
      document.removeEventListener("wheel", blockScrollBehind);
      window.removeEventListener("keydown", onKeyDown);

      html.style.overflow = prevHtml.overflow;
      html.style.overscrollBehavior = prevHtml.overscrollBehavior;
      html.style.height = prevHtml.height;

      body.style.position = prevBody.position;
      body.style.top = prevBody.top;
      body.style.left = prevBody.left;
      body.style.right = prevBody.right;
      body.style.width = prevBody.width;
      body.style.overflow = prevBody.overflow;
      body.style.overscrollBehavior = prevBody.overscrollBehavior;
      body.style.touchAction = prevBody.touchAction;

      if (mobile) {
        window.scrollTo(0, scrollY);
      }
    };
  }, [isModal, handleClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFocus = (name) => {
    setFocusedFields((prev) => ({ ...prev, [name]: true }));
  };

  const handleBlur = (name) => {
    setFocusedFields((prev) => ({ ...prev, [name]: false }));
  };

  const finishAuthSuccess = useCallback(
    (res) => {
      const rawUser = res.data?.user;
      if (rawUser && typeof rawUser === "object") {
        const { password: _omit, ...safeUser } = rawUser;
        setUser(safeUser);
      }
      const token = res.data?.token ?? res.data?.Token;
      if (token) {
        localStorage.setItem("token", token);
        addLog("Security token saved to localStorage.", "success");
      }
      const next =
        background?.pathname != null
          ? `${background.pathname}${background.search || ""}${background.hash || ""}`
          : "/menu";
      
      addLog(`Auth successful. Redirecting to "${next}"...`, "success");
      navigate(next, { replace: true });
    },
    [background, navigate, setUser, addLog],
  );

  const handleModeSwitch = (mode) => {
    setAuthMode(mode);
    setStatusMsg({ type: null, text: "" });
    addLog(`Switched view to ${mode === "login" ? "Log in" : "Sign up"}.`, "info");
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMsg({ type: null, text: "" });

    try {
      const slugHint =
        formData.tenantSlug.trim() ||
        getStoredTenantSlug() ||
        inferTenantSlugFromHostname();

      if (!isLogin && !slugHint) {
        const warnText = "Restaurant code (venue slug) is required for sign-up.";
        setStatusMsg({ type: "info", text: warnText });
        addLog(`Sign-up blocked: ${warnText}`, "error");
        setSubmitting(false);
        return;
      }

      if (isLogin) {
        addLog(`Initiating login request for: ${formData.email.trim()}`, "info");
        addLog("POST /api/user/login - pending response...", "api");
        const res = await api.post("/api/user/login", {
          email: formData.email.trim(),
          password: formData.password,
          ...(slugHint ? { tenantSlug: slugHint } : {}),
        });
        
        addLog("POST /api/user/login - 200 OK", "success");
        setStatusMsg({ type: "success", text: "Successfully signed in! Redirecting..." });
        setTimeout(() => finishAuthSuccess(res), 1000);
      } else {
        addLog(`Initiating signup request for: ${formData.username.trim()}`, "info");
        addLog("POST /api/user/create - pending response...", "api");
        const res = await api.post("/api/user/create", {
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
          profilePic: "",
          tenantSlug: slugHint,
        });

        addLog("POST /api/user/create - 200 OK", "success");
        setStatusMsg({ type: "success", text: "Account created successfully! Redirecting..." });
        setTimeout(() => finishAuthSuccess(res), 1000);
      }
    } catch (err) {
      const code = err.response?.data?.code;
      const backendMsg = err.response?.data?.message;
      const genericMsg = err.message || (isLogin ? "Could not sign in" : "Could not create account");
      const msg = backendMsg || genericMsg;

      addLog(`Request failed. Error [${code || "API_ERROR"}]: ${msg}`, "error");

      if (code === "TENANT_REQUIRED") {
        if (isLogin) {
          setStatusMsg({
            type: "info",
            text: "Enter your restaurant code — this email exists at more than one venue.",
          });
        } else {
          setStatusMsg({
            type: "info",
            text: "Enter your restaurant code to sign up.",
          });
        }
      } else {
        setStatusMsg({ type: "error", text: String(msg) });
      }
      setSubmitting(false);
    }
  };

  const getFieldWrapperClass = (name) => {
    const isFocused = focusedFields[name];
    const hasValue = String(formData[name] || "").length > 0;
    return `signup-input-wrapper${isFocused ? " signup-input-wrapper--focused" : ""}${
      hasValue ? " signup-input-wrapper--has-value" : ""
    }`;
  };

  const formInner = (
    <div className="signup-card">
      {/* Sliding tabs header */}
      <div
        className={`signup-auth-tabs${isLogin ? " signup-auth-tabs--login-active" : ""}`}
        role="tablist"
        aria-label="New or returning customer"
      >
        <div className="signup-tabs-slider" aria-hidden="true" />
        <button
          type="button"
          role="tab"
          aria-selected={!isLogin}
          className={`signup-auth-tab${!isLogin ? " signup-auth-tab--active" : ""}`}
          onClick={() => handleModeSwitch("signup")}
        >
          Sign up
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isLogin}
          className={`signup-auth-tab${isLogin ? " signup-auth-tab--active" : ""}`}
          onClick={() => handleModeSwitch("login")}
        >
          Log in
        </button>
      </div>

      <h1 id="auth-title">{isLogin ? "Welcome back" : "Create account"}</h1>
      <p className="signup-lead">
        {isLogin
          ? "Sign in with your email and password to continue."
          : "Sign up to save your details and speed up future orders."}
      </p>

      {/* Styled Inline custom alert message */}
      {statusMsg.text && (
        <div className={`auth-alert auth-alert--${statusMsg.type || "info"}`} role="alert">
          <span className="auth-alert-icon">
            {statusMsg.type === "success" ? (
              <IoCheckmarkCircleOutline />
            ) : (
              <IoAlertCircleOutline />
            )}
          </span>
          <span className="auth-alert-message">{statusMsg.text}</span>
          <button
            type="button"
            className="auth-alert-close"
            onClick={() => setStatusMsg({ type: null, text: "" })}
            aria-label="Dismiss alert"
          >
            <IoCloseOutline />
          </button>
        </div>
      )}

      <form onSubmit={submitHandler}>
        {!isLogin && (
          <div className="signup-field-group">
            <div className={getFieldWrapperClass("username")}>
              <span className="signup-input-icon">
                <IoPersonOutline />
              </span>
              <input
                id="signup-username"
                name="username"
                type="text"
                autoComplete="username"
                className="signup-input"
                value={formData.username}
                onChange={handleChange}
                onFocus={() => handleFocus("username")}
                onBlur={() => handleBlur("username")}
                required={!isLogin}
              />
              <label htmlFor="signup-username" className="signup-label">
                Username
              </label>
            </div>
          </div>
        )}

        <div className="signup-field-group">
          <div className={getFieldWrapperClass("email")}>
            <span className="signup-input-icon">
              <IoMailOutline />
            </span>
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              className="signup-input"
              value={formData.email}
              onChange={handleChange}
              onFocus={() => handleFocus("email")}
              onBlur={() => handleBlur("email")}
              required
            />
            <label htmlFor="signup-email" className="signup-label">
              Email Address
            </label>
          </div>
        </div>

        <div className="signup-field-group">
          <div className={getFieldWrapperClass("password")}>
            <span className="signup-input-icon">
              <IoLockClosedOutline />
            </span>
            <input
              id="signup-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isLogin ? "current-password" : "new-password"}
              className="signup-input"
              value={formData.password}
              onChange={handleChange}
              onFocus={() => handleFocus("password")}
              onBlur={() => handleBlur("password")}
              required
              minLength={isLogin ? 1 : 6}
            />
            <label htmlFor="signup-password" className="signup-label">
              Password
            </label>
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword((p) => !p)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
            </button>
          </div>
        </div>

        <div className="signup-field-group">
          <div className={getFieldWrapperClass("tenantSlug")}>
            <span className="signup-input-icon">
              <IoRestaurantOutline />
            </span>
            <input
              id="signup-tenant-slug"
              name="tenantSlug"
              type="text"
              autoComplete="organization"
              className="signup-input"
              value={formData.tenantSlug}
              onChange={handleChange}
              onFocus={() => handleFocus("tenantSlug")}
              onBlur={() => handleBlur("tenantSlug")}
              required={!isLogin}
            />
            <label htmlFor="signup-tenant-slug" className="signup-label">
              Restaurant code
            </label>
          </div>
          <p className="signup-field-hint">
            Usually filled automatically when you open your venue&apos;s menu link.
          </p>
        </div>

        <button
          type="submit"
          className="signup-submit"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <span className="signup-btn-spinner" aria-hidden="true" />
              <span>{isLogin ? "Signing in…" : "Creating account…"}</span>
            </>
          ) : (
            <span>{isLogin ? "Log in" : "Sign up"}</span>
          )}
        </button>
      </form>

      {/* Collapsible Logger Trigger */}
      <button
        type="button"
        className={`auth-logger-trigger${showLogsConsole ? " auth-logger-trigger--expanded" : ""}`}
        onClick={() => setShowLogsConsole((c) => !c)}
        aria-expanded={showLogsConsole}
      >
        <span className="auth-logger-trigger-icon">
          <IoChevronDownOutline />
        </span>
        <IoTerminalOutline />
        <span>{showLogsConsole ? "Hide Session Logs" : "Show Live Session Logs"}</span>
      </button>

      {/* Visual Terminal/Logger Console */}
      {showLogsConsole && (
        <div className="auth-logger-console">
          <div className="auth-logger-header">
            <div className="auth-logger-title-group">
              <div className="auth-logger-dot" />
              <span className="auth-logger-title">Auth console</span>
            </div>
            <button
              type="button"
              className="auth-logger-clear-btn"
              onClick={() => {
                setLogs([]);
                addLog("Console log history cleared.", "info");
              }}
            >
              Clear
            </button>
          </div>
          <div className="auth-logger-body">
            {logs.length === 0 ? (
              <div className="auth-logger-empty">No logs captured.</div>
            ) : (
              logs.map((log, idx) => (
                <div className="auth-logger-line" key={idx}>
                  <span className="auth-log-time">[{log.time}]</span>
                  <span className={`auth-log-level auth-log-level--${log.level}`}>
                    {log.level.toUpperCase()}
                  </span>
                  <span className="auth-logger-line-message">{log.message}</span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* Back / Close button */}
      <div className="signup-backfoot">
        {isModal ? (
          <button
            type="button"
            className="signup-back-icon"
            onClick={handleClose}
            aria-label="Back to menu"
          >
            <IoChevronBack className="signup-back-icon__glyph" aria-hidden />
          </button>
        ) : (
          <Link to="/menu" className="signup-back-icon" aria-label="Back to menu">
            <IoChevronBack className="signup-back-icon__glyph" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );

  if (isModal) {
    return createPortal(
      <div className="signup-modal-root">
        <AsyncLoadingOverlay
          open={submitting}
          message={isLogin ? "Signing you in…" : "Creating your account…"}
        />
        <button
          type="button"
          className="signup-backdrop"
          aria-label="Close"
          onClick={handleClose}
        />
        <div
          ref={dialogRef}
          className="signup-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-title"
        >
          {formInner}
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <main className="signup-page">
      <AsyncLoadingOverlay
        open={submitting}
        message={isLogin ? "Signing you in…" : "Creating your account…"}
      />
      {formInner}
    </main>
  );
};

export default SignUp;
