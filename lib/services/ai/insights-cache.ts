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
import type { AnalyticsSummary } from "./analytics-summarizer";
import type { AiLocale } from "./locale-utils";

const CACHE_PREFIX = "ai:insights:";
const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours

// In-memory fallback when Redis is unavailable (e.g. dev without Redis)
const memoryCache = new Map<string, { insights: string[]; expiresAt: number }>();
const MEMORY_CACHE_TTL_MS = CACHE_TTL_SECONDS * 1000;

/**
 * Computes a deterministic hash of the exact LLM user-message body + locale.
 * Uses `summary.text` (not `structured` alone) so the cache key matches what `generateInsights` sends to Groq.
 */
export function computeCacheKey(summary: AnalyticsSummary, locale: AiLocale): string {
  const payload = summary.text + ":" + locale;
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

/**
 * Gets cached insights if available.
 *
 * @param cacheKey - Hash from computeCacheKey(summary)
 * @returns Cached insights array, or null if miss
 */
export async function getCachedInsights(
  cacheKey: string
): Promise<string[] | null> {
  const redis = getRedisClient();

  if (redis) {
    try {
      const key = CACHE_PREFIX + cacheKey;
      const cached = await redis.get(key);
      if (cached) {
        const parsed = JSON.parse(cached) as string[];
        return Array.isArray(parsed) ? parsed : null;
      }
    } catch {
      // Redis error: fall through to memory cache
    }
  }

  // In-memory fallback
  const entry = memoryCache.get(cacheKey);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.insights;
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
 * @param insights - Generated insight strings to cache
 */
export async function setCachedInsights(
  cacheKey: string,
  insights: string[]
): Promise<void> {
  const redis = getRedisClient();

  if (redis) {
    try {
      const key = CACHE_PREFIX + cacheKey;
      await redis.setex(key, CACHE_TTL_SECONDS, JSON.stringify(insights));
    } catch {
      // Redis error: fall through to memory cache
    }
  }

  // In-memory fallback
  memoryCache.set(cacheKey, {
    insights,
    expiresAt: Date.now() + MEMORY_CACHE_TTL_MS,
  });
}
