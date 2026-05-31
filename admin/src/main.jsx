import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter as Router } from "react-router-dom";
import { AuthContextProvider } from "./context/AuthContext.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";

registerSW({ immediate: true });

/**
 * Eruda steals pointer events over forms. Enable only when explicitly requested:
 *   localStorage.setItem("tabletab_eruda","1"); location.reload()
 */
if (import.meta.env.DEV && typeof localStorage !== "undefined") {
  try {
    if (localStorage.getItem("tabletab_eruda") === "1") {
      import("eruda").then((mod) => mod.default.init());
    }
  } catch {
    /* ignore */
  }
}

createRoot(document.getElementById("root")).render(
  <SocketProvider>
    <AuthContextProvider>
      <Router>
        <App />
      </Router>
    </AuthContextProvider>
  </SocketProvider>,
);
