const fromEnv = String(import.meta.env.VITE_API_URL ?? "").trim();

function computeBase() {
  const base = fromEnv.replace(/\/$/, "");

  if (base) {
    return base;
  }

  if (import.meta.env.DEV) {
    // Same-origin requests hit Vite’s proxy (`vite.config.js` → backend)
    return "";
  }

  console.error(
    "[TableTab Admin] VITE_API_URL is missing. Set it for production builds."
  );
  return null;
}

export const API_BASE_URL = computeBase();

/** MongoDB ObjectId string for this restaurant — required by `/api/otp/*` (middleware `resolvePublicTenant`). */
export const TENANT_ID = String(import.meta.env.VITE_TENANT_ID ?? "").trim();

/** Restaurant slug — required for `POST /api/admin/login` (`tenantSlug` in body). Must match `Tenant.slug` in DB. */
export const TENANT_SLUG = String(import.meta.env.VITE_TENANT_SLUG ?? "").trim();

/** Use on every admin call to `/api/otp/send-otp` and `/api/otp/verify-otp`. */
export function otpApiHeaders() {
  return {
    "Content-Type": "application/json",
    ...(TENANT_ID ? { "X-Tenant-Id": TENANT_ID } : {}),
  };
}