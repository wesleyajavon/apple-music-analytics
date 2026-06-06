export type RateLimitRedisTransport = "upstash-rest" | "ioredis";

function getUpstashRestCredentials(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url, token };
}

export function isRateLimitRestRedisConfigured(): boolean {
  return getUpstashRestCredentials() !== null;
}

export function isRateLimitRedisBackendConfigured(): boolean {
  return isRateLimitRestRedisConfigured() || !!process.env.REDIS_URL;
}

export function getRateLimitRedisTransport(): RateLimitRedisTransport | null {
  if (isRateLimitRestRedisConfigured()) return "upstash-rest";
  if (process.env.REDIS_URL) return "ioredis";
  return null;
}

/**
 * In production, rate limiting must use Redis. When Redis is missing or
 * unreachable, requests are rejected instead of bypassing limits (fail-closed).
 *
 * Prefer UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN on serverless (HTTP).
 * Set RATE_LIMIT_FAIL_CLOSED=false locally in prod-like staging if needed.
 */
export function isRateLimitFailClosed(): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  const raw = process.env.RATE_LIMIT_FAIL_CLOSED?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "off") return false;
  return true;
}

export function isRateLimitRedisRequired(): boolean {
  return isRateLimitFailClosed();
}

export function getRateLimitBackendStatus(): {
  failClosed: boolean;
  redisConfigured: boolean;
  redisRequired: boolean;
  transport: ReturnType<typeof getRateLimitRedisTransport>;
} {
  const failClosed = isRateLimitFailClosed();
  return {
    failClosed,
    redisConfigured: isRateLimitRedisBackendConfigured(),
    redisRequired: failClosed,
    transport: getRateLimitRedisTransport(),
  };
}
