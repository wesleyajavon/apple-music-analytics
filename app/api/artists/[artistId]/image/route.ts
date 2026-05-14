import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAuthenticatedUserId,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  enrichArtistImageFromSpotifyIfMissing,
  getSpotifyClientCredentialsFromEnv,
} from "@/lib/services/spotify/artist-image-enrichment";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RATE = {
  route: "/api/artists/[artistId]/image",
  windowMs: 60_000,
  maxRequests: 40,
  softLimitRatio: 0.9,
} as const;

/** Hydratation paresseuse : une tentative Spotify par artiste (si pas d’image en base et credentials OK). */
export async function POST(
  request: NextRequest,
  context: { params: { artistId: string } }
) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    if (!userId) return unauthorizedResponse();

    await assertRateLimit(request, { ...RATE, userId });

    const artistId = context.params?.artistId?.trim();
    if (!artistId) {
      return NextResponse.json({ error: "artistId is required" }, { status: 400 });
    }

    const listen = await prisma.listen.findFirst({
      where: { userId, track: { artistId } },
      select: { id: true },
    });
    if (!listen) {
      return NextResponse.json(
        { error: "No listens for this artist in your library" },
        { status: 403 }
      );
    }

    const creds = getSpotifyClientCredentialsFromEnv();
    if (!creds) {
      const row = await prisma.artist.findUnique({
        where: { id: artistId },
        select: { imageUrl: true },
      });
      return NextResponse.json({
        imageUrl: row?.imageUrl?.trim() ?? null,
        enrichmentDisabled: true,
      });
    }

    const enriched = await enrichArtistImageFromSpotifyIfMissing({
      artistDbId: artistId,
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      force: false,
    });

    if (!enriched.ok) {
      if (enriched.reason === "artist_not_found") {
        return NextResponse.json({ error: "Artist not found" }, { status: 404 });
      }

      const row = await prisma.artist.findUnique({
        where: { id: artistId },
        select: { imageUrl: true },
      });
      const imageUrl = row?.imageUrl?.trim() ?? null;

      return NextResponse.json({
        imageUrl,
        ...(enriched.reason === "spotify_auth_failed"
          ? { spotifyUnavailable: true }
          : { enrichmentDisabled: true }),
      });
    }

    return NextResponse.json({
      imageUrl: enriched.imageUrl ?? null,
      hydrated: !enriched.skippedAlreadyHad,
    });
  } catch (error) {
    return handleApiError(error, { route: RATE.route });
  }
}
