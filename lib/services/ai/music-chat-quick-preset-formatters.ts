/**
 * Deterministic final copy for quick-question presets (no second Groq call).
 */

import type { AiLocale } from "@/lib/services/ai/locale-utils";

function intlLocale(locale: AiLocale): string {
  switch (locale) {
    case "fr":
      return "fr-FR";
    case "es":
      return "es-ES";
    case "en":
    default:
      return "en-US";
  }
}

function formatMediumDate(isoUtc: string, locale: AiLocale): string {
  const d = new Date(isoUtc);
  if (Number.isNaN(d.getTime())) return isoUtc.slice(0, 10);
  return new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(d);
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseIsoDateParts(
  isoDate: string
): { y: number; m: number; d: number } | null {
  const match = ISO_DATE_RE.exec(isoDate);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return { y, m, d };
}

function isFullCalendarYear(startDate: string, endDate: string): boolean {
  const start = parseIsoDateParts(startDate);
  const end = parseIsoDateParts(endDate);
  if (!start || !end) return false;
  return (
    start.y === end.y &&
    start.m === 1 &&
    start.d === 1 &&
    end.m === 12 &&
    end.d === 31
  );
}

function lastDayOfMonthUtc(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isFullCalendarMonth(startDate: string, endDate: string): boolean {
  const start = parseIsoDateParts(startDate);
  const end = parseIsoDateParts(endDate);
  if (!start || !end) return false;
  if (start.y !== end.y || start.m !== end.m) return false;
  return start.d === 1 && end.d === lastDayOfMonthUtc(start.y, start.m);
}

function formatMonthYear(isoDate: string, locale: AiLocale): string {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return isoDate.slice(0, 7);
  return new Intl.DateTimeFormat(intlLocale(locale), {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/** Human-friendly label for a listening period (year → "2020", month → "June 2024", else medium dates). */
export function formatPeriodRangeLabel(
  startDate: string,
  endDate: string,
  locale: AiLocale
): string {
  if (!startDate && !endDate) return "";
  if (startDate && startDate === endDate) {
    return formatMediumDate(`${startDate}T00:00:00.000Z`, locale);
  }
  if (isFullCalendarYear(startDate, endDate)) {
    return startDate.slice(0, 4);
  }
  if (isFullCalendarMonth(startDate, endDate)) {
    return formatMonthYear(startDate, locale);
  }
  const d1 = formatMediumDate(`${startDate}T00:00:00.000Z`, locale);
  const d2 = formatMediumDate(`${endDate}T00:00:00.000Z`, locale);
  return `${d1} – ${d2}`;
}

function formatListeningPeriodPhrase(
  locale: AiLocale,
  startDate: string,
  endDate: string
): string {
  if (isFullCalendarYear(startDate, endDate) || isFullCalendarMonth(startDate, endDate)) {
    const label = formatPeriodRangeLabel(startDate, endDate, locale);
    if (locale === "fr") return `en ${label}`;
    if (locale === "es") return `en ${label}`;
    return `in ${label}`;
  }
  const d1 = formatMediumDate(`${startDate}T00:00:00.000Z`, locale);
  const d2 = formatMediumDate(`${endDate}T00:00:00.000Z`, locale);
  if (locale === "fr") return `entre le ${d1} et le ${d2}`;
  if (locale === "es") return `entre el ${d1} y el ${d2}`;
  return `between ${d1} and ${d2}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

// --- Genre breakdown ---

export type GenreBreakdownToolResult = {
  period: { startDate: string; endDate: string };
  totalListens: number;
  genres: Array<{ genre: string; count: number; percentage: number }>;
};

export function isGenreBreakdownToolResult(
  value: unknown
): value is GenreBreakdownToolResult {
  if (!isRecord(value)) return false;
  const p = value.period;
  if (!isRecord(p)) return false;
  return (
    typeof p.startDate === "string" &&
    typeof p.endDate === "string" &&
    typeof value.totalListens === "number" &&
    Array.isArray(value.genres)
  );
}

export function formatGenreBreakdownPresetAnswer(
  locale: AiLocale,
  result: GenreBreakdownToolResult
): string {
  const periodPhrase = formatListeningPeriodPhrase(
    locale,
    result.period.startDate,
    result.period.endDate
  );
  const bullets = result.genres.map(
    (g) =>
      `- ${g.genre} (${g.count} ${locale === "fr" ? "écoutes" : locale === "es" ? "reproducciones" : "listens"}, ${g.percentage.toFixed(1)}%)`
  );
  const intro =
    locale === "fr"
      ? `Tes genres les plus écoutés ${periodPhrase} :`
      : locale === "es"
        ? `Tus géneros más escuchados ${periodPhrase}:`
        : `Your top genres ${periodPhrase}:`;
  const caveat =
    locale === "fr"
      ? "Les totaux reposent uniquement sur l’historique d’écoute importé (résolution genre : piste, puis mapping artiste si besoin)."
      : locale === "es"
        ? "Los totales se basan solo en el historial importado (género de la pista, o mapa del artista)."
        : "Counts use only imported history (track genre, then artist map when needed).";
  if (result.genres.length === 0 || result.totalListens <= 0) {
    const empty =
      locale === "fr"
        ? `Aucune écoute pour cette période.`
        : locale === "es"
          ? `Sin reproducciones en este periodo.`
          : `No plays in this period.`;
    return [empty, "", caveat].join("\n");
  }
  return [intro, "", ...bullets, "", caveat].join("\n");
}

// --- Compare periods ---

export type ComparePeriodsToolResult = {
  firstPeriod: {
    startDate: string;
    endDate: string;
    topTracks: Array<{
      title: string;
      artistName: string;
      listenCount: number;
    }>;
    topArtists: Array<{ artistName: string; listenCount: number }>;
  };
  secondPeriod: {
    startDate: string;
    endDate: string;
    topTracks: Array<{
      title: string;
      artistName: string;
      listenCount: number;
    }>;
    topArtists: Array<{ artistName: string; listenCount: number }>;
  };
};

export function isComparePeriodsToolResult(
  value: unknown
): value is ComparePeriodsToolResult {
  if (!isRecord(value)) return false;
  return isRecord(value.firstPeriod) && isRecord(value.secondPeriod);
}

export function formatComparePeriodsPresetAnswer(
  locale: AiLocale,
  result: ComparePeriodsToolResult
): string {
  const fmt = (sd: string, ed: string) => formatPeriodRangeLabel(sd, ed, locale);
  const hFirst =
    locale === "fr"
      ? `Période 1 (${fmt(result.firstPeriod.startDate, result.firstPeriod.endDate)})`
      : locale === "es"
        ? `Periodo 1 (${fmt(result.firstPeriod.startDate, result.firstPeriod.endDate)})`
        : `Period 1 (${fmt(result.firstPeriod.startDate, result.firstPeriod.endDate)})`;
  const hSecond =
    locale === "fr"
      ? `Période 2 (${fmt(result.secondPeriod.startDate, result.secondPeriod.endDate)})`
      : locale === "es"
        ? `Periodo 2 (${fmt(result.secondPeriod.startDate, result.secondPeriod.endDate)})`
        : `Period 2 (${fmt(result.secondPeriod.startDate, result.secondPeriod.endDate)})`;
  const artWord =
    locale === "fr" ? "Artistes" : locale === "es" ? "Artistas" : "Artists";
  const lines: string[] = [
    locale === "fr"
      ? "Comparaison des tops (limités à 5 par période) :"
      : locale === "es"
        ? "Comparación de tops (máx. 5 por periodo):"
        : "Comparison of tops (up to 5 per period):",
    "",
    hFirst,
    "",
    locale === "fr"
      ? "Titres :"
      : locale === "es"
        ? "Canciones:"
        : "Tracks:",
  ];
  for (const t of result.firstPeriod.topTracks) {
    lines.push(
      `- ${t.title} — ${t.artistName} (${t.listenCount})`
    );
  }
  lines.push("", artWord + ":");
  for (const a of result.firstPeriod.topArtists) {
    lines.push(`- ${a.artistName} (${a.listenCount})`);
  }
  lines.push("", hSecond);
  lines.push(
    "",
    locale === "fr"
      ? "Titres :"
      : locale === "es"
        ? "Canciones:"
        : "Tracks:"
  );
  for (const t of result.secondPeriod.topTracks) {
    lines.push(
      `- ${t.title} — ${t.artistName} (${t.listenCount})`
    );
  }
  lines.push("", artWord + ":");
  for (const a of result.secondPeriod.topArtists) {
    lines.push(`- ${a.artistName} (${a.listenCount})`);
  }
  lines.push(
    "",
    locale === "fr"
      ? "Les totaux reposent uniquement sur l’historique importé."
      : locale === "es"
        ? "Los totales se basan solo en el historial importado."
        : "Counts are based only on imported history."
  );
  return lines.join("\n");
}

// --- Yearly trends ---

export type YearlyTrendsToolResult = {
  years: Array<{
    year: number;
    listenCount: number;
    uniqueTracks: number;
    uniqueArtists: number;
  }>;
};

export function isYearlyTrendsToolResult(
  value: unknown
): value is YearlyTrendsToolResult {
  return isRecord(value) && Array.isArray(value.years);
}

export function formatYearlyTrendsPresetAnswer(
  locale: AiLocale,
  result: YearlyTrendsToolResult
): string {
  if (result.years.length === 0) {
    return locale === "fr"
      ? "Aucune année d’écoute dans ton historique importé."
      : locale === "es"
        ? "No hay años de escucha en tu historial importado."
        : "No listening years in your imported history.";
  }
  const intro =
    locale === "fr"
      ? "Volume d’écoute par année (années les plus récentes selon la limite de la requête) :"
      : locale === "es"
        ? "Volumen de escucha por año (años más recientes según el límite de la consulta):"
        : "Listening volume by year (most recent years within the query limit):";
  const fixed = result.years.map((y) =>
    locale === "fr"
      ? `- ${y.year} : ${y.listenCount} écoutes, ${y.uniqueTracks} titres, ${y.uniqueArtists} artistes`
      : locale === "es"
        ? `- ${y.year}: ${y.listenCount} reproducciones, ${y.uniqueTracks} pistas, ${y.uniqueArtists} artistas`
        : `- ${y.year}: ${y.listenCount} listens, ${y.uniqueTracks} tracks, ${y.uniqueArtists} artists`
  );
  const caveat =
    locale === "fr"
      ? "Les totaux reposent uniquement sur l’historique importé."
      : locale === "es"
        ? "Los totales se basan solo en el historial importado."
        : "Counts are based only on imported history.";
  return [intro, "", ...fixed, "", caveat].join("\n");
}

// --- Consistent artists ---

export type ConsistentArtistsToolResult = {
  metric: string;
  artists: Array<{
    artistName: string;
    totalListens: number;
    activeYears: number;
    activeMonths: number;
    consistencyScore: number;
    firstListenAt: string;
    lastListenAt: string;
  }>;
};

export function isConsistentArtistsToolResult(
  value: unknown
): value is ConsistentArtistsToolResult {
  if (!isRecord(value)) return false;
  return (
    typeof value.metric === "string" && Array.isArray(value.artists)
  );
}

export function formatConsistentArtistsPresetAnswer(
  locale: AiLocale,
  result: ConsistentArtistsToolResult
): string {
  if (result.artists.length === 0) {
    return locale === "fr"
      ? "Pas assez de données pour classer des artistes récurrents."
      : locale === "es"
        ? "No hay datos suficientes para clasificar artistas estables."
        : "Not enough data to rank consistent artists.";
  }
  const intro =
    locale === "fr"
      ? "Artistes les plus constants dans ton historique (score = années actives pondérées + mois + volume) :"
      : locale === "es"
        ? "Artistas más constantes en tu historial (puntuación según años/meses activos y volumen):"
        : "Your most consistent artists over time (score weights active years, months, and volume):";
  const lines = result.artists.map((a) =>
    locale === "fr"
      ? `- ${a.artistName} — score ${a.consistencyScore}, ${a.totalListens} écoutes, ${a.activeYears} ans actifs, ${a.activeMonths} mois actifs (du ${formatMediumDate(a.firstListenAt, locale)} au ${formatMediumDate(a.lastListenAt, locale)})`
      : locale === "es"
        ? `- ${a.artistName} — puntuación ${a.consistencyScore}, ${a.totalListens} reproducciones, ${a.activeYears} años activos, ${a.activeMonths} meses activos (${formatMediumDate(a.firstListenAt, locale)} – ${formatMediumDate(a.lastListenAt, locale)})`
        : `- ${a.artistName} — score ${a.consistencyScore}, ${a.totalListens} listens, ${a.activeYears} active years, ${a.activeMonths} active months (${formatMediumDate(a.firstListenAt, locale)} to ${formatMediumDate(a.lastListenAt, locale)})`
  );
  const caveat =
    locale === "fr"
      ? "Les totaux reposent uniquement sur l’historique importé."
      : locale === "es"
        ? "Los totales se basan solo en el historial importado."
        : "Counts are based only on imported history.";
  return [intro, "", ...lines, "", caveat].join("\n");
}

// --- Late night ---

export type LateNightProfileToolResult = {
  period: { startDate: string; endDate: string };
  periodTotalListens: number;
  lateNight: {
    listens: number;
    shareOfPeriodListensPct: number;
    peakHourWithinWindow: { hour: number; listens: number } | null;
  };
  topTracks: Array<{ title: string; artistName: string; listenCount: number }>;
  topArtists: Array<{ artistName: string; listenCount: number }>;
};

export function isLateNightProfileToolResult(
  value: unknown
): value is LateNightProfileToolResult {
  if (!isRecord(value)) return false;
  return (
    isRecord(value.period) &&
    typeof value.periodTotalListens === "number" &&
    isRecord(value.lateNight) &&
    Array.isArray(value.topTracks) &&
    Array.isArray(value.topArtists)
  );
}

export function formatLateNightPresetAnswer(
  locale: AiLocale,
  result: LateNightProfileToolResult
): string {
  const p1 = formatMediumDate(`${result.period.startDate}T00:00:00.000Z`, locale);
  const p2 = formatMediumDate(`${result.period.endDate}T00:00:00.000Z`, locale);
  const share = result.lateNight.shareOfPeriodListensPct;
  const intro =
    locale === "fr"
      ? `Fenêtre récente (${p1}–${p2}, heures 22–03 UTC) : ${result.lateNight.listens} écoutes nocturnes sur ${result.periodTotalListens} au total (${share.toFixed(1)} %).`
      : locale === "es"
        ? `Ventana reciente (${p1}–${p2}, horas 22–03 UTC): ${result.lateNight.listens} reproducciones nocturnas de ${result.periodTotalListens} (${share.toFixed(1)} %).`
        : `Recent window (${p1}–${p2}, 22–03 UTC): ${result.lateNight.listens} late-night plays out of ${result.periodTotalListens} (${share.toFixed(1)}%).`;
  const ph = result.lateNight.peakHourWithinWindow;
  const peak = ph
    ? locale === "fr"
      ? `Heure la plus dense dans la fenêtre : ${ph.hour}:00 UTC (${ph.listens} écoutes).`
      : locale === "es"
        ? `Hora con más escuchas en la ventana: ${ph.hour}:00 UTC (${ph.listens}).`
        : `Busiest hour in the window: ${ph.hour}:00 UTC (${ph.listens} listens).`
    : null;
  const blocks: string[] = [intro];
  if (peak) {
    blocks.push("", peak);
  }
  if (result.topTracks.length > 0) {
    blocks.push(
      "",
      locale === "fr"
        ? "Titres (nocturnes) :"
        : locale === "es"
          ? "Canciones (nocturnas):"
          : "Tracks (late night):"
    );
    for (const t of result.topTracks) {
      blocks.push(`- ${t.title} — ${t.artistName} (${t.listenCount})`);
    }
  }
  if (result.topArtists.length > 0) {
    blocks.push(
      "",
      locale === "fr"
        ? "Artistes :"
        : locale === "es"
          ? "Artistas:"
          : "Artists:"
    );
    for (const a of result.topArtists) {
      blocks.push(`- ${a.artistName} (${a.listenCount})`);
    }
  }
  blocks.push(
    "",
    locale === "fr"
      ? "Les totaux reposent sur l’historique importé et une fenêtre UTC récente — pas nécessairement tout le filtre du tableau de bord."
      : locale === "es"
        ? "Los totales usan historial importado y una ventana UTC reciente; no siempre todo el rango del panel."
        : "Counts use imported history and a recent UTC window—not always your full dashboard range."
  );
  return blocks.join("\n");
}

// --- Taste shift ---

function pickName(o: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return "?";
}

export function formatTasteShiftPresetAnswer(locale: AiLocale, result: unknown): string {
  if (!isRecord(result)) return "";
  const periods = result.periods;
  if (!isRecord(periods)) return "";
  const first = periods.first;
  const second = periods.second;
  if (!isRecord(first) || !isRecord(second)) return "";

  const d1s =
    typeof first.startDate === "string" ? first.startDate : "";
  const d1e = typeof first.endDate === "string" ? first.endDate : "";
  const d2s =
    typeof second.startDate === "string" ? second.startDate : "";
  const d2e = typeof second.endDate === "string" ? second.endDate : "";

  const period1 = formatPeriodRangeLabel(d1s, d1e, locale);
  const period2 = formatPeriodRangeLabel(d2s, d2e, locale);

  const intro =
    locale === "fr"
      ? `Changement de goût entre ${period1} et ${period2} :`
      : locale === "es"
        ? `Cambio de gusto entre ${period1} y ${period2}:`
        : `Taste shift between ${period1} and ${period2}:`;

  const lines: string[] = [intro, ""];

  const topA =
    locale === "fr"
      ? "Quelques artistes mis en avant par période :"
      : locale === "es"
        ? "Artistas destacados por periodo:"
        : "Notable artists by period:";
  lines.push(topA);
  const fa = first.topArtists;
  const sa = second.topArtists;
  if (Array.isArray(fa)) {
    lines.push(
      locale === "fr"
        ? `Première période (${period1}) :`
        : locale === "es"
          ? `Primer periodo (${period1}):`
          : `First period (${period1}):`
    );
    for (const x of fa.slice(0, 5)) {
      if (isRecord(x)) {
        const n = pickName(x, ["artistName", "name"]);
        const c = x.listenCount;
        lines.push(`- ${n} (${typeof c === "number" ? c : 0})`);
      }
    }
  }
  if (Array.isArray(sa)) {
    lines.push(
      "",
      locale === "fr"
        ? `Seconde période (${period2}) :`
        : locale === "es"
          ? `Segundo periodo (${period2}):`
          : `Second period (${period2}):`
    );
    for (const x of sa.slice(0, 5)) {
      if (isRecord(x)) {
        const n = pickName(x, ["artistName", "name"]);
        const c = x.listenCount;
        lines.push(`- ${n} (${typeof c === "number" ? c : 0})`);
      }
    }
  }

  const deltas = result.deltas;
  if (isRecord(deltas)) {
    const art = deltas.artists;
    if (isRecord(art)) {
      const rising = art.rising;
      const declining = art.declining;
      lines.push(
        "",
        locale === "fr"
          ? "Mouvements d’artistes (delta d’écoutes) :"
          : locale === "es"
            ? "Movimientos de artistas (delta de reproducciones):"
            : "Artist listen deltas:"
      );
      if (Array.isArray(rising)) {
        for (const x of rising.slice(0, 5)) {
          if (isRecord(x)) {
            const n = pickName(x, ["artistName", "name"]);
            const d = x.delta;
            lines.push(`- ↑ ${n}: ${typeof d === "number" ? d : 0}`);
          }
        }
      }
      if (Array.isArray(declining)) {
        for (const x of declining.slice(0, 5)) {
          if (isRecord(x)) {
            const n = pickName(x, ["artistName", "name"]);
            const d = x.delta;
            lines.push(`- ↓ ${n}: ${typeof d === "number" ? d : 0}`);
          }
        }
      }
    }
    const gen = deltas.genres;
    if (isRecord(gen)) {
      const rising = gen.rising;
      const declining = gen.declining;
      lines.push(
        "",
        locale === "fr"
          ? "Mouvements de genres :"
          : locale === "es"
            ? "Movimientos de géneros:"
            : "Genre shifts:"
      );
      if (Array.isArray(rising)) {
        for (const x of rising.slice(0, 5)) {
          if (isRecord(x)) {
            const n = pickName(x, ["genre", "name"]);
            const d = x.delta;
            lines.push(`- ↑ ${n}: ${typeof d === "number" ? d : 0}`);
          }
        }
      }
      if (Array.isArray(declining)) {
        for (const x of declining.slice(0, 5)) {
          if (isRecord(x)) {
            const n = pickName(x, ["genre", "name"]);
            const d = x.delta;
            lines.push(`- ↓ ${n}: ${typeof d === "number" ? d : 0}`);
          }
        }
      }
    }
  }

  const dq = result.dataQuality;
  if (isRecord(dq) && dq.insufficientData === true) {
    lines.push(
      "",
      locale === "fr"
        ? "Au moins une période a très peu d’écoutes : interprète ces écarts avec prudence."
        : locale === "es"
          ? "Al menos un periodo tiene muy pocas reproducciones: interpreta con cautela."
          : "At least one period has very little data—treat shifts as directional."
    );
  }

  lines.push(
    "",
    locale === "fr"
      ? "Les totaux reposent uniquement sur l’historique importé."
      : locale === "es"
        ? "Los totales se basan solo en el historial importado."
        : "Counts are based only on imported history."
  );
  return lines.join("\n");
}

export function isTasteShiftSummaryToolResult(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return isRecord(value.periods);
}

// --- Weekly taste evolution ---

const WEEKLY_CLASSIFICATION_LABELS: Record<
  AiLocale,
  Record<string, string>
> = {
  fr: {
    expansion: "Expansion",
    consolidation: "Consolidation",
    exploration: "Exploration",
    regression: "Régression",
    stable: "Stable",
  },
  en: {
    expansion: "Expansion",
    consolidation: "Consolidation",
    exploration: "Exploration",
    regression: "Regression",
    stable: "Stable",
  },
  es: {
    expansion: "Expansión",
    consolidation: "Consolidación",
    exploration: "Exploración",
    regression: "Regresión",
    stable: "Estable",
  },
};

export type WeeklyTasteEvolutionToolResult = {
  period: { startDate: string; endDate: string };
  trends: unknown[];
  skippedWeeks?: unknown;
};

export function isWeeklyTasteEvolutionToolResult(
  value: unknown
): value is WeeklyTasteEvolutionToolResult {
  if (!isRecord(value)) return false;
  const period = value.period;
  if (!isRecord(period)) return false;
  return (
    typeof period.startDate === "string" &&
    typeof period.endDate === "string" &&
    Array.isArray(value.trends)
  );
}

function formatWeeklyVolumeLine(
  locale: AiLocale,
  previousWeekListens: number,
  currentWeekListens: number
): string {
  if (locale === "fr") {
    return `- Écoutes : ${currentWeekListens} cette semaine (${previousWeekListens} la semaine précédente)`;
  }
  if (locale === "es") {
    return `- Reproducciones: ${currentWeekListens} esta semana (${previousWeekListens} la semana anterior)`;
  }
  return `- Listens: ${currentWeekListens} this week (${previousWeekListens} the week before)`;
}

function formatWeeklyGenreListLine(
  locale: AiLocale,
  kind: "rising" | "declining",
  genres: string[]
): string | null {
  if (genres.length === 0) return null;
  const joined = genres.join(", ");
  if (kind === "rising") {
    if (locale === "fr") return `- Genres qui montent : ${joined}`;
    if (locale === "es") return `- Géneros al alza: ${joined}`;
    return `- Rising genres: ${joined}`;
  }
  if (locale === "fr") return `- Genres qui reculent : ${joined}`;
  if (locale === "es") return `- Géneros a la baja: ${joined}`;
  return `- Declining genres: ${joined}`;
}

export function formatWeeklyTasteEvolutionPresetAnswer(
  locale: AiLocale,
  result: unknown
): string {
  if (!isWeeklyTasteEvolutionToolResult(result)) return "";

  const period = result.period;
  const startDate = period.startDate;
  const endDate = period.endDate;
  const periodPhrase = formatListeningPeriodPhrase(locale, startDate, endDate);

  const intro =
    locale === "fr"
      ? `Voici comment tes goûts ont bougé, semaine après semaine ${periodPhrase} :`
      : locale === "es"
        ? `Así han cambiado tus gustos, semana a semana ${periodPhrase}:`
        : `Here’s how your taste shifted, week by week ${periodPhrase}:`;

  const lines: string[] = [intro, ""];

  if (result.trends.length === 0) {
    lines.push(
      locale === "fr"
        ? "Pas assez d’écoutes sur les dernières semaines pour comparer — il faut au moins une dizaine d’écoutes par semaine."
        : locale === "es"
          ? "No hay suficientes reproducciones en las últimas semanas para comparar: hacen falta al menos unas diez por semana."
          : "Not enough listens in recent weeks to compare—you need at least about ten per week."
    );
  } else {
    for (const trend of result.trends) {
      if (!isRecord(trend)) continue;
      const weekLabel =
        typeof trend.weekLabel === "string" ? trend.weekLabel : "";
      const previousWeekLabel =
        typeof trend.previousWeekLabel === "string"
          ? trend.previousWeekLabel
          : "";
      const classification =
        typeof trend.classification === "string"
          ? trend.classification
          : "stable";
      const classLabel =
        WEEKLY_CLASSIFICATION_LABELS[locale][classification] ?? classification;
      const currentWeekListens =
        typeof trend.currentWeekListens === "number"
          ? trend.currentWeekListens
          : 0;
      const previousWeekListens =
        typeof trend.previousWeekListens === "number"
          ? trend.previousWeekListens
          : 0;

      lines.push(
        locale === "fr"
          ? `${previousWeekLabel} → ${weekLabel} — ${classLabel}`
          : locale === "es"
            ? `${previousWeekLabel} → ${weekLabel} — ${classLabel}`
            : `${previousWeekLabel} → ${weekLabel} — ${classLabel}`
      );
      lines.push(
        formatWeeklyVolumeLine(
          locale,
          previousWeekListens,
          currentWeekListens
        )
      );

      const emerging = trend.emergingGenres;
      const risingGenreNames: string[] = [];
      if (Array.isArray(emerging)) {
        for (const item of emerging.slice(0, 3)) {
          if (!isRecord(item)) continue;
          risingGenreNames.push(pickName(item, ["genre", "name"]));
        }
      }
      const risingLine = formatWeeklyGenreListLine(
        locale,
        "rising",
        risingGenreNames
      );
      if (risingLine) lines.push(risingLine);

      const declining = trend.decliningGenres;
      const decliningGenreNames: string[] = [];
      if (Array.isArray(declining)) {
        for (const item of declining.slice(0, 3)) {
          if (!isRecord(item)) continue;
          decliningGenreNames.push(pickName(item, ["genre", "name"]));
        }
      }
      const decliningLine = formatWeeklyGenreListLine(
        locale,
        "declining",
        decliningGenreNames
      );
      if (decliningLine) lines.push(decliningLine);

      const artists = trend.artistMovements;
      if (Array.isArray(artists) && artists.length > 0) {
        lines.push(
          locale === "fr"
            ? "- Artistes qui bougent dans ton top :"
            : locale === "es"
              ? "- Artistas que se mueven en tu top:"
              : "- Artists moving in your top:"
        );
        for (const item of artists.slice(0, 3)) {
          if (!isRecord(item)) continue;
          const name = pickName(item, ["artistName", "name"]);
          const previousRank = item.previousRank;
          const currentRank = item.currentRank;
          if (previousRank === null && typeof currentRank === "number") {
            lines.push(
              locale === "fr"
                ? `  - ${name} (nouveau dans le top, #${currentRank})`
                : locale === "es"
                  ? `  - ${name} (nuevo en el top, #${currentRank})`
                  : `  - ${name} (new in your top, #${currentRank})`
            );
          } else if (
            typeof previousRank === "number" &&
            typeof currentRank === "number"
          ) {
            lines.push(`  - ${name}: #${previousRank} → #${currentRank}`);
          } else {
            lines.push(`  - ${name}`);
          }
        }
      }

      lines.push("");
    }
  }

  const skipped = result.skippedWeeks;
  if (Array.isArray(skipped) && skipped.length > 0) {
    lines.push(
      locale === "fr"
        ? `${skipped.length} semaine(s) sans assez d’écoutes pour être comparées.`
        : locale === "es"
          ? `${skipped.length} semana(s) sin datos suficientes para comparar.`
          : `${skipped.length} week(s) had too little data to compare.`
    );
    lines.push("");
  }

  lines.push(
    locale === "fr"
      ? "Basé uniquement sur ton historique d’écoute importé."
      : locale === "es"
        ? "Basado solo en tu historial de escucha importado."
        : "Based only on your imported listening history."
  );
  return lines.join("\n").trimEnd();
}

