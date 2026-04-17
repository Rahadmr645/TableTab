import React, { useEffect } from 'react'

import  './App.css'

import Dashbord from './pages/deshboard/Dashbord'
import Navbar from './components/navbar/Navbar.jsx'
import AppRoutes from './AppRoutes.jsx'
import {
  unlockOrderAudio,
  requestNotificationPermissionIfNeeded,
} from './utils/orderAlerts.js'

const App = () => {
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
       <Navbar/>
       <AppRoutes/>
       <Dashbord/>
      </div>
     </>
  )
}

export default App