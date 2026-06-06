/**
 * Redis client configuration
 * Singleton pattern for connection reuse across the application
 */

import Redis, { type RedisOptions } from "ioredis";

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
  
  const options: RedisOptions = {
    /**
     * Never use `null` here: ioredis would retry queued commands indefinitely while reconnecting,
     * which can hang TPM/quota Redis calls and stall `/api/ai/*` for as long as the tab stays open.
     */
    maxRetriesPerRequest: 4,
    enableReadyCheck: true,
    lazyConnect: true,
    connectTimeout: 5000,
    /** Fail stuck commands instead of blocking AI routes forever */
    commandTimeout: 12_000,
    retryStrategy: () => null,
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

function isRedisClientUsable(client: Redis): boolean {
  const status = client.status;
  return status !== "end" && status !== "close";
}

export function isStaleRedisConnectionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Connection is closed") ||
    message.includes("ECONNRESET") ||
    message.includes("ECONNREFUSED") ||
    message.includes("Socket closed")
  );
}

/** Drop a dead client so the next getRedisClient() creates a fresh connection. */
export function invalidateRedisClient(): void {
  const existing = globalForRedis.redis;
  if (!existing) return;
  globalForRedis.redis = undefined;
  try {
    existing.disconnect();
  } catch {
    // ignore teardown errors
  }
}

/**
 * Get or create Redis client instance.
 * Reuses one connection per warm serverless instance (Vercel) to avoid
 * connection storms and stale TCP sockets against Upstash.
 */
export function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) {
    return null;
  }

  const existing = globalForRedis.redis;
  if (existing && isRedisClientUsable(existing)) {
    return existing;
  }

  if (existing) {
    invalidateRedisClient();
  }

  globalForRedis.redis = createRedisClient();
  return globalForRedis.redis;
}

/**
 * Run a Redis command with one automatic reconnect on stale TCP connections.
 * Keeps retry bounded (single retry) so AI routes cannot hang indefinitely.
 */
export async function runRedisCommand<T>(
  operation: (client: Redis) => Promise<T>
): Promise<T> {
  const attempt = async (allowRetry: boolean): Promise<T> => {
    const client = getRedisClient();
    if (!client) {
      throw new Error("Redis is not configured");
    }
    try {
      return await operation(client);
    } catch (error) {
      if (allowRetry && isStaleRedisConnectionError(error)) {
        invalidateRedisClient();
        return attempt(false);
      }
      throw error;
    }
  };

  return attempt(true);
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return !!process.env.REDIS_URL;
}

