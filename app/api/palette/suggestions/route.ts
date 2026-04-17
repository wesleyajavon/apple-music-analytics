import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { unauthorizedResponse } from "@/lib/auth/require-auth-user-id";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { createValidationError, handleApiError } from "@/lib/utils/error-handler";
import { parsePaletteMode } from "@/lib/services/palette/palette-service";
import { getPaletteSuggestions } from "@/lib/services/palette/palette-suggestions-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RATE = {
  route: "/api/palette/suggestions",
  windowMs: 60_000,
  maxRequests: 120,
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
    const artistId = request.nextUrl.searchParams.get("artistId")?.trim() || undefined;
    const trackId = request.nextUrl.searchParams.get("trackId")?.trim() || undefined;

    if (mode === "artists" && !artistId) {
      throw createValidationError("artistId is required in artists mode");
    }
    if (mode === "tracks" && !trackId) {
      throw createValidationError("trackId is required in tracks mode");
    }

    const suggestions = await getPaletteSuggestions({
      userId,
      mode,
      artistId,
      trackId,
    });
    return NextResponse.json({ ok: true, suggestions });
  } catch (error) {
    return handleApiError(error, { route: RATE.route });
  }
}
