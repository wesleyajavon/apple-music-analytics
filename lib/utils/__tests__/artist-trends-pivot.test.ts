import { describe, it, expect } from "vitest";
import {
  formatArtistTrendDate,
  pivotArtistTrends,
} from "@/lib/utils/artist-trends-pivot";
import type { ArtistTrendChartRow } from "@/lib/services/artist/artist-service";

describe("artist-trends-pivot", () => {
  const locale = "en-US";

  it("formatArtistTrendDate formats day bucket", () => {
    const s = formatArtistTrendDate(
      "2024-06-15T12:00:00",
      "day",
      locale
    );
    expect(s).toMatch(/\d{1,2}\/\d{1,2}/);
  });

  it("formatArtistTrendDate formats week range", () => {
    const s = formatArtistTrendDate("2024-06-10", "week", locale);
    expect(s).toContain("-");
  });

  it("formatArtistTrendDate formats month bucket", () => {
    const s = formatArtistTrendDate("2024-03", "month", locale);
    expect(s.toLowerCase()).toContain("2024");
  });

  it("pivotArtistTrends aggregates by date and orders artists by total listens", () => {
    const rows: ArtistTrendChartRow[] = [
      {
        date: "2024-01-01",
        artistId: "a1",
        artistName: "A",
        count: 3,
      },
      {
        date: "2024-01-01",
        artistId: "a2",
        artistName: "B",
        count: 10,
      },
      {
        date: "2024-01-02",
        artistId: "a1",
        artistName: "A",
        count: 1,
      },
    ];
    const { data, availableArtists } = pivotArtistTrends(
      rows,
      "day",
      locale
    );
    expect(availableArtists.map((a) => a.id)).toEqual(["a2", "a1"]);
    expect(data).toHaveLength(2);
    expect(data[0].a2).toBe(10);
    expect(data[0].a1).toBe(3);
    expect(data[1].a1).toBe(1);
    expect(data[1].a2).toBe(0);
  });

  it("pivotArtistTrends filters by artistId when filter is non-empty", () => {
    const rows: ArtistTrendChartRow[] = [
      {
        date: "2024-01-01",
        artistId: "a1",
        artistName: "A",
        count: 5,
      },
      {
        date: "2024-01-01",
        artistId: "a2",
        artistName: "B",
        count: 99,
      },
    ];
    const { availableArtists } = pivotArtistTrends(rows, "day", locale, ["a1"]);
    expect(availableArtists).toEqual([{ id: "a1", name: "A" }]);
  });

  it("pivotArtistTrends uses ensureArtists order with totals tie-break", () => {
    const rows: ArtistTrendChartRow[] = [
      {
        date: "2024-01-01",
        artistId: "a1",
        artistName: "A",
        count: 5,
      },
      {
        date: "2024-01-01",
        artistId: "a2",
        artistName: "B",
        count: 5,
      },
    ];
    const { availableArtists } = pivotArtistTrends(
      rows,
      "day",
      locale,
      undefined,
      [
        { id: "a2", name: "B" },
        { id: "a1", name: "A" },
      ]
    );
    expect(availableArtists[0].id).toBe("a1");
    expect(availableArtists[1].id).toBe("a2");
  });
});
