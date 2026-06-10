import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET as GETTimeline } from "@/app/api/duet/compare/timeline/route";
import { GET as GETEntity } from "@/app/api/duet/compare/entity/route";
import { GET as GETMetadata } from "@/app/api/duet/compare/metadata/route";
import { GET as GETSharedArtists } from "@/app/api/duet/compare/shared-artists/route";

vi.mock("@/lib/services/duet/duet-compare-guard", () => ({
  requireDuetCompareAccess: vi.fn(),
  parseFriendUserId: vi.fn(),
  invalidFriendUserIdResponse: vi.fn(() =>
    NextResponse.json({ error: "Invalid friendUserId" }, { status: 400 })
  ),
  friendAccessDeniedResponse: vi.fn((status: number) =>
    NextResponse.json(
      { error: status === 404 ? "Not found" : "Forbidden" },
      { status }
    )
  ),
}));

vi.mock("@/lib/services/duet/compare-service", () => ({
  getCompareTimeline: vi.fn(),
  getCompareEntity: vi.fn(),
  getCompareMetadata: vi.fn(),
  getCompareSharedArtists: vi.fn(),
}));

import { requireDuetCompareAccess } from "@/lib/services/duet/duet-compare-guard";
import {
  getCompareTimeline,
  getCompareEntity,
  getCompareMetadata,
  getCompareSharedArtists,
} from "@/lib/services/duet/compare-service";

const VIEWER_ID = "11111111-1111-4111-8111-111111111111";
const FRIEND_ID = "22222222-2222-4222-8222-222222222222";

const timelinePayload = {
  period: "day" as const,
  startDate: "2026-05-01T00:00:00.000Z",
  endDate: "2026-06-01T00:00:00.000Z",
  rangeClamped: false,
  self: [{ date: "2026-05-01", listens: 10, uniqueTracks: 5, uniqueArtists: 3 }],
  friend: [{ date: "2026-05-01", listens: 7, uniqueTracks: 4, uniqueArtists: 2 }],
  merged: [{ date: "2026-05-01", self: 10, friend: 7 }],
};

