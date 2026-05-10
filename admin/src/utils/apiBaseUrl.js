import { jwtDecode } from "jwt-decode";

/** 
 * 1. Robust URL Normalization 
 * Now handles IPv6 [::] and ensures no trailing slashes.
 */
function normalizeBrowserApiUrl(url) {
  if (!url) return "";
  return url
    .trim()
    .replace(/(^https?:\/\/)0\.0\.0\.0(?=:|\/|$)/i, (_, scheme) => `${scheme}127.0.0.1`)
    .replace(/(^https?:\/\/)\[::\](?=:|\/|$)/i, (_, scheme) => `${scheme}[::1]`)
    .replace(/\/$/, "");
}

/** 
 * 2. Strict Loopback Check
 * Determines if the API is pointing to the same machine.
 */
function isLoopbackApiUrl(base) {
  // Matches localhost, 127.x.x.x, or IPv6 [::1]
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(base);
}

/** 
 * 3. Fail-Fast Base URL Computation
 * Prevents the app from running in production with a broken configuration.
 */
function computeBase() {
  const fromEnv = import.meta.env.VITE_API_URL || "";
  const base = normalizeBrowserApiUrl(fromEnv);

  if (import.meta.env.DEV) {
    // In DEV, if VITE_API_URL is local or empty, we use Vite's proxy ("")
    // This allows LAN testing (e.g., opening 192.168.x.x:5173 on a phone) to work.
    if (!base || isLoopbackApiUrl(base)) {
      return ""; 
    }
    return base;
  }

  // In PROD, we must have a valid external URL.
  if (!base) {
    throw new Error(
      "[Config] VITE_API_URL is missing! Production builds require an absolute API URL."
    );
  }

  return base;
}

export const API_BASE_URL = computeBase();

/** 
 * 4. Secure Tenant Extraction
 * Added a check for "poisoned" or expired tokens.
 */
export function getStaffTenantHeaders() {
  const token = localStorage.getItem("token")?.trim();
  if (!token) return {};

  try {
    const decoded = jwtDecode(token);
    
    // Check if token is expired (optional but recommended)
    const currentTime = Date.now() / 1000;
    if (decoded.exp && decoded.exp < currentTime) {
      console.warn("Token expired. Cleaning up...");
      localStorage.removeItem("token");
      return {};
    }

    if (decoded?.tenantId) {
      return { "X-Tenant-Id": String(decoded.tenantId).trim() };
    }
  } catch (err) {
    console.error("Invalid JWT found in storage.");
    // Optional: localStorage.removeItem("token");
  }
  return {};
}

/** 
 * 5. Sanitized OTP Headers
 * Ensures we don't send strings like "null" or "undefined" as IDs.
 */
export function otpHeadersFromTenantId(tenantId) {
  if (tenantId === null || tenantId === undefined) return {};
  
  const cleanId = String(tenantId).trim();
  if (!cleanId || cleanId === "undefined" || cleanId === "null") {
    return {};
  }
  
  return { "X-Tenant-Id": cleanId };
}