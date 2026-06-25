import { getRedisClient } from "../config/redis.js";

export const getCache = async (key) => {
  const client = getRedisClient();
  if (!client) return null;
  try {
    return await client.get(key);
  } catch (err) {
    console.warn(`Error reading from cache for key ${key}:`, err.message);
    return null;
  }
};

export const setCache = async (key, value, ttlSeconds = 300) => {
  const client = getRedisClient();
  if (!client) return false;
  try {
    await client.set(key, value, { EX: ttlSeconds });
    return true;
  } catch (err) {
    console.warn(`Error writing to cache for key ${key}:`, err.message);
    return false;
  }
};

export const deleteCache = async (key) => {
  const client = getRedisClient();
  if (!client) return false;
  try {
    await client.del(key);
    return true;
  } catch (err) {
    console.warn(`Error deleting cache key ${key}:`, err.message);
    return false;
  }
};

export const clearMenuCache = async (tenantId, branchId = null) => {
  const client = getRedisClient();
  if (!client) return;
  try {
    const tid = String(tenantId);
    if (branchId) {
      const bid = String(branchId);
      await client.del(`menu:${tid}:${bid}`);
      console.log(`Menu cache cleared for tenant: ${tid}, branch: ${bid}`);
    } else {
      await client.del(`menu:${tid}:default`);
      const pattern = `menu:${tid}:*`;
      for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
        await client.del(key);
      }
      console.log(`Menu cache cleared for tenant: ${tid} (all branches)`);
    }
  } catch (err) {
    console.warn(`Failed to clear menu cache for tenant ${tenantId}:`, err.message);
  }
};
