import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  computeTasteProfileCacheKey,
  getCachedTasteProfile,
  setCachedTasteProfile,
} from "../taste-profile-cache";
import type { TasteSummary } from "../taste-summary-builder";
import type { TasteProfileTone } from "@/lib/dto/taste-profile";
import { getRedisClient } from "@/lib/redis";

vi.mock("@/lib/redis", () => ({
  getRedisClient: vi.fn(() => null),
}));

describe("taste-profile-cache", () => {
  const mockSummary: TasteSummary = {
    text: "Test taste summary",
    structured: '{"dateRange":{"start":"2024-01-01","end":"2024-01-31"}}',
  };

  const mockProfile = {
    description: "Votre goût musical est centré sur le rock.",
    influences: "Rock, Pop",
    coreGenres: "1. Rock 2. Pop",
    uniqueAspect: "Concentration sur quelques genres.",
  };

  beforeEach(() => {
    vi.mocked(getRedisClient).mockReturnValue(null);
  });

  describe("computeTasteProfileCacheKey", () => {
    it("returns deterministic key for same summary, tone and locale", () => {
      const key1 = computeTasteProfileCacheKey(mockSummary, "casual", "fr");
      const key2 = computeTasteProfileCacheKey(mockSummary, "casual", "fr");
      expect(key1).toBe(key2);
    });

    it("returns different key for different tone", () => {
      const key1 = computeTasteProfileCacheKey(mockSummary, "casual", "fr");
      const key2 = computeTasteProfileCacheKey(mockSummary, "analytical", "fr");
      expect(key1).not.toBe(key2);
    });

    it("returns different key for different summary", () => {
      const key1 = computeTasteProfileCacheKey(mockSummary, "casual", "fr");
      const key2 = computeTasteProfileCacheKey(
        { ...mockSummary, structured: '{"other":"data"}' },
        "casual",
        "fr"
      );
      expect(key1).not.toBe(key2);
    });

    it("returns different key for different locale", () => {
      const key1 = computeTasteProfileCacheKey(mockSummary, "casual", "fr");
      const key2 = computeTasteProfileCacheKey(mockSummary, "casual", "en");
      expect(key1).not.toBe(key2);
    });

    it("key format includes tone and locale suffix", () => {
      const key = computeTasteProfileCacheKey(mockSummary, "poetic", "fr");
      expect(key).toMatch(/:poetic:fr$/);
    });
  });

  describe("getCachedTasteProfile / setCachedTasteProfile", () => {
    it("returns null when cache is empty", async () => {
      const result = await getCachedTasteProfile("nonexistent-key");
      expect(result).toBeNull();
    });

    it("stores and retrieves profile", async () => {
      const cacheKey = computeTasteProfileCacheKey(mockSummary, "casual", "fr");

      await setCachedTasteProfile(cacheKey, mockProfile);
      const result = await getCachedTasteProfile(cacheKey);

      expect(result).toEqual(mockProfile);
    });
  });

  describe("Redis path", () => {
    it("returns cached profile from Redis when available", async () => {
      const cacheKey = "redis-profile-key";
      vi.mocked(getRedisClient).mockReturnValue({
        get: vi.fn().mockResolvedValue(JSON.stringify(mockProfile)),
        setex: vi.fn().mockResolvedValue(undefined),
      } as any);

      const result = await getCachedTasteProfile(cacheKey);
      expect(result).toEqual(mockProfile);
    });

    it("returns null when Redis returns invalid profile shape", async () => {
      const cacheKey = "invalid-profile-key";
      vi.mocked(getRedisClient).mockReturnValue({
        get: vi.fn().mockResolvedValue(
          JSON.stringify({ description: "only" }) // missing influences, coreGenres, uniqueAspect
        ),
        setex: vi.fn().mockResolvedValue(undefined),
      } as any);

      const result = await getCachedTasteProfile(cacheKey);
      expect(result).toBeNull();
    });

    it("falls back to memory when Redis throws", async () => {
      const cacheKey = "redis-error-key";
      vi.mocked(getRedisClient).mockReturnValue({
        get: vi.fn().mockRejectedValue(new Error("Redis failed")),
        setex: vi.fn().mockRejectedValue(new Error("Redis failed")),
      } as any);

      await setCachedTasteProfile(cacheKey, mockProfile);
      const result = await getCachedTasteProfile(cacheKey);
      expect(result).toEqual(mockProfile);
    });
  });
});
