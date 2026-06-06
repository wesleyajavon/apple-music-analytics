import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { getRedisClient, runRedisCommand } from "@/lib/redis";
import { isRateLimitFailClosed } from "@/lib/security/rate-limit-policy";
import { logSecurityAuthEvent } from "@/lib/security/security-logger";
import { AppError, ErrorCodes } from "@/lib/utils/error-handler";
import { logger } from "@/lib/utils/logger";
import { captureRateLimitSpike } from "@/lib/utils/sentry";

const REDIS_FIXED_WINDOW_LUA = `
local key = KEYS[1]
local window_ms = tonumber(ARGV[1])
local current = redis.call('INCR', key)
if current == 1 then
  redis.call('PEXPIRE', key, window_ms)
end
local ttl = redis.call('PTTL', key)
if ttl < 0 then
  ttl = window_ms
end
return { current, ttl }
`;

type MemoryCounter = {
  count: number;
  resetAtMs: number;
};

const memoryCounters = new Map<string, MemoryCounter>();
const memory429ByRouteMinute = new Map<string, number>();
const memory429ByRouteSubject = new Map<string, number>();
const memorySoftWarnedKeys = new Set<string>();

export type RateLimitConfig = {
  route: string;
  windowMs: number;
  maxRequests: number;
  userId?: string | null;
  softLimitRatio?: number;
  spikeAlertThreshold?: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: string;
  /** True when production fail-closed rejected the request because Redis was unavailable. */
  backendUnavailable?: boolean;
};

export type RateLimitHeadersConfig = {
  maxRequests: number;
};

export type RateLimitBlockedSubjectStat = {
  subject: string;
  blockedCount: number;
};

function getClientIp(request: NextRequest): string | null {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }

  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;

  const cf = request.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;

  return null;
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip, "utf8").digest("hex").slice(0, 24);
}

function resolveSubject(request: NextRequest, userId?: string | null): string {
  const normalizedUserId = userId?.trim();
  if (normalizedUserId) return `u:${normalizedUserId}`;

  const ip = getClientIp(request) ?? "unknown";
  return `ip:${hashIp(ip)}`;
}

function buildKey(route: string, subject: string): string {
  return `rate-limit:${route}:${subject}`;
}

function createResult(
  allowed: boolean,
  remaining: number,
  resetAtMs: number,
  backendUnavailable = false
): RateLimitResult {
  return {
    allowed,
    remaining: Math.max(0, remaining),
    resetAt: new Date(resetAtMs).toISOString(),
    backendUnavailable,
  };
}

function createFailClosedResult(nowMs: number, windowMs: number): RateLimitResult {
  return createResult(false, 0, nowMs + windowMs, true);
}

function clampSoftRatio(ratio?: number): number {
  if (ratio === undefined) return 0.8;
  if (!Number.isFinite(ratio)) return 0.8;
  if (ratio <= 0) return 0.8;
  if (ratio >= 1) return 0.99;
  return ratio;
}

function getSpikeAlertThreshold(config: RateLimitConfig): number {
  const envRaw = process.env.RATE_LIMIT_SPIKE_ALERT_THRESHOLD;
  const envThreshold = envRaw ? Number.parseInt(envRaw, 10) : NaN;
  if (Number.isFinite(envThreshold) && envThreshold > 0) return envThreshold;
  if (config.spikeAlertThreshold && config.spikeAlertThreshold > 0) return config.spikeAlertThreshold;
  return 20;
}

function shouldWarnSoftLimit(
  key: string,
  result: RateLimitResult,
  config: RateLimitConfig
): boolean {
  if (!result.allowed) return false;
  if (memorySoftWarnedKeys.has(key)) return false;
  const used = config.maxRequests - result.remaining;
  const softThreshold = Math.ceil(config.maxRequests * clampSoftRatio(config.softLimitRatio));
  if (used >= softThreshold) {
    memorySoftWarnedKeys.add(key);
    return true;
  }
  return false;
}

