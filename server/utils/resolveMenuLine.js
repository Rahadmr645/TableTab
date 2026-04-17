import mongoose from "mongoose";
import Menu from "../models/Menu.js";

let nameMapCache = null;
let nameMapCacheAt = 0;
const CACHE_MS = 45_000;

/**
 * Map normalized dish name (lowercase trim) -> ObjectId for menu rows.
 */
export async function getMenuNameToIdMap() {
  const now = Date.now();
  if (nameMapCache && now - nameMapCacheAt < CACHE_MS) {
    return nameMapCache;
  }
  const menus = await Menu.find().select("name _id").lean();
  nameMapCache = new Map(
    menus.map((m) => [(m.name || "").trim().toLowerCase(), m._id]),
  );
  nameMapCacheAt = now;
  return nameMapCache;
}

export function invalidateMenuNameMapCache() {
  nameMapCache = null;
}

/**
 * Prefer stored menuItemId; otherwise match by exact menu name.
 */
export function resolveLineMenuId(item, nameMap) {
  if (!item) return null;
  if (item.menuItemId) return item.menuItemId;
  const key = (item.name || "").trim().toLowerCase();
  if (!key || !nameMap) return null;
  return nameMap.get(key) || null;
}

export function toObjectIdSafe(id) {
  if (!id) return null;
  try {
    const s = String(id);
    return mongoose.Types.ObjectId.isValid(s)
      ? new mongoose.Types.ObjectId(s)
      : null;
  } catch {
    return null;
  }
}
