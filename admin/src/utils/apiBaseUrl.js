const fromEnv = String(import.meta.env.VITE_API_URL ?? "").trim();

function computeBase() {
  if (import.meta.env.DEV) {
    return "";
  }
  const base = (fromEnv || "").replace(/\/$/, "");
  if (!base) {
    // eslint-disable-next-line no-console
    console.error(
      "[TableTab Admin] VITE_API_URL is missing. Rebuild with your Railway API URL.",
    );
    return "";
  }
  return base;
}

export const API_BASE_URL = computeBase();
