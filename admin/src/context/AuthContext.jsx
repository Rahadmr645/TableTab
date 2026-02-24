import Rect, { createContext, useState, useEffect } from "react";
import { getUserFromToken } from "../utils/decodeToken";

export const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [showLogin, setShowLogin] = useState(false);
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [currState, setCurrState] = useState("Signup");
  const [expiresAt, setExpiresAt] = useState(null);
  const [showUpdateProfilePic, setShowUpdateProfilePic] = useState(true);

  // const URL = import.meta.env.VITE_API_URL;
  const URL = "http:///192.168.1.100:4000";

  // get admin from token
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    const decoded = getUserFromToken();
    console.log(decoded);
    if (decoded) setAdmin(decoded);
  }, []);

  const contextVelu = {
    showLogin,
    showMenuForm,
    setShowMenuForm,
    setShowLogin,
    currState,
    setCurrState,
    URL,
    admin,
    setAdmin,
    expiresAt,
    setExpiresAt,
    showUpdateProfilePic,
    setShowUpdateProfilePic,
  };

  return (
    <AuthContext.Provider value={contextVelu}>{children}</AuthContext.Provider>
  );
};
