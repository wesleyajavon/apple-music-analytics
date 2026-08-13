import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRecentAuthenticatedUser } from "@/lib/auth/require-recent-auth";
import { assertRateLimit } from "@/lib/security/rate-limit";
import {
  AppError,
  createValidationError,
  handleApiError,
} from "@/lib/utils/error-handler";
import { listenSourceForOnboardingProvider } from "@/lib/services/listening/get-user-import-cursor";
import { importOnboardingListens } from "@/lib/services/listening/import-onboarding-listens";
import {
  isOnboardingImportMode,
  parseOnboardingImportMode,
} from "@/lib/services/listening/onboarding-import-mode";
import { prepareOnboardingImportRows } from "@/lib/services/listening/prepare-onboarding-import-rows";
import { getPaletteInvitationStatus } from "@/lib/services/palette/palette-service";
import { getGroqImportGenreBackfillEligibility } from "@/lib/services/listening/import-genre-backfill-queue";
import { parseOnboardingImportJsonBody } from "@/lib/services/listening/onboarding-import-json-body";
import { ONBOARDING_IMPORT_MAX_PARSED_ROWS } from "@/lib/services/listening/onboarding-import-constants";
import {
  enrichTopUserArtistsFromSpotify,
  getSpotifyClientCredentialsFromEnv,
  POST_IMPORT_SPOTIFY_ARTIST_IMAGE_LIMIT,
} from "@/lib/services/spotify/artist-image-enrichment";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const RATE = {
  route: "/api/user/onboarding/import",
  windowMs: 60_000,
  /** Import découpé en plusieurs lots JSON (contournement plafond Vercel ~4,5 Mo). */
  maxRequests: 40,
  softLimitRatio: 0.8,
} as const;

const MAX_ZIP_BYTES = 45 * 1024 * 1024;
const MAX_CSV_BYTES = 25 * 1024 * 1024;

type Provider = "spotify" | "apple";

function isProvider(s: string | null): s is Provider {
  return s === "spotify" || s === "apple";
}

