import { NextRequest } from "next/server";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { extractOptionalUserId } from "@/lib/middleware/validation";
import { isUuidString } from "@/lib/constants/public-profile";
import { resolveActivePublicProfileUserId } from "@/lib/services/user/public-profile-access";

export type ResolveAuthorizedDataUserIdResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403 };

/**
 * Resolves which user's data a read-only analytics request may access.
 * - Authenticated: own data; optional `userId` may select the public demo profile only.
 *   Any other `userId` query is ignored (still scoped to the session user).
 *   Malformed values are treated like a foreign override (scoped to session when logged in).
 * - Anonymous: only the configured public profile, and only when `userId` query matches it.
 */
export async function resolveAuthorizedDataUserId(
  request: NextRequest
): Promise<ResolveAuthorizedDataUserIdResult> {
  const publicId = await resolveActivePublicProfileUserId();
  const requestedRaw = extractOptionalUserId(request);
  const requested =
    requestedRaw && isUuidString(requestedRaw) ? requestedRaw.trim() : undefined;

  const sessionUserId = (await getCurrentUserId(request)) ?? null;

  if (requestedRaw && !requested) {
    if (sessionUserId) {
      return { ok: true, userId: sessionUserId };
    }
    return { ok: false, status: 403 };
  }

  if (sessionUserId) {
    if (publicId && requested === publicId) {
      return { ok: true, userId: publicId };
    }
    // Foreign or absent userId query: never honor another user's UUID; scope to session.
    return { ok: true, userId: sessionUserId };
  }

  if (!publicId) {
    return { ok: false, status: 401 };
  }

  if (requested === publicId) {
    return { ok: true, userId: publicId };
  }

  return { ok: false, status: 401 };
}
