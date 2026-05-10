import React, { useContext, useEffect } from 'react'

import  './App.css'

import Login from './pages/login/Login.jsx'
import Navbar from './components/navbar/Navbar.jsx'
import AppRoutes from './AppRoutes.jsx'
import { AuthContext } from './context/AuthContext.jsx'
import { useLocation } from 'react-router-dom'
import AsyncLoadingOverlay from './components/common/AsyncLoadingOverlay.jsx'
import {
  unlockOrderAudio,
  requestNotificationPermissionIfNeeded,
} from './utils/orderAlerts.js'

const App = () => {
  const { isGlobalLoading, showLogin } = useContext(AuthContext);
  const { pathname } = useLocation();
  const hideNavbar =
    pathname === "/subscription-plans" ||
    pathname === "/trial-create-account" ||
    pathname === "/verify-otp";

  useEffect(() => {
    const onFirstGesture = () => {
      unlockOrderAudio();
      requestNotificationPermissionIfNeeded();
    };
    window.addEventListener('pointerdown', onFirstGesture, { once: true });
    return () => window.removeEventListener('pointerdown', onFirstGesture);
  }, []);

  return (
    <>
      <div className="app-container">
       {!hideNavbar && <Navbar />}
       <AppRoutes/>
       {showLogin ? (
         <div className="admin-login-host">
           <Login />
         </div>
       ) : null}
       <AsyncLoadingOverlay show={isGlobalLoading} />
      </div>
     </>
  )
}

export default App