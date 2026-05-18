import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/user/dashboard-subject/route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/resolve-authorized-data-user-id", () => ({
  resolveAuthorizedDataUserId: vi.fn(),
}));

vi.mock("@/lib/security/analytics-rate-limit", () => ({
  assertAnalyticsRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 59 }),
}));

import { prisma } from "@/lib/prisma";
import { resolveAuthorizedDataUserId } from "@/lib/auth/resolve-authorized-data-user-id";
import { assertAnalyticsRateLimit } from "@/lib/security/analytics-rate-limit";

describe("GET /api/user/dashboard-subject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveAuthorizedDataUserId).mockResolvedValue({
      ok: true,
      userId: "resolved-user",
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      name: "Demo Public",
    } as Awaited<ReturnType<typeof prisma.user.findUnique>>);
  });

  it("returns the resolved subject display name", async () => {
    const request = new NextRequest("http://localhost/api/user/dashboard-subject");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ user: { name: "Demo Public" } });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "resolved-user" },
      select: { name: true },
    });
    expect(assertAnalyticsRateLimit).toHaveBeenCalled();
  });

  it("returns 401 when resolve fails unauthorized", async () => {
    vi.mocked(resolveAuthorizedDataUserId).mockResolvedValue({
      ok: false,
      status: 401,
    });

    const request = new NextRequest("http://localhost/api/user/dashboard-subject");
    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
