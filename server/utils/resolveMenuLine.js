import mongoose from "mongoose";
import Menu from "../models/Menu.js";

/** Keyed cache entries: `${tenantId}:${branchHint}` -> { map, at } */
const cacheBuckets = new Map();
const CACHE_MS = 45_000;

function cacheKey(tenantId, branchId) {
  const b = branchId ? String(branchId) : "all";
  return `${String(tenantId)}:${b}`;
}

/**
 * Map normalized dish name (lowercase trim) -> ObjectId for menu rows, scoped to tenant
 * (and optionally narrowed to an outlet + shared “all-branch” items where `branchId` is null).
 */
export async function getMenuNameToIdMap(tenantId, branchId = null) {
  const tid =
    tenantId instanceof mongoose.Types.ObjectId
      ? tenantId
      : new mongoose.Types.ObjectId(String(tenantId));

  const key = cacheKey(tid, branchId);
  const now = Date.now();
  const slot = cacheBuckets.get(key);
  if (slot && now - slot.at < CACHE_MS) {
    return slot.map;
  }

  const q = { tenantId: tid };
  if (branchId && mongoose.Types.ObjectId.isValid(String(branchId))) {
    const bid = new mongoose.Types.ObjectId(String(branchId));
    q.$or = [{ branchId: null }, { branchId: bid }];
  }

  const menus = await Menu.find(q).select("name _id").lean();
  const map = new Map(
    menus.map((m) => [(m.name || "").trim().toLowerCase(), m._id]),
  );
  cacheBuckets.set(key, { map, at: now });
  return map;
}

export function invalidateMenuNameMapCache(tenantId = null, branchId = null) {
  if (!tenantId) {
    cacheBuckets.clear();
    return;
  }
  const key = cacheKey(tenantId, branchId);
  cacheBuckets.delete(key);
}

/**
 * Prefer stored menuItemId; otherwise match by exact menu name within tenant-scoped map.
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
