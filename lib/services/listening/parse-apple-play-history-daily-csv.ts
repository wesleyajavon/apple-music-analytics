import type { NormalizedListenInput } from "./onboarding-import-types";

// Indices alignés sur scripts/import-apple-music-csv.js (export « Play History Daily Tracks »).
const DATE_PLAYED_INDEX = 3;
const HOURS_INDEX = 4;
const PLAY_COUNT_INDEX = 8;
const TRACK_DESCRIPTION_INDEX = 12;

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseTrackDescription(description: string): {
  artistName: string | null;
  trackName: string | null;
} {
  if (!description || typeof description !== "string") {
    return { artistName: null, trackName: null };
  }
  const sep = " - ";
  const idx = description.indexOf(sep);
  if (idx === -1) {
    return { artistName: description.trim(), trackName: "" };
  }
  return {
    artistName: description.slice(0, idx).trim(),
    trackName: description.slice(idx + sep.length).trim(),
  };
}

function parseHours(hoursStr: string): number[] {
  if (!hoursStr) return [];
  return hoursStr
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n >= 0 && n <= 23);
}

/** Horodatage déterministe (évite doublons différents à chaque ré-import). */
function buildPlayedAtUtc(dateStr: string, hour: number, salt: number): Date | null {
  if (!dateStr || dateStr.length !== 8) return null;
  const y = parseInt(dateStr.slice(0, 4), 10);
  const m = parseInt(dateStr.slice(4, 6), 10) - 1;
  const d = parseInt(dateStr.slice(6, 8), 10);
  const min = salt % 60;
  const sec = Math.floor(salt / 60) % 60;
  const ms = salt % 1000;
  return new Date(Date.UTC(y, m, d, hour, min, sec, ms));
}

/**
 * Parse le CSV « Apple Music - Play History Daily Tracks.csv » (texte UTF-8, avec ou sans BOM).
 */
export function parseApplePlayHistoryDailyTracksCsv(csvText: string): NormalizedListenInput[] {
  const text = csvText.replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return [];

  const out: NormalizedListenInput[] = [];
  let salt = 0;

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const fields = parseCSVLine(lines[lineIndex]!);
    const datePlayed = fields[DATE_PLAYED_INDEX];
    const hoursStr = fields[HOURS_INDEX] ?? "";
    const playCount = parseInt(fields[PLAY_COUNT_INDEX] ?? "0", 10) || 1;
    const description = fields[TRACK_DESCRIPTION_INDEX] ?? "";

    const { artistName, trackName } = parseTrackDescription(description);
    if (!artistName || !trackName) continue;

    const hours = parseHours(hoursStr);
    if (hours.length === 0) continue;

    for (let i = 0; i < playCount; i++) {
      const hour = hours[i % hours.length]!;
      const playedAt = buildPlayedAtUtc(datePlayed, hour, salt++);
      if (playedAt) {
        out.push({ artistName, trackName, playedAt });
      }
    }
  }

  return out;
}
