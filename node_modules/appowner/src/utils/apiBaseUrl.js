/** Base URL for API calls. In dev, Vite proxy forwards `/api` when this is relative. */
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || ""
).trim().replace(/\/$/, "");
