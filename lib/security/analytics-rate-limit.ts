import type { NextRequest } from "next/server";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { getPublicProfileUserId } from "@/lib/constants/public-profile";
import {
  assertRateLimit,
  type RateLimitConfig,
  type RateLimitResult,
} from "@/lib/security/rate-limit";

/**
 * Sujet de rate limit pour les APIs analytics : le jeu de données « démo publique »
 * ne doit pas partager un seul compteur global (`u:<publicUuid>`) entre tous les visiteurs.
 * - Anonyme + démo : quota par IP (via `userId: null` dans {@link assertRateLimit}).
 * - Connecté + démo : quota par compte (`u:<session>`).
 */
export async function resolveAnalyticsRateLimitUserId(
  request: NextRequest,
  authorizedDataUserId: string
): Promise<string | null> {
  const publicId = getPublicProfileUserId();
  if (publicId && authorizedDataUserId === publicId) {
    const sessionUserId = (await getCurrentUserId(request))?.trim();
    return sessionUserId || null;
  }
  return authorizedDataUserId;
}

export async function assertAnalyticsRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  authorizedDataUserId: string
): Promise<RateLimitResult> {
  const userId = await resolveAnalyticsRateLimitUserId(request, authorizedDataUserId);
  return assertRateLimit(request, { ...config, userId });
}
