import { describe, it, expect, beforeEach, vi } from "vitest";

const exchangeCodeForSession = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseRouteHandlerClient: vi.fn(),
}));

vi.mock("@/lib/auth/ensure-app-user-from-session", () => ({
  ensureAppUserFromSession: vi.fn(),
}));

vi.mock("@/lib/services/spotify/persist-connection-from-session", () => ({
  persistSpotifyConnectionFromSupabaseSession: vi.fn(),
}));

vi.mock("@/lib/utils/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { GET } from "@/app/auth/callback/route";
import { ensureAppUserFromSession } from "@/lib/auth/ensure-app-user-from-session";
import { persistSpotifyConnectionFromSupabaseSession } from "@/lib/services/spotify/persist-connection-from-session";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";

function locationOf(response: Response): string {
  const loc = response.headers.get("location");
  expect(loc).toBeTruthy();
  return loc!;
}

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    vi.mocked(createSupabaseRouteHandlerClient).mockResolvedValue({
      auth: { exchangeCodeForSession },
    } as Awaited<ReturnType<typeof createSupabaseRouteHandlerClient>>);
    vi.mocked(ensureAppUserFromSession).mockResolvedValue(undefined);
    vi.mocked(persistSpotifyConnectionFromSupabaseSession).mockResolvedValue(
      undefined
    );
  });

  it("uses error code as detail when error_description is absent", async () => {
    const url =
      "http://localhost/auth/callback?error=temporarily_unavailable";
    const response = await GET(new Request(url));

    expect(
      new URL(locationOf(response)).searchParams.get("detail")
    ).toBe("temporarily_unavailable");
  });

  it("redirects to sign-in with OAuth error detail when provider returns error", async () => {
    const url =
      "http://localhost/auth/callback?error=access_denied&error_description=User+cancelled&next=/dashboard";
    const response = await GET(new Request(url));

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    const loc = locationOf(response);
    expect(loc).toContain("/fr/sign-in");
    const parsed = new URL(loc);
    expect(parsed.searchParams.get("oauth_error")).toBe("1");
    expect(parsed.searchParams.get("detail")).toBe("User cancelled");
    expect(parsed.searchParams.get("next")).toBe("/dashboard");
    expect(createSupabaseRouteHandlerClient).not.toHaveBeenCalled();
  });

  it("truncates long OAuth error descriptions for the detail query param", async () => {
    const longDesc = "x".repeat(600);
    const url = `http://localhost/auth/callback?error=access_denied&error_description=${encodeURIComponent(longDesc)}`;
    const response = await GET(new Request(url));

    const parsed = new URL(locationOf(response));
    const detail = parsed.searchParams.get("detail");
    expect(detail).toHaveLength(501);
    expect(detail?.endsWith("…")).toBe(true);
  });

  it("exchanges code, persists user and Spotify connection, then redirects to next", async () => {
    const session = {
      user: { id: "user-1" },
      access_token: "at",
    };
    exchangeCodeForSession.mockResolvedValue({
      data: { session },
      error: null,
    });

    const url =
      "http://localhost/auth/callback?code=abc&next=/fr/dashboard/overview";
    const response = await GET(new Request(url));

    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(ensureAppUserFromSession).toHaveBeenCalledWith(session.user);
    expect(persistSpotifyConnectionFromSupabaseSession).toHaveBeenCalledWith(
      session
    );
    expect(locationOf(response)).toBe(
      new URL("/fr/dashboard/overview", "http://localhost").href
    );
  });

  it("redirects to sign-in when code exchange fails", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: { message: "invalid_grant" },
    });

    const url = "http://localhost/auth/callback?code=bad";
    const response = await GET(new Request(url));

    const parsed = new URL(locationOf(response));
    expect(parsed.pathname).toContain("/sign-in");
    expect(parsed.searchParams.get("oauth_error")).toBe("1");
    expect(parsed.searchParams.get("detail")).toBe("invalid_grant");
  });

  it("truncates long exchange error messages", async () => {
    const msg = "e".repeat(600);
    exchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: { message: msg },
    });

    const url = "http://localhost/auth/callback?code=bad";
    const response = await GET(new Request(url));

    const detail = new URL(locationOf(response)).searchParams.get("detail");
    expect(detail).toHaveLength(501);
    expect(detail?.endsWith("…")).toBe(true);
  });

  it("logs and continues when post-session persistence throws", async () => {
    const session = { user: { id: "user-1" } };
    exchangeCodeForSession.mockResolvedValue({
      data: { session },
      error: null,
    });
    vi.mocked(ensureAppUserFromSession).mockRejectedValue(
      new Error("ensure failed")
    );

    const url = "http://localhost/auth/callback?code=abc&next=/dashboard";
    const response = await GET(new Request(url));

    expect(logger.error).toHaveBeenCalled();
    expect(locationOf(response)).toBe(
      new URL("/dashboard", "http://localhost").href
    );
  });

  it("logs and continues when Spotify session persistence throws after ensure user", async () => {
    const session = { user: { id: "user-1" } };
    exchangeCodeForSession.mockResolvedValue({
      data: { session },
      error: null,
    });
    vi.mocked(persistSpotifyConnectionFromSupabaseSession).mockRejectedValue(
      new Error("spotify persist failed")
    );

    const url = "http://localhost/auth/callback?code=abc&next=/dashboard";
    const response = await GET(new Request(url));

    expect(logger.error).toHaveBeenCalled();
    expect(locationOf(response)).toBe(
      new URL("/dashboard", "http://localhost").href
    );
  });

  it("uses /dashboard when next is missing or unsafe", async () => {
    const cases: [string, string][] = [
      ["http://localhost/auth/callback", "/dashboard"],
      ["http://localhost/auth/callback?next=unsafe", "/dashboard"],
      ["http://localhost/auth/callback?next=%2F%2Fevil.com", "/dashboard"],
    ];
    for (const [requestUrl, expectedPath] of cases) {
      const response = await GET(new Request(requestUrl));
      expect(new URL(locationOf(response)).pathname).toBe(expectedPath);
    }
  });

  it("redirects to next when there is no OAuth code (implicit session refresh)", async () => {
    const url = "http://localhost/auth/callback?next=/fr/dashboard";
    const response = await GET(new Request(url));

    expect(createSupabaseRouteHandlerClient).not.toHaveBeenCalled();
    expect(locationOf(response)).toBe(
      new URL("/fr/dashboard", "http://localhost").href
    );
  });

  it("redirects to sign-in with a generic message when the handler throws", async () => {
    vi.mocked(createSupabaseRouteHandlerClient).mockRejectedValue(
      new Error("boom")
    );

    const url = "http://localhost/auth/callback?code=abc&next=/dashboard";
    const response = await GET(new Request(url));

    expect(logger.error).toHaveBeenCalled();
    const parsed = new URL(locationOf(response));
    expect(parsed.pathname).toContain("/sign-in");
    expect(parsed.searchParams.get("oauth_error")).toBe("1");
    expect(parsed.searchParams.get("detail")).toContain("réessayer");
    expect(parsed.searchParams.get("next")).toBe("/dashboard");
  });
});
