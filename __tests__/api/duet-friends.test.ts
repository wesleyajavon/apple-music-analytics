import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as GETFriends } from "@/app/api/duet/friends/route";
import { POST as POSTInvite } from "@/app/api/duet/friends/invite/route";
import { PATCH as PATCHFriend } from "@/app/api/duet/friends/[id]/route";
import { POST as POSTBlock } from "@/app/api/duet/friends/[id]/block/route";
import { GET as GETSettings, PATCH as PATCHSettings } from "@/app/api/duet/settings/route";

vi.mock("@/lib/auth/require-auth-user-id", () => ({
  requireAuthenticatedUserId: vi.fn(),
  unauthorizedResponse: vi.fn(() =>
    new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  ),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  assertRateLimit: vi.fn(),
}));

vi.mock("@/lib/services/duet/friendship-service", () => ({
  listFriendships: vi.fn(),
  inviteFriendByEmail: vi.fn(),
  acceptFriendship: vi.fn(),
  declineFriendship: vi.fn(),
  revokeFriendship: vi.fn(),
  updateFriendshipShareScope: vi.fn(),
  blockUser: vi.fn(),
}));

vi.mock("@/lib/services/duet/duet-share-settings-service", () => ({
  getOrCreateDuetShareSettings: vi.fn(),
  updateDuetShareSettings: vi.fn(),
}));

vi.mock("@/lib/services/duet/duet-consent", () => ({
  grantDuetSharingConsent: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    friendship: {
      findUnique: vi.fn(),
    },
  },
}));

import { requireAuthenticatedUserId } from "@/lib/auth/require-auth-user-id";
import {
  listFriendships,
  inviteFriendByEmail,
  acceptFriendship,
  declineFriendship,
  revokeFriendship,
  updateFriendshipShareScope,
  blockUser,
} from "@/lib/services/duet/friendship-service";
import {
  getOrCreateDuetShareSettings,
  updateDuetShareSettings,
} from "@/lib/services/duet/duet-share-settings-service";
import { grantDuetSharingConsent } from "@/lib/services/duet/duet-consent";
import { prisma } from "@/lib/prisma";
import { DUET_ERROR_CODES, DuetServiceError } from "@/lib/services/duet/duet-errors";

const USER_ID = "user-duet-a";
const FRIEND_ID = "user-duet-b";
const FRIENDSHIP_ID = "friendship-1";

const mockFriendship = {
  id: FRIENDSHIP_ID,
  status: "pending" as const,
  shareScope: "none" as const,
  createdAt: new Date("2026-06-01T12:00:00Z"),
  respondedAt: null,
  requester: {
    id: USER_ID,
    email: "a@test.com",
    name: "User A",
    avatarUrl: null,
  },
  addressee: {
    id: FRIEND_ID,
    email: "b@test.com",
    name: "User B",
    avatarUrl: null,
  },
  direction: "outgoing" as const,
};

