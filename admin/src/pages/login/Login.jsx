import React, { useEffect, useContext, useState } from "react";
import "./Login.css";
import { AuthContext } from "../../context/AuthContext";
import axios from "axios";

import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const {
    currState,
    setCurrState,
    setShowLogin,
    URL,
    setAdmin,
    isVerified,
    setIsVerified,
  } = useContext(AuthContext);
  const [otpSend, setOtpSend] = useState(false);
  const [loading, setLoading] = useState(false);

  // handle send otp
  // const sendOtpHandler = async (e) => {
  //   e.preventDefault();
  //   try {
  //     setLoading(true);
  //     const res = await axios.post(
  //       `${URL}/api/otp/send-otp`,
  //       { email: formData.email },
  //       { headers: { "Content-Type": "application/json" } },
  //     );

  //     if (res.status === 200) {
  //       alert("OTP send to your email");
  //       setOtpSend(true);

  //       // save email temporarily to the localstorage
  //       localStorage.setItem("otpEmail", formData.email);
  //       navigate("/verify-otp");
  //     }
  //   } catch (error) {
  //     alert("Failed to send OTP:");
  //     console.error(error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const sendOtpHandler = async () => {
    try {
      setLoading(true);

      //  save full form data before sending the otp
      localStorage.setItem("otpFormData", JSON.stringify(formData));
      localStorage.setItem("currState", currState);

      const res = await axios.post(
        `${URL}/api/otp/send-otp`,
        { email: formData.email },
        { headers: { "Content-Type": "application/json" } },
      );

      if (res.status === 200) {
        alert("OTP send to your email successfullly");
        navigate("/verify-otp");
      }
    } catch (error) {
      alert("Failed to send OTP:");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    profilePic: "",
    role: "",
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const submitHandler = async (e) => {
    e.preventDefault();

    const endPoint =
      currState === "SignUp"
        ? `${URL}/api/admin/create`
        : `${URL}/api/admin/login`;

    const bodyData =
      currState === "SignUp"
        ? formData
        : { email: formData.email, password: formData.password };
    console.log(bodyData);

    try {
      //  put here the otp verification before sending the login or signup requuest how i can do that

      const res = await axios.post(endPoint, bodyData, {
        headers: { "Content-Type": "application/json" },
      });
      const data = res.data;
      if (res.status === 200) {
        alert("Success");
        console.log(data);
      } else {
        alert("Fail: " + data.message);
      }

      setAdmin(res.data.user);
      const token = res.data.token;

      if (token) {
        localStorage.setItem("token", token);
        console.log("token saved:", localStorage.getItem("token"));
      } else {
        console.log("no token found from backend");
      }

      // saving to the localstorage
      setFormData({ username: "", email: "", password: "" });
      navigate("/");
      setShowLogin(false);

      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("Something went wrong: " + error.message);
    }
  };

  // useEffect(() => {
  //   console.log(isVerified)
  // },[isVerified])

  return (
    <div className="loginForm-container">
      <button onClick={() => setIsVerified(true)}>test</button>
      <button onClick={() => setIsVerified(false)}>test</button>
      <form className="lgoinForm" onSubmit={submitHandler}>
        <div className="login-header">
          <p>{currState}</p>
          <p
            onClick={() => setShowLogin(false)}
            style={{ fontSize: "20px", cursor: "pointer" }}
          >
            x
          </p>
        </div>

        {currState === "SignUp" && (
          <div className="mb-3">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              type="text"
              className="form-control"
              id="username"
              onChange={handleChange}
              name="username"
              value={formData.username}
            />
          </div>
        )}

        <div className="mb-3">
          <label htmlFor="email" className="form-label">
            Email address
          </label>
          <input
            type="email"
            className="form-control"
            id="email"
            onChange={handleChange}
            name="email"
            value={formData.email}
          />
        </div>

        <div className="mb-3">
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <input
            type="password"
            className="form-control"
            id="password"
            onChange={handleChange}
            name="password"
            value={formData.password}
          />
        </div>
        {currState === "SignUp" ? (
          <div className="rol-container">
            <select
              name="role"
              required
              value={formData.role}
              onChange={handleChange}
            >
              <option value="" disabled hidden>
                Role
              </option>
              <option value="admin">Admin</option>
              <option value="chef">Chef</option>
            </select>
          </div>
        ) : (
          <></>
        )}

        <button
          type="button"
          onClick={sendOtpHandler}
          disabled={loading}
          className="btn submitn-btn btn-primary submit-btn"
        >
          {loading ? "Sending OTP..." : "Send OTP"}
        </button>

        {currState === "SignUp" ? (
          <p>
            Already have an account?{" "}
            <span className="span" onClick={() => setCurrState("Login")}>
              Click here
            </span>
          </p>
        ) : (
          <p>
            Don't have an account?{" "}
            <span className="span" onClick={() => setCurrState("SignUp")}>
              Click here
            </span>
          </p>
        )}
      </form>
    </div>
  );
};

export default Login;
