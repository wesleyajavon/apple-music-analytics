import { describe, it, expect } from "vitest";
import { buildTasteSummary } from "../taste-summary-builder";
import type { TasteProfileInput } from "@/lib/dto/taste-profile";

describe("taste-summary-builder", () => {
  const minimalInput: TasteProfileInput = {
    dateRange: { start: "2024-01-01", end: "2024-01-31" },
    genreDistribution: [
      { genre: "Rock", count: 100, percentage: 40 },
      { genre: "Pop", count: 75, percentage: 30 },
      { genre: "Jazz", count: 50, percentage: 20 },
    ],
    listeningByTimeOfDay: [
      { hour: 18, listens: 50 },
      { hour: 12, listens: 30 },
      { hour: 20, listens: 45 },
    ],
    topArtists: [
      { artistName: "Artist A", listenCount: 80 },
      { artistName: "Artist B", listenCount: 60 },
    ],
  };

  it("produces deterministic output for same input", () => {
    const result1 = buildTasteSummary(minimalInput);
    const result2 = buildTasteSummary(minimalInput);
    expect(result1.text).toBe(result2.text);
    expect(result1.structured).toBe(result2.structured);
  });

  it("includes date range in summary", () => {
    const result = buildTasteSummary(minimalInput);
    expect(result.text).toContain("2024-01-01");
    expect(result.text).toContain("2024-01-31");
  });

  it("sorts genres by count descending", () => {
    const result = buildTasteSummary(minimalInput);
    const rockIndex = result.text.indexOf("Rock");
    const popIndex = result.text.indexOf("Pop");
    const jazzIndex = result.text.indexOf("Jazz");
    expect(rockIndex).toBeLessThan(popIndex);
    expect(popIndex).toBeLessThan(jazzIndex);
  });

  it("includes diversity metrics when provided", () => {
    const withDiversity: TasteProfileInput = {
      ...minimalInput,
      totalListens: 500,
      uniqueArtists: 50,
      uniqueTracks: 200,
    };
    const result = buildTasteSummary(withDiversity);
    expect(result.text).toContain("Diversité");
    expect(result.text).toContain("3 genres");
    expect(result.text).toContain("40.0%");
  });

  it("produces valid JSON in structured field", () => {
    const result = buildTasteSummary(minimalInput);
    expect(() => JSON.parse(result.structured)).not.toThrow();
    const parsed = JSON.parse(result.structured);
    expect(parsed.dateRange).toEqual(minimalInput.dateRange);
    expect(parsed.topGenres).toHaveLength(3);
    expect(parsed.coreArtists).toHaveLength(2);
    expect(parsed.diversity).toBeDefined();
  });

  it("limits to top 10 genres and artists", () => {
    const manyItems: TasteProfileInput = {
      ...minimalInput,
      genreDistribution: Array.from({ length: 15 }, (_, i) => ({
        genre: `Genre ${i}`,
        count: 100 - i,
        percentage: 10,
      })),
      topArtists: Array.from({ length: 15 }, (_, i) => ({
        artistName: `Artist ${i}`,
        listenCount: 100 - i,
      })),
    };
    const result = buildTasteSummary(manyItems);
    const parsed = JSON.parse(result.structured);
    expect(parsed.topGenres).toHaveLength(10);
    expect(parsed.coreArtists).toHaveLength(10);
  });

  it("excludes Unknown genre from summary and renormalizes shares", () => {
    const dominatedByUnknown: TasteProfileInput = {
      ...minimalInput,
      genreDistribution: [
        { genre: "Unknown", count: 900, percentage: 90 },
        { genre: "Rock", count: 50, percentage: 5 },
        { genre: "Pop", count: 50, percentage: 5 },
      ],
    };
    const result = buildTasteSummary(dominatedByUnknown);
    expect(result.text).not.toContain("Unknown");
    expect(result.text.indexOf("Rock")).toBeLessThan(result.text.indexOf("Pop"));
    const parsed = JSON.parse(result.structured);
    expect(parsed.topGenres.map((g: { genre: string }) => g.genre)).toEqual(["Rock", "Pop"]);
    expect(parsed.topGenres[0].percentage).toBe(50);
    expect(parsed.topGenres[1].percentage).toBe(50);
  });

  it("includes peak day and hour when provided", () => {
    const withPeaks: TasteProfileInput = {
      ...minimalInput,
      peakDay: { dayName: "Samedi", listens: 80 },
      peakHour: { hour: 20, listens: 45 },
    };
    const result = buildTasteSummary(withPeaks);
    expect(result.text).toContain("Samedi");
    expect(result.text).toContain("20h");
  });
});
