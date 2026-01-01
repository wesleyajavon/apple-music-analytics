/**
 * Redis client configuration
 * Singleton pattern for connection reuse across the application
 */

import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

/**
 * Create a Redis client with proper error handling
 */
function createRedisClient(): Redis {
  let redisUrl = process.env.REDIS_URL!;
  
  // For Upstash, convert redis:// to rediss:// (TLS required)
  if (redisUrl.includes('upstash.io') && redisUrl.startsWith('redis://')) {
    redisUrl = redisUrl.replace('redis://', 'rediss://');
  }
  
  // Configuration options
  const options: any = {
    maxRetriesPerRequest: null, // Disable automatic retries, we handle errors manually
    enableReadyCheck: true,
    lazyConnect: true,
    connectTimeout: 5000, // 5 seconds timeout
    retryStrategy: (times: number) => {
      // Don't retry - fail fast
      return null;
    },
  };

  // For Upstash, use IPv6 (required by some Upstash instances)
  if (redisUrl.includes('upstash.io')) {
    options.family = 6; // Force IPv6 for Upstash
  }

  const client = new Redis(redisUrl, options);

  // Handle connection errors silently (we catch errors in try/catch blocks)
  client.on("error", (err) => {
    // Only log in development for debugging
    if (process.env.NODE_ENV === "development") {
      console.debug("Redis connection error (cache will be skipped):", err.message);
    }
  });

  return client;
}

/**
 * Get or create Redis client instance
 * Uses singleton pattern to reuse connection in development
 * Falls back gracefully if REDIS_URL is not configured
 */
export function getRedisClient(): Redis | null {
  // If Redis URL is not configured, return null (cache disabled)
  if (!process.env.REDIS_URL) {
    return null;
  }

  // In development, reuse the same Redis instance to avoid connection limits
  if (process.env.NODE_ENV !== "production") {
    if (!globalForRedis.redis) {
      globalForRedis.redis = createRedisClient();
    }
    return globalForRedis.redis;
  }

  // In production, create new instance (serverless functions)
  return createRedisClient();
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return !!process.env.REDIS_URL;
}

