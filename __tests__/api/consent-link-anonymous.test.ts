import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { POST } from "@/app/api/user/consent/link-anonymous/route";

vi.mock("@/lib/auth/get-current-user-id", () => ({
  getCurrentUserId: vi.fn(),
}));

vi.mock("@/lib/services/user/link-anonymous-consents", () => ({
  linkAnonymousConsentsToUser: vi.fn(),
}));

import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { linkAnonymousConsentsToUser } from "@/lib/services/user/link-anonymous-consents";

describe("POST /api/user/consent/link-anonymous", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUserId).mockResolvedValue("user-1");
    vi.mocked(linkAnonymousConsentsToUser).mockResolvedValue(3);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(undefined);
    const response = await POST(
      new NextRequest("http://localhost/api/user/consent/link-anonymous", {
        method: "POST",
        body: JSON.stringify({ anonymousId: "anon-1" }),
      })
    );
    expect(response.status).toBe(401);
  });

  it("links anonymous consents for authenticated user", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/user/consent/link-anonymous", {
        method: "POST",
        body: JSON.stringify({ anonymousId: "anon-1" }),
      })
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.linked).toBe(3);
    expect(linkAnonymousConsentsToUser).toHaveBeenCalledWith("user-1", "anon-1");
  });
});