// --- Track obsessions ---

export type TrackObsessionsToolResult = {
  period: { startDate: string; endDate: string };
  windowDays: number;
  obsessionWindows: Array<{
    title: string;
    artistName: string;
    listensInWindow: number;
    totalListensInPeriod: number;
    window: { startDate: string; endDate: string };
  }>;
};

export function isTrackObsessionsToolResult(
  value: unknown
): value is TrackObsessionsToolResult {
  if (!isRecord(value)) return false;
  return (
    isRecord(value.period) &&
    typeof value.windowDays === "number" &&
    Array.isArray(value.obsessionWindows)
  );
}

export function formatTrackObsessionsPresetAnswer(
  locale: AiLocale,
  result: TrackObsessionsToolResult
): string {
  const periodPhrase = formatListeningPeriodPhrase(
    locale,
    result.period.startDate,
    result.period.endDate
  );
  const intro =
    locale === "fr"
      ? `Fenêtre courte : ${result.windowDays} jours. Période ${periodPhrase}.`
      : locale === "es"
        ? `Ventana corta: ${result.windowDays} días. Periodo ${periodPhrase}.`
        : `Short window: ${result.windowDays} days. Period ${periodPhrase}.`;

  if (result.obsessionWindows.length === 0) {
    return [
      intro,
      "",
      locale === "fr"
        ? "Aucun pic marquant détecté avec ces paramètres."
        : locale === "es"
          ? "No se detectaron picos claros con estos parámetros."
          : "No strong spikes detected with these settings.",
      "",
      locale === "fr"
        ? "Les totaux reposent sur l’historique importé."
        : locale === "es"
          ? "Los totales se basan solo en el historial importado."
          : "Counts use only imported history.",
    ].join("\n");
  }
  const lines = result.obsessionWindows.map((w) => {
    const windowLabel = formatPeriodRangeLabel(
      w.window.startDate,
      w.window.endDate,
      locale
    );
    return locale === "fr"
      ? `- ${w.title} — ${w.artistName}, ${w.listensInWindow} écoutes sur ${result.windowDays} jours (${windowLabel}), ${w.totalListensInPeriod} sur toute la période`
      : locale === "es"
        ? `- ${w.title} — ${w.artistName}, ${w.listensInWindow} reproducciones en ${result.windowDays} días (${windowLabel}), ${w.totalListensInPeriod} en el periodo completo`
        : `- ${w.title} — ${w.artistName}, ${w.listensInWindow} listens in ${result.windowDays} days (${windowLabel}), ${w.totalListensInPeriod} in the full span`;
  });
  return [
    intro,
    "",
    locale === "fr" ? "Pics détectés :" : locale === "es" ? "Picos:" : "Spikes:",
    "",
    ...lines,
    "",
    locale === "fr"
      ? "Les totaux reposent sur l’historique importé."
      : locale === "es"
        ? "Los totales se basan solo en el historial importado."
        : "Counts use only imported history.",
  ].join("\n");
}
