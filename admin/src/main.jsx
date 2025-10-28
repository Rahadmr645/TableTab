
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthContextProvider } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';

import eruda from 'eruda'
eruda.init();
createRoot(document.getElementById('root')).render(

  <SocketProvider>
  <AuthContextProvider>
    <Router>
      <App />
    </Router>
  </AuthContextProvider>
</SocketProvider>
)
