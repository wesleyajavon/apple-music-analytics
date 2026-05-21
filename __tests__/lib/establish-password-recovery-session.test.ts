import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { establishPasswordRecoverySession } from "@/lib/auth/establish-password-recovery-session";

const setSession = vi.fn();
const exchangeCodeForSession = vi.fn();
const getUser = vi.fn();

function createMockSupabase() {
  return {
    auth: { setSession, exchangeCodeForSession, getUser },
  };
}

function installWindowUrl(url: string) {
  const parsed = new URL(url, "http://localhost");
  const location = {
    href: parsed.href,
    pathname: parsed.pathname,
    search: parsed.search,
    hash: parsed.hash,
  };

  vi.stubGlobal("window", {
    location,
    history: {
      replaceState(_state: unknown, _title: string, newUrl: string) {
        const next = new URL(newUrl, "http://localhost");
        location.href = next.href;
        location.pathname = next.pathname;
        location.search = next.search;
        location.hash = next.hash;
      },
    },
  });
}

describe("establishPasswordRecoverySession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installWindowUrl("/en/update-password");
    setSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } }, error: null });
    exchangeCodeForSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
      error: null,
    });
    getUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sets session from recovery hash tokens and strips the hash", async () => {
    window.history.replaceState(
      {},
      "",
      "/en/update-password#access_token=at&refresh_token=rt&type=recovery"
    );

    const ok = await establishPasswordRecoverySession(createMockSupabase() as never);

    expect(ok).toBe(true);
    expect(setSession).toHaveBeenCalledWith({
      access_token: "at",
      refresh_token: "rt",
    });
    expect(window.location.pathname).toBe("/en/update-password");
    expect(window.location.hash).toBe("");
    expect(getUser).not.toHaveBeenCalled();
  });

  it("exchanges PKCE code from query params and removes code from the URL", async () => {
    window.history.replaceState({}, "", "/en/update-password?code=pkce-code");

    const ok = await establishPasswordRecoverySession(createMockSupabase() as never);

    expect(ok).toBe(true);
    expect(exchangeCodeForSession).toHaveBeenCalledWith("pkce-code");
    expect(window.location.search).toBe("");
    expect(setSession).not.toHaveBeenCalled();
  });

  it("falls back to getUser when there are no recovery params", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });

    const ok = await establishPasswordRecoverySession(createMockSupabase() as never);

    expect(ok).toBe(true);
    expect(setSession).not.toHaveBeenCalled();
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(getUser).toHaveBeenCalled();
  });

  it("returns false when setSession fails", async () => {
    window.history.replaceState(
      {},
      "",
      "/en/update-password#access_token=bad&refresh_token=bad&type=recovery"
    );
    setSession.mockResolvedValue({ data: { session: null }, error: { message: "invalid" } });

    const ok = await establishPasswordRecoverySession(createMockSupabase() as never);

    expect(ok).toBe(false);
  });
});
