import { describe, it, expect } from "vitest";
import { formatTrendDate, pivotTrends } from "@/lib/utils/genre-trends-pivot";
import type { GenreTrendRow } from "@/lib/services/listening/listening-stats";

describe("genre-trends-pivot", () => {
  const locale = "en-US";

  it("formatTrendDate handles day, week, and month", () => {
    expect(formatTrendDate("2024-07-04", "day", locale)).toMatch(/07/);
    expect(formatTrendDate("2024-07-01", "week", locale)).toContain("-");
    expect(formatTrendDate("2024-11", "month", locale).toLowerCase()).toContain(
      "2024"
    );
  });

  it("pivotTrends builds sparse points and sorts genres by total listens", () => {
    const rows: GenreTrendRow[] = [
      { date: "2024-01-01", genre: "Rock", count: 2 },
      { date: "2024-01-01", genre: "Jazz", count: 10 },
      { date: "2024-01-02", genre: "Rock", count: 3 },
    ];
    const { data, availableGenres } = pivotTrends(rows, "day", locale);
    expect(availableGenres).toEqual(["Jazz", "Rock"]);
    expect(data[0].Jazz).toBe(10);
    expect(data[0].Rock).toBe(2);
    expect(data[1].Rock).toBe(3);
    expect(data[1].Jazz).toBe(0);
  });

  it("pivotTrends applies genreFilter when provided", () => {
    const rows: GenreTrendRow[] = [
      { date: "2024-01-01", genre: "A", count: 1 },
      { date: "2024-01-01", genre: "B", count: 100 },
    ];
    const { availableGenres } = pivotTrends(rows, "day", locale, ["A"]);
    expect(availableGenres).toEqual(["A"]);
  });
});
