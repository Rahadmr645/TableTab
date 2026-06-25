import axios from "axios";
import { API_BASE_URL } from "./apiBaseUrl.js";
import { getCustomerAuthHeaders } from "./authHeaders.js";
import { getPublicTenantHeaders } from "./tenantContext.js";

const base = (API_BASE_URL || "").replace(/\/$/, "");

/** Single axios instance for the TableTab API (same base URL + customer JWT when present). */
export const api = axios.create(base ? { baseURL: base } : {});

api.interceptors.request.use((config) => {
  const { Authorization } = getCustomerAuthHeaders();
  const tenant = getPublicTenantHeaders();
  config.headers = config.headers ?? {};
  if (Authorization) {
    config.headers.Authorization = Authorization;
  }
  Object.assign(config.headers, tenant);
  return config;
});
