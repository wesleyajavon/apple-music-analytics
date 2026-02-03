/**
 * Tests for listening habit heuristics (pure functions, no I/O)
 */

import { describe, it, expect } from "vitest";
import {
  computeTimeWindow,
  computeConfidenceScore,
  computePredictedGenre,
  computeListeningHabitPrediction,
  type HourDayGenreRow,
} from "../listening-habit-heuristics";

describe("listening-habit-heuristics", () => {
  describe("computeTimeWindow", () => {
    it("returns 2-hour window centered on peak hour", () => {
      const hourCounts = new Map<number, number>([
        [20, 10],
        [21, 50], // peak
        [22, 30],
        [23, 5],
      ]);
      const result = computeTimeWindow(hourCounts);
      expect(result).not.toBeNull();
      expect(result!.startHour).toBe(20);
      expect(result!.endHour).toBe(21);
      expect(result!.label).toMatch(/\d+h–\d+h/);
    });

    it("returns null for empty map", () => {
      expect(computeTimeWindow(new Map())).toBeNull();
    });

    it("handles edge hour 0", () => {
      const hourCounts = new Map<number, number>([[0, 100]]);
      const result = computeTimeWindow(hourCounts);
      expect(result).not.toBeNull();
      expect(result!.startHour).toBe(0);
      expect(result!.endHour).toBeLessThanOrEqual(1);
    });

    it("handles edge hour 23", () => {
      const hourCounts = new Map<number, number>([[23, 100]]);
      const result = computeTimeWindow(hourCounts);
      expect(result).not.toBeNull();
      expect(result!.endHour).toBe(23);
    });
  });

  describe("computeConfidenceScore", () => {
    it("computes percentage correctly", () => {
      expect(computeConfidenceScore(50, 100)).toBe(50);
      expect(computeConfidenceScore(25, 100)).toBe(25);
    });

    it("returns 0 when total is 0", () => {
      expect(computeConfidenceScore(10, 0)).toBe(0);
    });

    it("caps at 95", () => {
      expect(computeConfidenceScore(100, 100)).toBeLessThanOrEqual(95);
    });
  });

  describe("computePredictedGenre", () => {
    const baseRows: HourDayGenreRow[] = [
      { hour: 21, day_of_week: 1, genre: "Rock", count: 20 },
      { hour: 21, day_of_week: 1, genre: "Pop", count: 5 },
      { hour: 22, day_of_week: 1, genre: "Rock", count: 15 },
    ];

    it("returns most frequent genre in window", () => {
      const genre = computePredictedGenre(baseRows, 21, 22, 1);
      expect(genre).toBe("Rock");
    });

    it("filters by day of week", () => {
      const rows: HourDayGenreRow[] = [
        ...baseRows,
        { hour: 21, day_of_week: 0, genre: "Jazz", count: 100 },
      ];
      const genre = computePredictedGenre(rows, 21, 22, 1);
      expect(genre).toBe("Rock"); // Jazz is for day 0, not 1
    });

    it("filters by hour window", () => {
      const rows: HourDayGenreRow[] = [
        ...baseRows,
        { hour: 10, day_of_week: 1, genre: "Classical", count: 100 },
      ];
      const genre = computePredictedGenre(rows, 21, 22, 1);
      expect(genre).toBe("Rock"); // Classical is outside 21-22
    });
  });

  describe("computeListeningHabitPrediction", () => {
    const rows: HourDayGenreRow[] = [
      { hour: 20, day_of_week: 1, genre: "Rock", count: 10 },
      { hour: 21, day_of_week: 1, genre: "Rock", count: 40 },
      { hour: 22, day_of_week: 1, genre: "Rock", count: 30 },
      { hour: 21, day_of_week: 1, genre: "Pop", count: 5 },
    ];

    it("returns prediction for Monday (day 1)", () => {
      const result = computeListeningHabitPrediction(
        rows,
        1,
        85,
        90,
        true
      );
      expect(result).not.toBeNull();
      expect(result!.timeWindow.label).toMatch(/\d+h–\d+h/);
      expect(result!.confidenceScore).toBeGreaterThan(0);
      expect(result!.predictedGenre).toBe("Rock");
      expect(result!.supportingMetrics).toBeDefined();
      expect(result!.supportingMetrics!.dayOfWeek).toBe(1);
      expect(result!.supportingMetrics!.dayName).toBe("Lundi");
    });

    it("returns null when no data for target day", () => {
      const result = computeListeningHabitPrediction(
        rows,
        3, // Wednesday - no data
        85,
        90,
        true
      );
      expect(result).toBeNull();
    });

    it("omits supporting metrics when requested", () => {
      const result = computeListeningHabitPrediction(
        rows,
        1,
        85,
        90,
        false
      );
      expect(result).not.toBeNull();
      expect(result!.supportingMetrics).toBeUndefined();
    });
  });
});
