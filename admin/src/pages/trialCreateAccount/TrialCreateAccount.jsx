import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import "./TrialCreateAccount.css";
import { API_BASE_URL } from "../../utils/apiBaseUrl.js";

function apiBase() {
  if (API_BASE_URL === null) return null;
  return API_BASE_URL || "";
}

const TrialCreateAccount = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const enrollmentToken = location.state?.enrollmentToken;
  const emailFromTrial = location.state?.email || "";

  const [username, setUsername] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enrollmentToken || !emailFromTrial) {
      navigate("/subscription-plans", { replace: true });
    }
  }, [enrollmentToken, emailFromTrial, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!username.trim()) {
      setError("Enter a username.");
      return;
    }
    if (!businessName.trim()) {
      setError("Enter your company / restaurant name.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    const base = apiBase();
    if (base === null) {
      setError("API URL is not configured.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await axios.post(
        `${base}/api/public/trial-enrollment/register`,
        {
          enrollmentToken,
          username: username.trim(),
          businessName: businessName.trim(),
          password,
        },
        { headers: { "Content-Type": "application/json" } },
      );

      const email = data.user?.email || emailFromTrial;
      try {
        sessionStorage.setItem(
          "tabletab_trial_login_prefill",
          JSON.stringify({
            email,
            password,
            tenantSlug: data.tenant?.slug,
            tenantId: data.tenant?._id,
          }),
        );
      } catch {
        /* ignore */
      }

      navigate("/login", { replace: true });
    } catch (ex) {
      setError(
        ex.response?.data?.message ||
          ex.message ||
          "Registration failed.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!enrollmentToken) {
    return null;
  }

  return (
    <div className="trial-create-page">
      <div className="trial-create-card admin-surface">
        <h1 className="trial-create-title">Create your account</h1>
        <p className="trial-create-lead">
          Use the same Gmail you used for the trial. Your restaurant URL slug is
          created automatically from the company name.
        </p>

        <form className="trial-create-form" onSubmit={handleSubmit} noValidate>
          {error ? (
            <p className="trial-create-error" role="alert">
              {error}
            </p>
          ) : null}

          <label className="trial-create-label" htmlFor="tc-email">
            Email (locked)
          </label>
          <input
            id="tc-email"
            className="trial-create-input trial-create-input--readonly"
            type="text"
            readOnly
            value={emailFromTrial}
          />

          <label className="trial-create-label" htmlFor="tc-user">
            Username <span className="trial-create-req">*</span>
          </label>
          <input
            id="tc-user"
            className="trial-create-input"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label className="trial-create-label" htmlFor="tc-company">
            Company / restaurant name <span className="trial-create-req">*</span>
          </label>
          <input
            id="tc-company"
            className="trial-create-input"
            autoComplete="organization"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />

          <label className="trial-create-label" htmlFor="tc-pass">
            Password <span className="trial-create-req">*</span>
          </label>
          <input
            id="tc-pass"
            className="trial-create-input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <label className="trial-create-label" htmlFor="tc-pass2">
            Confirm password <span className="trial-create-req">*</span>
          </label>
          <input
            id="tc-pass2"
            className="trial-create-input"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          <button
            type="submit"
            className="trial-create-submit"
            disabled={submitting}
          >
            {submitting ? "Creating…" : "Create account"}
          </button>
        </form>

        <button
          type="button"
          className="trial-create-back"
          onClick={() => navigate("/subscription-plans")}
        >
          ← Back to plans
        </button>
      </div>
    </div>
  );
};

export default TrialCreateAccount;
