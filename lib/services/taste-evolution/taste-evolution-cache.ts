/**
 * Taste Evolution Cache
 *
 * Caches:
 * 1. Weekly trend computations (by date range + userId)
 * 2. AI commentary separately (by hash of trends)
 *
 * Recompute only when new listening data is added.
 * TTL: 24h for trends, 24h for commentary.
 */

import { createHash } from "crypto";
import { getRedisClient } from "@/lib/redis";
import type { WeekToWeekTrend } from "@/lib/dto/taste-evolution";
import type { AiLocale } from "@/lib/services/ai/locale-utils";

const TRENDS_CACHE_PREFIX = "taste-evolution:trends:";
const COMMENTARY_CACHE_PREFIX = "taste-evolution:commentary:";
const COMMENTARY_LIGHT_CACHE_PREFIX = "taste-evolution:commentary-light:";
const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours

const memoryTrendsCache = new Map<
  string,
  { trends: WeekToWeekTrend[]; skippedWeeks: Array<{ weekStart: string; reason: string }>; expiresAt: number }
>();
const memoryCommentaryCache = new Map<string, { commentary: string; expiresAt: number }>();
const memoryCommentaryLightCache = new Map<string, { commentary: string; expiresAt: number }>();
const MEMORY_CACHE_TTL_MS = CACHE_TTL_SECONDS * 1000;

function trendsCacheKey(startDate: string, endDate: string, userId?: string): string {
  return createHash("sha256")
    .update(`${startDate}:${endDate}:${userId ?? "all"}`)
    .digest("hex");
}

function commentaryCacheKey(trends: WeekToWeekTrend[], locale: AiLocale, light: boolean): string {
  const payload = JSON.stringify(
    trends.map((t) => ({
      week: t.timeRange.weekStart,
      classification: t.classification,
      volumeDelta: t.volumeDelta,
      diversityDelta: t.diversityDelta,
      emerging: t.emergingGenres.map((g) => g.genre),
      declining: t.decliningGenres.map((g) => g.genre),
    }))
  );
  return createHash("sha256").update(payload + ":" + locale + ":" + (light ? "light" : "tech"), "utf8").digest("hex");
}

export async function getCachedTrends(
  startDate: string,
  endDate: string,
  userId?: string
): Promise<{ trends: WeekToWeekTrend[]; skippedWeeks: Array<{ weekStart: string; reason: string }> } | null> {
  const key = trendsCacheKey(startDate, endDate, userId);
  const redis = getRedisClient();

  if (redis) {
    try {
      const cached = await redis.get(TRENDS_CACHE_PREFIX + key);
      if (cached) {
        const parsed = JSON.parse(cached) as {
          trends: WeekToWeekTrend[];
          skippedWeeks: Array<{ weekStart: string; reason: string }>;
        };
        return parsed;
      }
    } catch {
      // fall through
    }
  }

  const entry = memoryTrendsCache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return { trends: entry.trends, skippedWeeks: entry.skippedWeeks };
  }
  if (entry) memoryTrendsCache.delete(key);
  return null;
}

export async function setCachedTrends(
  startDate: string,
  endDate: string,
  userId: string | undefined,
  data: { trends: WeekToWeekTrend[]; skippedWeeks: Array<{ weekStart: string; reason: string }> }
): Promise<void> {
  const key = trendsCacheKey(startDate, endDate, userId);
  const redis = getRedisClient();

  if (redis) {
    try {
      await redis.setex(
        TRENDS_CACHE_PREFIX + key,
        CACHE_TTL_SECONDS,
        JSON.stringify(data)
      );
    } catch {
      // fall through
    }
  }

  memoryTrendsCache.set(key, {
    ...data,
    expiresAt: Date.now() + MEMORY_CACHE_TTL_MS,
  });
}

export async function getCachedCommentary(
  trends: WeekToWeekTrend[],
  locale: AiLocale,
  light = false
): Promise<string | null> {
  const key = commentaryCacheKey(trends, locale, light);
  const prefix = light ? COMMENTARY_LIGHT_CACHE_PREFIX : COMMENTARY_CACHE_PREFIX;
  const cache = light ? memoryCommentaryLightCache : memoryCommentaryCache;
  const redis = getRedisClient();

  if (redis) {
    try {
      const cached = await redis.get(prefix + key);
      if (cached) return cached;
    } catch {
      // fall through
    }
  }

  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.commentary;
  }
  if (entry) cache.delete(key);
  return null;
}

export async function setCachedCommentary(
  trends: WeekToWeekTrend[],
  commentary: string,
  locale: AiLocale,
  light = false
): Promise<void> {
  const key = commentaryCacheKey(trends, locale, light);
  const prefix = light ? COMMENTARY_LIGHT_CACHE_PREFIX : COMMENTARY_CACHE_PREFIX;
  const cache = light ? memoryCommentaryLightCache : memoryCommentaryCache;
  const redis = getRedisClient();

  if (redis) {
    try {
      await redis.setex(prefix + key, CACHE_TTL_SECONDS, commentary);
    } catch {
      // fall through
    }
  }

  cache.set(key, {
    commentary,
    expiresAt: Date.now() + MEMORY_CACHE_TTL_MS,
  });
}
