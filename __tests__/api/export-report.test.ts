/**
 * Tests d'intégration pour GET /api/export/report
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/export/report/route";

vi.mock("@/lib/services/listening/listening-stats", () => ({
  getOverviewStats: vi.fn(),
  getGenreDistribution: vi.fn(),
}));

vi.mock("@/lib/services/listening/listening-aggregation", () => ({
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

import { getOverviewStats, getGenreDistribution } from "@/lib/services/listening/listening-stats";
import { getMonthlyAggregatedListens } from "@/lib/services/listening/listening-aggregation";

const overviewStub = {
  totalListens: 10,
  uniqueArtists: 2,
  uniqueTracks: 5,
  totalPlayTime: 600,
};

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
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain("attachment");
    expect(getOverviewStats).toHaveBeenCalled();
  });

  it("should return 400 for unsupported format", async () => {
    const request = new NextRequest(
      "http://localhost/api/export/report?format=csv&year=2024"
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("should return 400 when year is out of range", async () => {
    const request = new NextRequest(
      "http://localhost/api/export/report?year=1999"
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("should return 500 when getOverviewStats throws", async () => {
    vi.mocked(getOverviewStats).mockRejectedValue(new Error("fail"));

    const request = new NextRequest(
      "http://localhost/api/export/report?year=2024"
    );
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });
});
