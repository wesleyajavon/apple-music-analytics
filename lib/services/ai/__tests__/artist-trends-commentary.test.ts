import { describe, it, expect } from "vitest";
import type { ArtistTrendsChartDataPoint } from "@/lib/dto/artist";
import { buildArtistTrendsCompactPayload } from "../artist-trends-commentary";

function row(
  date: string,
  artists: Record<string, number>
): ArtistTrendsChartDataPoint {
  return {
    date,
    formattedDate: date,
    ...artists,
  };
}

describe("buildArtistTrendsCompactPayload", () => {
  it("returns null when chart or selection is empty", () => {
    expect(
      buildArtistTrendsCompactPayload(
        [],
        ["a1"],
        new Map([["a1", "A"]]),
        "month",
        { start: "2024-01-01", end: "2024-12-31" },
        "all_time"
      )
    ).toBeNull();
    expect(
      buildArtistTrendsCompactPayload(
        [row("2024-01-01", { a1: 1 })],
        [],
        new Map(),
        "month",
        { start: "2024-01-01", end: "2024-12-31" },
        "all_time"
      )
    ).toBeNull();
  });

  it("returns null when selected artists are absent from chart keys", () => {
    const chart = [row("2024-01-01", { x: 1 })];
    expect(
      buildArtistTrendsCompactPayload(
        chart,
        ["missing"],
        new Map([["missing", "M"]]),
        "month",
        { start: "2024-01-01", end: "2024-01-31" },
        "custom_range"
      )
    ).toBeNull();
  });

  it("builds metrics, timeline full mode, and meta", () => {
    const chart: ArtistTrendsChartDataPoint[] = [
      row("2024-01-01", { a1: 2, a2: 0 }),
      row("2024-01-02", { a1: 0, a2: 5 }),
    ];
    const idToName = new Map([
      ["a1", "Alpha"],
      ["a2", "Beta"],
    ]);
    const payload = buildArtistTrendsCompactPayload(
      chart,
      ["a1", "a2"],
      idToName,
      "week",
      { start: "2024-01-01", end: "2024-01-31" },
      "custom_range"
    );
    expect(payload).not.toBeNull();
    expect(payload!.meta.timelineMode).toBe("full");
    expect(payload!.meta.period).toBe("week");
    expect(payload!.perArtist).toHaveLength(2);
    expect(payload!.timeline).toHaveLength(2);
    expect(Object.keys(payload!.timeline[0].listens).length).toBeGreaterThan(0);
  });

  it("disambiguates duplicate display names in timeline keys", () => {
    const chart: ArtistTrendsChartDataPoint[] = [
      row("2024-01-01", { id1: 1, id2: 1 }),
    ];
    const idToName = new Map([
      ["id1", "Same"],
      ["id2", "Same"],
    ]);
    const payload = buildArtistTrendsCompactPayload(
      chart,
      ["id1", "id2"],
      idToName,
      "day",
      { start: "2024-01-01", end: "2024-01-02" },
      "all_time"
    );
    const keys = Object.keys(payload!.timeline[0].listens);
    expect(keys[0]).not.toBe(keys[1]);
  });

  it("downsamples timeline when bucket count exceeds cap", () => {
    const ids = ["a1", "a2"];
    const chart: ArtistTrendsChartDataPoint[] = Array.from(
      { length: 50 },
      (_, i) =>
        row(`2024-01-${String((i % 27) + 1).padStart(2, "0")}`, {
          a1: i,
          a2: 50 - i,
        })
    );
    const payload = buildArtistTrendsCompactPayload(
      chart,
      ids,
      new Map([
        ["a1", "A"],
        ["a2", "B"],
      ]),
      "day",
      { start: "2024-01-01", end: "2024-02-28" },
      "all_time"
    );
    expect(payload!.meta.timelineMode).toBe("downsampled");
    expect(payload!.meta.timelineStride).toBeGreaterThanOrEqual(1);
    expect(payload!.timeline.length).toBeLessThanOrEqual(43);
  });

  it("caps artists beyond MAX_ARTISTS_IN_ANALYSIS", () => {
    const n = 16;
    const ids = Array.from({ length: n }, (_, i) => `id${i}`);
    const chartRow: Record<string, number> = {};
    for (let i = 0; i < n; i++) chartRow[ids[i]] = i + 1;
    const chart: ArtistTrendsChartDataPoint[] = [row("2024-01-01", chartRow)];
    const idToName = new Map(ids.map((id) => [id, `Name ${id}`] as const));
    const payload = buildArtistTrendsCompactPayload(
      chart,
      ids,
      idToName,
      "month",
      { start: "2024-01-01", end: "2024-12-31" },
      "all_time"
    );
    expect(payload!.meta.artistsCapped).toBe(true);
    expect(payload!.meta.cappedToTopN).toBe(14);
    expect(payload!.perArtist).toHaveLength(14);
  });
});
