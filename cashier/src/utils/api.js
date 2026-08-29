import axios from "axios";

export function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(envUrl)) {
    return envUrl.replace(/\/$/, "");
  }

  // If in browser on a tablet or mobile device (e.g. 192.168.x.x:5173), route to port 5000 on the same machine
  if (typeof window !== "undefined" && window.location?.hostname) {
    const host = window.location.hostname;
    const protocol = window.location.protocol || "http:";
    return `${protocol}//${host}:5000`;
  }

  return envUrl ? envUrl.replace(/\/$/, "") : "http://127.0.0.1:5000";
}

export const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  // Ensure baseURL is always dynamically updated for tablet network changes
  config.baseURL = getApiBaseUrl();
  // Attach staff / cashier JWT token if logged in
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("cashier_token") ||
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

