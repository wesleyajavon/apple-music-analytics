import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveAuthorizedDataUserId } from "@/lib/auth/resolve-authorized-data-user-id";
import {
  forbiddenResponse,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import { assertAnalyticsRateLimit } from "@/lib/security/analytics-rate-limit";
import { handleApiError } from "@/lib/utils/error-handler";

export const dynamic = "force-dynamic";

const ROUTE = "/api/user/dashboard-subject";

const DASHBOARD_SUBJECT_RATE_LIMIT = {
  route: ROUTE,
  windowMs: 60_000,
  maxRequests: 60,
} as const;

/**
 * GET — nom d’affichage de l’utilisateur dont les analytics dashboard sont résolues
 * (mêmes règles que `resolveAuthorizedDataUserId` vs `userId` en query).
 * Utilisé pour personnaliser le hero overview quand un utilisateur connecté consulte la démo publique.
 */
export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveAuthorizedDataUserId(request);
    if (!resolved.ok) {
      return resolved.status === 403 ? forbiddenResponse() : unauthorizedResponse();
    }
    const { userId } = resolved;
    await assertAnalyticsRateLimit(request, DASHBOARD_SUBJECT_RATE_LIMIT, userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, avatarUrl: true },
    });

    return NextResponse.json({
      user: {
        name: user?.name ?? null,
        avatarUrl: user?.avatarUrl ?? null,
      },
    });
  } catch (error) {
    return handleApiError(error, { route: ROUTE });
  }
}
