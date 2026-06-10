import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireAuthenticatedUserId,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { handleApiError } from "@/lib/utils/error-handler";
import { inviteFriendByEmail } from "@/lib/services/duet/friendship-service";
import {
  DUET_INVITE_UNIFORM_RESPONSE,
  DUET_RATE_LIMITS,
  isUniformInviteResponse,
  mapDuetServiceError,
  serializeFriendship,
} from "@/lib/services/duet/duet-api";
import { DuetServiceError } from "@/lib/services/duet/duet-errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RATE = DUET_RATE_LIMITS.friendsInvite;

const InviteSchema = z.object({
  email: z.string().trim().min(3).max(320),
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

    const parsed = InviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid invite payload", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    try {
      const friendship = await inviteFriendByEmail(userId, parsed.data.email);
      return NextResponse.json({
        ...DUET_INVITE_UNIFORM_RESPONSE,
        friendship: serializeFriendship(friendship),
      });
    } catch (error) {
      if (error instanceof DuetServiceError && isUniformInviteResponse(error)) {
        return NextResponse.json(DUET_INVITE_UNIFORM_RESPONSE);
      }
      if (error instanceof DuetServiceError) {
        return mapDuetServiceError(error);
      }
      throw error;
    }
  } catch (error) {
    return handleApiError(error, { route: RATE.route });
  }
}
