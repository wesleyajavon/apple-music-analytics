/**
 * AI Insights Cache
 *
 * Caches AI-generated insights based on a hash of the analytics summary input.
 * Cache logic is separated from generation logic for clarity and testability.
 *
 * Uses Redis when available; falls back to in-memory cache for development.
 * TTL: 24 hours (insights don't change unless underlying analytics change).
 */

import { createHash } from "crypto";
import { getRedisClient } from "@/lib/redis";
import type { AiInsightMoment, AiInsightsStyle } from "@/lib/dto/ai-insights";
import type { AnalyticsSummary } from "./analytics-summarizer";
import type { AiLocale } from "./locale-utils";

const CACHE_PREFIX = "ai:insights:v3:";
const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours

export type CachedInsightsPayload = {
  insights: string[];
  moments?: AiInsightMoment[];
};

// In-memory fallback when Redis is unavailable (e.g. dev without Redis)
const memoryCache = new Map<
  string,
  { payload: CachedInsightsPayload; expiresAt: number }
>();
const MEMORY_CACHE_TTL_MS = CACHE_TTL_SECONDS * 1000;

function normalizeCachedPayload(parsed: unknown): CachedInsightsPayload | null {
  if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
    return { insights: parsed };
  }
  if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as CachedInsightsPayload).insights)
  ) {
    const value = parsed as CachedInsightsPayload;
    return {
      insights: value.insights,
      moments: Array.isArray(value.moments) ? value.moments : undefined,
    };
  }
  return null;
}

function toPayload(
  value: CachedInsightsPayload | string[]
): CachedInsightsPayload {
  return Array.isArray(value) ? { insights: value } : value;
}

/**
 * Computes a deterministic hash of the exact LLM user-message body + locale + style.
 * Uses `summary.text` (not `structured` alone) so the cache key matches what `generateInsights` sends to Groq.
 */
export function computeCacheKey(
  summary: AnalyticsSummary,
  locale: AiLocale,
  insightStyle: AiInsightsStyle = "technical"
): string {
  const payload = summary.text + ":" + locale + ":" + insightStyle;
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

/**
 * Gets cached insights if available.
 *
 * @param cacheKey - Hash from computeCacheKey(summary)
 * @returns Cached payload, or null if miss
 */
export async function getCachedInsights(
  cacheKey: string
): Promise<CachedInsightsPayload | null> {
  const redis = getRedisClient();

  if (redis) {
    try {
      const key = CACHE_PREFIX + cacheKey;
      const cached = await redis.get(key);
      if (cached) {
        return normalizeCachedPayload(JSON.parse(cached));
      }
    } catch {
      // Redis error: fall through to memory cache
    }
  }

  const entry = memoryCache.get(cacheKey);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.payload;
  }
  if (entry) {
    memoryCache.delete(cacheKey);
  }

  return null;
}

/**
 * Stores insights in cache.
 *
 * @param cacheKey - Hash from computeCacheKey(summary)
 * @param insights - Generated insight strings or typed moments payload
 */
export async function setCachedInsights(
  cacheKey: string,
  insights: CachedInsightsPayload | string[]
): Promise<void> {
  const payload = toPayload(insights);
  const redis = getRedisClient();

  if (redis) {
    try {
      const key = CACHE_PREFIX + cacheKey;
      await redis.setex(key, CACHE_TTL_SECONDS, JSON.stringify(payload));
    } catch {
      // Redis error: fall through to memory cache
    }
  }

  memoryCache.set(cacheKey, {
    payload,
    expiresAt: Date.now() + MEMORY_CACHE_TTL_MS,
  });
}
