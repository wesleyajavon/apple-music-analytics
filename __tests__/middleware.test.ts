import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  updateSession: vi.fn(),
}));

vi.mock("next-intl/middleware", () => ({
  default: () => () => new Response(null),
}));

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: mocks.updateSession,
}));

import middleware from "@/middleware";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PROFILE_ID = "11111111-1111-4111-8111-111111111111";

describe("middleware public Palette access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_PUBLIC_PROFILE_USER_ID = PUBLIC_PROFILE_ID;
    vi.mocked(updateSession).mockResolvedValue({
      response: NextResponse.next(),
      user: null,
    });
  });

  it("redirects anonymous public-profile viewers away from Palette", async () => {
    const request = new NextRequest(
      `http://localhost/fr/dashboard/genres/palette?userId=${PUBLIC_PROFILE_ID}`
    );

    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `http://localhost/fr/dashboard/genres?userId=${PUBLIC_PROFILE_ID}&palette=restricted`
    );
  });

  it("does not block authenticated users on Palette", async () => {
    const sessionResponse = NextResponse.next();
    vi.mocked(updateSession).mockResolvedValue({
      response: sessionResponse,
      user: { id: "user-1" } as Awaited<
        ReturnType<typeof updateSession>
      >["user"],
    });
    const request = new NextRequest(
      `http://localhost/fr/dashboard/genres/palette?userId=${PUBLIC_PROFILE_ID}`
    );

    const response = await middleware(request);

    expect(response).toBe(sessionResponse);
  });
});