async function enrichSpotifyArtistImagesForUserAfterOnboarding(userId: string) {
  const creds = getSpotifyClientCredentialsFromEnv();
  if (!creds) return undefined;

  try {
    const r = await enrichTopUserArtistsFromSpotify({
      userId,
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      limit: POST_IMPORT_SPOTIFY_ARTIST_IMAGE_LIMIT,
      force: false,
    });

    return {
      updated: r.updated,
      skippedNoSpotifyMatch: r.skippedNoSpotifyMatch,
      skippedNoImageUrl: r.skippedNoImageUrl,
    };
  } catch (e) {
    console.error(
      "[onboarding/import] Spotify artist image enrichment:",
      e instanceof Error ? e.message : e
    );
    return {
      updated: 0,
      skippedNoSpotifyMatch: 0,
      skippedNoImageUrl: 0,
      error: true as const,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRecentAuthenticatedUser(request);
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    await assertRateLimit(request, {
      ...RATE,
      userId,
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new AppError(404, "User not found", "NOT_FOUND");
    }

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const raw = await request.json();
      const {
        provider: providerRaw,
        rows: parsedRows,
        batch,
        sessionTotalImported,
        mode,
      } = parseOnboardingImportJsonBody(raw);

      const prepared = await prepareOnboardingImportRows({
        userId,
        provider: providerRaw,
        mode,
        preParsedRows: parsedRows,
      });
      const rows = prepared.rows;

      if (prepared.parsedRows > ONBOARDING_IMPORT_MAX_PARSED_ROWS) {
        throw createValidationError(
          `This export contains more than ${ONBOARDING_IMPORT_MAX_PARSED_ROWS.toLocaleString()} plays. Contact support or split the data.`
        );
      }

      const source = listenSourceForOnboardingProvider(providerRaw);

      const result =
        rows.length === 0
          ? { imported: 0, skippedDuplicates: 0, skippedInvalid: 0 }
          : await importOnboardingListens(userId, source, rows);
      const isLastBatch = !batch || batch.index === batch.count - 1;

      let paletteInvite: Awaited<ReturnType<typeof getPaletteInvitationStatus>> | null = null;
      let genreLlmBackfill: Awaited<
        ReturnType<typeof getGroqImportGenreBackfillEligibility>
      > | null = null;
      let artistImagesSpotify:
        | Awaited<
            ReturnType<typeof enrichSpotifyArtistImagesForUserAfterOnboarding>
          >
        | undefined;

      if (isLastBatch) {
        paletteInvite = await getPaletteInvitationStatus(userId);
        const priorImported =
          batch && batch.count > 1 && sessionTotalImported !== null
            ? sessionTotalImported
            : 0;
        const sessionImports = priorImported + result.imported;
        if (sessionImports > 0) {
          genreLlmBackfill = await getGroqImportGenreBackfillEligibility(userId);
          artistImagesSpotify =
            await enrichSpotifyArtistImagesForUserAfterOnboarding(userId);
        }
      }

      return NextResponse.json({
        ok: true,
        partial: !isLastBatch,
        provider: providerRaw,
        mode: prepared.mode,
        parsedRows: prepared.parsedRows,
        rowsAfterCursor: rows.length,
        skippedByCursor: prepared.skippedByCursor,
        cursor: prepared.cursor,
        imported: result.imported,
        skippedDuplicates: result.skippedDuplicates,
        skippedInvalid: result.skippedInvalid,
        paletteInvitation: paletteInvite,
        genreLlmBackfill,
        ...(artistImagesSpotify !== undefined && {
          artistImagesSpotify,
        }),
      });
    }

    if (!contentType.includes("multipart/form-data")) {
      throw createValidationError("Expected multipart/form-data or application/json");
    }

    const form = await request.formData();
    const providerRaw = form.get("provider");
    const file = form.get("file");

    if (typeof providerRaw !== "string" || !isProvider(providerRaw)) {
      throw createValidationError('Invalid or missing "provider" (spotify | apple)');
    }

    if (!(file instanceof File)) {
      throw createValidationError('Missing "file"');
    }

    const modeRaw = form.get("mode");
    const mode =
      typeof modeRaw === "string" && isOnboardingImportMode(modeRaw)
        ? modeRaw
        : parseOnboardingImportMode(modeRaw);

    let spotifyZipBuffer: Buffer | undefined;
    let appleCsvText: string | undefined;

    if (providerRaw === "spotify") {
      if (!file.name.toLowerCase().endsWith(".zip")) {
        throw createValidationError("Spotify import expects a .zip file (e.g. my_spotify_data.zip)");
      }
      if (file.size > MAX_ZIP_BYTES) {
        throw createValidationError(
          `File too large (max ${Math.round(MAX_ZIP_BYTES / (1024 * 1024))} MB)`
        );
      }
      spotifyZipBuffer = Buffer.from(await file.arrayBuffer());
    } else {
      const lower = file.name.toLowerCase();
      if (!lower.endsWith(".csv")) {
        throw createValidationError("Apple import expects a .csv file");
      }
      if (file.size > MAX_CSV_BYTES) {
        throw createValidationError(
          `File too large (max ${Math.round(MAX_CSV_BYTES / (1024 * 1024))} MB)`
        );
      }
      appleCsvText = await file.text();
    }

    const prepared = await prepareOnboardingImportRows({
      userId,
      provider: providerRaw,
      mode,
      spotifyZipBuffer,
      appleCsvText,
    });

    if (prepared.emptySpotifyZip) {
      throw createValidationError(
        "No Spotify extended streaming history JSON files found in this ZIP (expected Streaming_History_Audio_*.json or StreamingHistory_music_*.json). Use the archive from Spotify’s email (Extended streaming history)."
      );
    }

    if (prepared.parsedRows === 0 && prepared.skippedByCursor === 0) {
      throw createValidationError(
        "No listening rows could be parsed. Check that you selected the correct file."
      );
    }

    if (prepared.parsedRows > ONBOARDING_IMPORT_MAX_PARSED_ROWS) {
      throw createValidationError(
        `This export contains more than ${ONBOARDING_IMPORT_MAX_PARSED_ROWS.toLocaleString()} plays. Contact support or split the data.`
      );
    }

    const rows = prepared.rows;
    const source = listenSourceForOnboardingProvider(providerRaw);

    const result =
      rows.length === 0
        ? { imported: 0, skippedDuplicates: 0, skippedInvalid: 0 }
        : await importOnboardingListens(userId, source, rows);
    const paletteInvite = await getPaletteInvitationStatus(userId);
    const genreLlmBackfill =
      result.imported > 0
        ? await getGroqImportGenreBackfillEligibility(userId)
        : null;

    const artistImagesSpotify =
      result.imported > 0
        ? await enrichSpotifyArtistImagesForUserAfterOnboarding(userId)
        : undefined;

    return NextResponse.json({
      ok: true,
      provider: providerRaw,
      mode: prepared.mode,
      parsedRows: prepared.parsedRows,
      rowsAfterCursor: rows.length,
      skippedByCursor: prepared.skippedByCursor,
      cursor: prepared.cursor,
      imported: result.imported,
      skippedDuplicates: result.skippedDuplicates,
      skippedInvalid: result.skippedInvalid,
      paletteInvitation: paletteInvite,
      genreLlmBackfill,
      ...(artistImagesSpotify !== undefined && {
        artistImagesSpotify,
      }),
    });
  } catch (error) {
    return handleApiError(error, { route: RATE.route });
  }
}
