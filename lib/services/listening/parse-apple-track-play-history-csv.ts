import type { NormalizedListenInput } from "./onboarding-import-types";

const TRACK_NAME_INDEX = 0;
const LAST_PLAYED_INDEX = 1;

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

function parseTrackNameField(raw: string): {
  artistName: string | null;
  trackName: string | null;
} {
  if (!raw || typeof raw !== "string") {
    return { artistName: null, trackName: null };
  }
  const sep = " - ";
  const idx = raw.indexOf(sep);
  if (idx === -1) {
    return { artistName: raw.trim(), trackName: "" };
  }
  return {
    artistName: raw.slice(0, idx).trim(),
    trackName: raw.slice(idx + sep.length).trim(),
  };
}

/**
 * Parse le CSV « Apple Music - Track Play History.csv » (export confidentialité Apple).
 * Colonnes : Track Name, Last Played Date (unix ms), Is User Initiated.
 */
export function parseAppleTrackPlayHistoryCsv(csvText: string): NormalizedListenInput[] {
  const text = csvText.replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return [];

  const seen = new Set<string>();
  const out: NormalizedListenInput[] = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const fields = parseCSVLine(lines[lineIndex]!);
    const trackField = fields[TRACK_NAME_INDEX];
    const lastPlayedRaw = fields[LAST_PLAYED_INDEX];

    if (!trackField || !lastPlayedRaw) continue;

    const ts = parseInt(lastPlayedRaw, 10);
    if (Number.isNaN(ts) || ts <= 0) continue;

    const { artistName, trackName } = parseTrackNameField(trackField);
    if (!artistName || !trackName) continue;

    const playedAt = new Date(ts);
    if (Number.isNaN(playedAt.getTime())) continue;

    const dedupeKey = `${artistName.toLowerCase()}\0${trackName.toLowerCase()}\0${ts}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    out.push({ artistName, trackName, playedAt });
  }

  return out;
}
