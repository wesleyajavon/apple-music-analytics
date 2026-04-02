/**
 * Tests d'intégration pour GET /api/analytics/taste-evolution
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/analytics/taste-evolution/route";

vi.mock("@/lib/services/listening/listening-service", () => ({
  getListenDateRange: vi.fn(),
}));

vi.mock("@/lib/services/taste-evolution/taste-evolution-service", () => ({
  getTasteEvolutionTrends: vi.fn(),
}));

vi.mock("@/lib/services/ai/taste-evolution-commentary", () => ({
  generateTasteEvolutionCommentary: vi.fn(),
}));

vi.mock("@/lib/services/taste-evolution/taste-evolution-cache", () => ({
  getCachedTrends: vi.fn(),
  setCachedTrends: vi.fn(),
  getCachedCommentary: vi.fn(),
  setCachedCommentary: vi.fn(),
}));

import { getListenDateRange } from "@/lib/services/listening/listening-service";
import { getTasteEvolutionTrends } from "@/lib/services/taste-evolution/taste-evolution-service";
import {
  getCachedTrends,
  setCachedTrends,
} from "@/lib/services/taste-evolution/taste-evolution-cache";

describe("GET /api/analytics/taste-evolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCachedTrends).mockResolvedValue(null);
    vi.mocked(setCachedTrends).mockResolvedValue(undefined);
    vi.mocked(getTasteEvolutionTrends).mockResolvedValue({
      trends: [],
      skippedWeeks: [],
    });
  });

  it("should return empty payload when no date params and no listens in DB", async () => {
    vi.mocked(getListenDateRange).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/analytics/taste-evolution"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      trends: [],
      commentary: null,
      commentaryLight: null,
      skippedWeeks: [],
    });
    expect(getTasteEvolutionTrends).not.toHaveBeenCalled();
  });

  it("should derive range from listens when no date params", async () => {
    const minDate = new Date("2024-06-01T00:00:00Z");
    const maxDate = new Date("2024-08-01T00:00:00Z");
    vi.mocked(getListenDateRange).mockResolvedValue({ minDate, maxDate });

    const request = new NextRequest(
      "http://localhost/api/analytics/taste-evolution"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    await response.json();
    expect(getTasteEvolutionTrends).toHaveBeenCalled();
    expect(setCachedTrends).toHaveBeenCalled();
  });

  it("should return 400 for invalid startDate when endDate is provided", async () => {
    const request = new NextRequest(
      "http://localhost/api/analytics/taste-evolution?startDate=not-a-date&endDate=2024-12-31"
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("should return 200 with trends when date range is valid", async () => {
    vi.mocked(getTasteEvolutionTrends).mockResolvedValue({
      trends: [],
      skippedWeeks: [],
    });

    const request = new NextRequest(
      "http://localhost/api/analytics/taste-evolution?startDate=2024-01-01&endDate=2024-03-31"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.trends).toEqual([]);
    expect(getListenDateRange).not.toHaveBeenCalled();
  });

  it("should return 500 when getTasteEvolutionTrends throws", async () => {
    vi.mocked(getListenDateRange).mockResolvedValue({
      minDate: new Date("2024-01-01"),
      maxDate: new Date("2024-06-01"),
    });
    vi.mocked(getTasteEvolutionTrends).mockRejectedValue(new Error("Service error"));

    const request = new NextRequest(
      "http://localhost/api/analytics/taste-evolution"
    );
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });
});
