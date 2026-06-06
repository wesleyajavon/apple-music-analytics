import { isRedisAvailable } from "@/lib/redis";

/**
 * In production, rate limiting must use Redis. When Redis is missing or
 * unreachable, requests are rejected instead of bypassing limits (fail-closed).
 *
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
} {
  const failClosed = isRateLimitFailClosed();
  const redisConfigured = isRedisAvailable();
  return {
    failClosed,
    redisConfigured,
    redisRequired: failClosed,
  };
}