describe("Duet friends API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuthenticatedUserId).mockResolvedValue(USER_ID);
  });

  it("GET /api/duet/friends returns 401 without session", async () => {
    vi.mocked(requireAuthenticatedUserId).mockResolvedValue(null);

    const response = await GETFriends(new NextRequest("http://localhost/api/duet/friends"));
    expect(response.status).toBe(401);
    expect(listFriendships).not.toHaveBeenCalled();
  });

  it("GET /api/duet/friends returns partitioned lists", async () => {
    vi.mocked(listFriendships).mockResolvedValue({
      friends: [{ ...mockFriendship, status: "accepted", direction: "friend" }],
      pendingIncoming: [{ ...mockFriendship, direction: "incoming" }],
      pendingOutgoing: [{ ...mockFriendship, direction: "outgoing" }],
    });

    const response = await GETFriends(new NextRequest("http://localhost/api/duet/friends"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.friends).toHaveLength(1);
    expect(data.pendingIncoming).toHaveLength(1);
    expect(data.pendingOutgoing).toHaveLength(1);
    expect(data.friends[0].createdAt).toBe("2026-06-01T12:00:00.000Z");
  });

  it("POST /api/duet/friends/invite returns uniform response when email unknown", async () => {
    vi.mocked(inviteFriendByEmail).mockRejectedValue(
      new DuetServiceError(DUET_ERROR_CODES.ADDRESSEE_NOT_FOUND)
    );

    const response = await POSTInvite(
      new NextRequest("http://localhost/api/duet/friends/invite", {
        method: "POST",
        body: JSON.stringify({ email: "unknown@test.com" }),
      })
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.message).toBe("Invitation processed");
    expect(data.friendship).toBeUndefined();
  });

  it("POST /api/duet/friends/invite returns friendship on success", async () => {
    vi.mocked(inviteFriendByEmail).mockResolvedValue(mockFriendship);

    const response = await POSTInvite(
      new NextRequest("http://localhost/api/duet/friends/invite", {
        method: "POST",
        body: JSON.stringify({ email: "b@test.com" }),
      })
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.friendship.id).toBe(FRIENDSHIP_ID);
  });

  it("POST /api/duet/friends/invite returns 409 on duplicate", async () => {
    vi.mocked(inviteFriendByEmail).mockRejectedValue(
      new DuetServiceError(DUET_ERROR_CODES.DUPLICATE_INVITE)
    );

    const response = await POSTInvite(
      new NextRequest("http://localhost/api/duet/friends/invite", {
        method: "POST",
        body: JSON.stringify({ email: "b@test.com" }),
      })
    );

    expect(response.status).toBe(409);
  });

  it("PATCH accept records duet sharing consent", async () => {
    vi.mocked(requireAuthenticatedUserId).mockResolvedValue(FRIEND_ID);
    vi.mocked(acceptFriendship).mockResolvedValue({
      ...mockFriendship,
      status: "accepted",
      shareScope: "aggregates",
    });

    const response = await PATCHFriend(
      new NextRequest(`http://localhost/api/duet/friends/${FRIENDSHIP_ID}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "accept", shareScope: "aggregates" }),
      }),
      { params: Promise.resolve({ id: FRIENDSHIP_ID }) }
    );

    expect(response.status).toBe(200);
    expect(grantDuetSharingConsent).toHaveBeenCalledWith(FRIEND_ID, expect.any(NextRequest));
    expect(acceptFriendship).toHaveBeenCalledWith(FRIENDSHIP_ID, FRIEND_ID, "aggregates");
  });

  it("PATCH decline returns friendship", async () => {
    vi.mocked(declineFriendship).mockResolvedValue({
      ...mockFriendship,
      status: "declined",
    });

    const response = await PATCHFriend(
      new NextRequest(`http://localhost/api/duet/friends/${FRIENDSHIP_ID}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "decline" }),
      }),
      { params: Promise.resolve({ id: FRIENDSHIP_ID }) }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.friendship.status).toBe("declined");
  });

  it("PATCH updateShareScope records duet sharing consent", async () => {
    vi.mocked(updateFriendshipShareScope).mockResolvedValue({
      ...mockFriendship,
      status: "accepted",
      shareScope: "full",
      direction: "friend",
    });

    const response = await PATCHFriend(
      new NextRequest(`http://localhost/api/duet/friends/${FRIENDSHIP_ID}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "updateShareScope", shareScope: "full" }),
      }),
      { params: Promise.resolve({ id: FRIENDSHIP_ID }) }
    );

    expect(response.status).toBe(200);
    expect(updateFriendshipShareScope).toHaveBeenCalledWith(FRIENDSHIP_ID, USER_ID, "full");
    expect(grantDuetSharingConsent).toHaveBeenCalledWith(USER_ID, expect.any(NextRequest));
  });

  it("PATCH revoke returns ok", async () => {
    const response = await PATCHFriend(
      new NextRequest(`http://localhost/api/duet/friends/${FRIENDSHIP_ID}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "revoke" }),
      }),
      { params: Promise.resolve({ id: FRIENDSHIP_ID }) }
    );

    expect(response.status).toBe(200);
    expect(revokeFriendship).toHaveBeenCalledWith(FRIENDSHIP_ID, USER_ID);
  });

  it("POST block returns blocked friendship", async () => {
    vi.mocked(prisma.friendship.findUnique).mockResolvedValue({
      requesterId: USER_ID,
      addresseeId: FRIEND_ID,
    } as Awaited<ReturnType<typeof prisma.friendship.findUnique>>);
    vi.mocked(blockUser).mockResolvedValue({
      ...mockFriendship,
      status: "blocked",
    });

    const response = await POSTBlock(
      new NextRequest(`http://localhost/api/duet/friends/${FRIENDSHIP_ID}/block`, {
        method: "POST",
      }),
      { params: Promise.resolve({ id: FRIENDSHIP_ID }) }
    );

    expect(response.status).toBe(200);
    expect(blockUser).toHaveBeenCalledWith(USER_ID, FRIEND_ID);
  });

  it("POST block returns 404 for unknown friendship", async () => {
    vi.mocked(prisma.friendship.findUnique).mockResolvedValue(null);

    const response = await POSTBlock(
      new NextRequest(`http://localhost/api/duet/friends/${FRIENDSHIP_ID}/block`, {
        method: "POST",
      }),
      { params: Promise.resolve({ id: FRIENDSHIP_ID }) }
    );

    expect(response.status).toBe(404);
  });

  it("GET /api/duet/settings returns settings", async () => {
    vi.mocked(getOrCreateDuetShareSettings).mockResolvedValue({
      userId: USER_ID,
      allowFriendRequests: true,
      defaultShareScope: "aggregates",
    });

    const response = await GETSettings(new NextRequest("http://localhost/api/duet/settings"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.defaultShareScope).toBe("aggregates");
  });

  it("PATCH /api/duet/settings updates settings", async () => {
    vi.mocked(updateDuetShareSettings).mockResolvedValue({
      userId: USER_ID,
      allowFriendRequests: false,
      defaultShareScope: "full",
    });

    const response = await PATCHSettings(
      new NextRequest("http://localhost/api/duet/settings", {
        method: "PATCH",
        body: JSON.stringify({ allowFriendRequests: false }),
      })
    );

    expect(response.status).toBe(200);
    expect(updateDuetShareSettings).toHaveBeenCalledWith(USER_ID, {
      allowFriendRequests: false,
    });
  });
});