async function recordBlockedRateLimit(route: string, subject: string): Promise<{ minuteCount: number }> {
  const minuteKey = new Date().toISOString().slice(0, 16);
  const redis = getRedisClient();
  if (redis) {
    const routeMinuteKey = `rate-limit:429:route:${route}:${minuteKey}`;
    const routeSubjectKey = `rate-limit:429:subject:${route}:${subject}`;
    try {
      const raw = await redis
        .multi()
        .incr(routeMinuteKey)
        .expire(routeMinuteKey, 120)
        .zincrby(routeSubjectKey, 1, subject)
        .expire(routeSubjectKey, 7 * 24 * 3600)
        .exec();
      const minuteCount = Number(raw?.[0]?.[1] ?? 1);
      return { minuteCount: Number.isFinite(minuteCount) ? minuteCount : 1 };
    } catch {
      // Fall through to memory counters.
    }
  }

  const routeMinuteKey = `${route}:${minuteKey}`;
  const routeSubjectKey = `${route}:${subject}`;
  const nextMinuteCount = (memory429ByRouteMinute.get(routeMinuteKey) ?? 0) + 1;
  const nextSubjectCount = (memory429ByRouteSubject.get(routeSubjectKey) ?? 0) + 1;
  memory429ByRouteMinute.set(routeMinuteKey, nextMinuteCount);
  memory429ByRouteSubject.set(routeSubjectKey, nextSubjectCount);
  return { minuteCount: nextMinuteCount };
}

export async function getRateLimitBlockedInCurrentMinute(route: string): Promise<number> {
  const minuteKey = new Date().toISOString().slice(0, 16);
  const redis = getRedisClient();
  if (redis) {
    try {
      const raw = await redis.get(`rate-limit:429:route:${route}:${minuteKey}`);
      const n = Number(raw ?? 0);
      return Number.isFinite(n) ? n : 0;
    } catch {
      // fall through to memory fallback
    }
  }
  return memory429ByRouteMinute.get(`${route}:${minuteKey}`) ?? 0;
}

export async function getRateLimitTopBlockedSubjects(
  route: string,
  limit = 10
): Promise<RateLimitBlockedSubjectStat[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const redis = getRedisClient();
  if (redis) {
    try {
      const zkey = `rate-limit:429:subject:${route}`;
      const raw = await redis.zrevrange(zkey, 0, safeLimit - 1, "WITHSCORES");
      const out: RateLimitBlockedSubjectStat[] = [];
      for (let i = 0; i < raw.length; i += 2) {
        const subject = raw[i];
        const score = Number(raw[i + 1] ?? 0);
        out.push({
          subject,
          blockedCount: Number.isFinite(score) ? Math.floor(score) : 0,
        });
      }
      return out;
    } catch {
      // fall through to memory fallback
    }
  }

  const prefix = `${route}:`;
  const pairs: RateLimitBlockedSubjectStat[] = [];
  for (const [k, count] of memory429ByRouteSubject.entries()) {
    if (!k.startsWith(prefix)) continue;
    pairs.push({
      subject: k.slice(prefix.length),
      blockedCount: count,
    });
  }
  pairs.sort((a, b) => b.blockedCount - a.blockedCount);
  return pairs.slice(0, safeLimit);
}

function checkRateLimitMemory(
  key: string,
  windowMs: number,
  maxRequests: number,
  nowMs: number
): RateLimitResult {
  const current = memoryCounters.get(key);
  if (!current || nowMs >= current.resetAtMs) {
    memoryCounters.set(key, { count: 1, resetAtMs: nowMs + windowMs });
    return createResult(true, maxRequests - 1, nowMs + windowMs);
  }

  const nextCount = current.count + 1;
  current.count = nextCount;
  memoryCounters.set(key, current);
  return createResult(nextCount <= maxRequests, maxRequests - nextCount, current.resetAtMs);
}

