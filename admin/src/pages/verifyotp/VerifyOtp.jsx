import React from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import "./VerifyOtp.css";
import { useEffect, useRef } from "react";

const VerifyOtp = () => {
  const { URL, expiresAt, setExpiresAt } = useContext(AuthContext);

  const Navigate = useNavigate();

  const otpFormData = JSON.parse(localStorage.getItem("otpFormData"));

  if(!otpFormData) {
    Navigate('/login')
  }
  const email = otpFormData?.email;

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState(0);
  // backend expiry
  const inputsRef = useRef([]);

  // load backend expiry from localStorage if page refreshed
  useEffect(() => {
    const storedExpires = localStorage.getItem("otpExpiresAt");
    if (storedExpires) {
      setExpiresAt(parseInt(storedExpires));
    }
  }, []);

  // timer countdown
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

  // handle change
  const handleChange = (value, index) => {
    if (/^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      if (value && index < otp.length - 1) {
        inputsRef.current[index + 1].focus();
      }
    }
  };

  // handle key
  const handlekeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1].focus();
    }
  };

  const verifyHandler = async () => {
    if (timeLeft <= 0) return alert("OTP expired");
    const enteredOtp = otp.join("");
    try {
      const res = await axios.post(
        `${URL}/api/otp/verify-otp`,

        { email, otp: enteredOtp },
        { headers: { "Content-Type": "application/json" } },
      );

      if (res.status === 200) {
        alert("OTP verified successfully");

        // remove after verified
        localStorage.removeItem("otpExpiresAt");
        // localStorage.removeItem("otpEmail");

        // get stored data
        const savedFormData = JSON.parse(localStorage.getItem("otpFormData"));
        const savedState = localStorage.getItem("currState");

        const endPoint =
          savedState === "SignUp"
            ? `${URL}/api/admin/create`
            : `${URL}/api/admin/login`;

        const bodyData =
          savedState === "SignUp"
            ? savedFormData
            : {
                email: savedFormData.email,
                password: savedFormData.password,
              };

        console.log("Saved form data:", savedFormData);
        console.log("Saved state:", savedState);
        console.log("body data:", bodyData);

        // now call login/SignUp api
        const loginRes = await axios.post(endPoint, bodyData, {
          headers: { "Content-Type": "application/json" },
        });

        const token = loginRes.data.token;

        if (token) {
          localStorage.setItem("token", token);
          console.log("token saved:", localStorage.getItem("token"));
        }

        // cleanup
        localStorage.removeItem("otpFormData");
        localStorage.removeItem("currState");

        Navigate("/");
        window.location.reload();
      }
    } catch (error) {
     console.log("full error", error)
      alert(" something failed");
    }
  };

  // resent otp handler
  const resendOtpHandler = async () => {
    try {
      const res = await axios.post(`${URL}/api/otp/send-otp`, { email });
      if (res.status === 200) {
        const backendExpiry = res.data.expiresAt;
        setExpiresAt(backendExpiry);
        localStorage.setItem("otpExpiresAt", backendExpiry);
        alert("OTP resend successfully ");
      }
    } catch (error) {
      alert("Failed to resend otp");
    }
  };

  const formatTime = (sec) => {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="otp-container">
      <div className="otp-box">
        <h2>Verify your Email</h2>
        <p>
          OTP send to: <span style={{ color: "white" }}>{email}</span>
        </p>

        <div className="otp-inputs">
          {otp.map((digit, idx) => (
            <input
              key={idx}
              type="text"
              maxLength="1"
              inputMode="numeric"
              value={digit}
              placeholder="Enter otp"
              onChange={(e) => handleChange(e.target.value, idx)}
              onKeyDown={(e) => handlekeyDown(e, idx)}
              ref={(el) => (inputsRef.current[idx] = el)}
              disabled={timeLeft <= 0}
            />
          ))}
        </div>
        <div className="timer">
          {timeLeft > 0 ? (
            <p>Expires with in : {formatTime(timeLeft)}</p>
          ) : (
            <p style={{ color: "red" }}>OTP expired</p>
          )}
        </div>
        <button
          onClick={verifyHandler}
          className="verify-btn"
          disabled={timeLeft <= 0}
        >
          Verify OTP
        </button>

        <button
          className="resend-btn"
          onClick={resendOtpHandler}
          disabled={timeLeft > 0}
        >
          Resend OTP
        </button>
      </div>
    </div>
  );
};

export default VerifyOtp;
