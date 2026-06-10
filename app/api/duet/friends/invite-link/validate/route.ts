import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireAuthenticatedUserId,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { handleApiError } from "@/lib/utils/error-handler";
import { previewInviteLink } from "@/lib/services/duet/duet-invite-token-service";
import { DUET_RATE_LIMITS, mapDuetServiceError } from "@/lib/services/duet/duet-api";
import { DuetServiceError } from "@/lib/services/duet/duet-errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RATE = DUET_RATE_LIMITS.friendsInviteLink;

const QuerySchema = z.object({
  token: z.string().min(10),
});

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    if (!userId) return unauthorizedResponse();

    await assertRateLimit(request, { ...RATE, userId });

    const parsed = QuerySchema.safeParse({
      token: request.nextUrl.searchParams.get("token"),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid invite token", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    try {
      const preview = await previewInviteLink(parsed.data.token);
      return NextResponse.json({
        ok: true,
        expiresAt: preview.expiresAt.toISOString(),
        requester: {
          id: preview.requester.id,
          email: null,
          name: preview.requester.name,
          avatarUrl: preview.requester.avatarUrl,
        },
      });
    } catch (error) {
      if (error instanceof DuetServiceError) {
        return mapDuetServiceError(error);
      }
      throw error;
    }
  } catch (error) {
    return handleApiError(error, { route: `${RATE.route}/validate` });
  }
}
