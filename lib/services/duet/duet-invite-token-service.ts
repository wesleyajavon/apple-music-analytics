import { createHmac, timingSafeEqual } from "crypto";
import type { DuetShareScope } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DUET_INVITE_LINK_TTL_MS } from "@/lib/constants/duet-invite";
import { DUET_MAX_FRIENDS, DUET_MAX_INVITES_PER_DAY } from "@/lib/constants/duet-limits";
import { DUET_ERROR_CODES, DuetServiceError } from "@/lib/services/duet/duet-errors";
import { countDuetInvitesSentToday } from "@/lib/services/duet/duet-invite-quota";
import {
  acceptFriendship,
  findFriendshipBetween,
  type DuetUserSummary,
  type FriendshipDto,
} from "@/lib/services/duet/friendship-service";
import { getOrCreateDuetShareSettings } from "@/lib/services/duet/duet-share-settings-service";

const userSummarySelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
} as const;

function getInviteSecret(): string {
  const secret = process.env.DUET_INVITE_TOKEN_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("DUET_INVITE_TOKEN_SECRET is required in production");
  }
  return secret ?? "dev-duet-invite-token-secret";
}

function signPayload(tokenId: string, expiresAtMs: number): string {
  const payload = `${tokenId}.${expiresAtMs}`;
  return createHmac("sha256", getInviteSecret()).update(payload).digest("hex");
}

function verifySignature(tokenId: string, expiresAtMs: number, signature: string): boolean {
  const expected = signPayload(tokenId, expiresAtMs);
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function buildInviteTokenString(tokenId: string, expiresAt: Date): string {
  const expiresAtMs = expiresAt.getTime();
  const signature = signPayload(tokenId, expiresAtMs);
  return `${tokenId}.${expiresAtMs}.${signature}`;
}

function parseInviteToken(raw: string): { tokenId: string; expiresAtMs: number; signature: string } | null {
  const parts = raw.trim().split(".");
  if (parts.length !== 3) return null;
  const [tokenId, expiresRaw, signature] = parts;
  if (!tokenId || !expiresRaw || !signature) return null;
  const expiresAtMs = Number(expiresRaw);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= 0) return null;
  if (!/^[a-f0-9]{64}$/i.test(signature)) return null;
  return { tokenId, expiresAtMs, signature };
}

async function loadVerifiedToken(raw: string) {
  const parsed = parseInviteToken(raw);
  if (!parsed) {
    throw new DuetServiceError(DUET_ERROR_CODES.INVITE_TOKEN_INVALID);
  }

  if (parsed.expiresAtMs <= Date.now()) {
    throw new DuetServiceError(DUET_ERROR_CODES.INVITE_TOKEN_EXPIRED);
  }

  if (!verifySignature(parsed.tokenId, parsed.expiresAtMs, parsed.signature)) {
    throw new DuetServiceError(DUET_ERROR_CODES.INVITE_TOKEN_INVALID);
  }

  const row = await prisma.duetInviteToken.findUnique({
    where: { id: parsed.tokenId },
    include: { requester: { select: userSummarySelect } },
  });

  if (!row) {
    throw new DuetServiceError(DUET_ERROR_CODES.INVITE_TOKEN_INVALID);
  }

  if (row.consumedAt) {
    throw new DuetServiceError(DUET_ERROR_CODES.INVITE_TOKEN_CONSUMED);
  }

  if (row.expiresAt.getTime() !== parsed.expiresAtMs) {
    throw new DuetServiceError(DUET_ERROR_CODES.INVITE_TOKEN_INVALID);
  }

  if (row.expiresAt.getTime() <= Date.now()) {
    throw new DuetServiceError(DUET_ERROR_CODES.INVITE_TOKEN_EXPIRED);
  }

  return row;
}

