import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  computeCacheKey,
  getCachedInsights,
  setCachedInsights,
} from "../insights-cache";
import type { AnalyticsSummary } from "../analytics-summarizer";
import { getRedisClient } from "@/lib/redis";

vi.mock("@/lib/redis", () => ({
  getRedisClient: vi.fn(() => null),
}));

describe("insights-cache", () => {
  const mockSummary: AnalyticsSummary = {
    text: "Test summary text",
    structured: '{"dateRange":{"start":"2024-01-01","end":"2024-01-31"},"topGenres":[]}',
  };

  beforeEach(() => {
    vi.mocked(getRedisClient).mockReturnValue(null);
  });

  describe("computeCacheKey", () => {
    it("returns deterministic hash for same input", () => {
      const key1 = computeCacheKey(mockSummary);
      const key2 = computeCacheKey(mockSummary);
      expect(key1).toBe(key2);
      expect(key1).toMatch(/^[a-f0-9]{64}$/);
    });

    it("returns different hash for different input", () => {
      const key1 = computeCacheKey(mockSummary);
      const key2 = computeCacheKey({
        ...mockSummary,
        structured: '{"different":"data"}',
      });
      expect(key1).not.toBe(key2);
    });
  });

  describe("getCachedInsights / setCachedInsights (memory fallback)", () => {
    it("returns null when cache is empty", async () => {
      const result = await getCachedInsights("nonexistent-key");
      expect(result).toBeNull();
    });

    it("stores and retrieves insights", async () => {
      const cacheKey = computeCacheKey(mockSummary);
      const insights = ["Insight 1", "Insight 2", "Insight 3"];

      await setCachedInsights(cacheKey, insights);
      const result = await getCachedInsights(cacheKey);

      expect(result).toEqual(insights);
    });
  });

  describe("Redis path", () => {
    it("returns cached insights from Redis when available", async () => {
      const insights = ["Redis insight 1", "Redis insight 2"];
      const cacheKey = "redis-key";
      vi.mocked(getRedisClient).mockReturnValue({
        get: vi.fn().mockResolvedValue(JSON.stringify(insights)),
        setex: vi.fn().mockResolvedValue(undefined),
      } as any);

      const result = await getCachedInsights(cacheKey);
      expect(result).toEqual(insights);
    });

    it("returns null when Redis returns non-array JSON", async () => {
      const cacheKey = "invalid-json-key";
      vi.mocked(getRedisClient).mockReturnValue({
        get: vi.fn().mockResolvedValue('{"not":"array"}'),
        setex: vi.fn().mockResolvedValue(undefined),
      } as any);

      const result = await getCachedInsights(cacheKey);
      expect(result).toBeNull();
    });

    it("falls back to memory when Redis throws", async () => {
      const cacheKey = "redis-error-key";
      const insights = ["Memory fallback"];
      vi.mocked(getRedisClient).mockReturnValue({
        get: vi.fn().mockRejectedValue(new Error("Redis connection failed")),
        setex: vi.fn().mockRejectedValue(new Error("Redis write failed")),
      } as any);

      await setCachedInsights(cacheKey, insights);
      const result = await getCachedInsights(cacheKey);
      expect(result).toEqual(insights);
    });

    it("uses Redis setex when storing", async () => {
      const setex = vi.fn().mockResolvedValue(undefined);
      vi.mocked(getRedisClient).mockReturnValue({
        get: vi.fn().mockResolvedValue(null),
        setex,
      } as any);

      await setCachedInsights("store-key", ["Insight"]);
      expect(setex).toHaveBeenCalledWith(
        "ai:insights:store-key",
        24 * 60 * 60,
        JSON.stringify(["Insight"])
      );
    });
  });
});
