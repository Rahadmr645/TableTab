import React, { createContext, useState, useEffect } from "react";
import { getUserFromToken } from "../utils/decodeToken";
import axios from "axios";
import { API_BASE_URL } from "../utils/apiBaseUrl.js";

export const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [showLogin, setShowLogin] = useState(false);
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [currState, setCurrState] = useState("login");
  const [expiresAt, setExpiresAt] = useState(null);
  const [showUpdateProfilePic, setShowUpdateProfilePic] = useState(false);
  const [profileImage, setProfileImage] = useState(null);

  const URL = API_BASE_URL;

  // get admin from token
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    const decoded = getUserFromToken();
    console.log(decoded);
    if (decoded) setAdmin(decoded);
  }, []);

  useEffect(() => {
    const fetchAdmin = async () => {
      if (!admin || !admin.id) {
        return console.log("admin not find yet");
      }
      try {
        const res = await axios.get(`${URL}/api/admin/fetchAdmin/${admin.id}`, {
          headers: { "Content-Type": "application/json" },
        });

        const data = res.data;
        const profilePic = res.data.admin.profilePic;
        setProfileImage(profilePic);
      } catch (error) {
        console.error(error.message);
      }
    };
    fetchAdmin();
  }, [admin]);

  //fetchadmin
 console.log(currState)
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
    profileImage,
    setProfileImage,
  };

  return (
    <AuthContext.Provider value={contextVelu}>{children}</AuthContext.Provider>
  );
};
