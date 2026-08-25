import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET } from "@/app/api/duet/friend-overview/route";

vi.mock("@/lib/services/duet/duet-compare-guard", () => ({
  requireDuetFriendAccess: vi.fn(),
  invalidFriendUserIdResponse: vi.fn(() =>
    NextResponse.json(
      { error: "Invalid friendUserId", code: "VALIDATION_ERROR" },
      { status: 400 }
    )
  ),
}));

vi.mock("@/lib/services/duet/friend-overview-service", () => ({
  getFriendOverview: vi.fn(),
}));

import { requireDuetFriendAccess } from "@/lib/services/duet/duet-compare-guard";
import { getFriendOverview } from "@/lib/services/duet/friend-overview-service";

const VIEWER_ID = "11111111-1111-4111-8111-111111111111";
const FRIEND_ID = "22222222-2222-4222-8222-222222222222";

const overviewPayload = {
  friendUserId: FRIEND_ID,
  shareScope: "aggregates" as const,
  subject: { name: "Ada", avatarUrl: null },
  stats: {
    totalListens: 10,
    uniqueArtists: 4,
    uniqueTracks: 7,
    totalPlayTime: 120,
  },
  topArtists: [],
  topGenres: [],
  timeline: [],
};

describe("GET /api/duet/friend-overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireDuetFriendAccess).mockResolvedValue({
      ok: true,
      viewerId: VIEWER_ID,
      friendUserId: FRIEND_ID,
      shareScope: "aggregates",
    });
    vi.mocked(getFriendOverview).mockResolvedValue(overviewPayload);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireDuetFriendAccess).mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    });

    const response = await GET(
      new NextRequest(
        `http://localhost/api/duet/friend-overview?friendUserId=${FRIEND_ID}`
      )
    );

    expect(response.status).toBe(401);
    expect(getFriendOverview).not.toHaveBeenCalled();
  });

  it("returns 404 for a stranger", async () => {
    vi.mocked(requireDuetFriendAccess).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    });

    const response = await GET(
      new NextRequest(
        `http://localhost/api/duet/friend-overview?friendUserId=${FRIEND_ID}`
      )
    );

    expect(response.status).toBe(404);
    expect(getFriendOverview).not.toHaveBeenCalled();
  });

  it("returns 403 when shareScope is none", async () => {
    vi.mocked(requireDuetFriendAccess).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });

    const response = await GET(
      new NextRequest(
        `http://localhost/api/duet/friend-overview?friendUserId=${FRIEND_ID}`
      )
    );

    expect(response.status).toBe(403);
    expect(getFriendOverview).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid friendUserId", async () => {
    vi.mocked(requireDuetFriendAccess).mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { error: "Invalid friendUserId", code: "VALIDATION_ERROR" },
        { status: 400 }
      ),
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/duet/friend-overview?friendUserId=not-a-uuid"
      )
    );

    expect(response.status).toBe(400);
    expect(getFriendOverview).not.toHaveBeenCalled();
  });

  it("returns 400 when viewerId equals friendUserId", async () => {
    vi.mocked(requireDuetFriendAccess).mockResolvedValue({
      ok: true,
      viewerId: VIEWER_ID,
      friendUserId: VIEWER_ID,
      shareScope: "full",
    });

    const response = await GET(
      new NextRequest(
        `http://localhost/api/duet/friend-overview?friendUserId=${VIEWER_ID}`
      )
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(getFriendOverview).not.toHaveBeenCalled();
  });

  it("calls the guard with friend-overview route and aggregates scope", async () => {
    const response = await GET(
      new NextRequest(
        `http://localhost/api/duet/friend-overview?friendUserId=${FRIEND_ID}`
      )
    );

    expect(response.status).toBe(200);
    expect(requireDuetFriendAccess).toHaveBeenCalledWith(
      expect.any(NextRequest),
      "/api/duet/friend-overview",
      "aggregates"
    );
  });

  it("returns 200 and loads the friend's overview, not the viewer's", async () => {
    const response = await GET(
      new NextRequest(
        `http://localhost/api/duet/friend-overview?friendUserId=${FRIEND_ID}&startDate=2026-01-01&endDate=2026-06-01`
      )
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.friendUserId).toBe(FRIEND_ID);
    expect(getFriendOverview).toHaveBeenCalledWith({
      friendUserId: FRIEND_ID,
      shareScope: "aggregates",
      startDate: expect.any(Date),
      endDate: expect.any(Date),
    });
    const call = vi.mocked(getFriendOverview).mock.calls[0]?.[0];
    expect(call?.friendUserId).not.toBe(VIEWER_ID);
  });
});
