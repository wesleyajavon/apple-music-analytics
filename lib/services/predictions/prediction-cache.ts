/**
 * Redis + in-memory cache for listening-habit predictions (per user + UTC day).
 */

import { createHash } from "crypto";
import { getRedisClient } from "@/lib/redis";
import type { ListeningHabitResponse } from "@/lib/dto/predictions";

const PRED_PREFIX = "prediction:listening-habit:";
const EXPLAIN_PREFIX = "prediction:listening-habit:explain:";
const TTL_SECONDS = 24 * 60 * 60;

const memoryPrediction = new Map<
  string,
  { payload: ListeningHabitResponse; expiresAt: number }
>();
const memoryExplain = new Map<string, { text: string; expiresAt: number }>();

function utcDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function predictionKey(userId: string): string {
  return `${PRED_PREFIX}${userId}:${utcDateStr()}`;
}

export function getExplanationCacheKey(userId: string, locale: string): string {
  return `${userId}:${locale}:${utcDateStr()}`;
}

export async function getCachedPrediction(
  userId: string
): Promise<ListeningHabitResponse | null> {
  const key = predictionKey(userId);
  const redis = getRedisClient();
  if (redis) {
    try {
      const raw = await redis.get(key);
      if (raw) {
        const parsed = JSON.parse(raw) as ListeningHabitResponse;
        return parsed ?? null;
      }
    } catch {
      /* fall through */
    }
  }

  const mem = memoryPrediction.get(key);
  if (mem && mem.expiresAt > Date.now()) return mem.payload;
  memoryPrediction.delete(key);
  return null;
}

export async function setCachedPrediction(
  userId: string,
  data: ListeningHabitResponse
): Promise<void> {
  const key = predictionKey(userId);
  const payload = JSON.stringify(data);
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.setex(key, TTL_SECONDS, payload);
    } catch {
      /* fall through */
    }
  }

  memoryPrediction.set(key, {
    payload: data,
    expiresAt: Date.now() + TTL_SECONDS * 1000,
  });
}

export async function getCachedExplanation(
  logicalKey: string
): Promise<string | null> {
  const hashed = createHash("sha256").update(logicalKey, "utf8").digest("hex");
  const key = `${EXPLAIN_PREFIX}${hashed}`;
  const redis = getRedisClient();
  if (redis) {
    try {
      const raw = await redis.get(key);
      if (typeof raw === "string" && raw.length > 0) return raw;
    } catch {
      /* fall through */
    }
  }

  const mem = memoryExplain.get(key);
  if (mem && mem.expiresAt > Date.now()) return mem.text;
  memoryExplain.delete(key);
  return null;
}

export async function setCachedExplanation(
  logicalKey: string,
  text: string
): Promise<void> {
  const hashed = createHash("sha256").update(logicalKey, "utf8").digest("hex");
  const key = `${EXPLAIN_PREFIX}${hashed}`;
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.setex(key, TTL_SECONDS, text);
    } catch {
      /* fall through */
    }
  }

  memoryExplain.set(key, {
    text,
    expiresAt: Date.now() + TTL_SECONDS * 1000,
  });
}
