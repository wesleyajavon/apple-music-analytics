import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { FriendshipDto } from "@/lib/services/duet/friendship-service";
import { DUET_ERROR_CODES, DuetServiceError } from "@/lib/services/duet/duet-errors";
import { logger } from "@/lib/utils/logger";

export const DUET_INVITE_UNIFORM_RESPONSE = {
  ok: true,
  message: "Invitation processed",
} as const;

export const DUET_RATE_LIMITS = {
  friendsList: {
    route: "/api/duet/friends",
    windowMs: 60_000,
    maxRequests: 60,
    softLimitRatio: 0.8,
  },
  friendsInvite: {
    route: "/api/duet/friends/invite",
    windowMs: 60_000,
    maxRequests: 15,
    softLimitRatio: 0.8,
  },
  friendsInviteLink: {
    route: "/api/duet/friends/invite-link",
    windowMs: 60_000,
    maxRequests: 8,
    softLimitRatio: 0.8,
  },
  friendsInviteLinkRedeem: {
    route: "/api/duet/friends/invite-link/redeem",
    windowMs: 60_000,
    maxRequests: 15,
    softLimitRatio: 0.8,
  },
  friendsMutate: {
    route: "/api/duet/friends/mutate",
    windowMs: 60_000,
    maxRequests: 30,
    softLimitRatio: 0.8,
  },
  settings: {
    route: "/api/duet/settings",
    windowMs: 60_000,
    maxRequests: 30,
    softLimitRatio: 0.8,
  },
} as const;

export type SerializedFriendship = Omit<FriendshipDto, "createdAt" | "respondedAt"> & {
  createdAt: string;
  respondedAt: string | null;
};

export function serializeFriendship(dto: FriendshipDto): SerializedFriendship {
  return {
    ...dto,
    createdAt: dto.createdAt.toISOString(),
    respondedAt: dto.respondedAt?.toISOString() ?? null,
  };
}

/** Mask lookup failures and disabled targets (anti-enumeration). */
export function isUniformInviteResponse(error: DuetServiceError): boolean {
  return (
    error.code === DUET_ERROR_CODES.ADDRESSEE_NOT_FOUND ||
    error.code === DUET_ERROR_CODES.FRIEND_REQUESTS_DISABLED
  );
}

export function mapDuetServiceError(error: DuetServiceError): NextResponse {
  switch (error.code) {
    case DUET_ERROR_CODES.INVALID_EMAIL:
    case DUET_ERROR_CODES.INVALID_SHARE_SCOPE:
    case DUET_ERROR_CODES.SELF_INVITE:
    case DUET_ERROR_CODES.SELF_ACTION:
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    case DUET_ERROR_CODES.FRIENDSHIP_NOT_FOUND:
      return NextResponse.json(
        { error: "Friendship not found", code: error.code },
        { status: 404 }
      );
    case DUET_ERROR_CODES.FORBIDDEN:
    case DUET_ERROR_CODES.BLOCKED:
    case DUET_ERROR_CODES.FRIEND_LIMIT_REACHED:
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 403 }
      );
    case DUET_ERROR_CODES.INVITE_QUOTA_EXCEEDED:
      return NextResponse.json(
        { error: "Daily invite limit reached", code: error.code },
        { status: 429 }
      );
    case DUET_ERROR_CODES.DUPLICATE_INVITE:
    case DUET_ERROR_CODES.INVERSE_PENDING:
    case DUET_ERROR_CODES.ALREADY_FRIENDS:
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 409 }
      );
    case DUET_ERROR_CODES.INVITE_TOKEN_INVALID:
    case DUET_ERROR_CODES.INVITE_TOKEN_EXPIRED:
    case DUET_ERROR_CODES.INVITE_TOKEN_CONSUMED:
      return NextResponse.json(
        { error: "Invite link unavailable", code: error.code },
        { status: 404 }
      );
    default:
      return NextResponse.json(
        { error: "Request failed", code: error.code },
        { status: 400 }
      );
  }
}

export function logDuetSecurityEvent(payload: {
  action: "decline" | "block" | "revoke";
  route: string;
  actorUserId: string;
  friendshipId: string;
  targetUserId?: string;
  request?: NextRequest;
}): void {
  logger.warn("Duet social security event", {
    action: payload.action,
    route: payload.route,
    friendshipId: payload.friendshipId,
    targetUserId: payload.targetUserId,
    auth: { userIdPresent: Boolean(payload.actorUserId.trim()) },
  });
}
