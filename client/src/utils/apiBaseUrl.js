const fromEnv = String(import.meta.env.VITE_API_URL ?? "").trim();

/**
 * Dev: `""` → same-origin `/api/...` via Vite proxy (see `vite.config.js` + `VITE_API_URL`).
 * Prod: must set `VITE_API_URL` at **build** time to your Railway URL (https://….up.railway.app).
 */
function computeBase() {
  if (import.meta.env.DEV) {
    return "";
  }
  const base = (fromEnv || "").replace(/\/$/, "");
  if (!base) {
    // eslint-disable-next-line no-console
    console.error(
      "[TableTab] VITE_API_URL is missing. Rebuild the client with e.g. VITE_API_URL=https://your-service.up.railway.app",
    );
    return "";
  }
  return base;
}

export const API_BASE_URL = computeBase();
