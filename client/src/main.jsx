import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter as Router } from 'react-router-dom'
import { ContextProvider } from './context/CartContext.jsx'
import { SocketContextProvider } from './context/SocketContext.jsx'
import eruda from 'eruda'
eruda.init();
createRoot(document.getElementById('root')).render(


  
    <SocketContextProvider>
      <ContextProvider>
        <Router>
          <App />
        </Router>
      </ContextProvider>
    </SocketContextProvider>


)
