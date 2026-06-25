import { createClient } from "redis";

let redisClient = null;
let isRedisConnected = false;

export const initRedis = async () => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn("REDIS_URL environment variable is not defined. Caching and socket clustering will run in fallback (disabled) mode.");
    return null;
  }

  try {
    redisClient = createClient({ url: redisUrl });
    
    redisClient.on("error", (err) => {
      console.warn("Redis Client Error:", err.message);
      isRedisConnected = false;
    });

    await redisClient.connect();
    isRedisConnected = true;
    console.log("Redis connected successfully");
    return redisClient;
  } catch (error) {
    console.warn("Failed to connect to Redis. Caching/Socket clustering fallback enabled. Error:", error.message);
    redisClient = null;
    isRedisConnected = false;
    return null;
  }
};

export const getRedisClient = () => {
  if (isRedisConnected) return redisClient;
  return null;
};
