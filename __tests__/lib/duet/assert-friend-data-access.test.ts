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
      requiredScope: "full",
    });
    expect(result).toEqual({ ok: true, shareScope: "full" });
    expect(findFriendshipBetween).not.toHaveBeenCalled();
  });

  it("returns 404 when no accepted friendship", async () => {
    vi.mocked(findFriendshipBetween).mockResolvedValue(null);

    const result = await assertFriendDataAccess({
      viewerId: "user-a",
      targetUserId: "user-b",
      requiredScope: "aggregates",
    });

    expect(result).toEqual({ ok: false, status: 404 });
  });

  it("returns 403 when share scope is insufficient", async () => {
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
      requiredScope: "full",
    });

    expect(result).toEqual({ ok: false, status: 403 });
  });

  it("allows access when scope meets requirement", async () => {
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
      requiredScope: "aggregates",
    });

    expect(result).toEqual({ ok: true, shareScope: "full" });
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
      requiredScope: "aggregates",
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
      requiredScope: "aggregates",
    });

    expect(result).toEqual({ ok: false, status: 404 });
  });
});
