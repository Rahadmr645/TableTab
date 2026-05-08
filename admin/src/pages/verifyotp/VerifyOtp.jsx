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
import {
  TENANT_ID,
  TENANT_SLUG,
  otpApiHeaders,
} from "../../utils/apiBaseUrl.js";
import "./VerifyOtp.css";

function readStoredForm() {
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

  const otpFormData = useMemo(() => readStoredForm(), [location.key]);

  const email = otpFormData?.email ?? "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const inputsRef = useRef([]);

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

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

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

  const verifyHandler = async () => {
    if (timeLeft <= 0) {
      alert("Code expired. Go back and request a new one.");
      return;
    }
    if (verifying) return;
    if (!TENANT_ID || !TENANT_SLUG) {
      alert(
        "Missing VITE_TENANT_ID or VITE_TENANT_SLUG in admin/.env. Restart Vite after saving.",
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
        { headers: otpApiHeaders() },
      );

      if (verifyRes.status !== 200) return;

      const savedFormData = readStoredForm();
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
        "Verification failed";
      alert(msg);
      console.error(error);
    } finally {
      setVerifying(false);
    }
  };

  const resendOtpHandler = async () => {
    if (!TENANT_ID) {
      alert("Missing VITE_TENANT_ID in admin/.env.");
      return;
    }
    try {
      const res = await axios.post(
        `${URL}/api/otp/send-otp`,
        { email },
        { headers: otpApiHeaders() },
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
    }
  };

  const formatTime = (sec) => {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  if (!email) {
    return (
      <div className="otp-container">
        <div className="otp-box otp-box--compact">
          <p className="otp-muted">Returning to sign in…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="otp-container">
      <div className="otp-box">
        <h2 className="otp-heading">Check your email</h2>
        <p className="otp-lead">
          We sent a 6-digit code to{" "}
          <span className="otp-email">{email}</span>
        </p>

        <div className="otp-inputs">
          {otp.map((digit, idx) => (
            <input
              key={idx}
              type="text"
              maxLength={1}
              inputMode="numeric"
              autoComplete="one-time-code"
              value={digit}
              onChange={(e) => handleChange(e.target.value, idx)}
              onKeyDown={(e) => handlekeyDown(e, idx)}
              ref={(el) => {
                inputsRef.current[idx] = el;
              }}
              disabled={timeLeft <= 0 || verifying}
              aria-label={`Digit ${idx + 1}`}
            />
          ))}
        </div>
        <div className="timer">
          {timeLeft > 0 ? (
            <p className="otp-timer">Expires in {formatTime(timeLeft)}</p>
          ) : (
            <p className="otp-expired">Code expired</p>
          )}
        </div>
        <button
          type="button"
          onClick={verifyHandler}
          className="verify-btn"
          disabled={timeLeft <= 0 || verifying}
        >
          {verifying ? "Signing in…" : "Verify & sign in"}
        </button>

        <button
          type="button"
          className="resend-btn"
          onClick={resendOtpHandler}
          disabled={timeLeft > 0 || verifying}
        >
          Resend code
        </button>

        <button
          type="button"
          className="otp-back"
          onClick={() => navigate("/login")}
        >
          ← Back to sign in
        </button>
      </div>
    </div>
  );
};

export default VerifyOtp;
