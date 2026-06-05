import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH } from "@/app/api/user/me/route";
import { POST, DELETE } from "@/app/api/user/avatar/route";

const getCurrentUserIdMock = vi.hoisted(() => vi.fn());
const authUpdateUserMock = vi.hoisted(() => vi.fn());
const storageUploadMock = vi.hoisted(() => vi.fn());
const storageRemoveMock = vi.hoisted(() => vi.fn());
const storageGetPublicUrlMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/get-current-user-id", () => ({
  getCurrentUserId: getCurrentUserIdMock,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  assertRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 19,
    resetAt: new Date().toISOString(),
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      updateUser: authUpdateUserMock,
    },
    storage: {
      from: vi.fn(() => ({
        upload: storageUploadMock,
        remove: storageRemoveMock,
        getPublicUrl: storageGetPublicUrlMock,
      })),
    },
  })),
}));

vi.mock("@/lib/utils/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

describe("/api/user/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserIdMock.mockResolvedValue("user-123");
    authUpdateUserMock.mockResolvedValue({ error: null });
  });

  it("returns the current user profile with avatarUrl", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      name: "Jane Listener",
      email: "jane@example.com",
      avatarUrl: "https://example.com/avatar.png",
    } as Awaited<ReturnType<typeof prisma.user.findUnique>>);

    const response = await GET(new NextRequest("http://localhost/api/user/me"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      user: {
        name: "Jane Listener",
        email: "jane@example.com",
        avatarUrl: "https://example.com/avatar.png",
      },
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-123" },
      select: { name: true, email: true, avatarUrl: true },
    });
  });

  it("updates the display name without dropping avatarUrl", async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({
      name: "Jane",
      email: "jane@example.com",
      avatarUrl: "https://example.com/avatar.png",
    } as Awaited<ReturnType<typeof prisma.user.update>>);

    const response = await PATCH(
      new NextRequest("http://localhost/api/user/me", {
        method: "PATCH",
        body: JSON.stringify({ name: " Jane " }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      user: {
        name: "Jane",
        email: "jane@example.com",
        avatarUrl: "https://example.com/avatar.png",
      },
    });
    expect(authUpdateUserMock).toHaveBeenCalledWith({
      data: { name: "Jane", full_name: "Jane" },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: { name: "Jane" },
      select: { name: true, email: true, avatarUrl: true },
    });
  });
});

describe("/api/user/avatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserIdMock.mockResolvedValue("user-123");
    authUpdateUserMock.mockResolvedValue({ error: null });
    storageUploadMock.mockResolvedValue({ error: null });
    storageRemoveMock.mockResolvedValue({ error: null });
    storageGetPublicUrlMock.mockReturnValue({
      data: {
        publicUrl:
          "https://project.supabase.co/storage/v1/object/public/avatars/user-123/avatar.png",
      },
    });
  });

  it("uploads a supported avatar and stores the public URL", async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({
      name: "Jane",
      email: "jane@example.com",
      avatarUrl:
        "https://project.supabase.co/storage/v1/object/public/avatars/user-123/avatar.png?v=1",
    } as Awaited<ReturnType<typeof prisma.user.update>>);

    const formData = new FormData();
    formData.set(
      "avatar",
      new File(["avatar"], "avatar.png", { type: "image/png" })
    );

    const response = await POST(
      new NextRequest("http://localhost/api/user/avatar", {
        method: "POST",
        body: formData,
      })
    );

    expect(response.status).toBe(200);
    expect(storageUploadMock).toHaveBeenCalledWith(
      "user-123/avatar.png",
      expect.any(File),
      { contentType: "image/png", upsert: true }
    );
    expect(storageRemoveMock).toHaveBeenCalledWith([
      "user-123/avatar.jpg",
      "user-123/avatar.webp",
      "user-123/avatar.gif",
    ]);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: {
        avatarUrl: expect.stringMatching(
          /^https:\/\/project\.supabase\.co\/storage\/v1\/object\/public\/avatars\/user-123\/avatar\.png\?v=\d+$/
        ),
      },
      select: { name: true, email: true, avatarUrl: true },
    });
    expect(authUpdateUserMock).toHaveBeenCalledWith({
      data: {
        avatar_url: expect.stringContaining("user-123/avatar.png?v="),
        picture: expect.stringContaining("user-123/avatar.png?v="),
      },
    });
  });

  it("rejects unsupported avatar file types", async () => {
    const formData = new FormData();
    formData.set(
      "avatar",
      new File(["not-image"], "avatar.txt", { type: "text/plain" })
    );

    const response = await POST(
      new NextRequest("http://localhost/api/user/avatar", {
        method: "POST",
        body: formData,
      })
    );

    expect(response.status).toBe(415);
    expect(storageUploadMock).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("deletes the current avatar and clears avatarUrl", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      avatarUrl:
        "https://project.supabase.co/storage/v1/object/public/avatars/user-123/avatar.png?v=1",
    } as Awaited<ReturnType<typeof prisma.user.findUnique>>);
    vi.mocked(prisma.user.update).mockResolvedValue({
      name: "Jane",
      email: "jane@example.com",
      avatarUrl: null,
    } as Awaited<ReturnType<typeof prisma.user.update>>);

    const response = await DELETE(
      new NextRequest("http://localhost/api/user/avatar", {
        method: "DELETE",
      })
    );

    expect(response.status).toBe(200);
    expect(storageRemoveMock).toHaveBeenCalledWith([
      "user-123/avatar.jpg",
      "user-123/avatar.png",
      "user-123/avatar.webp",
      "user-123/avatar.gif",
    ]);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: { avatarUrl: null },
      select: { name: true, email: true, avatarUrl: true },
    });
    expect(authUpdateUserMock).toHaveBeenCalledWith({
      data: { avatar_url: null, picture: null },
    });
  });
});
