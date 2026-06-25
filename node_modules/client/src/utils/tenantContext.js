import axios from "axios";
import { API_BASE_URL } from "./apiBaseUrl.js";

const ID_KEY = "tabletab_public_tenant_id";
const SLUG_KEY = "tabletab_public_tenant_slug";

const base = (API_BASE_URL || "").replace(/\/$/, "");

/** First segment of hostname when using `slug.example.com` style routing. */
export function inferTenantSlugFromHostname() {
  try {
    const host = window.location.hostname;
    if (!host || host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      return "";
    }
    const parts = host.split(".").filter(Boolean);
    if (parts.length >= 3 && parts[0] !== "www") {
      return parts[0];
    }
  } catch {
    /* ignore */
  }
  return "";
}

export function getTenantSlugFromSearch(search = window.location.search) {
  const p = new URLSearchParams(search);
  return (
    p.get("tenantSlug")?.trim() ||
    p.get("slug")?.trim() ||
    ""
  );
}

export function getTenantSlugFromPath(pathname = window.location.pathname) {
  try {
    const match = String(pathname).match(/^\/menu\/([^\/?#]+)/);
    return match?.[1]?.trim() || "";
  } catch {
    return "";
  }
}

export function getStoredTenantId() {
  return sessionStorage.getItem(ID_KEY)?.trim() || "";
}

export function setStoredTenantId(id) {
  if (id) sessionStorage.setItem(ID_KEY, String(id));
}

export function getStoredTenantSlug() {
  return sessionStorage.getItem(SLUG_KEY)?.trim() || "";
}

export function setStoredTenantSlug(slug) {
  if (slug) sessionStorage.setItem(SLUG_KEY, String(slug));
}

/** Headers for public menu/order APIs (`resolvePublicTenant`). */
export function getPublicTenantHeaders() {
  const id = getStoredTenantId();
  if (id) {
    return { "X-Tenant-Id": id };
  }
  const slug =
    getTenantSlugFromSearch() ||
    getStoredTenantSlug() ||
    getTenantSlugFromPath() ||
    inferTenantSlugFromHostname();
  if (slug) {
    return { "X-Tenant-Slug": slug };
  }
  return {};
}

/**
 * Resolve tenant from `?tenantSlug=` / subdomain / session and cache Mongo id.
 * Safe to call multiple times.
 */
export async function bootstrapPublicTenant() {
  try {
    const fromQuery = getTenantSlugFromSearch();
    const fromPath = getTenantSlugFromPath();
    if (fromQuery) {
      setStoredTenantSlug(fromQuery);
    } else if (fromPath) {
      setStoredTenantSlug(fromPath);
    }
    const slug =
      fromQuery ||
      fromPath ||
      getStoredTenantSlug() ||
      inferTenantSlugFromHostname();

    if (!slug && !getStoredTenantId()) {
      return;
    }

    if (slug && !getStoredTenantId()) {
      const url = `${base}/api/tenant/resolve/${encodeURIComponent(slug)}`;
      const res = await axios.get(url);
      const tid = res.data?.tenantId;
      if (tid) {
        setStoredTenantId(String(tid));
      }
    }
  } catch (e) {
    console.warn("[TableTab] Tenant bootstrap:", e?.message || e);
  }
}
