import React, { createContext, useState, useEffect, useRef } from "react";
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
  const [pendingRequests, setPendingRequests] = useState(0);
  const pendingRequestsRef = useRef(0);

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

  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        pendingRequestsRef.current += 1;
        setPendingRequests(pendingRequestsRef.current);
        return config;
      },
      (error) => {
        pendingRequestsRef.current = Math.max(0, pendingRequestsRef.current - 1);
        setPendingRequests(pendingRequestsRef.current);
        return Promise.reject(error);
      },
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => {
        pendingRequestsRef.current = Math.max(0, pendingRequestsRef.current - 1);
        setPendingRequests(pendingRequestsRef.current);
        return response;
      },
      (error) => {
        pendingRequestsRef.current = Math.max(0, pendingRequestsRef.current - 1);
        setPendingRequests(pendingRequestsRef.current);
        return Promise.reject(error);
      },
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

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
    isGlobalLoading: pendingRequests > 0,
  };

  return (
    <AuthContext.Provider value={contextVelu}>{children}</AuthContext.Provider>
  );
};
