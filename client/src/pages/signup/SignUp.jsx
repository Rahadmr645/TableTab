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
import { IoChevronBack } from "react-icons/io5";
import { AuthContext } from "../../context/CartContext.jsx";
import "./SignUp.css";
import AsyncLoadingOverlay from "../../components/common/AsyncLoadingOverlay.jsx";

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
  });
  const dialogRef = useRef(null);
  const isLogin = authMode === "login";

  const handleClose = useCallback(() => {
    if (isModal) {
      navigate(-1);
      return;
    }
    navigate("/menu", { replace: true });
  }, [isModal, navigate]);

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

  const finishAuthSuccess = useCallback(
    (res) => {
      const rawUser = res.data?.user;
      if (rawUser && typeof rawUser === "object") {
        const { password: _omit, ...safeUser } = rawUser;
        setUser(safeUser);
      }
      const token = res.data?.token ?? res.data?.Token;
      if (token) localStorage.setItem("token", token);
      const next =
        background?.pathname != null
          ? `${background.pathname}${background.search || ""}${background.hash || ""}`
          : "/menu";
      navigate(next, { replace: true });
    },
    [background, navigate, setUser],
  );

  const submitHandler = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isLogin) {
        const res = await api.post("/api/user/login", {
          email: formData.email.trim(),
          password: formData.password,
        });
        finishAuthSuccess(res);
      } else {
        const res = await api.post("/api/user/create", {
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
          profilePic: "",
        });
        finishAuthSuccess(res);
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        (isLogin ? "Could not sign in" : "Could not create account");
      alert(String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const formInner = (
    <div className="signup-card">
      <div
        className="signup-auth-tabs"
        role="tablist"
        aria-label="New or returning customer"
      >
        <button
          type="button"
          role="tab"
          aria-selected={!isLogin}
          className={`signup-auth-tab${!isLogin ? " signup-auth-tab--active" : ""}`}
          onClick={() => setAuthMode("signup")}
        >
          Sign up
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isLogin}
          className={`signup-auth-tab${isLogin ? " signup-auth-tab--active" : ""}`}
          onClick={() => setAuthMode("login")}
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
      <form onSubmit={submitHandler}>
        {!isLogin && (
          <div className="signup-field">
            <label htmlFor="signup-username">Username</label>
            <input
              id="signup-username"
              name="username"
              type="text"
              autoComplete="username"
              value={formData.username}
              onChange={handleChange}
              required={!isLogin}
            />
          </div>
        )}
        <div className="signup-field">
          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="signup-field">
          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            value={formData.password}
            onChange={handleChange}
            required
            minLength={isLogin ? 1 : 6}
          />
        </div>
        <button
          type="submit"
          className="signup-submit"
          disabled={submitting}
        >
          {submitting
            ? isLogin
              ? "Signing in…"
              : "Creating…"
            : isLogin
              ? "Log in"
              : "Sign up"}
        </button>
      </form>
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
