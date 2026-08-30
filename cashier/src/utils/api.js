import axios from "axios";

export function getApiBaseUrl() {
  // 1. In Vite local dev mode (npm run dev), use same-origin relative URLs ("")
  // to route through Vite's local dev proxy (/api, /uploads, /socket.io).
  if (import.meta.env.DEV) {
    return "";
  }

  // 2. If VITE_API_URL is configured at build time, use it
  const envUrl = (import.meta.env.VITE_API_URL || "").trim();
  if (envUrl && !/^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(envUrl)) {
    return envUrl.replace(/\/$/, "");
  }

  // 3. Cloud production default
  return "https://tabletab-server.up.railway.app";
}

export const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  // Ensure baseURL is always dynamically updated for tablet network changes
  config.baseURL = getApiBaseUrl();
  // Attach staff / cashier JWT token if logged in (prioritize cashier_token)
  const token =
    localStorage.getItem("cashier_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("adminToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Attach tenant context (ID and/or Slug)
  const tenantId =
    localStorage.getItem("cashier_tenant_id") ||
    localStorage.getItem("tenantId") ||
    sessionStorage.getItem("tabletab_public_tenant_id");

  if (tenantId) {
    config.headers["X-Tenant-Id"] = tenantId;
  }

  const tenantSlug =
    localStorage.getItem("cashier_tenant_slug") ||
    localStorage.getItem("tenantSlug") ||
    sessionStorage.getItem("tabletab_public_tenant_slug");

  if (tenantSlug) {
    config.headers["X-Tenant-Slug"] = tenantSlug;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("[Cashier API] 401 Unauthorized encountered:", error.config?.url);
      const hasToken = localStorage.getItem("cashier_token") || localStorage.getItem("token");
      if (hasToken) {
        localStorage.removeItem("cashier_token");
        localStorage.removeItem("token");
        localStorage.removeItem("cashier_user");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("cashier:session-expired"));
        }
      }
    }
    return Promise.reject(error);
  }
);

