/**
 * API tests for GET /api/date-range
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "@/app/api/date-range/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/services/listening/listening-service", () => ({
  getListenDateRange: vi.fn(),
}));

import { getListenDateRange } from "@/lib/services/listening/listening-service";

describe("GET /api/date-range", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return startDate and endDate when listens exist", async () => {
    const minDate = new Date("2020-01-15T10:00:00Z");
    const maxDate = new Date("2025-02-21T18:00:00Z");
    vi.mocked(getListenDateRange).mockResolvedValue({ minDate, maxDate });

    const request = new NextRequest("http://localhost/api/date-range");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      startDate: "2020-01-15",
      endDate: "2025-02-21",
    });
    expect(getListenDateRange).toHaveBeenCalledWith(undefined);
  });

  it("should return null when no listens exist", async () => {
    vi.mocked(getListenDateRange).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/date-range");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      startDate: null,
      endDate: null,
    });
  });

  it("should pass userId when provided", async () => {
    const minDate = new Date("2024-01-01");
    const maxDate = new Date("2024-12-31");
    vi.mocked(getListenDateRange).mockResolvedValue({ minDate, maxDate });

    const request = new NextRequest(
      "http://localhost/api/date-range?userId=user-123"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(getListenDateRange).toHaveBeenCalledWith("user-123");
  });
});
