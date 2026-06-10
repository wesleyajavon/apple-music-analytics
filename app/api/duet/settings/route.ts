import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireAuthenticatedUserId,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  getOrCreateDuetShareSettings,
  updateDuetShareSettings,
} from "@/lib/services/duet/duet-share-settings-service";
import { DUET_RATE_LIMITS } from "@/lib/services/duet/duet-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RATE = DUET_RATE_LIMITS.settings;

const PatchSchema = z
  .object({
    allowFriendRequests: z.boolean().optional(),
    defaultShareScope: z.enum(["none", "aggregates", "full"]).optional(),
  })
  .refine(
    (body) =>
      body.allowFriendRequests !== undefined || body.defaultShareScope !== undefined,
    { message: "At least one setting must be provided" }
  );

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    if (!userId) return unauthorizedResponse();

    await assertRateLimit(request, { ...RATE, userId });

    const settings = await getOrCreateDuetShareSettings(userId);
    return NextResponse.json(settings);
  } catch (error) {
    return handleApiError(error, { route: RATE.route });
  }
}

export async function PATCH(request: NextRequest) {
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

    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid Duet settings payload", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const settings = await updateDuetShareSettings(userId, parsed.data);
    return NextResponse.json(settings);
  } catch (error) {
    return handleApiError(error, { route: RATE.route });
  }
}
