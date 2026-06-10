import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireAuthenticatedUserId,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  acceptFriendship,
  declineFriendship,
  revokeFriendship,
} from "@/lib/services/duet/friendship-service";
import { grantDuetSharingConsent } from "@/lib/services/duet/duet-consent";
import {
  DUET_RATE_LIMITS,
  logDuetSecurityEvent,
  mapDuetServiceError,
  serializeFriendship,
} from "@/lib/services/duet/duet-api";
import { DuetServiceError } from "@/lib/services/duet/duet-errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RATE = DUET_RATE_LIMITS.friendsMutate;

const PatchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("accept"),
    shareScope: z.enum(["aggregates", "full"]),
  }),
  z.object({
    action: z.literal("decline"),
  }),
  z.object({
    action: z.literal("revoke"),
  }),
]);

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id: friendshipId } = await context.params;
  const route = `/api/duet/friends/${friendshipId}`;

  try {
    const userId = await requireAuthenticatedUserId(request);
    if (!userId) return unauthorizedResponse();

    await assertRateLimit(request, { ...RATE, route, userId });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid friendship action", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    try {
      if (parsed.data.action === "accept") {
        const friendship = await acceptFriendship(
          friendshipId,
          userId,
          parsed.data.shareScope
        );
        try {
          await grantDuetSharingConsent(userId, request);
        } catch (error) {
          if (error instanceof Error && error.message === "USER_CONSENT_TABLE_MISSING") {
            return NextResponse.json(
              {
                error:
                  "Consent storage is not ready. Run `npm run db:migrate` and restart the dev server.",
                code: "CONSENT_TABLE_MISSING",
              },
              { status: 503 }
            );
          }
          throw error;
        }
        return NextResponse.json({ friendship: serializeFriendship(friendship) });
      }

      if (parsed.data.action === "decline") {
        const friendship = await declineFriendship(friendshipId, userId);
        logDuetSecurityEvent({
          action: "decline",
          route,
          actorUserId: userId,
          friendshipId,
          targetUserId: friendship.requester.id,
          request,
        });
        return NextResponse.json({ friendship: serializeFriendship(friendship) });
      }

      await revokeFriendship(friendshipId, userId);
      logDuetSecurityEvent({
        action: "revoke",
        route,
        actorUserId: userId,
        friendshipId,
        request,
      });
      return NextResponse.json({ ok: true });
    } catch (error) {
      if (error instanceof DuetServiceError) {
        return mapDuetServiceError(error);
      }
      throw error;
    }
  } catch (error) {
    return handleApiError(error, { route });
  }
}
