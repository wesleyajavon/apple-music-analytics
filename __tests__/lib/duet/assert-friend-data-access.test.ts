import { describe, it, expect, beforeEach, vi } from "vitest";
import type { DuetShareScope } from "@prisma/client";

vi.mock("@/lib/services/duet/friendship-service", () => ({
  findFriendshipBetween: vi.fn(),
}));

import { findFriendshipBetween } from "@/lib/services/duet/friendship-service";
import { assertFriendDataAccess } from "@/lib/services/duet/assert-friend-data-access";

describe("assertFriendDataAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows self access with full scope", async () => {
    const result = await assertFriendDataAccess({
      viewerId: "user-a",
      targetUserId: "user-a",
    });
    expect(result).toEqual({ ok: true, shareScope: "full" });
    expect(findFriendshipBetween).not.toHaveBeenCalled();
  });

  it("returns 404 when no accepted friendship", async () => {
    vi.mocked(findFriendshipBetween).mockResolvedValue(null);

    const result = await assertFriendDataAccess({
      viewerId: "user-a",
      targetUserId: "user-b",
    });

    expect(result).toEqual({ ok: false, status: 404 });
  });

  it("returns 403 when sharing is off (none)", async () => {
    vi.mocked(findFriendshipBetween).mockResolvedValue({
      id: "f1",
      requesterId: "user-a",
      addresseeId: "user-b",
      status: "accepted",
      shareScope: "none" as DuetShareScope,
      createdAt: new Date(),
      respondedAt: new Date(),
    });

    const result = await assertFriendDataAccess({
      viewerId: "user-a",
      targetUserId: "user-b",
    });

    expect(result).toEqual({ ok: false, status: 403 });
  });

  it("allows access for full sharing", async () => {
    vi.mocked(findFriendshipBetween).mockResolvedValue({
      id: "f1",
      requesterId: "user-a",
      addresseeId: "user-b",
      status: "accepted",
      shareScope: "full" as DuetShareScope,
      createdAt: new Date(),
      respondedAt: new Date(),
    });

    const result = await assertFriendDataAccess({
      viewerId: "user-a",
      targetUserId: "user-b",
    });

    expect(result).toEqual({ ok: true, shareScope: "full" });
  });

  it("allows access for legacy aggregates (treated as on)", async () => {
    vi.mocked(findFriendshipBetween).mockResolvedValue({
      id: "f1",
      requesterId: "user-a",
      addresseeId: "user-b",
      status: "accepted",
      shareScope: "aggregates" as DuetShareScope,
      createdAt: new Date(),
      respondedAt: new Date(),
    });

    const result = await assertFriendDataAccess({
      viewerId: "user-a",
      targetUserId: "user-b",
    });

    expect(result).toEqual({ ok: true, shareScope: "aggregates" });
  });

  it("returns 404 when friendship is pending", async () => {
    vi.mocked(findFriendshipBetween).mockResolvedValue({
      id: "f1",
      requesterId: "user-a",
      addresseeId: "user-b",
      status: "pending",
      shareScope: "none" as DuetShareScope,
      createdAt: new Date(),
      respondedAt: null,
    });

    const result = await assertFriendDataAccess({
      viewerId: "user-a",
      targetUserId: "user-b",
    });

    expect(result).toEqual({ ok: false, status: 404 });
  });

  it("returns 404 when user is blocked", async () => {
    vi.mocked(findFriendshipBetween).mockResolvedValue({
      id: "f1",
      requesterId: "user-a",
      addresseeId: "user-b",
      status: "blocked",
      shareScope: "none" as DuetShareScope,
      createdAt: new Date(),
      respondedAt: new Date(),
    });

    const result = await assertFriendDataAccess({
      viewerId: "user-a",
      targetUserId: "user-b",
    });

    expect(result).toEqual({ ok: false, status: 404 });
  });
});
