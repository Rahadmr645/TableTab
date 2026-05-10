import React, {
  useEffect,
  useRef,
  useState,
  useContext,
  useMemo,
} from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { otpHeadersFromTenantId } from "../../utils/apiBaseUrl.js";
import "./VerifyOtp.css";

function readOtpForm() {
  try {
    const raw = localStorage.getItem("otpFormData");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const VerifyOtp = () => {
  const { URL, expiresAt, setExpiresAt } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const otpFormData = useMemo(() => readOtpForm(), [location.key]);

  const email = otpFormData?.email ?? "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const inputsRef = useRef([]);

  const busy = verifying || resending || leaving;

  useEffect(() => {
    if (!email) {
      const t = setTimeout(() => navigate("/login", { replace: true }), 0);
      return () => clearTimeout(t);
    }
  }, [email, navigate]);

  useEffect(() => {
    const storedExpires = localStorage.getItem("otpExpiresAt");
    if (storedExpires) {
      setExpiresAt(parseInt(storedExpires, 10));
    }
  }, [setExpiresAt]);

  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const remaining = Math.floor((expiresAt - Date.now()) / 1000);

      if (remaining <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleChange = (value, index) => {
    if (/^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      if (value && index < otp.length - 1) {
        inputsRef.current[index + 1]?.focus();
      }
    }
  };

  const handlekeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePasteDigit = (e) => {
    const text = e.clipboardData?.getData("text")?.replace(/\D/g, "") ?? "";
    if (text.length !== 6) return;
    e.preventDefault();
    setOtp(text.split(""));
    inputsRef.current[5]?.focus();
  };

  const verifyHandler = async () => {
    if (timeLeft <= 0) {
      alert("Code expired. Go back and request a new one.");
      return;
    }
    if (busy) return;
    const tenantKey = otpFormData?.tenantId;
    if (!tenantKey) {
      alert(
        "Missing tenant session for OTP. Go back and request a new code.",
      );
      return;
    }

    const enteredOtp = otp.join("");
    if (enteredOtp.length !== 6) {
      alert("Enter the full 6-digit code.");
      return;
    }

    setVerifying(true);
    try {
      const verifyRes = await axios.post(
        `${URL}/api/otp/verify-otp`,
        { email, otp: enteredOtp },
        {
          headers: {
            "Content-Type": "application/json",
            ...otpHeadersFromTenantId(tenantKey),
          },
        },
      );

      if (verifyRes.status !== 200) return;

      const savedFormData = readOtpForm();
      if (!savedFormData?.email || !savedFormData?.password) {
        alert("Session expired. Sign in again.");
        navigate("/login", { replace: true });
        return;
      }

      const loginRes = await axios.post(
        `${URL}/api/admin/login`,
        {
          email: savedFormData.email,
          password: savedFormData.password,
          ...(savedFormData.tenantSlug
            ? { tenantSlug: savedFormData.tenantSlug }
            : {}),
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
        "Verification failed";
      alert(msg);
      console.error(error);
    } finally {
      setVerifying(false);
    }
  };

  const resendOtpHandler = async () => {
    if (busy) return;
    const tenantKey = otpFormData?.tenantId;
    if (!tenantKey) {
      alert("Missing tenant session. Go back and request a new code.");
      return;
    }
    setResending(true);
    try {
      const res = await axios.post(
        `${URL}/api/otp/send-otp`,
        { email },
        {
          headers: {
            "Content-Type": "application/json",
            ...otpHeadersFromTenantId(tenantKey),
          },
        },
      );
      if (res.status === 200) {
        const backendExpiry = res.data.expiresAt;
        setExpiresAt(backendExpiry);
        localStorage.setItem("otpExpiresAt", String(backendExpiry));
      }
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Could not resend code";
      alert(msg);
    } finally {
      setResending(false);
    }
  };

  const handleBackToSignIn = () => {
    if (busy) return;
    setLeaving(true);
    window.setTimeout(() => navigate("/login", { replace: true }), 0);
  };

  const formatTime = (sec) => {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  if (!email) {
    return (
      <div className="otp-page">
        <div className="otp-page__backdrop" aria-hidden />
        <div className="otp-card otp-card--compact admin-surface">
          <p className="otp-page__muted">Returning to sign in…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="otp-page">
      <div className="otp-page__backdrop" aria-hidden />

      <div className="otp-page__inner">
        <div className="otp-card admin-surface">
          <div className="otp-card__brand" aria-hidden>
            <span className="otp-card__brand-icon" />
          </div>

          <h1 className="otp-card__title">Check your email</h1>
          <p className="otp-card__lead">
            Enter the 6-digit code we sent to
          </p>
          <p className="otp-card__email">{email}</p>

          <div
            className={`otp-digits${timeLeft <= 0 || busy ? " otp-digits--locked" : ""}`}
          >
            {otp.map((digit, idx) => (
              <input
                key={idx}
                type="text"
                maxLength={1}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete={idx === 0 ? "one-time-code" : "off"}
                value={digit}
                onChange={(e) => handleChange(e.target.value, idx)}
                onKeyDown={(e) => handlekeyDown(e, idx)}
                onPaste={handlePasteDigit}
                ref={(el) => {
                  inputsRef.current[idx] = el;
                }}
                disabled={timeLeft <= 0 || busy}
                aria-label={`Digit ${idx + 1} of 6`}
                className="otp-digits__input"
              />
            ))}
          </div>

          <div className="otp-card__timer-wrap">
            {timeLeft > 0 ? (
              <span className="otp-card__timer">
                <span className="otp-card__timer-dot" aria-hidden />
                Expires in {formatTime(timeLeft)}
              </span>
            ) : (
              <span className="otp-card__expired">Code expired — request a new one</span>
            )}
          </div>

          <button
            type="button"
            onClick={verifyHandler}
            className="otp-card__btn otp-card__btn--primary"
            disabled={timeLeft <= 0 || busy}
            aria-busy={verifying}
          >
            {verifying ? (
              <>
                <span className="otp-card__spinner" aria-hidden />
                Signing in…
              </>
            ) : (
              "Verify & sign in"
            )}
          </button>

          <div className="otp-card__secondary">
            <button
              type="button"
              className="otp-card__btn otp-card__btn--ghost"
              onClick={resendOtpHandler}
              disabled={timeLeft > 0 || busy}
              aria-busy={resending}
            >
              {resending ? (
                <>
                  <span
                    className="otp-card__spinner otp-card__spinner--ghost"
                    aria-hidden
                  />
                  Sending code…
                </>
              ) : (
                "Resend code"
              )}
            </button>
            <button
              type="button"
              className="otp-card__btn otp-card__btn--link"
              onClick={handleBackToSignIn}
              disabled={busy}
              aria-busy={leaving}
            >
              {leaving ? (
                <>
                  <span
                    className="otp-card__spinner otp-card__spinner--link"
                    aria-hidden
                  />
                  Leaving…
                </>
              ) : (
                "Back to sign in"
              )}
            </button>
          </div>
        </div>

        <p className="otp-page__footer-hint">
          Tip: you can paste the full code from your email.
        </p>
      </div>
    </div>
  );
};

export default VerifyOtp;
