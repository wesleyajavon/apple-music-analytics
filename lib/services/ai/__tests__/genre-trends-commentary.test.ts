import { describe, it, expect } from "vitest";
import type { GenreTrendsDataPoint } from "@/lib/dto/genres";
import { buildGenreTrendsCompactPayload } from "../genre-trends-commentary";

function row(
  date: string,
  genres: Record<string, number>
): GenreTrendsDataPoint {
  return {
    date,
    formattedDate: date,
    ...genres,
  };
}

describe("buildGenreTrendsCompactPayload", () => {
  it("returns null when chart or selection is empty", () => {
    expect(
      buildGenreTrendsCompactPayload(
        [],
        ["Rock"],
        "month",
        { start: "2024-01-01", end: "2024-12-31" },
        "all_time"
      )
    ).toBeNull();
    expect(
      buildGenreTrendsCompactPayload(
        [row("2024-01-01", { Rock: 1 })],
        [],
        "month",
        { start: "2024-01-01", end: "2024-12-31" },
        "all_time"
      )
    ).toBeNull();
  });

  it("returns null when genres are missing from chart series", () => {
    expect(
      buildGenreTrendsCompactPayload(
        [row("2024-01-01", { Jazz: 1 })],
        ["Rock"],
        "day",
        { start: "2024-01-01", end: "2024-01-02" },
        "custom_range"
      )
    ).toBeNull();
  });

  it("builds per-genre metrics and full timeline for small series", () => {
    const chart: GenreTrendsDataPoint[] = [
      row("2024-01-01", { Rock: 3, Jazz: 1 }),
      row("2024-01-02", { Rock: 1, Jazz: 4 }),
    ];
    const payload = buildGenreTrendsCompactPayload(
      chart,
      ["Rock", "Jazz"],
      "week",
      { start: "2024-01-01", end: "2024-01-14" },
      "custom_range"
    );
    expect(payload).not.toBeNull();
    expect(payload!.meta.timelineMode).toBe("full");
    expect(payload!.perGenre.map((g) => g.genre)).toEqual(["Jazz", "Rock"]);
    expect(payload!.timeline).toHaveLength(2);
  });

  it("downsamples when there are many buckets", () => {
    const chart: GenreTrendsDataPoint[] = Array.from({ length: 50 }, (_, i) =>
      row(`2024-01-${String((i % 27) + 1).padStart(2, "0")}`, {
        Rock: i,
        Jazz: 50 - i,
      })
    );
    const payload = buildGenreTrendsCompactPayload(
      chart,
      ["Rock", "Jazz"],
      "day",
      { start: "2024-01-01", end: "2024-03-01" },
      "all_time"
    );
    expect(payload!.meta.timelineMode).toBe("downsampled");
    expect(payload!.timeline.length).toBeLessThanOrEqual(43);
  });

  it("caps genres beyond MAX_GENRES_IN_ANALYSIS", () => {
    const genres = Array.from({ length: 16 }, (_, i) => `G${i}`);
    const chartRow: Record<string, number> = {};
    for (let i = 0; i < 16; i++) chartRow[genres[i]] = i + 1;
    const payload = buildGenreTrendsCompactPayload(
      [row("2024-01-01", chartRow)],
      genres,
      "month",
      { start: "2024-01-01", end: "2024-12-31" },
      "all_time"
    );
    expect(payload!.meta.genresCapped).toBe(true);
    expect(payload!.perGenre).toHaveLength(14);
  });
});
