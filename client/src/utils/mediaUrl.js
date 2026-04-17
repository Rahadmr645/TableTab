/** Full URL for menu/cart images: Cloudinary (absolute) or legacy `/uploads/...` on API host. */
export function resolveAssetUrl(apiBaseUrl, pathOrUrl) {
  if (!pathOrUrl) return "";
  const s = String(pathOrUrl).trim();
  if (/^https?:\/\//i.test(s)) return s;
  const base = (apiBaseUrl || "").replace(/\/$/, "");
  const path = s.startsWith("/") ? s : `/${s}`;
  return `${base}${path}`;
}
