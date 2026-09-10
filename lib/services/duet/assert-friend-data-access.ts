import type { DuetShareScope } from "@prisma/client";
import { findFriendshipBetween } from "@/lib/services/duet/friendship-service";

/** Sharing is on when scope is anything other than `none` (legacy `aggregates` counts as on). */
export type FriendDataAccessRequiredScope = "sharing";

export type FriendDataAccessResult =
  | { ok: true; shareScope: DuetShareScope }
  | { ok: false; status: 403 | 404 };

function isSharingOn(scope: DuetShareScope): boolean {
  return scope === "full" || scope === "aggregates";
}

/**
 * Verifies that `viewerId` may read analytics for `targetUserId` via an accepted friendship.
 * Returns 404 when no accepted relation exists (anti-enumeration).
 */
export async function assertFriendDataAccess(args: {
  viewerId: string;
  targetUserId: string;
  requiredScope?: FriendDataAccessRequiredScope;
}): Promise<FriendDataAccessResult> {
  const { viewerId, targetUserId } = args;

  if (viewerId === targetUserId) {
    return { ok: true, shareScope: "full" };
  }

  const friendship = await findFriendshipBetween(viewerId, targetUserId);
  if (!friendship || friendship.status !== "accepted") {
    return { ok: false, status: 404 };
  }

  if (!isSharingOn(friendship.shareScope)) {
    return { ok: false, status: 403 };
  }

  return { ok: true, shareScope: friendship.shareScope };
}
