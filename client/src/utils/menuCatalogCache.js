let cachedItems = null;
let cachedAt = 0;

const TTL_MS = 5 * 60 * 1000;

/** Returns cached menu rows if still fresh, otherwise null */
export function readMenuCatalogCache() {
  if (!cachedItems?.length || Date.now() - cachedAt > TTL_MS) return null;
  return cachedItems;
}

export function writeMenuCatalogCache(items) {
  if (Array.isArray(items) && items.length > 0) {
    cachedItems = items;
    cachedAt = Date.now();
  }
}
