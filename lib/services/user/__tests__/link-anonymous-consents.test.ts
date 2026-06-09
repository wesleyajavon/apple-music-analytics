import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userConsent: {
      updateMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { linkAnonymousConsentsToUser } from "@/lib/services/user/link-anonymous-consents";

describe("linkAnonymousConsentsToUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.userConsent.updateMany).mockResolvedValue({ count: 2 });
  });

  it("returns 0 for empty anonymousId", async () => {
    await expect(linkAnonymousConsentsToUser("user-1", "  ")).resolves.toBe(0);
    expect(prisma.userConsent.updateMany).not.toHaveBeenCalled();
  });

  it("updates rows with matching anonymousId and null userId", async () => {
    const count = await linkAnonymousConsentsToUser("user-1", "anon-abc");
    expect(count).toBe(2);
    expect(prisma.userConsent.updateMany).toHaveBeenCalledWith({
      where: { anonymousId: "anon-abc", userId: null },
      data: { userId: "user-1" },
    });
  });
});
