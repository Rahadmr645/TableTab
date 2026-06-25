import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../utils/apiBaseUrl.js";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [canRegister, setCanRegister] = useState(false);
  const [setupChecked, setSetupChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = `${API_BASE_URL}/api/platform/setup-status`;
        const res = await axios.get(url);
        if (!cancelled && res.data?.canRegister === true) {
          setCanRegister(true);
        }
      } catch {
        if (!cancelled) setCanRegister(false);
      } finally {
        if (!cancelled) setSetupChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistTokenAndGo = (token) => {
    if (!token) {
      setError("Success but no token was returned.");
      return;
    }
    localStorage.setItem("platformToken", token);
    navigate("/", { replace: true });
  };

  const submitSignIn = async (e) => {
    e.preventDefault();
    setError("");
    const trimmed = email.trim();
    if (!trimmed || !password) {
      setError("Enter email and password.");
      return;
    }
    setLoading(true);
    try {
      const url = `${API_BASE_URL}/api/platform/login`;
      const res = await axios.post(url, { email: trimmed, password });
      persistTokenAndGo(res.data?.token);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Login failed. Check server logs.",
      );
    } finally {
      setLoading(false);
    }
  };

  const submitRegister = async (e) => {
    e.preventDefault();
    setError("");
    const trimmed = email.trim();
    if (!trimmed || !password) {
      setError("Enter email and password.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const url = `${API_BASE_URL}/api/platform/register`;
      const res = await axios.post(url, { email: trimmed, password });
      persistTokenAndGo(res.data?.token);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Could not create account.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="po-login">
      <div className="po-login-card">
        <h1 className="po-login-title">Platform dashboard</h1>
        {mode === "signin" ? (
          <>
            <p className="po-login-sub">
              Sign in with your platform operator credentials. If the server uses{" "}
              <code className="po-code">PLATFORM_OWNER_*</code> env vars, use those;
              otherwise use the account you created here.
            </p>
            <form onSubmit={submitSignIn}>
              <label className="po-label">
                Email
                <input
                  className="form-control po-input"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="po-label">
                Password
                <input
                  className="form-control po-input"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              {error ? (
                <div className="alert alert-danger py-2 small mt-2" role="alert">
                  {error}
                </div>
              ) : null}
              <button
                type="submit"
                className="btn btn-primary w-100 mt-3 po-submit"
                disabled={loading}
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
            {setupChecked && canRegister ? (
              <p className="po-login-footer">
                First time?{" "}
                <button
                  type="button"
                  className="po-link-btn"
                  onClick={() => {
                    setMode("register");
                    setError("");
                    setConfirmPassword("");
                  }}
                >
                  Create platform owner account
                </button>
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p className="po-login-sub">
              This creates the only platform operator record in your database. After
              it exists, this option is hidden and you sign in normally. Use a strong
              password.
            </p>
            <form onSubmit={submitRegister}>
              <label className="po-label">
                Email
                <input
                  className="form-control po-input"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="po-label">
                Password
                <input
                  className="form-control po-input"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <label className="po-label">
                Confirm password
                <input
                  className="form-control po-input"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </label>
              {error ? (
                <div className="alert alert-danger py-2 small mt-2" role="alert">
                  {error}
                </div>
              ) : null}
              <button
                type="submit"
                className="btn btn-primary w-100 mt-3 po-submit"
                disabled={loading}
              >
                {loading ? "Creating…" : "Create account"}
              </button>
            </form>
            <p className="po-login-footer">
              <button
                type="button"
                className="po-link-btn"
                onClick={() => {
                  setMode("signin");
                  setError("");
                  setConfirmPassword("");
                }}
              >
                Back to sign in
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
