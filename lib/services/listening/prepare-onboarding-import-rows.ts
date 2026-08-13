import { extractSpotifyStreamingHistoryJsonTextsFromZip } from "./extract-spotify-export-zip";
import { filterAppleDailyTracksCsvAfterDate } from "./filter-apple-daily-tracks-csv-after-date";
import { filterNormalizedListensAfterCursor } from "./filter-normalized-listens-after-cursor";
import { getUserImportCursor } from "./get-user-import-cursor";
import { playedAtToDateKey } from "./onboarding-import-cursor-utils";
import type { OnboardingImportMode, OnboardingImportProvider } from "./onboarding-import-mode";
import type { NormalizedListenInput } from "./onboarding-import-types";
import { parseApplePlayHistoryDailyTracksCsv } from "./parse-apple-play-history-daily-csv";
import { parseSpotifyStreamingHistoryAudioJson } from "./parse-spotify-streaming-history-json";

export type PreparedOnboardingImport = {
  rows: NormalizedListenInput[];
  parsedRows: number;
  skippedByCursor: number;
  mode: OnboardingImportMode;
  cursor: {
    listenCount: number;
    lastPlayedAt: string | null;
    lastTrackLabel: string | null;
  } | null;
  emptySpotifyZip?: true;
};

export async function prepareOnboardingImportRows(params: {
  userId: string;
  provider: OnboardingImportProvider;
  mode: OnboardingImportMode;
  spotifyZipBuffer?: Buffer;
  appleCsvText?: string;
  /** Lignes déjà parsées côté client (gros fichiers). */
  preParsedRows?: NormalizedListenInput[];
}): Promise<PreparedOnboardingImport> {
  const { userId, provider, mode } = params;

  let rows: NormalizedListenInput[];
  if (params.preParsedRows) {
    rows = params.preParsedRows;
  } else if (provider === "spotify" && params.spotifyZipBuffer) {
    const jsonTexts = await extractSpotifyStreamingHistoryJsonTextsFromZip(
      params.spotifyZipBuffer
    );
    if (jsonTexts.length === 0) {
      return {
        rows: [],
        parsedRows: 0,
        skippedByCursor: 0,
        mode,
        cursor: null,
        emptySpotifyZip: true as const,
      };
    }
    rows = jsonTexts.flatMap((text) => parseSpotifyStreamingHistoryAudioJson(text));
  } else if (provider === "apple" && params.appleCsvText !== undefined) {
    rows = parseApplePlayHistoryDailyTracksCsv(params.appleCsvText);
  } else {
    rows = [];
  }

  const parsedRows = rows.length;
  let skippedByCursor = 0;
  let cursorInfo: PreparedOnboardingImport["cursor"] = null;

  if (mode === "incremental") {
    const cursor = await getUserImportCursor(userId, provider);
    cursorInfo = {
      listenCount: cursor.listenCount,
      lastPlayedAt: cursor.lastPlayedAt?.toISOString() ?? null,
      lastTrackLabel: cursor.lastTrackLabel,
    };

    if (cursor.lastPlayedAt && cursor.listenCount > 0) {
      if (provider === "apple" && params.appleCsvText !== undefined && !params.preParsedRows) {
        const minDateKey = playedAtToDateKey(cursor.lastPlayedAt);
        const { filteredCsv, skippedLines } = filterAppleDailyTracksCsvAfterDate(
          params.appleCsvText,
          minDateKey,
          true
        );
        skippedByCursor = skippedLines;
        rows = parseApplePlayHistoryDailyTracksCsv(filteredCsv);
      } else if (provider === "apple" && params.preParsedRows) {
        const minDateKey = playedAtToDateKey(cursor.lastPlayedAt);
        const minDayStart = Date.UTC(
          Number(minDateKey.slice(0, 4)),
          Number(minDateKey.slice(4, 6)) - 1,
          Number(minDateKey.slice(6, 8)),
          0,
          0,
          0,
          0
        );
        const filtered: NormalizedListenInput[] = [];
        for (const row of rows) {
          if (row.playedAt.getTime() < minDayStart) {
            skippedByCursor++;
          } else {
            filtered.push(row);
          }
        }
        rows = filtered;
      } else {
        const filtered = filterNormalizedListensAfterCursor(rows, cursor.lastPlayedAt);
        skippedByCursor = filtered.skipped;
        rows = filtered.rows;
      }
    }
  }

  return {
    rows,
    parsedRows,
    skippedByCursor,
    mode,
    cursor: cursorInfo,
  };
}
