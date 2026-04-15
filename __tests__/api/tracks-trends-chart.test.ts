import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/tracks/trends-chart/route";

vi.mock("@/lib/services/listening/listening-service", () => ({
  getListenDateRange: vi.fn(),
}));
vi.mock("@/lib/auth/resolve-authorized-data-user-id", () => ({
  resolveAuthorizedDataUserId: vi.fn(),
}));
vi.mock("@/lib/services/track/track-service", () => ({
  getTopTrackCatalogForRange: vi.fn(),
  getTrackTrendsChartRows: vi.fn(),
  getTrackTrendsChartRowsForTrackIds: vi.fn(),
  resolveTracksByIds: vi.fn(),
}));

import { getListenDateRange } from "@/lib/services/listening/listening-service";
import { resolveAuthorizedDataUserId } from "@/lib/auth/resolve-authorized-data-user-id";
import {
  getTopTrackCatalogForRange,
  getTrackTrendsChartRows,
  getTrackTrendsChartRowsForTrackIds,
  resolveTracksByIds,
} from "@/lib/services/track/track-service";

describe("GET /api/tracks/trends-chart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveAuthorizedDataUserId).mockResolvedValue({
      ok: true,
      userId: "user-1",
    });
    vi.mocked(getListenDateRange).mockResolvedValue({
      minDate: new Date("2024-01-01"),
      maxDate: new Date("2024-01-31"),
    });
    vi.mocked(getTrackTrendsChartRows).mockResolvedValue([]);
    vi.mocked(getTopTrackCatalogForRange).mockResolvedValue([]);
    vi.mocked(getTrackTrendsChartRowsForTrackIds).mockResolvedValue([]);
    vi.mocked(resolveTracksByIds).mockResolvedValue([]);
  });

  it("uses default topN=20", async () => {
    const response = await GET(new NextRequest("http://localhost/api/tracks/trends-chart"));
    expect(response.status).toBe(200);
    expect(getTrackTrendsChartRows).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      "month",
      "user-1",
      20
    );
  });

  it("supports explicit tracks filter and returns catalogTracks", async () => {
    vi.mocked(resolveTracksByIds).mockResolvedValue([
      { id: "t1", title: "Track 1", artistName: "Artist 1" },
    ]);
    vi.mocked(getTrackTrendsChartRowsForTrackIds).mockResolvedValue([
      {
        date: "2024-01-01",
        trackId: "t1",
        trackTitle: "Track 1",
        artistName: "Artist 1",
        count: 10,
      },
    ]);
    vi.mocked(getTopTrackCatalogForRange).mockResolvedValue([
      { id: "t2", title: "Track 2", artistName: "Artist 2" },
    ]);

    const response = await GET(
      new NextRequest("http://localhost/api/tracks/trends-chart?tracks=t1")
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.catalogTracks).toBeDefined();
    expect(getTrackTrendsChartRowsForTrackIds).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      "month",
      "user-1",
      ["t1"]
    );
  });
});
