/**
 * Tests d'intégration pour GET /api/export/stats
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/export/stats/route";

vi.mock("@/lib/services/listening/listening-stats", () => ({
  getOverviewStats: vi.fn(),
  getGenreDistribution: vi.fn(),
}));

vi.mock("@/lib/services/listening/listening-aggregation", () => ({
  getDailyAggregatedListens: vi.fn(),
  getWeeklyAggregatedListens: vi.fn(),
  getMonthlyAggregatedListens: vi.fn(),
}));

import { getOverviewStats, getGenreDistribution } from "@/lib/services/listening/listening-stats";
import {
  getDailyAggregatedListens,
  getWeeklyAggregatedListens,
  getMonthlyAggregatedListens,
} from "@/lib/services/listening/listening-aggregation";

const overviewStub = {
  totalListens: 10,
  uniqueArtists: 2,
  uniqueTracks: 5,
  totalPlayTime: 600,
};

describe("GET /api/export/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOverviewStats).mockResolvedValue(overviewStub);
    vi.mocked(getGenreDistribution).mockResolvedValue([
      { genre: "Rock", count: 10 },
    ]);
    vi.mocked(getDailyAggregatedListens).mockResolvedValue([]);
    vi.mocked(getWeeklyAggregatedListens).mockResolvedValue([]);
    vi.mocked(getMonthlyAggregatedListens).mockResolvedValue([]);
  });

  it("should return 200 with JSON attachment", async () => {
    const request = new NextRequest(
      "http://localhost/api/export/stats?includeTimeline=false"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/json");
    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.overview.totalListens).toBe(10);
    expect(data.genres).toHaveLength(1);
    expect(getDailyAggregatedListens).not.toHaveBeenCalled();
  });

  it("should return 400 for unsupported format", async () => {
    const request = new NextRequest(
      "http://localhost/api/export/stats?format=csv"
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("should return 400 for invalid dates", async () => {
    const request = new NextRequest(
      "http://localhost/api/export/stats?startDate=2024-01-31&endDate=2024-01-01"
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("should return 500 when getOverviewStats throws", async () => {
    vi.mocked(getOverviewStats).mockRejectedValue(new Error("fail"));

    const request = new NextRequest(
      "http://localhost/api/export/stats?includeTimeline=false"
    );
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });
});
