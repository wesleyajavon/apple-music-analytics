import { NextRequest } from "next/server";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { extractOptionalUserId } from "@/lib/middleware/validation";
import {
  getPublicProfileUserId,
  isUuidString,
} from "@/lib/constants/public-profile";
import { logSecurityAuthEvent } from "@/lib/security/security-logger";

export type ResolveAuthorizedDataUserIdResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403 };

/**
 * Resolves which user's data a read-only analytics request may access.
 * - Authenticated: own data, or the configured public profile (for demos).
 * - Anonymous: only the configured public profile, and only when `userId` query matches it.
 */
export async function resolveAuthorizedDataUserId(
  request: NextRequest
): Promise<ResolveAuthorizedDataUserIdResult> {
  const publicId = getPublicProfileUserId();
  const requestedRaw = extractOptionalUserId(request);
  const requested =
    requestedRaw && isUuidString(requestedRaw) ? requestedRaw.trim() : undefined;

  if (requestedRaw && !requested) {
    return { ok: false, status: 403 };
  }

  const sessionUserId = (await getCurrentUserId(request)) ?? null;

  if (sessionUserId) {
    const target = requested ?? sessionUserId;
    if (target === sessionUserId) {
      return { ok: true, userId: sessionUserId };
    }
    if (publicId && target === publicId) {
      return { ok: true, userId: publicId };
    }
    logSecurityAuthEvent({
      route: request.nextUrl.pathname,
      statusCode: 403,
      reason: "forbidden",
      userId: sessionUserId,
      request,
    });
    return { ok: false, status: 403 };
  }

  if (!publicId) {
    return { ok: false, status: 401 };
  }

  if (requested === publicId) {
    return { ok: true, userId: publicId };
  }

  return { ok: false, status: 401 };
}
