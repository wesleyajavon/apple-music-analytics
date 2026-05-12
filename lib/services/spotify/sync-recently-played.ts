import { prisma } from "@/lib/prisma";
import { importOnboardingListens } from "@/lib/services/listening/import-onboarding-listens";
import { getValidSpotifyAccessTokenForUser } from "@/lib/services/spotify/get-valid-access-token";
import { parseSpotifyApiErrorMessage } from "@/lib/services/spotify/spotify-http";
import type { SpotifyRecentlyPlayedApiResponse } from "@/lib/services/spotify/recently-played-normalize";
import { spotifyRecentlyPlayedItemsToNormalized } from "@/lib/services/spotify/recently-played-normalize";
import { AppError, ErrorCodes } from "@/lib/utils/error-handler";

const SOURCE = "spotify_web_api" as const;
const MAX_PAGES = 12;
const RECENT_MARGIN_MS = 5 * 60 * 1000;

function resolveRecentlyPlayedUrl(firstAfterMs?: number): string {
  const base =
    "https://api.spotify.com/v1/me/player/recently-played?limit=50";
  if (firstAfterMs == null) return base;
  return `${base}&after=${firstAfterMs}`;
}

export async function syncSpotifyRecentlyPlayedForUser(userId: string): Promise<{
  /** Rows usable after normalization (music tracks with artist + title + date). */
  fetched: number;
  /** Raw `items.length` sum from Spotify API across paginated requests (before filtering). */
  spotifyApiItemCount: number;
  imported: number;
  skippedDuplicates: number;
  skippedInvalid: number;
  nextCursorMs: string | null;
}> {
  const { accessToken, connectionId } =
    await getValidSpotifyAccessTokenForUser(userId);

  const conn = await prisma.spotifyConnection.findUniqueOrThrow({
    where: { id: connectionId },
    select: { syncCursorMs: true },
  });

  let firstAfterMs: number | undefined;
  if (conn.syncCursorMs != null) {
    const n = Number(conn.syncCursorMs);
    firstAfterMs = Number.isFinite(n)
      ? Math.max(0, n - RECENT_MARGIN_MS)
      : undefined;
  }

  let url: string | null = resolveRecentlyPlayedUrl(firstAfterMs);
  const allRows: ReturnType<typeof spotifyRecentlyPlayedItemsToNormalized> = [];
  let spotifyApiItemCount = 0;
  let pages = 0;

  while (url && pages < MAX_PAGES) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const bodyText = await res.text();

    if (res.status === 429) {
      throw new AppError(
        429,
        "Spotify rate limit; try again later.",
        ErrorCodes.RATE_LIMIT_EXCEEDED
      );
    }

    if (!res.ok) {
      throw new AppError(
        res.status === 401 || res.status === 403 ? 401 : 502,
        parseSpotifyApiErrorMessage(bodyText) ??
          `Spotify recently-played HTTP ${res.status}`,
        res.status === 401 || res.status === 403
          ? ErrorCodes.UNAUTHORIZED
          : ErrorCodes.EXTERNAL_API_ERROR
      );
    }

    let data: SpotifyRecentlyPlayedApiResponse;
    try {
      data = JSON.parse(bodyText) as SpotifyRecentlyPlayedApiResponse;
    } catch {
      throw new AppError(
        502,
        "Spotify recently-played returned invalid JSON",
        ErrorCodes.EXTERNAL_API_ERROR
      );
    }

    const pageItems = data.items ?? [];
    spotifyApiItemCount += pageItems.length;
    allRows.push(...spotifyRecentlyPlayedItemsToNormalized(pageItems));
    pages += 1;

    const next = data.next?.trim();
    if (!next) {
      url = null;
      break;
    }

    url = next.startsWith("http") ? next : `https://api.spotify.com${next}`;
  }

  const importResult = await importOnboardingListens(userId, SOURCE, allRows);

  let maxPlayedMs =
    conn.syncCursorMs != null ? Number(conn.syncCursorMs) : 0;
  if (!Number.isFinite(maxPlayedMs)) maxPlayedMs = 0;

  for (const r of allRows) {
    const t = r.playedAt.getTime();
    if (t > maxPlayedMs) maxPlayedMs = t;
  }

  const nextCursorBig =
    maxPlayedMs > 0 ? BigInt(maxPlayedMs) : conn.syncCursorMs ?? null;

  await prisma.spotifyConnection.update({
    where: { id: connectionId },
    data: {
      lastSyncedAt: new Date(),
      ...(nextCursorBig != null ? { syncCursorMs: nextCursorBig } : {}),
    },
  });

  return {
    fetched: allRows.length,
    spotifyApiItemCount,
    imported: importResult.imported,
    skippedDuplicates: importResult.skippedDuplicates,
    skippedInvalid: importResult.skippedInvalid,
    nextCursorMs: nextCursorBig != null ? nextCursorBig.toString() : null,
  };
}
