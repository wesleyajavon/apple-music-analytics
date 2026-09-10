import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/artists/[artistId]/insights/route";

vi.mock("@/lib/services/artist/artist-service", () => ({
  getArtistUserInsights: vi.fn(),
}));
vi.mock("@/lib/auth/resolve-authorized-data-user-id", () => ({
  resolveAuthorizedDataUserId: vi.fn(),
}));
vi.mock("@/lib/auth/get-current-user-id", () => ({
  getCurrentUserId: vi.fn(),
}));
vi.mock("@/lib/services/user/public-profile-access", () => ({
  isActivePublicProfileUserId: vi.fn(),
  resolveActivePublicProfileUserId: vi.fn(),
}));
vi.mock("@/lib/services/duet/assert-friend-data-access", () => ({
  assertFriendDataAccess: vi.fn(),
}));
vi.mock("@/lib/middleware/validation", () => ({
  extractOptionalDateRange: vi.fn(() => ({
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
  })),
  extractOptionalUserId: vi.fn((request: NextRequest) =>
    request.nextUrl.searchParams.get("userId") ?? undefined
  ),
}));

import { getArtistUserInsights } from "@/lib/services/artist/artist-service";
import { resolveAuthorizedDataUserId } from "@/lib/auth/resolve-authorized-data-user-id";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import {
  isActivePublicProfileUserId,
  resolveActivePublicProfileUserId,
} from "@/lib/services/user/public-profile-access";
import { assertFriendDataAccess } from "@/lib/services/duet/assert-friend-data-access";
import type { ArtistUserInsights } from "@/lib/services/artist/artist-service";

const VIEWER_ID = "11111111-1111-4111-8111-111111111111";
const FRIEND_ID = "22222222-2222-4222-8222-222222222222";
const DEMO_ID = "33333333-3333-4333-8333-333333333333";

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
    vi.mocked(getCurrentUserId).mockResolvedValue(VIEWER_ID);
    vi.mocked(resolveAuthorizedDataUserId).mockResolvedValue({ ok: true, userId: VIEWER_ID });
    vi.mocked(resolveActivePublicProfileUserId).mockResolvedValue(null);
    vi.mocked(isActivePublicProfileUserId).mockResolvedValue(false);
    vi.mocked(getArtistUserInsights).mockResolvedValue(sampleInsights);
  });

  it("returns 404 when artist has no listens in range", async () => {
    vi.mocked(getArtistUserInsights).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/artists/a1/insights");
    const response = await GET(request, { params: { artistId: "a1" } });

    expect(response.status).toBe(404);
    expect(getArtistUserInsights).toHaveBeenCalledWith("a1", undefined, undefined, VIEWER_ID);
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

  it("honors friend userId when Duet aggregates access is granted", async () => {
    vi.mocked(assertFriendDataAccess).mockResolvedValue({ ok: true, shareScope: "aggregates" });

    const request = new NextRequest(
      `http://localhost/api/artists/a1/insights?userId=${FRIEND_ID}`
    );
    const response = await GET(request, { params: { artistId: "a1" } });

    expect(response.status).toBe(200);
    expect(assertFriendDataAccess).toHaveBeenCalledWith({
      viewerId: VIEWER_ID,
      targetUserId: FRIEND_ID,
      requiredScope: "aggregates",
    });
    expect(getArtistUserInsights).toHaveBeenCalledWith("a1", undefined, undefined, FRIEND_ID);
    expect(resolveAuthorizedDataUserId).not.toHaveBeenCalled();
  });

  it("returns 404 when friend relation is missing", async () => {
    vi.mocked(assertFriendDataAccess).mockResolvedValue({ ok: false, status: 404 });

    const request = new NextRequest(
      `http://localhost/api/artists/a1/insights?userId=${FRIEND_ID}`
    );
    const response = await GET(request, { params: { artistId: "a1" } });

    expect(response.status).toBe(404);
    expect(getArtistUserInsights).not.toHaveBeenCalled();
  });

  it("returns 403 when friend share scope is insufficient", async () => {
    vi.mocked(assertFriendDataAccess).mockResolvedValue({ ok: false, status: 403 });

    const request = new NextRequest(
      `http://localhost/api/artists/a1/insights?userId=${FRIEND_ID}`
    );
    const response = await GET(request, { params: { artistId: "a1" } });

    expect(response.status).toBe(403);
    expect(getArtistUserInsights).not.toHaveBeenCalled();
  });

  it("keeps public demo userId on the self/demo path", async () => {
    vi.mocked(resolveActivePublicProfileUserId).mockResolvedValue(DEMO_ID);
    vi.mocked(resolveAuthorizedDataUserId).mockResolvedValue({ ok: true, userId: DEMO_ID });
    vi.mocked(isActivePublicProfileUserId).mockResolvedValue(false);

    const request = new NextRequest(
      `http://localhost/api/artists/a1/insights?userId=${DEMO_ID}`
    );
    const response = await GET(request, { params: { artistId: "a1" } });

    expect(response.status).toBe(200);
    expect(assertFriendDataAccess).not.toHaveBeenCalled();
    expect(resolveAuthorizedDataUserId).toHaveBeenCalledTimes(1);
    expect(getArtistUserInsights).toHaveBeenCalledWith("a1", undefined, undefined, DEMO_ID);
  });
});
