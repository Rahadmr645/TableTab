import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initPwaAutoUpdater } from '@shared/pwaAutoUpdate.js'
 import eruda from 'eruda'

// Automatically detect, download, and activate new PWA versions across all cashier devices
initPwaAutoUpdater({ appName: 'Cashier' });
eruda.init();
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
