import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

export const api = axios.create({
  baseURL: API_BASE_URL.replace(/\/$/, ""),
});

api.interceptors.request.use((config) => {
  // Attach staff JWT token if logged in
  const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Attach tenant context
  const tenantId = sessionStorage.getItem("tabletab_public_tenant_id") || localStorage.getItem("tenantId");
  if (tenantId) {
    config.headers["X-Tenant-Id"] = tenantId;
  }
  
  return config;
});
