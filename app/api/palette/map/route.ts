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
  mapPaletteArtistGenre,
  mapPaletteTrackGenre,
  parsePaletteMode,
} from "@/lib/services/palette/palette-service";
import type { PaletteMapArtistResponseDto, PaletteMapRequestBody } from "@/lib/dto/palette";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RATE = {
  route: "/api/palette/map",
  windowMs: 60_000,
  maxRequests: 80,
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

    const body = (await request.json()) as Partial<PaletteMapRequestBody>;
    const mode = parsePaletteMode(body.mode);
    const genre = body.genre?.trim();
    if (!genre) {
      throw createValidationError("genre is required");
    }

    let mapResult: Awaited<ReturnType<typeof mapPaletteArtistGenre>>;
    try {
      if (mode === "tracks") {
        const trackId = body.trackId?.trim();
        if (!trackId) {
          throw createValidationError("trackId is required in tracks mode");
        }
        mapResult = await mapPaletteTrackGenre(userId, trackId, genre);
      } else {
        const artistId = body.artistId?.trim();
        if (!artistId) {
          throw createValidationError("artistId is required");
        }
        mapResult = await mapPaletteArtistGenre(userId, artistId, genre);
      }
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_GENRE") {
        throw createValidationError("genre is invalid");
      }
      if (error instanceof Error && error.message === "ARTIST_NOT_FOUND") {
        throw new AppError(404, "Artist not found", "NOT_FOUND");
      }
      if (error instanceof Error && error.message === "TRACK_NOT_FOUND") {
        throw new AppError(404, "Track not found", "NOT_FOUND");
      }
      throw error;
    }

    const session = await getPaletteSession(userId, mode);
    const response: PaletteMapArtistResponseDto = {
      ok: true,
      updatedTracks: mapResult.updatedTracks,
      unknownListensRemoved: mapResult.unknownListensRemoved,
      normalizedGenre: mapResult.normalizedGenre,
      session,
    };
    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, { route: RATE.route });
  }
}
