import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { resolveCompareDateRange } from "@/lib/services/duet/compare-service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    listen: {
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/listening/listening-service", () => ({
  getListenDateRange: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getListenDateRange } from "@/lib/services/listening/listening-service";

const VIEWER_ID = "11111111-1111-4111-8111-111111111111";
const FRIEND_ID = "22222222-2222-4222-8222-222222222222";

describe("resolveCompareDateRange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.listen.count).mockResolvedValue(0);
  });

  it("uses union of both users' full history when no dates are provided", async () => {
    vi.mocked(getListenDateRange).mockImplementation(async (userId) => {
      if (userId === VIEWER_ID) {
        return {
          minDate: new Date("2020-01-01T00:00:00.000Z"),
          maxDate: new Date("2026-06-01T00:00:00.000Z"),
        };
      }
      if (userId === FRIEND_ID) {
        return {
          minDate: new Date("2025-05-04T00:00:00.000Z"),
          maxDate: new Date("2026-05-25T00:00:00.000Z"),
        };
      }
      return null;
    });

    const request = new NextRequest(
      `http://localhost/api/duet/compare/timeline?friendUserId=${FRIEND_ID}`
    );

    const result = await resolveCompareDateRange(request, VIEWER_ID, FRIEND_ID);

    expect(result.rangeClamped).toBe(false);
    expect(result.startDate.toISOString()).toBe("2020-01-01T00:00:00.000Z");
    expect(result.endDate.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("uses the available user's range when only one has listens", async () => {
    vi.mocked(getListenDateRange).mockImplementation(async (userId) => {
      if (userId === VIEWER_ID) {
        return {
          minDate: new Date("2024-03-01T00:00:00.000Z"),
          maxDate: new Date("2026-01-15T00:00:00.000Z"),
        };
      }
      return null;
    });

    const request = new NextRequest(
      `http://localhost/api/duet/compare/timeline?friendUserId=${FRIEND_ID}`
    );

    const result = await resolveCompareDateRange(request, VIEWER_ID, FRIEND_ID);

    expect(result.startDate.toISOString()).toBe("2024-03-01T00:00:00.000Z");
    expect(result.endDate.toISOString()).toBe("2026-01-15T00:00:00.000Z");
  });

  it("respects explicit startDate and endDate from the request", async () => {
    const request = new NextRequest(
      `http://localhost/api/duet/compare/timeline?friendUserId=${FRIEND_ID}&startDate=2026-01-01&endDate=2026-02-01`
    );

    const result = await resolveCompareDateRange(request, VIEWER_ID, FRIEND_ID);

    expect(getListenDateRange).not.toHaveBeenCalled();
    expect(result.startDate.toISOString()).toContain("2026-01-01");
    expect(result.endDate.toISOString()).toContain("2026-02-01");
  });

  it("clamps to the last 2 years for daily granularity when listen volume is high", async () => {
    vi.mocked(getListenDateRange).mockImplementation(async (userId) => {
      if (userId === VIEWER_ID) {
        return {
          minDate: new Date("2021-12-02T00:00:00.000Z"),
          maxDate: new Date("2026-04-12T00:00:00.000Z"),
        };
      }
      if (userId === FRIEND_ID) {
        return {
          minDate: new Date("2018-07-25T00:00:00.000Z"),
          maxDate: new Date("2026-05-31T00:00:00.000Z"),
        };
      }
      return null;
    });
    vi.mocked(prisma.listen.count).mockResolvedValue(60_000);

    const request = new NextRequest(
      `http://localhost/api/duet/compare/timeline?friendUserId=${FRIEND_ID}&period=day`
    );

    const result = await resolveCompareDateRange(request, VIEWER_ID, FRIEND_ID, {
      period: "day",
    });

    expect(result.rangeClamped).toBe(true);
    expect(result.endDate.toISOString()).toBe("2026-05-31T00:00:00.000Z");
    expect(result.startDate.getTime()).toBeGreaterThan(new Date("2024-05-01").getTime());
    expect(result.startDate.getTime()).toBeLessThan(new Date("2024-06-15").getTime());
  });

  it("keeps the full history for monthly granularity even when listen volume is high", async () => {
    vi.mocked(getListenDateRange).mockImplementation(async (userId) => {
      if (userId === VIEWER_ID) {
        return {
          minDate: new Date("2021-12-02T00:00:00.000Z"),
          maxDate: new Date("2026-04-12T00:00:00.000Z"),
        };
      }
      if (userId === FRIEND_ID) {
        return {
          minDate: new Date("2018-07-25T00:00:00.000Z"),
          maxDate: new Date("2026-05-31T00:00:00.000Z"),
        };
      }
      return null;
    });
    vi.mocked(prisma.listen.count).mockResolvedValue(60_000);

    const request = new NextRequest(
      `http://localhost/api/duet/compare/timeline?friendUserId=${FRIEND_ID}&period=month`
    );

    const result = await resolveCompareDateRange(request, VIEWER_ID, FRIEND_ID, {
      period: "month",
    });

    expect(result.rangeClamped).toBe(false);
    expect(result.startDate.toISOString()).toBe("2018-07-25T00:00:00.000Z");
    expect(result.endDate.toISOString()).toBe("2026-05-31T00:00:00.000Z");
    expect(prisma.listen.count).not.toHaveBeenCalled();
  });
});
