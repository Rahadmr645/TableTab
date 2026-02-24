import React from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import "./VerifyOtp.css";
import { useEffect } from "react";

const VerifyOtp = () => {
  const { URL, isVerified, setIsVerified } = useContext(AuthContext);

  const Navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const email = localStorage.getItem("otpEmail");
  const [timeLeft, setTimeLeft] = useState(300);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  // const verifyHandler = async (e) => {
  //   try {
  //     const res = await axios.post(
  //       `${URL}/api/otp/verify-otp`,
  //       { email, otp },
  //       { headers: { "Content-Type": "application/json" } },
  //     );

  //     if (res.status === 200) {
  //       alert("OTP verified successfully");

  //       localStorage.removeItem("otpEmail");
  //       setIsVerified(true);
  //       // now create user
  //       Navigate("/");
  //     }
  //   } catch (error) {
  //     alert("Invalid OTP");
  //     console.error("OTP verification failed:", error);
  //   }
  // };

  const verifyHandler = async () => {
    try {
      const res = await axios.post(
        `${URL}/api/otp/verify-otp`,
        { email, otp },
        { headers: { "Content-Type": "application/json" } },
      );

      if (res.status === 200) {
        alert("OTP verified successfully");

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
      alert("Invalid OTP");
    }
  };

  return (
    <div className="otp-container">
      <button onClick={() => setIsVerified(true)}>test</button>
      <button onClick={() => setIsVerified(false)}>test</button>
      <div className="otp-box">
        <h2>Verify your Email</h2>
        <p>
          OTP send to: <span style={{ color: "white" }}>{email}</span>
        </p>

        <div className="otp-input-btn-box">
          <input
            type="number"
            placeholder="Enter otp"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <button onClick={verifyHandler}>Verify OTP</button>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
