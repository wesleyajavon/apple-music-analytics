/**
 * Cache for artist trends AI commentary (24h TTL, Redis + memory fallback).
 */

import { createHash } from "crypto";
import { getRedisClient } from "@/lib/redis";
import type { AiLocale } from "@/lib/services/ai/locale-utils";
import type { ArtistTrendsCompactPayload } from "@/lib/dto/artist-trends-ai";

const PREFIX_TECH = "artist-trends:commentary:";
const PREFIX_LIGHT = "artist-trends:commentary-light:";
const CACHE_TTL_SECONDS = 24 * 60 * 60;

const memoryTech = new Map<string, { text: string; expiresAt: number }>();
const memoryLight = new Map<string, { text: string; expiresAt: number }>();
const MEMORY_TTL_MS = CACHE_TTL_SECONDS * 1000;

function stablePayloadHash(payload: ArtistTrendsCompactPayload): string {
  const normalized = JSON.stringify({
    meta: payload.meta,
    perArtist: payload.perArtist,
    timeline: payload.timeline,
  });
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

function cacheKey(
  payload: ArtistTrendsCompactPayload,
  locale: AiLocale,
  light: boolean
): string {
  return stablePayloadHash(payload) + ":" + locale + ":" + (light ? "light" : "tech");
}

export async function getCachedArtistTrendsCommentary(
  payload: ArtistTrendsCompactPayload,
  locale: AiLocale,
  light: boolean
): Promise<string | null> {
  const key = cacheKey(payload, locale, light);
  const prefix = light ? PREFIX_LIGHT : PREFIX_TECH;
  const mem = light ? memoryLight : memoryTech;
  const redis = getRedisClient();

  if (redis) {
    try {
      const cached = await redis.get(prefix + key);
      if (cached) return cached;
    } catch {
      // fall through
    }
  }

  const entry = mem.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.text;
  }
  if (entry) mem.delete(key);
  return null;
}

export async function setCachedArtistTrendsCommentary(
  payload: ArtistTrendsCompactPayload,
  text: string,
  locale: AiLocale,
  light: boolean
): Promise<void> {
  const key = cacheKey(payload, locale, light);
  const prefix = light ? PREFIX_LIGHT : PREFIX_TECH;
  const mem = light ? memoryLight : memoryTech;
  const redis = getRedisClient();

  if (redis) {
    try {
      await redis.setex(prefix + key, CACHE_TTL_SECONDS, text);
    } catch {
      // fall through
    }
  }

  mem.set(key, {
    text,
    expiresAt: Date.now() + MEMORY_TTL_MS,
  });
}
