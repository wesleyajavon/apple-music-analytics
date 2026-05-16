/**
 * Deterministic copy for the top-tracks preset — avoids a second Groq round-trip
 * (major latency win when TPM pacing or API retries stack up).
 */

import type { AiLocale } from "@/lib/services/ai/locale-utils";

export type TopTracksPeriodToolResult = {
  period: { startDate: string; endDate: string };
  tracks: Array<{
    title: string;
    artistName: string;
    listenCount: number;
    firstListenAt: string;
    lastListenAt: string;
  }>;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function isTopTracksPeriodToolResult(
  value: unknown
): value is TopTracksPeriodToolResult {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  const period = o.period;
  if (!period || typeof period !== "object") return false;
  const p = period as Record<string, unknown>;
  if (
    !isNonEmptyString(p.startDate) ||
    !isNonEmptyString(p.endDate)
  ) {
    return false;
  }
  return Array.isArray(o.tracks);
}

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

function copy(locale: AiLocale): {
  empty: (a: string, b: string) => string;
  intro: (a: string, b: string) => string;
  caveat: string;
  listens: (n: number) => string;
  span: (min: string, max: string) => string;
} {
  switch (locale) {
    case "fr":
      return {
        empty: (d1, d2) =>
          `Aucune écoute dans ton historique entre le ${d1} et le ${d2}. Essaie une autre année ou vérifie le filtre de dates du tableau de bord.`,
        intro: (d1, d2) =>
          `Tes titres les plus écoutés entre le ${d1} et le ${d2} :`,
        caveat:
          "Les totaux reposent uniquement sur l'historique d'écoute que tu as importé.",
        listens: (n) =>
          `${n} ${n === 1 ? "écoute" : "écoutes"}`,
        span: (min, max) =>
          `Pour ces titres, la première lecture de ce classement remonte au ${min}, la plus récente au ${max}.`,
      };
    case "es":
      return {
        empty: (d1, d2) =>
          `No hay reproducciones en tu historial entre el ${d1} y el ${d2}. Prueba con otro año o revisa el filtro de fechas del panel.`,
        intro: (d1, d2) =>
          `Tus canciones más reproducidas entre el ${d1} y el ${d2}:`,
        caveat:
          "Los totales se basan solo en el historial de escucha que has importado.",
        listens: (n) =>
          `${n} ${n === 1 ? "reproducción" : "reproducciones"}`,
        span: (min, max) =>
          `En este ranking, la reproducción más antigua es del ${min} y la más reciente del ${max}.`,
      };
    case "en":
    default:
      return {
        empty: (d1, d2) =>
          `There are no plays in your history between ${d1} and ${d2}. Try another year or check your dashboard date filter.`,
        intro: (d1, d2) =>
          `Your most-played tracks between ${d1} and ${d2}:`,
        caveat: "Counts are based only on listening history you have imported.",
        listens: (n) => `${n} ${n === 1 ? "listen" : "listens"}`,
        span: (min, max) =>
          `Across these tracks, your first play in this ranking was on ${min} and your most recent on ${max}.`,
      };
  }
}

/**
 * Renders the final user-facing answer for getTopTracksForPeriod (preset flow).
 */
export function formatTopTracksPresetAnswer(
  locale: AiLocale,
  result: TopTracksPeriodToolResult
): string {
  const t = copy(locale);
  const { startDate, endDate } = result.period;
  const d1 = formatMediumDate(`${startDate}T00:00:00.000Z`, locale);
  const d2 = formatMediumDate(`${endDate}T00:00:00.000Z`, locale);

  if (result.tracks.length === 0) {
    return [t.empty(d1, d2), "", t.caveat].join("\n");
  }

  let minIso = result.tracks[0].firstListenAt;
  let maxIso = result.tracks[0].lastListenAt;
  for (const row of result.tracks) {
    if (row.firstListenAt < minIso) minIso = row.firstListenAt;
    if (row.lastListenAt > maxIso) maxIso = row.lastListenAt;
  }

  const bullets = result.tracks.map(
    (row) =>
      `- ${row.title} — ${row.artistName} (${t.listens(row.listenCount)})`
  );

  return [
    t.intro(d1, d2),
    "",
    ...bullets,
    "",
    t.span(
      formatMediumDate(minIso, locale),
      formatMediumDate(maxIso, locale)
    ),
    "",
    t.caveat,
  ].join("\n");
}
