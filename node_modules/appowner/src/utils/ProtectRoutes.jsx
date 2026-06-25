import { Navigate } from "react-router-dom";
import { getPlatformTokenPayload } from "./decodePlatformToken.jsx";

export default function ProtectRoutes({ children }) {
  const payload = getPlatformTokenPayload();
  if (!payload) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
