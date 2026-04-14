import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { unauthorizedResponse } from "@/lib/auth/require-auth-user-id";
import { assertRateLimit } from "@/lib/security/rate-limit";
import {
  AppError,
  createValidationError,
  handleApiError,
} from "@/lib/utils/error-handler";
import {
  getPaletteSession,
  skipPaletteArtist,
} from "@/lib/services/palette/palette-service";
import type {
  PaletteSkipArtistPayload,
  PaletteSkipArtistResponseDto,
} from "@/lib/dto/palette";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RATE = {
  route: "/api/palette/skip",
  windowMs: 60_000,
  maxRequests: 100,
  softLimitRatio: 0.8,
} as const;

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) return unauthorizedResponse();

    await assertRateLimit(request, {
      ...RATE,
      userId,
    });

    const body = (await request.json()) as Partial<PaletteSkipArtistPayload>;
    const artistId = body.artistId?.trim();
    if (!artistId) {
      throw createValidationError("artistId is required");
    }

    try {
      await skipPaletteArtist(userId, artistId);
    } catch (error) {
      if (error instanceof Error && error.message === "ARTIST_NOT_FOUND") {
        throw new AppError(404, "Artist not found", "NOT_FOUND");
      }
      throw error;
    }

    const session = await getPaletteSession(userId);
    const response: PaletteSkipArtistResponseDto = {
      ok: true,
      session,
    };
    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, { route: RATE.route });
  }
}
