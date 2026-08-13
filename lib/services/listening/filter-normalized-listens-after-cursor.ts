import type { NormalizedListenInput } from "./onboarding-import-types";

/** Marge pour ne pas rater des écoutes proches du curseur (sync Spotify Web API). */
const CURSOR_MARGIN_MS = 5 * 60 * 1000;

/**
 * Ne conserve que les écoutes strictement postérieures au curseur (avec marge).
 * Les doublons exacts restent filtrés côté import.
 */
export function filterNormalizedListensAfterCursor(
  rows: NormalizedListenInput[],
  cursorPlayedAt: Date
): { rows: NormalizedListenInput[]; skipped: number } {
  const threshold = cursorPlayedAt.getTime() - CURSOR_MARGIN_MS;
  const filtered: NormalizedListenInput[] = [];
  let skipped = 0;

  for (const row of rows) {
    if (row.playedAt.getTime() <= threshold) {
      skipped++;
      continue;
    }
    filtered.push(row);
  }

  return { rows: filtered, skipped };
}
