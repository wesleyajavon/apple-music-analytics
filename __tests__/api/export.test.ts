/**
 * Tests d'intégration pour les routes GET /api/export/listens, /api/export/stats, /api/export/report
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as GETExportListens } from "@/app/api/export/listens/route";
import { GET as GETExportStats } from "@/app/api/export/stats/route";
import { GET as GETExportReport } from "@/app/api/export/report/route";

vi.mock("@/lib/services/listening/listening-service", () => ({
  getAllListensForExport: vi.fn(),
}));

vi.mock("@/lib/services/listening/listening-stats", () => ({
  getOverviewStats: vi.fn(),
  getGenreDistribution: vi.fn(),
}));

vi.mock("@/lib/services/listening/listening-aggregation", () => ({
  getDailyAggregatedListens: vi.fn(),
  getWeeklyAggregatedListens: vi.fn(),
  getMonthlyAggregatedListens: vi.fn(),
}));

vi.mock("@react-pdf/renderer", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@react-pdf/renderer")>();
  return {
    ...actual,
    renderToStream: vi.fn(async () => {
      async function* stream() {
        yield Buffer.from("%PDF-1.4 test");
      }
      return stream();
    }),
  };
});
vi.mock("@/lib/auth/require-recent-auth", () => ({
  requireRecentAuthenticatedUser: vi.fn().mockResolvedValue({
    ok: true,
    userId: "user-1",
    authenticatedAt: new Date(),
  }),
}));

import { getAllListensForExport } from "@/lib/services/listening/listening-service";
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

describe("GET /api/export/listens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 with CSV attachment headers", async () => {
    vi.mocked(getAllListensForExport).mockResolvedValue([
      {
        date: "2024-01-15",
        artistName: "Artist",
        trackTitle: "Track",
        genre: "Rock",
        source: "lastfm",
      },
    ]);

    const request = new NextRequest("http://localhost/api/export/listens");
    const response = await GETExportListens(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(response.headers.get("Content-Disposition")).toContain("attachment");
    const text = await response.text();
    expect(text).toContain("Date");
    expect(text).toContain("Artist");
    expect(getAllListensForExport).toHaveBeenCalledWith({
      startDate: undefined,
      endDate: undefined,
      userId: "user-1",
      source: undefined,
    });
  });

  it("should return 400 for unsupported format", async () => {
    const request = new NextRequest(
      "http://localhost/api/export/listens?format=json"
    );
    const response = await GETExportListens(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("should return 400 for invalid date range", async () => {
    const request = new NextRequest(
      "http://localhost/api/export/listens?startDate=not-a-date"
    );
    const response = await GETExportListens(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("should return 500 when getAllListensForExport throws", async () => {
    vi.mocked(getAllListensForExport).mockRejectedValue(new Error("DB error"));

    const request = new NextRequest("http://localhost/api/export/listens");
    const response = await GETExportListens(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });
});

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
    const response = await GETExportStats(request);

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
    const response = await GETExportStats(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("should return 400 for invalid dates", async () => {
    const request = new NextRequest(
      "http://localhost/api/export/stats?startDate=2024-01-31&endDate=2024-01-01"
    );
    const response = await GETExportStats(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("should return 500 when getOverviewStats throws", async () => {
    vi.mocked(getOverviewStats).mockRejectedValue(new Error("fail"));

    const request = new NextRequest(
      "http://localhost/api/export/stats?includeTimeline=false"
    );
    const response = await GETExportStats(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });
});

describe("GET /api/export/report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOverviewStats).mockResolvedValue(overviewStub);
    vi.mocked(getGenreDistribution).mockResolvedValue([]);
    vi.mocked(getMonthlyAggregatedListens).mockResolvedValue([]);
  });

  it("should return 200 with PDF headers", async () => {
    const request = new NextRequest(
      "http://localhost/api/export/report?year=2024"
    );
    const response = await GETExportReport(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain("attachment");
    expect(getOverviewStats).toHaveBeenCalled();
  });

  it("should return 400 for unsupported format", async () => {
    const request = new NextRequest(
      "http://localhost/api/export/report?format=csv&year=2024"
    );
    const response = await GETExportReport(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("should return 400 when year is out of range", async () => {
    const request = new NextRequest(
      "http://localhost/api/export/report?year=1999"
    );
    const response = await GETExportReport(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("should return 500 when getOverviewStats throws", async () => {
    vi.mocked(getOverviewStats).mockRejectedValue(new Error("fail"));

    const request = new NextRequest(
      "http://localhost/api/export/report?year=2024"
    );
    const response = await GETExportReport(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });
});
