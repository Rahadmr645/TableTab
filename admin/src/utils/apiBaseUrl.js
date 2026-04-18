const fromEnv = String(import.meta.env.VITE_API_URL ?? "").trim();

function computeBase() {
  const base = fromEnv.replace(/\/$/, "");

  if (!base) {
    console.error(
      "[TableTab Admin] VITE_API_URL is missing. Please set it in Vercel and redeploy."
    );
    return null; // ❗ important: fail clearly, don't silently break
  }

  return base;
}

export const API_BASE_URL = computeBase();