describe("Duet compare API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireDuetCompareAccess).mockResolvedValue({
      ok: true,
      viewerId: VIEWER_ID,
      friendUserId: FRIEND_ID,
    });
  });

  it("GET timeline returns 401 when unauthenticated", async () => {
    vi.mocked(requireDuetCompareAccess).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    });

    const response = await GETTimeline(
      new NextRequest(
        `http://localhost/api/duet/compare/timeline?friendUserId=${FRIEND_ID}`
      )
    );
    expect(response.status).toBe(401);
  });

  it("GET timeline returns 404 for stranger", async () => {
    vi.mocked(requireDuetCompareAccess).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    });

    const response = await GETTimeline(
      new NextRequest(
        `http://localhost/api/duet/compare/timeline?friendUserId=${FRIEND_ID}`
      )
    );
    expect(response.status).toBe(404);
  });

  it("GET timeline returns 403 for insufficient scope", async () => {
    vi.mocked(requireDuetCompareAccess).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });

    const response = await GETTimeline(
      new NextRequest(
        `http://localhost/api/duet/compare/timeline?friendUserId=${FRIEND_ID}`
      )
    );
    expect(response.status).toBe(403);
  });

  it("GET timeline returns merged series on happy path", async () => {
    vi.mocked(getCompareTimeline).mockResolvedValue(timelinePayload);

    const response = await GETTimeline(
      new NextRequest(
        `http://localhost/api/duet/compare/timeline?friendUserId=${FRIEND_ID}&period=day`
      )
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.merged).toEqual([{ date: "2026-05-01", self: 10, friend: 7 }]);
    expect(requireDuetCompareAccess).toHaveBeenCalledWith(
      expect.any(NextRequest),
      "/api/duet/compare/timeline",
      "aggregates"
    );
  });

  it("GET entity requires aggregates scope", async () => {
    vi.mocked(getCompareEntity).mockResolvedValue({
      type: "artist",
      entityId: "artist-1",
      artistName: "Radiohead",
      period: "day",
      startDate: timelinePayload.startDate,
      endDate: timelinePayload.endDate,
      rangeClamped: false,
      selfCount: 12,
      friendCount: 8,
      winner: "self",
      merged: [
        { date: "2026-05-01", self: 5, friend: 3 },
        { date: "2026-05-02", self: 7, friend: 5 },
      ],
    });

    const response = await GETEntity(
      new NextRequest(
        `http://localhost/api/duet/compare/entity?friendUserId=${FRIEND_ID}&type=artist&entityId=artist-1`
      )
    );

    expect(response.status).toBe(200);
    expect(requireDuetCompareAccess).toHaveBeenCalledWith(
      expect.any(NextRequest),
      "/api/duet/compare/entity",
      "aggregates"
    );
    expect(getCompareEntity).toHaveBeenCalledWith(
      expect.any(NextRequest),
      VIEWER_ID,
      FRIEND_ID,
      "artist",
      "artist-1"
    );
    const data = await response.json();
    expect(data.winner).toBe("self");
  });

  it("GET entity returns track head-to-head on happy path", async () => {
    vi.mocked(getCompareEntity).mockResolvedValue({
      type: "track",
      entityId: "track-1",
      trackTitle: "Paranoid Android",
      artistName: "Radiohead",
      period: "day",
      startDate: timelinePayload.startDate,
      endDate: timelinePayload.endDate,
      rangeClamped: false,
      selfCount: 6,
      friendCount: 9,
      winner: "friend",
      merged: [{ date: "2026-05-01", self: 6, friend: 9 }],
    });

    const response = await GETEntity(
      new NextRequest(
        `http://localhost/api/duet/compare/entity?friendUserId=${FRIEND_ID}&type=track&entityId=track-1`
      )
    );

    expect(response.status).toBe(200);
    expect(getCompareEntity).toHaveBeenCalledWith(
      expect.any(NextRequest),
      VIEWER_ID,
      FRIEND_ID,
      "track",
      "track-1"
    );
    const data = await response.json();
    expect(data.winner).toBe("friend");
    expect(data.trackTitle).toBe("Paranoid Android");
  });

  it("GET entity returns genre head-to-head on happy path", async () => {
    vi.mocked(getCompareEntity).mockResolvedValue({
      type: "genre",
      entityId: "Rock",
      genreName: "Rock",
      period: "day",
      startDate: timelinePayload.startDate,
      endDate: timelinePayload.endDate,
      rangeClamped: false,
      selfCount: 42,
      friendCount: 38,
      winner: "self",
      merged: [{ date: "2026-05-01", self: 42, friend: 38 }],
    });

    const response = await GETEntity(
      new NextRequest(
        `http://localhost/api/duet/compare/entity?friendUserId=${FRIEND_ID}&type=genre&entityId=${encodeURIComponent("Rock")}`
      )
    );

    expect(response.status).toBe(200);
    expect(getCompareEntity).toHaveBeenCalledWith(
      expect.any(NextRequest),
      VIEWER_ID,
      FRIEND_ID,
      "genre",
      "Rock"
    );
    const data = await response.json();
    expect(data.genreName).toBe("Rock");
    expect(data.winner).toBe("self");
  });

  it("GET entity returns 400 for invalid type", async () => {
    const response = await GETEntity(
      new NextRequest(
        `http://localhost/api/duet/compare/entity?friendUserId=${FRIEND_ID}&type=album&entityId=album-1`
      )
    );
    expect(response.status).toBe(400);
    expect(getCompareEntity).not.toHaveBeenCalled();
  });

  it("GET metadata returns coverage for self and friend", async () => {
    vi.mocked(getCompareMetadata).mockResolvedValue({
      self: {
        minDate: "2024-01-01T00:00:00.000Z",
        maxDate: "2026-06-01T00:00:00.000Z",
        totalListens: 1000,
        sources: ["lastfm"],
      },
      friend: {
        minDate: "2025-01-01T00:00:00.000Z",
        maxDate: "2026-06-01T00:00:00.000Z",
        totalListens: 200,
        sources: ["apple_music_replay"],
      },
    });

    const response = await GETMetadata(
      new NextRequest(
        `http://localhost/api/duet/compare/metadata?friendUserId=${FRIEND_ID}`
      )
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.friend.sources).toEqual(["apple_music_replay"]);
    expect(requireDuetCompareAccess).toHaveBeenCalledWith(
      expect.any(NextRequest),
      "/api/duet/compare/metadata",
      "aggregates"
    );
  });

  it("GET shared-artists requires aggregates scope", async () => {
    vi.mocked(getCompareSharedArtists).mockResolvedValue({
      startDate: timelinePayload.startDate,
      endDate: timelinePayload.endDate,
      rangeClamped: false,
      topPool: 50,
      totalShared: 1,
      artists: [
        {
          artistId: "artist-1",
          artistName: "Radiohead",
          selfCount: 12,
          friendCount: 8,
          selfRank: 3,
          friendRank: 5,
          combinedCount: 20,
          winner: "self",
        },
      ],
    });

    const response = await GETSharedArtists(
      new NextRequest(
        `http://localhost/api/duet/compare/shared-artists?friendUserId=${FRIEND_ID}`
      )
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.artists).toHaveLength(1);
    expect(data.artists[0].artistName).toBe("Radiohead");
    expect(requireDuetCompareAccess).toHaveBeenCalledWith(
      expect.any(NextRequest),
      "/api/duet/compare/shared-artists",
      "aggregates"
    );
  });
});