export async function createInviteLink(
  requesterId: string
): Promise<{ token: string; expiresAt: Date }> {
  const acceptedCount = await prisma.friendship.count({
    where: {
      status: "accepted",
      OR: [{ requesterId }, { addresseeId: requesterId }],
    },
  });
  if (acceptedCount >= DUET_MAX_FRIENDS) {
    throw new DuetServiceError(DUET_ERROR_CODES.FRIEND_LIMIT_REACHED);
  }

  const invitesToday = await countDuetInvitesSentToday(requesterId);
  if (invitesToday >= DUET_MAX_INVITES_PER_DAY) {
    throw new DuetServiceError(DUET_ERROR_CODES.INVITE_QUOTA_EXCEEDED);
  }

  const expiresAt = new Date(Date.now() + DUET_INVITE_LINK_TTL_MS);
  const row = await prisma.duetInviteToken.create({
    data: {
      requesterId,
      expiresAt,
    },
  });

  return {
    token: buildInviteTokenString(row.id, expiresAt),
    expiresAt,
  };
}

export async function previewInviteLink(rawToken: string): Promise<{
  requester: DuetUserSummary;
  expiresAt: Date;
}> {
  const row = await loadVerifiedToken(rawToken);
  return {
    requester: row.requester,
    expiresAt: row.expiresAt,
  };
}

async function assertRedeemableFriendship(
  requesterId: string,
  addresseeId: string
): Promise<void> {
  if (requesterId === addresseeId) {
    throw new DuetServiceError(DUET_ERROR_CODES.SELF_INVITE);
  }

  const addresseeSettings = await getOrCreateDuetShareSettings(addresseeId);
  if (!addresseeSettings.allowFriendRequests) {
    throw new DuetServiceError(DUET_ERROR_CODES.FRIEND_REQUESTS_DISABLED);
  }

  const acceptedCount = await prisma.friendship.count({
    where: {
      status: "accepted",
      OR: [{ requesterId: addresseeId }, { addresseeId: addresseeId }],
    },
  });
  if (acceptedCount >= DUET_MAX_FRIENDS) {
    throw new DuetServiceError(DUET_ERROR_CODES.FRIEND_LIMIT_REACHED);
  }

  const existing = await findFriendshipBetween(requesterId, addresseeId);
  if (!existing) return;

  if (existing.status === "accepted") {
    throw new DuetServiceError(DUET_ERROR_CODES.ALREADY_FRIENDS);
  }
  if (existing.status === "blocked") {
    throw new DuetServiceError(DUET_ERROR_CODES.BLOCKED);
  }
  if (existing.status === "pending") {
    if (existing.requesterId === requesterId) {
      return;
    }
    throw new DuetServiceError(DUET_ERROR_CODES.INVERSE_PENDING);
  }
}

export async function redeemInviteLink(
  rawToken: string,
  addresseeId: string,
  shareScope: DuetShareScope
): Promise<FriendshipDto> {
  const row = await loadVerifiedToken(rawToken);
  await assertRedeemableFriendship(row.requesterId, addresseeId);

  const friendshipId = await prisma.$transaction(async (tx) => {
    const current = await tx.duetInviteToken.findUnique({ where: { id: row.id } });
    if (!current || current.consumedAt) {
      throw new DuetServiceError(DUET_ERROR_CODES.INVITE_TOKEN_CONSUMED);
    }

    let friendship = await tx.friendship.findUnique({
      where: {
        requesterId_addresseeId: {
          requesterId: row.requesterId,
          addresseeId,
        },
      },
    });

    if (!friendship) {
      friendship = await tx.friendship.create({
        data: {
          requesterId: row.requesterId,
          addresseeId,
          status: "pending",
          shareScope: "none",
        },
      });
    } else if (friendship.status === "declined" && friendship.requesterId === row.requesterId) {
      friendship = await tx.friendship.update({
        where: { id: friendship.id },
        data: {
          status: "pending",
          shareScope: "none",
          respondedAt: null,
        },
      });
    }

    if (friendship.status !== "pending" || friendship.addresseeId !== addresseeId) {
      throw new DuetServiceError(DUET_ERROR_CODES.FORBIDDEN);
    }

    await tx.duetInviteToken.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    });

    return friendship.id;
  });

  return acceptFriendship(friendshipId, addresseeId, shareScope);
}
