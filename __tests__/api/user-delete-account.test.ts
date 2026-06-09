import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { DELETE } from "@/app/api/user/delete-account/route";

vi.mock("@/lib/auth/require-recent-auth", () => ({
  requireRecentAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  assertRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 2,
    resetAt: new Date().toISOString(),
  }),
}));

vi.mock("@/lib/services/user/delete-user-account", () => ({
  deleteUserAccount: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { requireRecentAuthenticatedUser } from "@/lib/auth/require-recent-auth";
import { deleteUserAccount } from "@/lib/services/user/delete-user-account";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

describe("DELETE /api/user/delete-account", () => {
  const signOut = vi.fn().mockResolvedValue({ error: null });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireRecentAuthenticatedUser).mockResolvedValue({
      ok: true,
      userId: "user-del-1",
      authenticatedAt: new Date(),
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      name: "Jane Doe",
      email: "jane@example.com",
    } as Awaited<ReturnType<typeof prisma.user.findUnique>>);
    vi.mocked(deleteUserAccount).mockResolvedValue({
      prismaUserDeleted: true,
      supabaseAuthDeleted: true,
      avatarStorageCleared: true,
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { signOut },
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireRecentAuthenticatedUser).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const response = await DELETE(
      new NextRequest("http://localhost/api/user/delete-account", {
        method: "DELETE",
        body: JSON.stringify({ confirm: true, phrase: "jane-doe" }),
      })
    );
    expect(response.status).toBe(401);
    expect(deleteUserAccount).not.toHaveBeenCalled();
  });

  it("returns 400 when phrase does not match", async () => {
    const response = await DELETE(
      new NextRequest("http://localhost/api/user/delete-account", {
        method: "DELETE",
        body: JSON.stringify({ confirm: true, phrase: "wrong" }),
      })
    );
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe("PHRASE_MISMATCH");
    expect(deleteUserAccount).not.toHaveBeenCalled();
  });

  it("deletes account and signs out when phrase matches", async () => {
    const response = await DELETE(
      new NextRequest("http://localhost/api/user/delete-account", {
        method: "DELETE",
        body: JSON.stringify({ confirm: true, phrase: "Jane-Doe" }),
      })
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(deleteUserAccount).toHaveBeenCalledWith("user-del-1");
    expect(signOut).toHaveBeenCalled();
  });
});
