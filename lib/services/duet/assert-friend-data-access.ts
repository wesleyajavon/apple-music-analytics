import type { DuetShareScope } from "@prisma/client";
import { findFriendshipBetween } from "@/lib/services/duet/friendship-service";

export type FriendDataAccessRequiredScope = "aggregates" | "full";

export type FriendDataAccessResult =
  | { ok: true; shareScope: DuetShareScope }
  | { ok: false; status: 403 | 404 };

const SCOPE_RANK: Record<DuetShareScope, number> = {
  none: 0,
  aggregates: 1,
  full: 2,
};

function meetsRequiredScope(
  actual: DuetShareScope,
  required: FriendDataAccessRequiredScope
): boolean {
  const requiredRank = SCOPE_RANK[required];
  return SCOPE_RANK[actual] >= requiredRank;
}

/**
 * Verifies that `viewerId` may read analytics for `targetUserId` via an accepted friendship.
 * Returns 404 when no accepted relation exists (anti-enumeration).
 */
export async function assertFriendDataAccess(args: {
  viewerId: string;
  targetUserId: string;
  requiredScope: FriendDataAccessRequiredScope;
}): Promise<FriendDataAccessResult> {
  const { viewerId, targetUserId, requiredScope } = args;

  if (viewerId === targetUserId) {
    return { ok: true, shareScope: "full" };
  }

  const friendship = await findFriendshipBetween(viewerId, targetUserId);
  if (!friendship || friendship.status !== "accepted") {
    return { ok: false, status: 404 };
  }

  if (!meetsRequiredScope(friendship.shareScope, requiredScope)) {
    return { ok: false, status: 403 };
  }

  return { ok: true, shareScope: friendship.shareScope };
}
