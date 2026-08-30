import axios from "axios";

export function getApiBaseUrl() {
  // In development, use same-origin relative URLs ("") to route through Vite's proxy.
  if (import.meta.env.DEV) {
    return "";
  }

  const envUrl = (import.meta.env.VITE_API_URL || "").trim();

  // If a valid remote cloud API URL was provided at build time (e.g. https://...railway.app), use it.
  if (envUrl && !/^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(envUrl)) {
    return envUrl.replace(/\/$/, "");
  }

  // If accessed from a local server / LAN IP in production
  if (typeof window !== "undefined" && window.location?.hostname) {
    const host = window.location.hostname;
    const protocol = window.location.protocol || "http:";
    if (/^(localhost|127\.0\.0\.1|\[::1\]|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/i.test(host)) {
      return `${protocol}//${host}:5000`;
    }
  }

  // Cloud production default (e.g. Vercel / Netlify / Custom Domain)
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

