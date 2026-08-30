import React from 'react'
import { createRoot } from 'react-dom/client'
import { initPwaAutoUpdater } from '@shared/pwaAutoUpdate.js'
import './index.css'
import App from './App.jsx'

// Automatically detect, download, and activate new PWA versions across all customer devices
initPwaAutoUpdater({ appName: 'Client' });
import { BrowserRouter as Router } from 'react-router-dom'
import { ContextProvider } from './context/CartContext.jsx'
import { SocketContextProvider } from './context/SocketContext.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import eruda from 'eruda'
import { bootstrapPublicTenant } from './utils/tenantContext.js'

eruda.init();

bootstrapPublicTenant().then(() => {
  createRoot(document.getElementById('root')).render(
    <LanguageProvider>
      <SocketContextProvider>
        <ContextProvider>
          <Router>
            <App />
          </Router>
        </ContextProvider>
      </SocketContextProvider>
    </LanguageProvider>,
  )
})
