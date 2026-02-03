import { describe, it, expect } from "vitest";
import { summarizeAnalytics } from "../analytics-summarizer";
import type { AiInsightsInput } from "@/lib/dto/ai-insights";

describe("analytics-summarizer", () => {
  const minimalInput: AiInsightsInput = {
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
    const result1 = summarizeAnalytics(minimalInput);
    const result2 = summarizeAnalytics(minimalInput);
    expect(result1.text).toBe(result2.text);
    expect(result1.structured).toBe(result2.structured);
  });

  it("includes date range in summary", () => {
    const result = summarizeAnalytics(minimalInput);
    expect(result.text).toContain("2024-01-01");
    expect(result.text).toContain("2024-01-31");
  });

  it("sorts genres by count descending", () => {
    const result = summarizeAnalytics(minimalInput);
    const rockIndex = result.text.indexOf("Rock");
    const popIndex = result.text.indexOf("Pop");
    const jazzIndex = result.text.indexOf("Jazz");
    expect(rockIndex).toBeLessThan(popIndex);
    expect(popIndex).toBeLessThan(jazzIndex);
  });

  it("sorts hours by listens descending", () => {
    const result = summarizeAnalytics(minimalInput);
    expect(result.text).toContain("18h-19h");
    expect(result.text).toContain("50 écoutes");
  });

  it("limits to top 10 genres", () => {
    const manyGenres = {
      ...minimalInput,
      genreDistribution: Array.from({ length: 15 }, (_, i) => ({
        genre: `Genre ${i}`,
        count: 100 - i,
        percentage: 10,
      })),
    };
    const result = summarizeAnalytics(manyGenres);
    const genreCount = (result.text.match(/Genre \d+/g) || []).length;
    expect(genreCount).toBeLessThanOrEqual(10);
  });

  it("includes year-over-year deltas when provided", () => {
    const withDeltas: AiInsightsInput = {
      ...minimalInput,
      yearOverYearDeltas: [
        {
          metric: "Total d'écoutes",
          currentValue: 250,
          previousValue: 200,
          percentChange: 25,
        },
      ],
    };
    const result = summarizeAnalytics(withDeltas);
    expect(result.text).toContain("Total d'écoutes");
    expect(result.text).toContain("+25");
  });

  it("formats Temps d'écoute in readable format (Xh Ymin)", () => {
    const withTime: AiInsightsInput = {
      ...minimalInput,
      yearOverYearDeltas: [
        {
          metric: "Temps d'écoute",
          currentValue: 37534, // 10h 25min
          previousValue: 64734, // 17h 58min
          percentChange: -42,
        },
      ],
    };
    const result = summarizeAnalytics(withTime);
    expect(result.text).toContain("10h 25min");
    expect(result.text).toContain("17h 58min");
    expect(result.text).not.toContain("37534");
    expect(result.text).not.toContain("64734");
  });

  it("includes peak day and hour when provided", () => {
    const withPeaks: AiInsightsInput = {
      ...minimalInput,
      peakDay: { dayName: "Samedi", listens: 80 },
      peakHour: { hour: 20, listens: 45 },
    };
    const result = summarizeAnalytics(withPeaks);
    expect(result.text).toContain("Samedi");
    expect(result.text).toContain("20h");
  });

  it("produces valid JSON in structured field", () => {
    const result = summarizeAnalytics(minimalInput);
    expect(() => JSON.parse(result.structured)).not.toThrow();
    const parsed = JSON.parse(result.structured);
    expect(parsed.dateRange).toEqual(minimalInput.dateRange);
    expect(parsed.topGenres).toHaveLength(3);
    expect(parsed.topArtists).toHaveLength(2);
  });
});
