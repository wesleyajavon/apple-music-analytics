import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { unauthorizedResponse } from "@/lib/auth/require-auth-user-id";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  getPaletteSession,
  parsePaletteMode,
} from "@/lib/services/palette/palette-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RATE = {
  route: "/api/palette/session",
  windowMs: 60_000,
  maxRequests: 60,
  softLimitRatio: 0.8,
} as const;

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) return unauthorizedResponse();

    await assertRateLimit(request, {
      ...RATE,
      userId,
    });

    const mode = parsePaletteMode(request.nextUrl.searchParams.get("mode"));
    const session = await getPaletteSession(userId, mode);
    return NextResponse.json(session);
  } catch (error) {
    return handleApiError(error, { route: RATE.route });
  }
}
