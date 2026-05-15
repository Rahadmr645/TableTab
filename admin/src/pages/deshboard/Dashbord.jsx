import React, { useContext, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

/** Home route shell */
const Dashbord = () => {
  const { admin } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (admin) {
      if (admin.role === "chef" || admin.role === "barista") {
        navigate("/orders", { replace: true });
      } else {
        navigate("/summary", { replace: true });
      }
    }
  }, [admin, navigate]);

  return <div className="admin-login-host" />;
};

export default Dashbord;
