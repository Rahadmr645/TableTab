/** Full URL for menu/cart images: Cloudinary (absolute) or legacy `/uploads/...` on API host. */
function optimizeCloudinaryImage(url) {
  if (!/res\.cloudinary\.com/i.test(url) || !/\/upload\//i.test(url)) return url;
  return url.replace(
    "/upload/",
    "/upload/f_auto,q_auto,c_limit,w_720,h_720/",
  );
}

export function resolveAssetUrl(apiBaseUrl, pathOrUrl) {
  if (!pathOrUrl) return "";
  const s = String(pathOrUrl).trim();
  if (/^https?:\/\//i.test(s)) return optimizeCloudinaryImage(s);
  const base = (apiBaseUrl || "").replace(/\/$/, "");
  const path = s.startsWith("/") ? s : `/${s}`;
  return optimizeCloudinaryImage(`${base}${path}`);
}
