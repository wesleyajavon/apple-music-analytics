import { describe, it, expect, beforeEach, vi } from "vitest";
import type { DuetShareScope, FriendshipStatus } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: vi.fn() },
    friendship: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    duetShareSettings: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/duet/duet-share-settings-service", () => ({
  getOrCreateDuetShareSettings: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getOrCreateDuetShareSettings } from "@/lib/services/duet/duet-share-settings-service";
import {
  inviteFriendByEmail,
  acceptFriendship,
  declineFriendship,
  revokeFriendship,
  blockUser,
  listFriendships,
  findFriendshipBetween,
} from "@/lib/services/duet/friendship-service";
import { DUET_ERROR_CODES, DuetServiceError } from "@/lib/services/duet/duet-errors";

const userA = "user-a";
const userB = "user-b";
const friendshipId = "friendship-1";

function mockUser(id: string, email: string) {
  const now = new Date("2026-06-01T12:00:00Z");
  return {
    id,
    email,
    name: id,
    avatarUrl: null,
    onboardingCompletedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

function mockFriendship(overrides: {
  id?: string;
  requesterId?: string;
  addresseeId?: string;
  status?: FriendshipStatus;
  shareScope?: DuetShareScope;
}) {
  const requesterId = overrides.requesterId ?? userA;
  const addresseeId = overrides.addresseeId ?? userB;
  return {
    id: overrides.id ?? friendshipId,
    requesterId,
    addresseeId,
    status: overrides.status ?? "pending",
    shareScope: overrides.shareScope ?? "none",
    createdAt: new Date("2026-06-01T12:00:00Z"),
    respondedAt: null,
    requester: mockUser(requesterId, `${requesterId}@test.com`),
    addressee: mockUser(addresseeId, `${addresseeId}@test.com`),
  };
}

describe("friendship-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOrCreateDuetShareSettings).mockResolvedValue({
      userId: userB,
      allowFriendRequests: true,
      defaultShareScope: "aggregates",
    });
  });

  describe("inviteFriendByEmail", () => {
    it("creates a pending friendship on happy path", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser(userB, "b@test.com"));
      vi.mocked(prisma.friendship.count)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      vi.mocked(prisma.friendship.findFirst).mockResolvedValue(null);
      const created = mockFriendship({});
      vi.mocked(prisma.friendship.create).mockResolvedValue(created);

      const result = await inviteFriendByEmail(userA, "User-B@test.com");

      expect(result.status).toBe("pending");
      expect(result.direction).toBe("outgoing");
      expect(prisma.friendship.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            requesterId: userA,
            addresseeId: userB,
            status: "pending",
            shareScope: "none",
          },
        })
      );
    });

    it("rejects self invite", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser(userA, "a@test.com"));

      await expect(inviteFriendByEmail(userA, "a@test.com")).rejects.toMatchObject({
        code: DUET_ERROR_CODES.SELF_INVITE,
      });
    });

    it("rejects duplicate pending invite", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser(userB, "b@test.com"));
      vi.mocked(prisma.friendship.count)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      vi.mocked(prisma.friendship.findFirst).mockResolvedValue(
        mockFriendship({ status: "pending", requesterId: userA, addresseeId: userB })
      );

      await expect(inviteFriendByEmail(userA, "b@test.com")).rejects.toMatchObject({
        code: DUET_ERROR_CODES.DUPLICATE_INVITE,
      });
    });

    it("rejects when inverse pending exists", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser(userB, "b@test.com"));
      vi.mocked(prisma.friendship.count)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      vi.mocked(prisma.friendship.findFirst).mockResolvedValue(
        mockFriendship({ status: "pending", requesterId: userB, addresseeId: userA })
      );

      await expect(inviteFriendByEmail(userA, "b@test.com")).rejects.toMatchObject({
        code: DUET_ERROR_CODES.INVERSE_PENDING,
      });
    });
  });

  describe("acceptFriendship", () => {
    it("accepts with share scope", async () => {
      const pending = mockFriendship({ status: "pending" });
      vi.mocked(prisma.friendship.findUnique).mockResolvedValue(pending);
      vi.mocked(prisma.friendship.count).mockResolvedValue(0);
      const accepted = mockFriendship({ status: "accepted", shareScope: "aggregates" });
      vi.mocked(prisma.friendship.update).mockResolvedValue(accepted);

      const result = await acceptFriendship(friendshipId, userB, "aggregates");

      expect(result.status).toBe("accepted");
      expect(result.shareScope).toBe("aggregates");
    });

    it("rejects invalid share scope", async () => {
      await expect(acceptFriendship(friendshipId, userB, "none")).rejects.toBeInstanceOf(
        DuetServiceError
      );
    });
  });

  describe("declineFriendship", () => {
    it("declines pending request for addressee", async () => {
      const pending = mockFriendship({ status: "pending" });
      vi.mocked(prisma.friendship.findUnique).mockResolvedValue(pending);
      const declined = mockFriendship({ status: "declined" });
      vi.mocked(prisma.friendship.update).mockResolvedValue(declined);

      const result = await declineFriendship(friendshipId, userB);

      expect(result.status).toBe("declined");
    });
  });

  describe("revokeFriendship", () => {
    it("deletes accepted friendship for either party", async () => {
      vi.mocked(prisma.friendship.findUnique).mockResolvedValue(
        mockFriendship({ status: "accepted" })
      );
      vi.mocked(prisma.friendship.delete).mockResolvedValue(mockFriendship({ status: "accepted" }));

      await revokeFriendship(friendshipId, userA);

      expect(prisma.friendship.delete).toHaveBeenCalledWith({ where: { id: friendshipId } });
    });

    it("forbids revoke when not a participant", async () => {
      vi.mocked(prisma.friendship.findUnique).mockResolvedValue(
        mockFriendship({ status: "accepted", requesterId: userA, addresseeId: userB })
      );

      await expect(revokeFriendship(friendshipId, "stranger")).rejects.toMatchObject({
        code: DUET_ERROR_CODES.FORBIDDEN,
      });
    });
  });

  describe("blockUser", () => {
    it("blocks an existing friendship", async () => {
      vi.mocked(prisma.friendship.findFirst).mockResolvedValue(
        mockFriendship({ status: "accepted" })
      );
      const blocked = mockFriendship({ status: "blocked" });
      vi.mocked(prisma.friendship.update).mockResolvedValue(blocked);

      const result = await blockUser(userA, userB);

      expect(result.status).toBe("blocked");
      expect(prisma.friendship.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "blocked", shareScope: "none" }),
        })
      );
    });

    it("creates blocked row when no relation exists", async () => {
      vi.mocked(prisma.friendship.findFirst).mockResolvedValue(null);
      const blocked = mockFriendship({ status: "blocked" });
      vi.mocked(prisma.friendship.create).mockResolvedValue(blocked);

      await blockUser(userA, userB);

      expect(prisma.friendship.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            requesterId: userA,
            addresseeId: userB,
            status: "blocked",
          }),
        })
      );
    });
  });

  describe("listFriendships", () => {
    it("partitions friends and pending lists", async () => {
      vi.mocked(prisma.friendship.findMany).mockResolvedValue([
        mockFriendship({ id: "f1", status: "accepted" }),
        mockFriendship({ id: "f2", status: "pending", requesterId: userB, addresseeId: userA }),
        mockFriendship({ id: "f3", status: "pending", requesterId: userA, addresseeId: userB }),
      ]);

      const result = await listFriendships(userA);

      expect(result.friends).toHaveLength(1);
      expect(result.pendingIncoming).toHaveLength(1);
      expect(result.pendingOutgoing).toHaveLength(1);
    });
  });

  describe("findFriendshipBetween", () => {
    it("queries both directions", async () => {
      vi.mocked(prisma.friendship.findFirst).mockResolvedValue(null);

      await findFriendshipBetween(userA, userB);

      expect(prisma.friendship.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { requesterId: userA, addresseeId: userB },
            { requesterId: userB, addresseeId: userA },
          ],
        },
      });
    });
  });
});
