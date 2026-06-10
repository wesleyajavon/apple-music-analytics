import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "@/app/api/artists/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/services/artist/artist-service", () => ({
  getArtistStats: vi.fn(),
  getArtistOverview: vi.fn(),
  countArtistsForRange: vi.fn(),
}));
vi.mock("@/lib/auth/resolve-authorized-data-user-id", () => ({
  resolveAuthorizedDataUserId: vi.fn(),
}));

import {
  getArtistStats,
  getArtistOverview,
  countArtistsForRange,
} from "@/lib/services/artist/artist-service";
import { resolveAuthorizedDataUserId } from "@/lib/auth/resolve-authorized-data-user-id";

describe("GET /api/artists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveAuthorizedDataUserId).mockResolvedValue({
      ok: true,
      userId: "user-1",
    });
  });

  const mockOverview = {
    totalArtists: 50,
    totalListens: 1200,
    averageListensPerArtist: 24,
    topArtistListenCount: 150,
  };

  const mockTopArtists = [
    {
      artistId: "artist-1",
      artistName: "Artist One",
      imageUrl: "https://example.com/img1.jpg",
      listenCount: 150,
      uniqueTracks: 45,
      firstListenDate: "2024-01-01T00:00:00.000Z",
      lastListenDate: "2024-01-31T23:59:59.000Z",
      totalPlayTime: 3600,
    },
    {
      artistId: "artist-2",
      artistName: "Artist Two",
      imageUrl: null,
      listenCount: 80,
      uniqueTracks: 25,
      firstListenDate: "2024-01-05T00:00:00.000Z",
      lastListenDate: "2024-01-30T00:00:00.000Z",
      totalPlayTime: 2400,
    },
  ];

  it("should return artists stats and overview without date range", async () => {
    vi.mocked(getArtistOverview).mockResolvedValue(mockOverview);
    vi.mocked(countArtistsForRange).mockResolvedValue(50);
    vi.mocked(getArtistStats).mockResolvedValue(mockTopArtists);

    const request = new NextRequest("http://localhost/api/artists");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("overview", mockOverview);
    expect(data).toHaveProperty("topArtists", mockTopArtists);
    expect(data).toHaveProperty("pagination");
    expect(getArtistOverview).toHaveBeenCalledWith(undefined, undefined, "user-1");
    expect(countArtistsForRange).toHaveBeenCalledWith(undefined, undefined, "user-1");
    expect(getArtistStats).toHaveBeenCalledWith(undefined, undefined, "user-1", 20, 0);
  });

  it("should return artists stats with date range", async () => {
    vi.mocked(getArtistOverview).mockResolvedValue(mockOverview);
    vi.mocked(countArtistsForRange).mockResolvedValue(50);
    vi.mocked(getArtistStats).mockResolvedValue(mockTopArtists);

    const request = new NextRequest(
      "http://localhost/api/artists?startDate=2024-01-01&endDate=2024-01-31"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(getArtistOverview).toHaveBeenCalledOnce();
    expect(getArtistStats).toHaveBeenCalledOnce();
    const overviewArgs = vi.mocked(getArtistOverview).mock.calls[0];
    const statsArgs = vi.mocked(getArtistStats).mock.calls[0];
    const totalArgs = vi.mocked(countArtistsForRange).mock.calls[0];
    expect(overviewArgs[0]).toBeInstanceOf(Date);
    expect(overviewArgs[1]).toBeInstanceOf(Date);
    expect(totalArgs[0]).toBeInstanceOf(Date);
    expect(totalArgs[1]).toBeInstanceOf(Date);
    expect(statsArgs[0]).toBeInstanceOf(Date);
    expect(statsArgs[1]).toBeInstanceOf(Date);
    expect(statsArgs[3]).toBe(20);
    expect(statsArgs[4]).toBe(0);
  });

  it("should pass limit parameter", async () => {
    vi.mocked(getArtistOverview).mockResolvedValue(mockOverview);
    vi.mocked(countArtistsForRange).mockResolvedValue(50);
    vi.mocked(getArtistStats).mockResolvedValue(mockTopArtists);

    const request = new NextRequest(
      "http://localhost/api/artists?limit=50"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(getArtistStats).toHaveBeenCalledWith(undefined, undefined, "user-1", 50, 0);
  });

  it("should ignore query userId and use authenticated user", async () => {
    vi.mocked(getArtistOverview).mockResolvedValue(mockOverview);
    vi.mocked(countArtistsForRange).mockResolvedValue(50);
    vi.mocked(getArtistStats).mockResolvedValue(mockTopArtists);

    const request = new NextRequest(
      "http://localhost/api/artists?userId=user123"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(getArtistOverview).toHaveBeenCalledWith(undefined, undefined, "user-1");
    expect(countArtistsForRange).toHaveBeenCalledWith(undefined, undefined, "user-1");
    expect(getArtistStats).toHaveBeenCalledWith(undefined, undefined, "user-1", 20, 0);
  });

  it("should return 400 for invalid limit (too low)", async () => {
    const request = new NextRequest("http://localhost/api/artists?limit=0");
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty("error", "Le paramètre limit doit être entre 1 et 100");
    expect(getArtistOverview).not.toHaveBeenCalled();
    expect(countArtistsForRange).not.toHaveBeenCalled();
    expect(getArtistStats).not.toHaveBeenCalled();
  });

  it("should return 400 for invalid limit (too high)", async () => {
    const request = new NextRequest("http://localhost/api/artists?limit=101");
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty("error", "Le paramètre limit doit être entre 1 et 100");
  });

  it("should return 400 for invalid limit (not a number)", async () => {
    const request = new NextRequest("http://localhost/api/artists?limit=abc");
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });

  it("should return 400 for invalid date format", async () => {
    const request = new NextRequest(
      "http://localhost/api/artists?startDate=invalid-date"
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty("error");
    expect(data).toHaveProperty("code", "VALIDATION_ERROR");
  });

  it("should return 400 when endDate is before startDate", async () => {
    const request = new NextRequest(
      "http://localhost/api/artists?startDate=2024-01-31&endDate=2024-01-01"
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty("error");
    expect(data).toHaveProperty("code", "VALIDATION_ERROR");
  });

  it("should return 500 when service throws an error", async () => {
    vi.mocked(getArtistOverview).mockRejectedValue(new Error("Database error"));

    const request = new NextRequest("http://localhost/api/artists");
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });

  it("should ignore query userId and use authenticated user", async () => {
    vi.mocked(getArtistOverview).mockResolvedValue(mockOverview);
    vi.mocked(getArtistStats).mockResolvedValue(mockTopArtists);
    vi.mocked(countArtistsForRange).mockResolvedValue(50);

    const request = new NextRequest(
      "http://localhost/api/artists?limit=5&userId=22222222-2222-4222-8222-222222222222"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(getArtistStats).toHaveBeenCalledWith(undefined, undefined, "user-1", 5, 0);
  });
});
