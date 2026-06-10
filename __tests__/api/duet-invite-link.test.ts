import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as POSTCreateLink } from "@/app/api/duet/friends/invite-link/route";
import { GET as GETValidate } from "@/app/api/duet/friends/invite-link/validate/route";
import { POST as POSTRedeem } from "@/app/api/duet/friends/invite-link/redeem/route";

vi.mock("@/lib/auth/require-auth-user-id", () => ({
  requireAuthenticatedUserId: vi.fn(),
  unauthorizedResponse: vi.fn(() =>
    new Response(JSON.stringify({ error: "Authentication required" }), { status: 401 })
  ),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  assertRateLimit: vi.fn(),
}));

vi.mock("@/lib/services/duet/duet-invite-token-service", () => ({
  createInviteLink: vi.fn(),
  previewInviteLink: vi.fn(),
  redeemInviteLink: vi.fn(),
}));

vi.mock("@/lib/services/duet/duet-consent", () => ({
  grantDuetSharingConsent: vi.fn(),
}));

import { requireAuthenticatedUserId } from "@/lib/auth/require-auth-user-id";
import {
  createInviteLink,
  previewInviteLink,
  redeemInviteLink,
} from "@/lib/services/duet/duet-invite-token-service";
import { grantDuetSharingConsent } from "@/lib/services/duet/duet-consent";
import { DUET_ERROR_CODES, DuetServiceError } from "@/lib/services/duet/duet-errors";

const USER_ID = "user-duet-a";
const TOKEN = "token-id.1893456000000.abc123signature0000000000000000000000000000000000000000000000";

describe("Duet invite link API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuthenticatedUserId).mockResolvedValue(USER_ID);
  });

  it("POST invite-link returns url on happy path", async () => {
    vi.mocked(createInviteLink).mockResolvedValue({
      token: TOKEN,
      expiresAt: new Date("2026-06-17T12:00:00.000Z"),
    });

    const response = await POSTCreateLink(
      new NextRequest("http://localhost/api/duet/friends/invite-link", { method: "POST" })
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.url).toContain("/duet/accept?token=");
    expect(createInviteLink).toHaveBeenCalledWith(USER_ID);
  });

  it("GET validate returns requester preview", async () => {
    vi.mocked(previewInviteLink).mockResolvedValue({
      requester: { id: "req-1", email: "a@test.com", name: "Alice", avatarUrl: null },
      expiresAt: new Date("2026-06-17T12:00:00.000Z"),
    });

    const response = await GETValidate(
      new NextRequest(
        `http://localhost/api/duet/friends/invite-link/validate?token=${encodeURIComponent(TOKEN)}`
      )
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.requester.name).toBe("Alice");
  });

  it("GET validate returns 404 for invalid token", async () => {
    vi.mocked(previewInviteLink).mockRejectedValue(
      new DuetServiceError(DUET_ERROR_CODES.INVITE_TOKEN_INVALID)
    );

    const response = await GETValidate(
      new NextRequest(
        `http://localhost/api/duet/friends/invite-link/validate?token=${encodeURIComponent(TOKEN)}`
      )
    );

    expect(response.status).toBe(404);
  });

  it("POST redeem accepts invite with share scope", async () => {
    vi.mocked(redeemInviteLink).mockResolvedValue({
      id: "friendship-1",
      status: "accepted",
      shareScope: "aggregates",
      createdAt: new Date(),
      respondedAt: new Date(),
      requester: { id: "req-1", email: null, name: "Alice", avatarUrl: null },
      addressee: { id: USER_ID, email: null, name: "Bob", avatarUrl: null },
      direction: "friend",
    });

    const response = await POSTRedeem(
      new NextRequest("http://localhost/api/duet/friends/invite-link/redeem", {
        method: "POST",
        body: JSON.stringify({ token: TOKEN, shareScope: "aggregates" }),
      })
    );

    expect(response.status).toBe(200);
    expect(redeemInviteLink).toHaveBeenCalledWith(TOKEN, USER_ID, "aggregates");
    expect(grantDuetSharingConsent).toHaveBeenCalledWith(USER_ID, expect.any(NextRequest));
  });
});
