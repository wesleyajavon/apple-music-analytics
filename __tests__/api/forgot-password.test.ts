import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/forgot-password/route";

vi.mock("@/lib/security/rate-limit", () => ({
  assertRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 9,
    resetAt: new Date().toISOString(),
  }),
}));

vi.mock("@/lib/supabase/config", () => ({
  getSupabaseConfig: vi.fn(() => ({
    supabaseUrl: "https://test.supabase.co",
    supabasePublishableKey: "publishable-key",
  })),
}));

const findAuthUserByEmail = vi.fn();
const getSupabaseAdminClient = vi.fn();
const resetPasswordForEmail = vi.fn();

vi.mock("@/lib/auth/find-auth-user-by-email", () => ({
  findAuthUserByEmail,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: { resetPasswordForEmail },
  })),
}));

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPasswordForEmail.mockResolvedValue({ error: null });
    getSupabaseAdminClient.mockReturnValue({ auth: { admin: {} } });
  });

  it("returns oauth_only for Google-only accounts", async () => {
    findAuthUserByEmail.mockResolvedValue({
      id: "user-1",
      email: "oauth@example.com",
      identities: [{ provider: "google" }],
    });

    const request = new NextRequest("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: "oauth@example.com", locale: "en" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      outcome: "oauth_only",
      providers: ["google"],
    });
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("sends reset email for email/password accounts", async () => {
    findAuthUserByEmail.mockResolvedValue({
      id: "user-2",
      email: "local@example.com",
      identities: [{ provider: "email" }],
    });

    const request = new NextRequest("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: "local@example.com", locale: "fr" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ outcome: "email_sent" });
    expect(resetPasswordForEmail).toHaveBeenCalledWith("local@example.com", {
      redirectTo:
        "http://localhost/auth/callback?next=%2Ffr%2Fupdate-password",
    });
  });

  it("returns email_sent when admin client is unavailable", async () => {
    getSupabaseAdminClient.mockReturnValue(null);

    const request = new NextRequest("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: "any@example.com" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ outcome: "email_sent" });
    expect(findAuthUserByEmail).not.toHaveBeenCalled();
    expect(resetPasswordForEmail).toHaveBeenCalled();
  });
});
