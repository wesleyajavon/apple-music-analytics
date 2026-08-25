import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/require-auth-user-id", () => ({
  requireAuthenticatedUserId: vi.fn(),
  unauthorizedResponse: vi.fn(() =>
    new Response(JSON.stringify({ error: "Authentication required" }), { status: 401 })
  ),
}));

vi.mock("@/lib/services/duet/assert-friend-data-access", () => ({
  assertFriendDataAccess: vi.fn(),
}));

vi.mock("@/lib/security/analytics-rate-limit", () => ({
  assertAnalyticsRateLimit: vi.fn(),
}));

import { requireAuthenticatedUserId } from "@/lib/auth/require-auth-user-id";
import { assertFriendDataAccess } from "@/lib/services/duet/assert-friend-data-access";
import { assertAnalyticsRateLimit } from "@/lib/security/analytics-rate-limit";
import {
  DUET_COMPARE_RATE_LIMIT,
  parseFriendUserId,
  requireDuetCompareAccess,
  requireDuetFriendAccess,
} from "@/lib/services/duet/duet-compare-guard";

const VIEWER_ID = "11111111-1111-4111-8111-111111111111";
const FRIEND_ID = "22222222-2222-4222-8222-222222222222";

describe("duet-compare-guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuthenticatedUserId).mockResolvedValue(VIEWER_ID);
    vi.mocked(assertFriendDataAccess).mockResolvedValue({ ok: true, shareScope: "full" });
    vi.mocked(assertAnalyticsRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 10,
      resetAt: new Date().toISOString(),
    });
  });

  it("parseFriendUserId rejects invalid uuid", () => {
    const request = new NextRequest(
      "http://localhost/api/duet/compare/timeline?friendUserId=not-a-uuid"
    );
    expect(parseFriendUserId(request)).toBeNull();
  });

  it("parseFriendUserId accepts valid uuid", () => {
    const request = new NextRequest(
      `http://localhost/api/duet/compare/timeline?friendUserId=${FRIEND_ID}`
    );
    expect(parseFriendUserId(request)).toBe(FRIEND_ID);
  });

  it("requireDuetCompareAccess returns 404 when not friends", async () => {
    vi.mocked(assertFriendDataAccess).mockResolvedValue({ ok: false, status: 404 });

    const result = await requireDuetCompareAccess(
      new NextRequest(
        `http://localhost/api/duet/compare/timeline?friendUserId=${FRIEND_ID}`
      ),
      "/api/duet/compare/timeline",
      "aggregates"
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(404);
    }
  });

  it("requireDuetCompareAccess succeeds with analytics rate limit", async () => {
    const result = await requireDuetCompareAccess(
      new NextRequest(
        `http://localhost/api/duet/compare/timeline?friendUserId=${FRIEND_ID}`
      ),
      "/api/duet/compare/timeline",
      "aggregates"
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.viewerId).toBe(VIEWER_ID);
      expect(result.friendUserId).toBe(FRIEND_ID);
      expect(result.shareScope).toBe("full");
    }
    expect(assertAnalyticsRateLimit).toHaveBeenCalled();
  });

  it("requireDuetFriendAccess is an alias of requireDuetCompareAccess", () => {
    expect(requireDuetFriendAccess).toBe(requireDuetCompareAccess);
  });

  it("requireDuetFriendAccess applies compare rate limit on friend-overview route", async () => {
    const result = await requireDuetFriendAccess(
      new NextRequest(
        `http://localhost/api/duet/friend-overview?friendUserId=${FRIEND_ID}`
      ),
      "/api/duet/friend-overview",
      "aggregates"
    );

    expect(result.ok).toBe(true);
    expect(assertAnalyticsRateLimit).toHaveBeenCalledWith(
      expect.any(NextRequest),
      { ...DUET_COMPARE_RATE_LIMIT, route: "/api/duet/friend-overview" },
      VIEWER_ID
    );
  });
});