async function checkRateLimitRedis(
  key: string,
  windowMs: number,
  maxRequests: number,
  nowMs: number
): Promise<RateLimitResult | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const raw = (await runRedisCommand((client) =>
      client.eval(REDIS_FIXED_WINDOW_LUA, 1, key, String(windowMs))
    )) as [number, number];

    const currentCount = Number(raw?.[0] ?? 0);
    const ttlMs = Math.max(1, Number(raw?.[1] ?? windowMs));
    const resetAtMs = nowMs + ttlMs;
    return createResult(currentCount <= maxRequests, maxRequests - currentCount, resetAtMs);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[rate-limit] Redis failed, using in-memory fallback:", error);
      return checkRateLimitMemory(key, windowMs, maxRequests, nowMs);
    }
    if (isRateLimitFailClosed()) {
      logger.error("Rate limit Redis unavailable (fail-closed)", {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return createFailClosedResult(nowMs, windowMs);
    }
    return null;
  }
}

export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const nowMs = Date.now();
  const subject = resolveSubject(request, config.userId);
  const key = buildKey(config.route, subject);

  const redisResult = await checkRateLimitRedis(
    key,
    config.windowMs,
    config.maxRequests,
    nowMs
  );
  if (redisResult) return redisResult;

  if (process.env.NODE_ENV === "development") {
    return checkRateLimitMemory(key, config.windowMs, config.maxRequests, nowMs);
  }

  if (isRateLimitFailClosed()) {
    logger.error("Rate limit Redis not configured (fail-closed)", {
      route: config.route,
      subject,
    });
    return createFailClosedResult(nowMs, config.windowMs);
  }

  // Staging / legacy: fail-open when Redis is missing to avoid accidental outages.
  return createResult(true, config.maxRequests, nowMs + config.windowMs);
}

export async function assertRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const subject = resolveSubject(request, config.userId);
  const key = buildKey(config.route, subject);
  const result = await checkRateLimit(request, config);
  if (result.backendUnavailable) {
    logger.error("Rate limit backend unavailable", {
      route: config.route,
      subject,
      resetAt: result.resetAt,
    });
    throw new AppError(
      503,
      "Service temporarily unavailable. Please try again shortly.",
      ErrorCodes.SERVICE_UNAVAILABLE,
      {
        route: config.route,
        resetAt: result.resetAt,
        reason: "rate_limit_backend_unavailable",
      }
    );
  }
  if (result.allowed) {
    if (shouldWarnSoftLimit(key, result, config)) {
      logger.warn("Rate limit soft threshold reached", {
        route: config.route,
        subject,
        maxRequests: config.maxRequests,
        windowMs: config.windowMs,
        remaining: result.remaining,
        resetAt: result.resetAt,
      });
    }
    return result;
  }

  const { minuteCount } = await recordBlockedRateLimit(config.route, subject);
  const spikeThreshold = getSpikeAlertThreshold(config);
  if (minuteCount >= spikeThreshold) {
    captureRateLimitSpike({
      route: config.route,
      blockedInMinute: minuteCount,
      threshold: spikeThreshold,
      subject,
    });
    logger.error("Rate limit spike detected", {
      route: config.route,
      blockedInMinute: minuteCount,
      threshold: spikeThreshold,
      subject,
      resetAt: result.resetAt,
    });
  } else {
    logger.warn("Rate limit hard limit reached", {
      route: config.route,
      subject,
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      remaining: result.remaining,
      resetAt: result.resetAt,
      blockedInMinute: minuteCount,
    });
  }

  logSecurityAuthEvent({
    route: config.route,
    statusCode: 429,
    reason: "rate_limited",
    userId: config.userId,
    request,
  });

  throw new AppError(
    429,
    "Too many requests. Please try again later.",
    ErrorCodes.RATE_LIMIT_EXCEEDED,
    {
      remaining: result.remaining,
      resetAt: result.resetAt,
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
      route: config.route,
    }
  );
}

export function applyRateLimitHeaders(
  response: Response,
  result: RateLimitResult,
  config: RateLimitHeadersConfig
): Response {
  response.headers.set("X-RateLimit-Limit", String(config.maxRequests));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  // Unix seconds are easier to consume on clients than ISO.
  response.headers.set(
    "X-RateLimit-Reset",
    String(Math.floor(new Date(result.resetAt).getTime() / 1000))
  );
  return response;
}

/** @internal tests */
export function __resetRateLimitMemoryForTests(): void {
  memoryCounters.clear();
  memory429ByRouteMinute.clear();
  memory429ByRouteSubject.clear();
  memorySoftWarnedKeys.clear();
}
