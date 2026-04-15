import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/tracks/route";

vi.mock("@/lib/services/track/track-service", () => ({
  countTracksForRange: vi.fn(),
  getTrackOverview: vi.fn(),
  getTrackStats: vi.fn(),
}));
vi.mock("@/lib/auth/resolve-authorized-data-user-id", () => ({
  resolveAuthorizedDataUserId: vi.fn(),
}));

import {
  countTracksForRange,
  getTrackOverview,
  getTrackStats,
} from "@/lib/services/track/track-service";
import { resolveAuthorizedDataUserId } from "@/lib/auth/resolve-authorized-data-user-id";

describe("GET /api/tracks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveAuthorizedDataUserId).mockResolvedValue({
      ok: true,
      userId: "user-1",
    });
  });

  it("returns top tracks with default top 20", async () => {
    vi.mocked(getTrackOverview).mockResolvedValue({
      totalTracks: 123,
      totalListens: 999,
      averageListensPerTrack: 8,
      topTrackListenCount: 42,
    });
    vi.mocked(countTracksForRange).mockResolvedValue(123);
    vi.mocked(getTrackStats).mockResolvedValue([
      {
        trackId: "track-1",
        trackTitle: "Track One",
        artistId: "artist-1",
        artistName: "Artist One",
        genre: null,
        listenCount: 42,
        firstListenDate: "2024-01-01T00:00:00.000Z",
        lastListenDate: "2024-01-31T00:00:00.000Z",
        totalPlayTime: 4200,
      },
    ]);

    const response = await GET(new NextRequest("http://localhost/api/tracks"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.pagination.limit).toBe(20);
    expect(data.pagination.offset).toBe(0);
    expect(getTrackStats).toHaveBeenCalledWith(undefined, undefined, "user-1", 20, 0);
  });

  it("supports explicit pagination", async () => {
    vi.mocked(getTrackOverview).mockResolvedValue({
      totalTracks: 50,
      totalListens: 500,
      averageListensPerTrack: 10,
      topTrackListenCount: 25,
    });
    vi.mocked(countTracksForRange).mockResolvedValue(50);
    vi.mocked(getTrackStats).mockResolvedValue([]);

    const response = await GET(new NextRequest("http://localhost/api/tracks?limit=15&offset=30"));
    expect(response.status).toBe(200);
    expect(getTrackStats).toHaveBeenCalledWith(undefined, undefined, "user-1", 15, 30);
  });

  it("rejects invalid limit", async () => {
    const response = await GET(new NextRequest("http://localhost/api/tracks?limit=0"));
    expect(response.status).toBe(400);
  });

  it("rejects invalid offset", async () => {
    const response = await GET(new NextRequest("http://localhost/api/tracks?offset=-1"));
    expect(response.status).toBe(400);
  });
});
