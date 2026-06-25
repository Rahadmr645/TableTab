import { Routes, Route } from "react-router-dom";
import Login from "./pages/login/Login.jsx";
import Dashboard from "./pages/dashboard/Dashboard.jsx";
import TenantUsagePage from "./pages/tenant/TenantUsagePage.jsx";
import ProtectRoutes from "./utils/ProtectRoutes.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectRoutes>
            <Dashboard />
          </ProtectRoutes>
        }
      />
      <Route
        path="/tenant/:tenantId"
        element={
          <ProtectRoutes>
            <TenantUsagePage />
          </ProtectRoutes>
        }
      />
    </Routes>
  );
}
