import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "@/app/api/genres/trends/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/services/listening/listening-stats", () => ({
  getGenreTrends: vi.fn(),
}));
vi.mock("@/lib/services/listening/listening-service", () => ({
  getListenDateRange: vi.fn(),
}));
vi.mock("@/lib/auth/require-auth-user-id", () => ({
  requireAuthenticatedUserId: vi.fn(),
  unauthorizedResponse: vi.fn(),
}));

import { getGenreTrends } from "@/lib/services/listening/listening-stats";
import { getListenDateRange } from "@/lib/services/listening/listening-service";
import { requireAuthenticatedUserId } from "@/lib/auth/require-auth-user-id";

describe("GET /api/genres/trends", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuthenticatedUserId).mockResolvedValue("user-1");
    vi.mocked(getListenDateRange).mockResolvedValue({
      minDate: new Date("2024-01-01"),
      maxDate: new Date("2024-02-29"),
    });
  });

  it("should return genre trends with default period (month)", async () => {
    const mockRows = [
      { date: "2024-01", genre: "Rock", count: 50 },
      { date: "2024-01", genre: "Pop", count: 30 },
      { date: "2024-02", genre: "Rock", count: 60 },
      { date: "2024-02", genre: "Pop", count: 25 },
    ];
    vi.mocked(getGenreTrends).mockResolvedValue(mockRows);

    const request = new NextRequest("http://localhost/api/genres/trends");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("data");
    expect(data).toHaveProperty("availableGenres");
    expect(Array.isArray(data.data)).toBe(true);
    expect(Array.isArray(data.availableGenres)).toBe(true);
    expect(data.availableGenres).toContain("Rock");
    expect(data.availableGenres).toContain("Pop");
    expect(data.data).toHaveLength(2);
    expect(data.data[0]).toHaveProperty("date");
    expect(data.data[0]).toHaveProperty("formattedDate");
    expect(data.data[0]).toHaveProperty("Rock");
    expect(data.data[0]).toHaveProperty("Pop");
    expect(data.data[0].Rock).toBe(50);
    expect(data.data[0].Pop).toBe(30);

    expect(getGenreTrends).toHaveBeenCalledOnce();
    const [start, end, period] = vi.mocked(getGenreTrends).mock.calls[0];
    expect(start).toBeInstanceOf(Date);
    expect(end).toBeInstanceOf(Date);
    expect(period).toBe("month");
  });

  it("should pass startDate, endDate, period from query", async () => {
    vi.mocked(getGenreTrends).mockResolvedValue([]);

    const request = new NextRequest(
      "http://localhost/api/genres/trends?startDate=2024-01-01&endDate=2024-06-30&period=week"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(getGenreTrends).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      "week",
      "user-1"
    );
  });

  it("should return 400 for invalid date range", async () => {
    const request = new NextRequest(
      "http://localhost/api/genres/trends?startDate=invalid"
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty("error");
    expect(data).toHaveProperty("code", "VALIDATION_ERROR");
  });

  it("should return 500 when service throws", async () => {
    vi.mocked(getGenreTrends).mockRejectedValue(new Error("Database error"));

    const request = new NextRequest("http://localhost/api/genres/trends");
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });
});
