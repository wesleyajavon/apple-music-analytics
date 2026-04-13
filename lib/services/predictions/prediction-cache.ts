/**
 * Cache for listening habit predictions.
 * Predictions are cached per day (invalidate at midnight).
 * AI explanations are cached separately by prediction hash.
 */

import { createHash } from "crypto";
import { getRedisClient } from "@/lib/redis";
import type { ListeningHabitPrediction } from "@/lib/dto/predictions";
import type { AiLocale } from "@/lib/services/ai/locale-utils";

const PREDICTION_PREFIX = "predictions:listening-habit:";
const EXPLANATION_PREFIX = "predictions:listening-habit:explanation:";
const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours (per day)

// In-memory fallback when Redis is unavailable
const memoryPredictionCache = new Map<
  string,
  { data: ListeningHabitPrediction; expiresAt: number }
>();
const memoryExplanationCache = new Map<
  string,
  { explanation: string; expiresAt: number }
>();
const MEMORY_TTL_MS = CACHE_TTL_SECONDS * 1000;

/**
 * Cache key for prediction: date + userId.
 * Same key for the whole day.
 */
function getPredictionCacheKey(userId?: string): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `${PREDICTION_PREFIX}${today}:${userId ?? "default"}`;
}

/**
 * Cache key for AI explanation: hash of prediction output + locale + user scope.
 * Avoids sharing an explanation string across users if two predictions ever collide.
 */
export function getExplanationCacheKey(
  prediction: ListeningHabitPrediction,
  locale: AiLocale,
  userId?: string
): string {
  const payload = JSON.stringify({
    timeWindow: prediction.timeWindow,
    confidenceScore: prediction.confidenceScore,
    predictedGenre: prediction.predictedGenre,
    supportingMetrics: prediction.supportingMetrics,
  });
  return (
    EXPLANATION_PREFIX +
    createHash("sha256")
      .update(payload + ":" + locale + ":" + (userId ?? "default"), "utf8")
      .digest("hex")
  );
}

export async function getCachedPrediction(
  userId?: string
): Promise<ListeningHabitPrediction | null> {
  const key = getPredictionCacheKey(userId);
  const redis = getRedisClient();

  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached) as ListeningHabitPrediction;
      }
    } catch {
      // Fall through to memory
    }
  }

  const entry = memoryPredictionCache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.data;
  }
  if (entry) memoryPredictionCache.delete(key);
  return null;
}

export async function setCachedPrediction(
  prediction: ListeningHabitPrediction,
  userId?: string
): Promise<void> {
  const key = getPredictionCacheKey(userId);
  const redis = getRedisClient();

  if (redis) {
    try {
      await redis.setex(key, CACHE_TTL_SECONDS, JSON.stringify(prediction));
    } catch {
      // Fall through
    }
  }

  memoryPredictionCache.set(key, {
    data: prediction,
    expiresAt: Date.now() + MEMORY_TTL_MS,
  });
}

export async function getCachedExplanation(
  cacheKey: string
): Promise<string | null> {
  const redis = getRedisClient();

  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return cached;
    } catch {
      // Fall through
    }
  }

  const entry = memoryExplanationCache.get(cacheKey);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.explanation;
  }
  if (entry) memoryExplanationCache.delete(cacheKey);
  return null;
}

export async function setCachedExplanation(
  cacheKey: string,
  explanation: string
): Promise<void> {
  const redis = getRedisClient();

  if (redis) {
    try {
      await redis.setex(cacheKey, CACHE_TTL_SECONDS, explanation);
    } catch {
      // Fall through
    }
  }

  memoryExplanationCache.set(cacheKey, {
    explanation,
    expiresAt: Date.now() + MEMORY_TTL_MS,
  });
}

/** Best-effort invalidation after a user clears analytics (avoids stale “today” prediction). */
export async function invalidateListeningHabitPredictionForUser(
  userId: string
): Promise<void> {
  const key = getPredictionCacheKey(userId);
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.del(key);
    } catch {
      // ignore
    }
  }
  memoryPredictionCache.delete(key);
}
