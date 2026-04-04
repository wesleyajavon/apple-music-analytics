import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "@/app/api/artists/trends-chart/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/services/artist/artist-service", () => ({
  getArtistTrendsChartRows: vi.fn(),
}));
vi.mock("@/lib/services/listening/listening-service", () => ({
  getListenDateRange: vi.fn(),
}));

import { getArtistTrendsChartRows } from "@/lib/services/artist/artist-service";
import { getListenDateRange } from "@/lib/services/listening/listening-service";

describe("GET /api/artists/trends-chart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getListenDateRange).mockResolvedValue({
      minDate: new Date("2024-01-01"),
      maxDate: new Date("2024-02-29"),
    });
  });

  it("should return pivoted artist trends with default period (month)", async () => {
    const mockRows = [
      {
        date: "2024-01",
        artistId: "a1",
        artistName: "Artist One",
        count: 50,
      },
      {
        date: "2024-01",
        artistId: "a2",
        artistName: "Artist Two",
        count: 30,
      },
      {
        date: "2024-02",
        artistId: "a1",
        artistName: "Artist One",
        count: 60,
      },
      {
        date: "2024-02",
        artistId: "a2",
        artistName: "Artist Two",
        count: 25,
      },
    ];
    vi.mocked(getArtistTrendsChartRows).mockResolvedValue(mockRows);

    const request = new NextRequest("http://localhost/api/artists/trends-chart");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("data");
    expect(data).toHaveProperty("availableArtists");
    expect(Array.isArray(data.data)).toBe(true);
    expect(Array.isArray(data.availableArtists)).toBe(true);
    expect(data.availableArtists).toEqual(
      expect.arrayContaining([
        { id: "a1", name: "Artist One" },
        { id: "a2", name: "Artist Two" },
      ])
    );
    expect(data.data).toHaveLength(2);
    expect(data.data[0]).toHaveProperty("date");
    expect(data.data[0]).toHaveProperty("formattedDate");
    expect(data.data[0].a1).toBe(50);
    expect(data.data[0].a2).toBe(30);

    expect(getArtistTrendsChartRows).toHaveBeenCalledOnce();
    const [start, end, period, userId, topN] = vi.mocked(
      getArtistTrendsChartRows
    ).mock.calls[0];
    expect(start).toBeInstanceOf(Date);
    expect(end).toBeInstanceOf(Date);
    expect(period).toBe("month");
    expect(userId).toBeUndefined();
    expect(topN).toBe(30);
  });

  it("should pass startDate, endDate, period from query", async () => {
    vi.mocked(getArtistTrendsChartRows).mockResolvedValue([]);

    const request = new NextRequest(
      "http://localhost/api/artists/trends-chart?startDate=2024-01-01&endDate=2024-06-30&period=week&topN=10"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(getArtistTrendsChartRows).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      "week",
      undefined,
      10
    );
  });

  it("should return 400 for invalid date range", async () => {
    const request = new NextRequest(
      "http://localhost/api/artists/trends-chart?startDate=invalid"
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty("error");
    expect(data).toHaveProperty("code", "VALIDATION_ERROR");
  });

  it("should return 500 when service throws", async () => {
    vi.mocked(getArtistTrendsChartRows).mockRejectedValue(
      new Error("Database error")
    );

    const request = new NextRequest("http://localhost/api/artists/trends-chart");
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });
});
