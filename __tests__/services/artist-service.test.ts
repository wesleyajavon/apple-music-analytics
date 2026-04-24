import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { countArtistsForRange } from "@/lib/services/artist/artist-service";

describe("countArtistsForRange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns count when query result has a bigint total", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ total: BigInt(42) }] as never);

    const total = await countArtistsForRange();

    expect(total).toBe(42);
    expect(prisma.$queryRaw).toHaveBeenCalledOnce();
  });

  it("returns 0 when query result is empty", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([] as never);

    const total = await countArtistsForRange();

    expect(total).toBe(0);
    expect(prisma.$queryRaw).toHaveBeenCalledOnce();
  });
});
