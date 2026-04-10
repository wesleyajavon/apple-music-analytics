import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "@/app/api/artists/trends/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/services/artist/artist-service", () => ({
  getArtistTrends: vi.fn(),
}));
vi.mock("@/lib/auth/resolve-authorized-data-user-id", () => ({
  resolveAuthorizedDataUserId: vi.fn(),
}));

import { getArtistTrends } from "@/lib/services/artist/artist-service";
import { resolveAuthorizedDataUserId } from "@/lib/auth/resolve-authorized-data-user-id";

describe("GET /api/artists/trends", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveAuthorizedDataUserId).mockResolvedValue({
      ok: true,
      userId: "user-1",
    });
  });

  const mockTrendData = [
    { date: "2024-01-01", artistName: "Artist One", listenCount: 25 },
    { date: "2024-01-02", artistName: "Artist One", listenCount: 30 },
    { date: "2024-01-01", artistName: "Artist Two", listenCount: 15 },
    { date: "2024-01-02", artistName: "Artist Two", listenCount: 20 },
  ];

  it("should return artist trends with required date range", async () => {
    vi.mocked(getArtistTrends).mockResolvedValue(mockTrendData);

    const request = new NextRequest(
      "http://localhost/api/artists/trends?startDate=2024-01-01&endDate=2024-01-31"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("data", mockTrendData);
    expect(data).toHaveProperty("period", "day");
    expect(data).toHaveProperty("startDate", "2024-01-01");
    expect(data).toHaveProperty("endDate", "2024-01-31");
    expect(getArtistTrends).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      "day",
      "user-1",
      5
    );
  });

  it("should pass period and topN, with authenticated user", async () => {
    vi.mocked(getArtistTrends).mockResolvedValue([]);

    const request = new NextRequest(
      "http://localhost/api/artists/trends?startDate=2024-01-01&endDate=2024-06-30&period=week&topN=10&userId=user123"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(getArtistTrends).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      "week",
      "user-1",
      10
    );
  });

  it("should accept period=month", async () => {
    vi.mocked(getArtistTrends).mockResolvedValue([]);

    const request = new NextRequest(
      "http://localhost/api/artists/trends?startDate=2024-01-01&endDate=2024-12-31&period=month"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(getArtistTrends).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      "month",
      "user-1",
      5
    );
  });

  it("should return 400 for invalid period", async () => {
    const request = new NextRequest(
      "http://localhost/api/artists/trends?startDate=2024-01-01&endDate=2024-01-31&period=invalid"
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty(
      "error",
      "Le paramètre period doit être 'day', 'week' ou 'month'"
    );
    expect(getArtistTrends).not.toHaveBeenCalled();
  });

  it("should return 400 for topN too low", async () => {
    const request = new NextRequest(
      "http://localhost/api/artists/trends?startDate=2024-01-01&endDate=2024-01-31&topN=0"
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty(
      "error",
      "Le paramètre topN doit être entre 1 et 20"
    );
  });

  it("should return 400 for topN too high", async () => {
    const request = new NextRequest(
      "http://localhost/api/artists/trends?startDate=2024-01-01&endDate=2024-01-31&topN=21"
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty(
      "error",
      "Le paramètre topN doit être entre 1 et 20"
    );
  });

  it("should return 400 for invalid topN (not a number)", async () => {
    const request = new NextRequest(
      "http://localhost/api/artists/trends?startDate=2024-01-01&endDate=2024-01-31&topN=abc"
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });

  it("should return 400 for missing date range", async () => {
    const request = new NextRequest(
      "http://localhost/api/artists/trends?startDate=2024-01-01"
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty("error");
    expect(data).toHaveProperty("code", "VALIDATION_ERROR");
  });

  it("should return 400 for invalid date format", async () => {
    const request = new NextRequest(
      "http://localhost/api/artists/trends?startDate=invalid&endDate=2024-01-31"
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty("error");
    expect(data).toHaveProperty("code", "VALIDATION_ERROR");
  });

  it("should return 500 when service throws", async () => {
    vi.mocked(getArtistTrends).mockRejectedValue(new Error("Database error"));

    const request = new NextRequest(
      "http://localhost/api/artists/trends?startDate=2024-01-01&endDate=2024-01-31"
    );
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });
});
