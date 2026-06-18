/**
 * Short TTL cache for deterministic Ask your Soundprint preset flows (direct tool → formatted answer).
 * Keyed by user, preset id, locale, preset-specific suffix (e.g. calendar year), and dashboard date filter.
 */

import { createHash } from "node:crypto";
import type {
  MusicChatDateRangeContext,
  MusicChatMessage,
  MusicChatPresetArgs,
  MusicChatPresetQuestionId,
  MusicChatResponse,
} from "@/lib/dto/music-chat";
import { getRedisClient } from "@/lib/redis";
import { buildArtistDeepDiveCacheSuffix } from "@/lib/services/ai/music-chat-artist-deep-dive-direct-answer";
import { resolveGenreQuickPresetYear } from "@/lib/services/ai/music-chat-preset-helpers";
import {
  getLateNightPresetDateRange,
  getWeeklyTasteEvolutionPresetDateRange,
} from "@/lib/services/ai/music-chat-tools";

const CACHE_KEY_PREFIX = "music-chat:preset:v1";

type PresetCachePayload = {
  userId: string;
  presetQuestionId: MusicChatPresetQuestionId;
  locale: string;
  suffix: string;
  dateRange: string;
};

function extractCalendarYearFromMessages(
  messages: MusicChatMessage[]
): number | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const entry = messages[i];
    if (entry.role !== "user") continue;
    const match = /\b((?:19|20)\d{2})\b/.exec(entry.content);
    if (match) {
      const y = Number.parseInt(match[1], 10);
      if (Number.isFinite(y)) return y;
    }
  }
  return null;
}

function serializeDateRangeContext(
  dateRange?: MusicChatDateRangeContext
): string {
  if (!dateRange) return "none";
  return `${dateRange.startDate ?? ""}|${dateRange.endDate ?? ""}|${dateRange.isAll === true ? "1" : "0"}`;
}

/** Returns preset-specific suffix for cache key, or null when this preset is not cached. */
export function buildMusicChatPresetCacheSuffix(
  presetQuestionId: MusicChatPresetQuestionId | undefined,
  messages: MusicChatMessage[],
  presetArgs?: MusicChatPresetArgs,
  dateRange?: MusicChatDateRangeContext
): string | null {
  if (!presetQuestionId) return null;

  switch (presetQuestionId) {
    case "summer-2022-top-tracks":
    case "summer-2022-top-artists":
    case "track-obsessions-2022":
      return String(extractCalendarYearFromMessages(messages) ?? 2022);
    case "taste-shift-2020-2024":
    case "consistent-artists":
      return "fixed";
    case "weekly-taste-evolution": {
      const r = getWeeklyTasteEvolutionPresetDateRange();
      return `${r.startDate}_${r.endDate}`;
    }
    case "late-night-habits": {
      const r = getLateNightPresetDateRange();
      return `${r.startDate}_${r.endDate}`;
    }
    case "artist-deep-dive":
      return buildArtistDeepDiveCacheSuffix(presetArgs, messages);
    case "genre-breakdown-last-year":
      return String(resolveGenreQuickPresetYear(presetArgs, dateRange));
    case "compare-listening-periods": {
      const a = presetArgs?.earlierYear;
      const b = presetArgs?.laterYear;
      if (typeof a !== "number" || typeof b !== "number" || !Number.isFinite(a) || !Number.isFinite(b)) {
        return null;
      }
      const lo = Math.min(Math.trunc(a), Math.trunc(b));
      const hi = Math.max(Math.trunc(a), Math.trunc(b));
      return `${lo}_${hi}`;
    }
    case "yearly-listening-trends":
      return "trend_limit_20";
    default:
      return null;
  }
}

function hashStorageKey(payload: PresetCachePayload): string {
  const json = JSON.stringify(payload);
  return createHash("sha256").update(json).digest("hex");
}

export function buildMusicChatPresetStorageKey(
  userId: string,
  presetQuestionId: MusicChatPresetQuestionId,
  locale: string,
  suffix: string,
  dateRange?: MusicChatDateRangeContext
): string {
  const payload: PresetCachePayload = {
    userId,
    presetQuestionId,
    locale,
    suffix,
    dateRange: serializeDateRangeContext(dateRange),
  };
  return `${CACHE_KEY_PREFIX}:${hashStorageKey(payload)}`;
}

export function getMusicChatPresetCacheTtlSeconds(): number {
  const raw = process.env.MUSIC_CHAT_PRESET_CACHE_TTL_SECONDS;
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  if (Number.isFinite(n) && n >= 5 && n <= 3600) return n;
  return 120;
}

type MemoryEntry = { expiresAt: number; json: string };

const memoryStore = new Map<string, MemoryEntry>();

function memoryGet(key: string): MusicChatResponse | null {
  const e = memoryStore.get(key);
  if (!e || Date.now() > e.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  try {
    return JSON.parse(e.json) as MusicChatResponse;
  } catch {
    memoryStore.delete(key);
    return null;
  }
}

function memorySet(key: string, response: MusicChatResponse, ttlSeconds: number): void {
  memoryStore.set(key, {
    expiresAt: Date.now() + ttlSeconds * 1000,
    json: JSON.stringify(response),
  });
}

export async function getCachedMusicChatPresetResponse(
  storageKey: string
): Promise<MusicChatResponse | null> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const raw = await redis.get(storageKey);
      if (!raw) return null;
      return JSON.parse(raw) as MusicChatResponse;
    } catch {
      return null;
    }
  }

  return memoryGet(storageKey);
}

export async function setCachedMusicChatPresetResponse(
  storageKey: string,
  response: MusicChatResponse,
  ttlSeconds: number
): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.set(storageKey, JSON.stringify(response), "EX", ttlSeconds);
    } catch {
      memorySet(storageKey, response, ttlSeconds);
    }
    return;
  }

  memorySet(storageKey, response, ttlSeconds);
}
