import axios from "axios";
import { API_BASE_URL } from "./apiBaseUrl.js";
import { getCustomerAuthHeaders } from "./authHeaders.js";

const base = (API_BASE_URL || "").replace(/\/$/, "");

/** Single axios instance for the TableTab API (same base URL + customer JWT when present). */
export const api = axios.create(base ? { baseURL: base } : {});

api.interceptors.request.use((config) => {
  const { Authorization } = getCustomerAuthHeaders();
  if (Authorization) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = Authorization;
  }
  return config;
});
