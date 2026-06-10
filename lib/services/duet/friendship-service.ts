import type { DuetShareScope, Friendship, FriendshipStatus, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DUET_MAX_FRIENDS, DUET_MAX_INVITES_PER_DAY } from "@/lib/constants/duet-limits";
import { DUET_ERROR_CODES, DuetServiceError } from "@/lib/services/duet/duet-errors";
import { countDuetInvitesSentToday } from "@/lib/services/duet/duet-invite-quota";
import { getOrCreateDuetShareSettings } from "@/lib/services/duet/duet-share-settings-service";

const userSummarySelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
} as const;

export type DuetUserSummary = Pick<User, keyof typeof userSummarySelect>;

export type FriendshipDto = {
  id: string;
  status: FriendshipStatus;
  shareScope: DuetShareScope;
  createdAt: Date;
  respondedAt: Date | null;
  requester: DuetUserSummary;
  addressee: DuetUserSummary;
  direction: "outgoing" | "incoming" | "friend";
};

export type FriendshipsListResult = {
  friends: FriendshipDto[];
  pendingIncoming: FriendshipDto[];
  pendingOutgoing: FriendshipDto[];
};

const friendshipInclude = {
  requester: { select: userSummarySelect },
  addressee: { select: userSummarySelect },
} as const;

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function toFriendshipDto(
  row: Friendship & { requester: DuetUserSummary; addressee: DuetUserSummary },
  viewerId: string
): FriendshipDto {
  let direction: FriendshipDto["direction"] = "friend";
  if (row.status === "pending") {
    direction = row.requesterId === viewerId ? "outgoing" : "incoming";
  }
  return {
    id: row.id,
    status: row.status,
    shareScope: row.shareScope,
    createdAt: row.createdAt,
    respondedAt: row.respondedAt,
    requester: row.requester,
    addressee: row.addressee,
    direction,
  };
}

export async function findFriendshipBetween(
  userA: string,
  userB: string
): Promise<Friendship | null> {
  return prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userA, addresseeId: userB },
        { requesterId: userB, addresseeId: userA },
      ],
    },
  });
}

