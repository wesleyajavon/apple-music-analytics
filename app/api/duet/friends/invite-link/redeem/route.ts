import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireAuthenticatedUserId,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { handleApiError } from "@/lib/utils/error-handler";
import { redeemInviteLink } from "@/lib/services/duet/duet-invite-token-service";
import { grantDuetSharingConsent } from "@/lib/services/duet/duet-consent";
import {
  DUET_RATE_LIMITS,
  mapDuetServiceError,
  serializeFriendship,
} from "@/lib/services/duet/duet-api";
import { DuetServiceError } from "@/lib/services/duet/duet-errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RATE = DUET_RATE_LIMITS.friendsInviteLinkRedeem;

const RedeemSchema = z.object({
  token: z.string().min(10),
  shareScope: z.enum(["aggregates", "full"]),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    if (!userId) return unauthorizedResponse();

    await assertRateLimit(request, { ...RATE, userId });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const parsed = RedeemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid redeem payload", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    try {
      const friendship = await redeemInviteLink(
        parsed.data.token,
        userId,
        parsed.data.shareScope
      );
      await grantDuetSharingConsent(userId, request);
      return NextResponse.json({
        ok: true,
        friendship: serializeFriendship(friendship),
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
