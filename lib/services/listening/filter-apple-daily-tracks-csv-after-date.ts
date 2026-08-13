/** Index de la colonne « Date Played » dans le CSV Daily Tracks. */
export const APPLE_DAILY_TRACKS_DATE_PLAYED_INDEX = 3;

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

/**
 * Filtre le CSV Daily Tracks aux lignes dont Date Played est à ou après minDateKey (YYYYMMDD).
 * Inclusif pour permettre de compléter le dernier jour déjà partiellement importé.
 */
export function filterAppleDailyTracksCsvAfterDate(
  csvText: string,
  minDateKey: string,
  inclusive = true
): {
  filteredCsv: string;
  keptLines: number;
  skippedLines: number;
  maxDateKey: string | null;
} {
  const text = csvText.replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) {
    return {
      filteredCsv: "",
      keptLines: 0,
      skippedLines: 0,
      maxDateKey: null,
    };
  }

  const header = lines[0]!;
  const kept: string[] = [header];
  let keptLines = 0;
  let skippedLines = 0;
  let maxDateKey: string | null = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    const fields = parseCSVLine(line);
    const datePlayed = fields[APPLE_DAILY_TRACKS_DATE_PLAYED_INDEX];

    if (!datePlayed || datePlayed.length !== 8) {
      skippedLines++;
      continue;
    }

    if (maxDateKey === null || datePlayed > maxDateKey) {
      maxDateKey = datePlayed;
    }

    const keep = inclusive
      ? datePlayed >= minDateKey
      : datePlayed > minDateKey;

    if (keep) {
      kept.push(line);
      keptLines++;
    } else {
      skippedLines++;
    }
  }

  return {
    filteredCsv: kept.join("\n"),
    keptLines,
    skippedLines,
    maxDateKey,
  };
}
