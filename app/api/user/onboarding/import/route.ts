import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { unauthorizedResponse } from "@/lib/auth/require-auth-user-id";
import { assertRateLimit } from "@/lib/security/rate-limit";
import {
  AppError,
  createValidationError,
  handleApiError,
} from "@/lib/utils/error-handler";
import { extractSpotifyStreamingHistoryJsonTextsFromZip } from "@/lib/services/listening/extract-spotify-export-zip";
import { parseSpotifyStreamingHistoryAudioJson } from "@/lib/services/listening/parse-spotify-streaming-history-json";
import { parseApplePlayHistoryDailyTracksCsv } from "@/lib/services/listening/parse-apple-play-history-daily-csv";
import { importOnboardingListens } from "@/lib/services/listening/import-onboarding-listens";
import type { NormalizedListenInput } from "@/lib/services/listening/onboarding-import-types";
import { getPaletteInvitationStatus } from "@/lib/services/palette/palette-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const RATE = {
  route: "/api/user/onboarding/import",
  windowMs: 60_000,
  maxRequests: 5,
  softLimitRatio: 0.8,
} as const;

const MAX_ZIP_BYTES = 45 * 1024 * 1024;
const MAX_CSV_BYTES = 25 * 1024 * 1024;
const MAX_PARSED_ROWS = 75_000;

type Provider = "spotify" | "apple";

function isProvider(s: string | null): s is Provider {
  return s === "spotify" || s === "apple";
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) return unauthorizedResponse();

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
    if (!contentType.includes("multipart/form-data")) {
      throw createValidationError("Expected multipart/form-data");
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

    let rows: NormalizedListenInput[];

    if (providerRaw === "spotify") {
      if (!file.name.toLowerCase().endsWith(".zip")) {
        throw createValidationError("Spotify import expects a .zip file (e.g. my_spotify_data.zip)");
      }
      if (file.size > MAX_ZIP_BYTES) {
        throw createValidationError(
          `File too large (max ${Math.round(MAX_ZIP_BYTES / (1024 * 1024))} MB)`
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const jsonTexts = await extractSpotifyStreamingHistoryJsonTextsFromZip(buffer);
      if (jsonTexts.length === 0) {
        throw createValidationError(
          "No Streaming_History_Audio_*.json files found in this ZIP. Use the archive from Spotify’s email (Extended streaming history)."
        );
      }
      rows = jsonTexts.flatMap((text) => parseSpotifyStreamingHistoryAudioJson(text));
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
      const csvText = await file.text();
      rows = parseApplePlayHistoryDailyTracksCsv(csvText);
    }

    if (rows.length === 0) {
      throw createValidationError(
        "No listening rows could be parsed. Check that you selected the correct file."
      );
    }

    if (rows.length > MAX_PARSED_ROWS) {
      throw createValidationError(
        `This export contains more than ${MAX_PARSED_ROWS.toLocaleString()} plays. Contact support or split the data.`
      );
    }

    const source =
      providerRaw === "spotify" ? ("spotify_export" as const) : ("apple_music_export" as const);

    const result = await importOnboardingListens(userId, source, rows);
    const paletteInvite = await getPaletteInvitationStatus(userId);

    return NextResponse.json({
      ok: true,
      provider: providerRaw,
      parsedRows: rows.length,
      imported: result.imported,
      skippedDuplicates: result.skippedDuplicates,
      skippedInvalid: result.skippedInvalid,
      paletteInvitation: paletteInvite,
    });
  } catch (error) {
    return handleApiError(error, { route: RATE.route });
  }
}
