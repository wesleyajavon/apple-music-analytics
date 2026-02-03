/**
 * Taste Profile Cache
 *
 * Caches generated taste profiles by analytics summary hash + tone.
 * Same analytics + same tone → cache hit. Avoids regeneration unless inputs change.
 *
 * Uses Redis when available; falls back to in-memory cache for development.
 * TTL: 24 hours (profiles don't change unless underlying analytics change).
 */

import { createHash } from "crypto";
import { getRedisClient } from "@/lib/redis";
import type { TasteSummary } from "./taste-summary-builder";
import type { TasteProfileTone } from "@/lib/dto/taste-profile";

const CACHE_PREFIX = "ai:taste-profile:";
const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours

export interface CachedTasteProfile {
  description: string;
  influences: string;
  coreGenres: string;
  uniqueAspect: string;
}

const memoryCache = new Map<
  string,
  { profile: CachedTasteProfile; expiresAt: number }
>();
const MEMORY_CACHE_TTL_MS = CACHE_TTL_SECONDS * 1000;

/**
 * Computes cache key from summary hash + tone.
 * Same summary + same tone → same key → cache hit.
 */
export function computeTasteProfileCacheKey(
  summary: TasteSummary,
  tone: TasteProfileTone
): string {
  const hash = createHash("sha256")
    .update(summary.structured, "utf8")
    .digest("hex");
  return `${hash}:${tone}`;
}

/**
 * Gets cached taste profile if available.
 */
export async function getCachedTasteProfile(
  cacheKey: string
): Promise<CachedTasteProfile | null> {
  const redis = getRedisClient();

  if (redis) {
    try {
      const key = CACHE_PREFIX + cacheKey;
      const cached = await redis.get(key);
      if (cached) {
        const parsed = JSON.parse(cached) as CachedTasteProfile;
        return isValidProfile(parsed) ? parsed : null;
      }
    } catch {
      // Redis error: fall through to memory cache
    }
  }

  const entry = memoryCache.get(cacheKey);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.profile;
  }
  if (entry) {
    memoryCache.delete(cacheKey);
  }

  return null;
}

/**
 * Stores taste profile in cache.
 */
export async function setCachedTasteProfile(
  cacheKey: string,
  profile: CachedTasteProfile
): Promise<void> {
  const redis = getRedisClient();

  if (redis) {
    try {
      const key = CACHE_PREFIX + cacheKey;
      await redis.setex(key, CACHE_TTL_SECONDS, JSON.stringify(profile));
    } catch {
      // Redis error: fall through to memory cache
    }
  }

  memoryCache.set(cacheKey, {
    profile,
    expiresAt: Date.now() + MEMORY_CACHE_TTL_MS,
  });
}

function isValidProfile(obj: unknown): obj is CachedTasteProfile {
  if (!obj || typeof obj !== "object") return false;
  const p = obj as Record<string, unknown>;
  return (
    typeof p.description === "string" &&
    typeof p.influences === "string" &&
    typeof p.coreGenres === "string" &&
    typeof p.uniqueAspect === "string"
  );
}
