import React, { useContext, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

/** Home route shell */
const Dashbord = () => {
  const { admin } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    if (admin) {
      navigate("/orders", { replace: true });
    }
  }, [admin, navigate]);

  return <div className="admin-login-host" />;
};

export default Dashbord;
