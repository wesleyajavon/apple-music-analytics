import { NextRequest, NextResponse } from "next/server";
import {
  requireAuthenticatedUserId,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { handleApiError } from "@/lib/utils/error-handler";
import { createInviteLink } from "@/lib/services/duet/duet-invite-token-service";
import { DUET_RATE_LIMITS, mapDuetServiceError } from "@/lib/services/duet/duet-api";
import { DuetServiceError } from "@/lib/services/duet/duet-errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RATE = DUET_RATE_LIMITS.friendsInviteLink;

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    if (!userId) return unauthorizedResponse();

    await assertRateLimit(request, { ...RATE, userId });

    try {
      const { token, expiresAt } = await createInviteLink(userId);
      const acceptPath = `/duet/accept?token=${encodeURIComponent(token)}`;
      const origin = request.nextUrl.origin;
      return NextResponse.json({
        ok: true,
        token,
        expiresAt: expiresAt.toISOString(),
        acceptPath,
        url: `${origin}${acceptPath}`,
      });
    } catch (error) {
      if (error instanceof DuetServiceError) {
        return mapDuetServiceError(error);
      }
      throw error;
    }
  } catch (error) {
    return handleApiError(error, { route: RATE.route });
  }
}
