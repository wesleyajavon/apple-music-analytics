/**
 * Unit tests for taste-evolution-core (pure, deterministic logic)
 */

import { describe, it, expect } from "vitest";
import {
  computeEntropy,
  computeGenreDeltas,
  computeArtistRankMovements,
  classifyTrend,
  computeWeekToWeekTrend,
  formatWeekLabel,
  getWeekEnd,
  type WeeklyAggregate,
} from "../taste-evolution-core";

describe("taste-evolution-core", () => {
  describe("formatWeekLabel", () => {
    it("formats week start as French date", () => {
      expect(formatWeekLabel("2024-01-15")).toMatch(/\d+\s+(janv\.|jan\.)/i);
    });
  });

  describe("getWeekEnd", () => {
    it("returns Sunday 6 days after Monday", () => {
      expect(getWeekEnd("2024-01-15")).toBe("2024-01-21");
    });
  });

  describe("computeEntropy", () => {
    it("returns 0 for empty distribution", () => {
      expect(computeEntropy([])).toBe(0);
    });

    it("returns 0 for single genre", () => {
      expect(computeEntropy([{ genre: "Rock", count: 100 }])).toBe(0);
    });

    it("returns higher value for more diverse distribution", () => {
      const uniform = [
        { genre: "A", count: 25 },
        { genre: "B", count: 25 },
        { genre: "C", count: 25 },
        { genre: "D", count: 25 },
      ];
      const skewed = [
        { genre: "A", count: 90 },
        { genre: "B", count: 5 },
        { genre: "C", count: 3 },
        { genre: "D", count: 2 },
      ];
      expect(computeEntropy(uniform)).toBeGreaterThan(computeEntropy(skewed));
    });
  });

  describe("computeGenreDeltas", () => {
    it("filters changes below 2pp threshold", () => {
      const prev: WeeklyAggregate = {
        weekStart: "2024-01-01",
        weekEnd: "2024-01-07",
        listens: 100,
        uniqueGenres: 2,
        uniqueArtists: 10,
        genreDistribution: [
          { genre: "Rock", count: 50 },
          { genre: "Pop", count: 50 },
        ],
        topArtists: [],
      };
      const curr: WeeklyAggregate = {
        ...prev,
        weekStart: "2024-01-08",
        weekEnd: "2024-01-14",
        genreDistribution: [
          { genre: "Rock", count: 51 },
          { genre: "Pop", count: 49 },
        ],
      };
      const { emerging, declining } = computeGenreDeltas(prev, curr);
      expect(emerging).toHaveLength(0);
      expect(declining).toHaveLength(0);
    });

    it("detects meaningful genre shifts", () => {
      const prev: WeeklyAggregate = {
        weekStart: "2024-01-01",
        weekEnd: "2024-01-07",
        listens: 100,
        uniqueGenres: 2,
        uniqueArtists: 10,
        genreDistribution: [
          { genre: "Rock", count: 70 },
          { genre: "Pop", count: 30 },
        ],
        topArtists: [],
      };
      const curr: WeeklyAggregate = {
        ...prev,
        weekStart: "2024-01-08",
        weekEnd: "2024-01-14",
        genreDistribution: [
          { genre: "Rock", count: 50 },
          { genre: "Pop", count: 50 },
        ],
      };
      const { emerging, declining } = computeGenreDeltas(prev, curr);
      expect(emerging.some((g) => g.genre === "Pop")).toBe(true);
      expect(declining.some((g) => g.genre === "Rock")).toBe(true);
    });
  });

  describe("computeArtistRankMovements", () => {
    it("detects new artists in top N", () => {
      const prev: WeeklyAggregate = {
        weekStart: "2024-01-01",
        weekEnd: "2024-01-07",
        listens: 100,
        uniqueGenres: 2,
        uniqueArtists: 10,
        genreDistribution: [],
        topArtists: [
          { artistName: "Artist A", listenCount: 50 },
          { artistName: "Artist B", listenCount: 30 },
        ],
      };
      const curr: WeeklyAggregate = {
        ...prev,
        weekStart: "2024-01-08",
        weekEnd: "2024-01-14",
        topArtists: [
          { artistName: "Artist C", listenCount: 60 },
          { artistName: "Artist A", listenCount: 40 },
          { artistName: "Artist B", listenCount: 20 },
        ],
      };
      const movements = computeArtistRankMovements(prev, curr);
      const newArtist = movements.find((m) => m.artistName === "Artist C");
      expect(newArtist?.previousRank).toBeNull();
      expect(newArtist?.currentRank).toBe(1);
    });
  });

  describe("classifyTrend", () => {
    it("returns expansion when genre count and entropy increase", () => {
      const prev: WeeklyAggregate = {
        weekStart: "2024-01-01",
        weekEnd: "2024-01-07",
        listens: 100,
        uniqueGenres: 2,
        uniqueArtists: 10,
        genreDistribution: [
          { genre: "Rock", count: 80 },
          { genre: "Pop", count: 20 },
        ],
        topArtists: [],
      };
      const curr: WeeklyAggregate = {
        ...prev,
        weekStart: "2024-01-08",
        weekEnd: "2024-01-14",
        uniqueGenres: 4,
        genreDistribution: [
          { genre: "Rock", count: 40 },
          { genre: "Pop", count: 30 },
          { genre: "Jazz", count: 20 },
          { genre: "Electronic", count: 10 },
        ],
        topArtists: [],
      };
      const classification = classifyTrend(
        prev,
        curr,
        [{ genre: "Jazz", previousPct: 0, currentPct: 20, deltaPct: 20, previousCount: 0, currentCount: 20 }],
        [],
        []
      );
      expect(classification).toBe("expansion");
    });
  });

  describe("computeWeekToWeekTrend", () => {
    it("returns null when previous week has insufficient listens", () => {
      const prev: WeeklyAggregate = {
        weekStart: "2024-01-01",
        weekEnd: "2024-01-07",
        listens: 5,
        uniqueGenres: 2,
        uniqueArtists: 5,
        genreDistribution: [{ genre: "Rock", count: 5 }],
        topArtists: [],
      };
      const curr: WeeklyAggregate = {
        ...prev,
        weekStart: "2024-01-08",
        weekEnd: "2024-01-14",
        listens: 50,
      };
      expect(computeWeekToWeekTrend(prev, curr)).toBeNull();
    });

    it("returns trend when both weeks have sufficient data", () => {
      const prev: WeeklyAggregate = {
        weekStart: "2024-01-01",
        weekEnd: "2024-01-07",
        listens: 50,
        uniqueGenres: 2,
        uniqueArtists: 10,
        genreDistribution: [
          { genre: "Rock", count: 30 },
          { genre: "Pop", count: 20 },
        ],
        topArtists: [
          { artistName: "A", listenCount: 20 },
          { artistName: "B", listenCount: 15 },
        ],
      };
      const curr: WeeklyAggregate = {
        ...prev,
        weekStart: "2024-01-08",
        weekEnd: "2024-01-14",
        listens: 60,
        genreDistribution: [
          { genre: "Rock", count: 35 },
          { genre: "Pop", count: 25 },
        ],
        topArtists: [
          { artistName: "A", listenCount: 25 },
          { artistName: "B", listenCount: 20 },
        ],
      };
      const trend = computeWeekToWeekTrend(prev, curr);
      expect(trend).not.toBeNull();
      expect(trend!.volumeDelta).toBe(10);
      expect(trend!.timeRange.weekStart).toBe("2024-01-08");
      expect(trend!.previousWeekRange.weekStart).toBe("2024-01-01");
    });
  });
});
