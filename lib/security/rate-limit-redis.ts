import { Redis as UpstashRedis } from "@upstash/redis";
import { getRedisClient, runRedisCommand } from "@/lib/redis";
import {
  isRateLimitRestRedisConfigured,
  type RateLimitRedisTransport,
} from "@/lib/security/rate-limit-policy";

export type { RateLimitRedisTransport };

export const REDIS_FIXED_WINDOW_LUA = `
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

const globalForRateLimitRedis = globalThis as unknown as {
  upstashRest: UpstashRedis | undefined;
};

function getUpstashRestCredentials(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url, token };
}

function getUpstashRestClient(): UpstashRedis {
  const credentials = getUpstashRestCredentials();
  if (!credentials) {
    throw new Error("Upstash REST Redis is not configured");
  }

  if (!globalForRateLimitRedis.upstashRest) {
    globalForRateLimitRedis.upstashRest = new UpstashRedis(credentials);
  }

  return globalForRateLimitRedis.upstashRest;
}

function normalizeEvalResult(raw: unknown): [number, number] {
  if (!Array.isArray(raw) || raw.length < 2) {
    return [0, 0];
  }
  const currentCount = Number(raw[0] ?? 0);
  const ttlMs = Math.max(1, Number(raw[1] ?? 0));
  return [
    Number.isFinite(currentCount) ? currentCount : 0,
    Number.isFinite(ttlMs) ? ttlMs : 0,
  ];
}

export async function evalRateLimitWindow(
  key: string,
  windowMs: number
): Promise<[number, number] | null> {
  if (isRateLimitRestRedisConfigured()) {
    const raw = await getUpstashRestClient().eval(
      REDIS_FIXED_WINDOW_LUA,
      [key],
      [String(windowMs)]
    );
    return normalizeEvalResult(raw);
  }

  const redis = getRedisClient();
  if (!redis) return null;

  const raw = await runRedisCommand((client) =>
    client.eval(REDIS_FIXED_WINDOW_LUA, 1, key, String(windowMs))
  );
  return normalizeEvalResult(raw);
}

export async function incrementRateLimitBlockedCounters(
  route: string,
  subject: string,
  minuteKey: string
): Promise<number | null> {
  const routeMinuteKey = `rate-limit:429:route:${route}:${minuteKey}`;
  const routeSubjectKey = `rate-limit:429:subject:${route}`;

  if (isRateLimitRestRedisConfigured()) {
    const results = await getUpstashRestClient()
      .pipeline()
      .incr(routeMinuteKey)
      .expire(routeMinuteKey, 120)
      .zincrby(routeSubjectKey, 1, subject)
      .expire(routeSubjectKey, 7 * 24 * 3600)
      .exec();

    const minuteCount = Number(results[0] ?? 1);
    return Number.isFinite(minuteCount) ? minuteCount : 1;
  }

  const redis = getRedisClient();
  if (!redis) return null;

  const raw = await runRedisCommand((client) =>
    client
      .multi()
      .incr(routeMinuteKey)
      .expire(routeMinuteKey, 120)
      .zincrby(routeSubjectKey, 1, subject)
      .expire(routeSubjectKey, 7 * 24 * 3600)
      .exec()
  );

  const minuteCount = Number(raw?.[0]?.[1] ?? 1);
  return Number.isFinite(minuteCount) ? minuteCount : 1;
}

export async function getRateLimitBlockedCount(
  route: string,
  minuteKey: string
): Promise<number | null> {
  const routeMinuteKey = `rate-limit:429:route:${route}:${minuteKey}`;

  if (isRateLimitRestRedisConfigured()) {
    const raw = await getUpstashRestClient().get<number>(routeMinuteKey);
    const n = Number(raw ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  const redis = getRedisClient();
  if (!redis) return null;

  const raw = await runRedisCommand((client) => client.get(routeMinuteKey));
  const n = Number(raw ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function getRateLimitTopBlockedSubjectsFromRedis(
  route: string,
  limit: number
): Promise<Array<{ subject: string; blockedCount: number }> | null> {
  const zkey = `rate-limit:429:subject:${route}`;

  if (isRateLimitRestRedisConfigured()) {
    const raw = await getUpstashRestClient().zrange(zkey, 0, limit - 1, {
      rev: true,
      withScores: true,
    });

    const out: Array<{ subject: string; blockedCount: number }> = [];
    if (Array.isArray(raw)) {
      for (let i = 0; i < raw.length; i += 2) {
        const member = raw[i];
        const score = Number(raw[i + 1] ?? 0);
        if (typeof member !== "string") continue;
        out.push({
          subject: member,
          blockedCount: Number.isFinite(score) ? Math.floor(score) : 0,
        });
      }
    }
    return out;
  }

  const redis = getRedisClient();
  if (!redis) return null;

  const raw = await runRedisCommand((client) =>
    client.zrevrange(zkey, 0, limit - 1, "WITHSCORES")
  );

  const out: Array<{ subject: string; blockedCount: number }> = [];
  if (Array.isArray(raw)) {
    for (let i = 0; i < raw.length; i += 2) {
      const subject = raw[i];
      const score = Number(raw[i + 1] ?? 0);
      if (typeof subject !== "string") continue;
      out.push({
        subject,
        blockedCount: Number.isFinite(score) ? Math.floor(score) : 0,
      });
    }
  }
  return out;
}
