import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/artists/[artistId]/insights/route";

vi.mock("@/lib/services/artist/artist-service", () => ({
  getArtistUserInsights: vi.fn(),
}));
vi.mock("@/lib/auth/resolve-authorized-data-user-id", () => ({
  resolveAuthorizedDataUserId: vi.fn(),
}));
vi.mock("@/lib/middleware/validation", () => ({
  extractOptionalDateRange: vi.fn(() => ({
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
  })),
}));

import { getArtistUserInsights } from "@/lib/services/artist/artist-service";
import { resolveAuthorizedDataUserId } from "@/lib/auth/resolve-authorized-data-user-id";
import type { ArtistUserInsights } from "@/lib/services/artist/artist-service";

const sampleInsights: ArtistUserInsights = {
  artist: {
    artistId: "a1",
    artistName: "Test Artist",
    imageUrl: null,
    listenCount: 120,
    uniqueTracks: 9,
    firstListenDate: "2024-01-05T12:00:00.000Z",
    lastListenDate: "2024-06-01T18:30:00.000Z",
    totalPlayTime: 36000,
  },
  topTracks: [{ trackId: "t1", title: "Track One", listenCount: 40 }],
  listensByHour: Array.from({ length: 24 }, (_, hour) => ({ hour, listens: hour === 20 ? 20 : 0 })),
  listensByWeekday: Array.from({ length: 7 }, (_, weekdayIndexMondayFirst) => ({
    weekdayIndexMondayFirst,
    listens: weekdayIndexMondayFirst === 2 ? 50 : 0,
  })),
  listensBySource: [
    { source: "lastfm", listens: 100 },
    { source: "spotify_export", listens: 20 },
  ],
  busiestDay: { date: "2024-03-15", listens: 25 },
  activeListeningDays: 40,
  listeningSpanDays: 150,
  peakListenHour: { hour: 20, listens: 20 },
  peakWeekday: { weekdayIndexMondayFirst: 2, listens: 50 },
};

describe("GET /api/artists/[artistId]/insights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveAuthorizedDataUserId).mockResolvedValue({ ok: true, userId: "user-1" });
    vi.mocked(getArtistUserInsights).mockResolvedValue(sampleInsights);
  });

  it("returns 404 when artist has no listens in range", async () => {
    vi.mocked(getArtistUserInsights).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/artists/a1/insights");
    const response = await GET(request, { params: { artistId: "a1" } });

    expect(response.status).toBe(404);
    expect(getArtistUserInsights).toHaveBeenCalledWith("a1", undefined, undefined, "user-1");
  });

  it("returns 200 with insight payload mapped to API DTO", async () => {
    const request = new NextRequest("http://localhost/api/artists/a1/insights");
    const response = await GET(request, { params: { artistId: "a1" } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.artist).toMatchObject(sampleInsights.artist);
    expect(Array.isArray(data.topTracks)).toBe(true);
    expect(data.listensByHour).toHaveLength(24);
    expect(data.peakListenHour).toEqual({ hour: 20, listens: 20 });
    expect(resolveAuthorizedDataUserId).toHaveBeenCalledTimes(1);
  });

  it("returns 400 for empty artist id", async () => {
    const request = new NextRequest("http://localhost/api/artists/ /insights");
    const response = await GET(request, { params: { artistId: "   " } });
    expect(response.status).toBe(400);
    expect(getArtistUserInsights).not.toHaveBeenCalled();
  });
});