async function countAcceptedFriendships(userId: string): Promise<number> {
  return prisma.friendship.count({
    where: {
      status: "accepted",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
  });
}

function assertAcceptableShareScope(shareScope: DuetShareScope): void {
  if (shareScope !== "aggregates" && shareScope !== "full") {
    throw new DuetServiceError(DUET_ERROR_CODES.INVALID_SHARE_SCOPE);
  }
}

export async function inviteFriendByEmail(
  requesterId: string,
  rawEmail: string
): Promise<FriendshipDto> {
  const email = normalizeEmail(rawEmail);
  if (!email) {
    throw new DuetServiceError(DUET_ERROR_CODES.INVALID_EMAIL);
  }

  const addressee = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (!addressee) {
    throw new DuetServiceError(DUET_ERROR_CODES.ADDRESSEE_NOT_FOUND);
  }

  const addresseeId = addressee.id;
  if (addresseeId === requesterId) {
    throw new DuetServiceError(DUET_ERROR_CODES.SELF_INVITE);
  }

  const addresseeSettings = await getOrCreateDuetShareSettings(addresseeId);
  if (!addresseeSettings.allowFriendRequests) {
    throw new DuetServiceError(DUET_ERROR_CODES.FRIEND_REQUESTS_DISABLED);
  }

  const acceptedCount = await countAcceptedFriendships(requesterId);
  if (acceptedCount >= DUET_MAX_FRIENDS) {
    throw new DuetServiceError(DUET_ERROR_CODES.FRIEND_LIMIT_REACHED);
  }

  const invitesToday = await countDuetInvitesSentToday(requesterId);
  if (invitesToday >= DUET_MAX_INVITES_PER_DAY) {
    throw new DuetServiceError(DUET_ERROR_CODES.INVITE_QUOTA_EXCEEDED);
  }

  const existing = await findFriendshipBetween(requesterId, addresseeId);
  if (existing) {
    if (existing.status === "accepted") {
      throw new DuetServiceError(DUET_ERROR_CODES.ALREADY_FRIENDS);
    }
    if (existing.status === "blocked") {
      throw new DuetServiceError(DUET_ERROR_CODES.BLOCKED);
    }
    if (existing.status === "pending") {
      if (existing.requesterId === requesterId) {
        throw new DuetServiceError(DUET_ERROR_CODES.DUPLICATE_INVITE);
      }
      throw new DuetServiceError(DUET_ERROR_CODES.INVERSE_PENDING);
    }
    if (existing.status === "declined") {
      if (existing.requesterId === requesterId) {
        const updated = await prisma.friendship.update({
          where: { id: existing.id },
          data: {
            status: "pending",
            shareScope: "none",
            respondedAt: null,
            createdAt: new Date(),
          },
          include: friendshipInclude,
        });
        return toFriendshipDto(updated, requesterId);
      }
    }
  }

  const created = await prisma.friendship.create({
    data: {
      requesterId,
      addresseeId,
      status: "pending",
      shareScope: "none",
    },
    include: friendshipInclude,
  });
  return toFriendshipDto(created, requesterId);
}

export async function acceptFriendship(
  friendshipId: string,
  addresseeId: string,
  shareScope: DuetShareScope
): Promise<FriendshipDto> {
  assertAcceptableShareScope(shareScope);

  const row = await prisma.friendship.findUnique({
    where: { id: friendshipId },
    include: friendshipInclude,
  });
  if (!row || row.addresseeId !== addresseeId) {
    throw new DuetServiceError(DUET_ERROR_CODES.FRIENDSHIP_NOT_FOUND);
  }
  if (row.status !== "pending") {
    throw new DuetServiceError(DUET_ERROR_CODES.FORBIDDEN);
  }

  const acceptedCount = await countAcceptedFriendships(addresseeId);
  if (acceptedCount >= DUET_MAX_FRIENDS) {
    throw new DuetServiceError(DUET_ERROR_CODES.FRIEND_LIMIT_REACHED);
  }

  const updated = await prisma.friendship.update({
    where: { id: friendshipId },
    data: {
      status: "accepted",
      shareScope,
      respondedAt: new Date(),
    },
    include: friendshipInclude,
  });
  return toFriendshipDto(updated, addresseeId);
}

export async function declineFriendship(
  friendshipId: string,
  addresseeId: string
): Promise<FriendshipDto> {
  const row = await prisma.friendship.findUnique({
    where: { id: friendshipId },
    include: friendshipInclude,
  });
  if (!row || row.addresseeId !== addresseeId) {
    throw new DuetServiceError(DUET_ERROR_CODES.FRIENDSHIP_NOT_FOUND);
  }
  if (row.status !== "pending") {
    throw new DuetServiceError(DUET_ERROR_CODES.FORBIDDEN);
  }

  const updated = await prisma.friendship.update({
    where: { id: friendshipId },
    data: {
      status: "declined",
      shareScope: "none",
      respondedAt: new Date(),
    },
    include: friendshipInclude,
  });
  return toFriendshipDto(updated, addresseeId);
}

export async function updateFriendshipShareScope(
  friendshipId: string,
  userId: string,
  shareScope: DuetShareScope
): Promise<FriendshipDto> {
  assertAcceptableShareScope(shareScope);

  const row = await prisma.friendship.findUnique({
    where: { id: friendshipId },
    include: friendshipInclude,
  });
  if (!row) {
    throw new DuetServiceError(DUET_ERROR_CODES.FRIENDSHIP_NOT_FOUND);
  }
  if (row.requesterId !== userId && row.addresseeId !== userId) {
    throw new DuetServiceError(DUET_ERROR_CODES.FORBIDDEN);
  }
  if (row.status !== "accepted") {
    throw new DuetServiceError(DUET_ERROR_CODES.FORBIDDEN);
  }
  if (row.shareScope === shareScope) {
    return toFriendshipDto(row, userId);
  }

  const updated = await prisma.friendship.update({
    where: { id: friendshipId },
    data: { shareScope },
    include: friendshipInclude,
  });
  return toFriendshipDto(updated, userId);
}

export async function revokeFriendship(
  friendshipId: string,
  userId: string
): Promise<void> {
  const row = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!row) {
    throw new DuetServiceError(DUET_ERROR_CODES.FRIENDSHIP_NOT_FOUND);
  }
  if (row.requesterId !== userId && row.addresseeId !== userId) {
    throw new DuetServiceError(DUET_ERROR_CODES.FORBIDDEN);
  }
  if (row.status !== "accepted") {
    throw new DuetServiceError(DUET_ERROR_CODES.FORBIDDEN);
  }

  await prisma.friendship.delete({ where: { id: friendshipId } });
}

export async function blockUser(
  blockerId: string,
  targetUserId: string
): Promise<FriendshipDto> {
  if (blockerId === targetUserId) {
    throw new DuetServiceError(DUET_ERROR_CODES.SELF_ACTION);
  }

  const existing = await findFriendshipBetween(blockerId, targetUserId);
  if (existing) {
    const updated = await prisma.friendship.update({
      where: { id: existing.id },
      data: {
        status: "blocked",
        shareScope: "none",
        respondedAt: new Date(),
      },
      include: friendshipInclude,
    });
    return toFriendshipDto(updated, blockerId);
  }

  const created = await prisma.friendship.create({
    data: {
      requesterId: blockerId,
      addresseeId: targetUserId,
      status: "blocked",
      shareScope: "none",
      respondedAt: new Date(),
    },
    include: friendshipInclude,
  });
  return toFriendshipDto(created, blockerId);
}

export async function listFriendships(userId: string): Promise<FriendshipsListResult> {
  const rows = await prisma.friendship.findMany({
    where: {
      OR: [
        { requesterId: userId, status: { in: ["accepted", "pending"] } },
        { addresseeId: userId, status: { in: ["accepted", "pending"] } },
      ],
    },
    include: friendshipInclude,
    orderBy: { createdAt: "desc" },
  });

  const friends: FriendshipDto[] = [];
  const pendingIncoming: FriendshipDto[] = [];
  const pendingOutgoing: FriendshipDto[] = [];

  for (const row of rows) {
    const dto = toFriendshipDto(row, userId);
    if (row.status === "accepted") {
      friends.push(dto);
    } else if (row.requesterId === userId) {
      pendingOutgoing.push(dto);
    } else {
      pendingIncoming.push(dto);
    }
  }

  return { friends, pendingIncoming, pendingOutgoing };
}
