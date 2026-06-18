/**
 * Deterministic copy for the top-artists preset — avoids Groq on this flow (see top-tracks preset).
 */

import type { AiLocale } from "@/lib/services/ai/locale-utils";

export type TopArtistsPeriodToolResult = {
  period: { startDate: string; endDate: string };
  artists: Array<{
    artistName: string;
    listenCount: number;
    uniqueTracks: number;
    firstListenAt: string;
    lastListenAt: string;
  }>;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function isTopArtistsPeriodToolResult(
  value: unknown
): value is TopArtistsPeriodToolResult {
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
  return Array.isArray(o.artists);
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

type ArtistsCopyPack = {
  empty: (a: string, b: string) => string;
  intro: (a: string, b: string) => string;
  caveat: string;
  line: (
    artistName: string,
    listensPhrase: string,
    uniquePhrase: string
  ) => string;
  listens: (n: number) => string;
  uniqueTracks: (n: number) => string;
  span: (min: string, max: string) => string;
};

function copy(locale: AiLocale): ArtistsCopyPack {
  switch (locale) {
    case "fr":
      return {
        empty: (d1, d2) =>
          `Aucun stream dans ton historique entre le ${d1} et le ${d2}. Essaie une autre année ou vérifie le filtre de dates du tableau de bord.`,
        intro: (d1, d2) =>
          `Tes artistes les plus streamés entre le ${d1} et le ${d2} :`,
        caveat:
          "Les totaux reposent uniquement sur l'historique de streams que tu as importé.",
        line: (name, listens, uniq) =>
          `- ${name} (${listens}, ${uniq})`,
        listens: (n) =>
          `${n} ${n === 1 ? "stream" : "streams"}`,
        uniqueTracks: (n) =>
          `${n} ${n === 1 ? "titre différent" : "titres différents"}`,
        span: (min, max) =>
          `Pour ces artistes, la première lecture de ce classement remonte au ${min}, la plus récente au ${max}.`,
      };
    case "es":
      return {
        empty: (d1, d2) =>
          `No hay streams en tu historial entre el ${d1} y el ${d2}. Prueba con otro año o revisa el filtro de fechas del panel.`,
        intro: (d1, d2) =>
          `Tus artistas más streameados entre el ${d1} y el ${d2}:`,
        caveat:
          "Los totales se basan solo en el historial de streams que has importado.",
        line: (name, listens, uniq) =>
          `- ${name} (${listens}, ${uniq})`,
        listens: (n) =>
          `${n} ${n === 1 ? "stream" : "streams"}`,
        uniqueTracks: (n) =>
          `${n} ${n === 1 ? "pista distinta" : "pistas distintas"}`,
        span: (min, max) =>
          `En este ranking, el stream más antiguo es del ${min} y el más reciente del ${max}.`,
      };
    case "en":
    default:
      return {
        empty: (d1, d2) =>
          `There are no streams in your history between ${d1} and ${d2}. Try another year or check your dashboard date filter.`,
        intro: (d1, d2) =>
          `Your top artists between ${d1} and ${d2}:`,
        caveat:
          "Counts are based only on streaming history you have imported.",
        line: (name, listens, uniq) =>
          `- ${name} (${listens}, ${uniq})`,
        listens: (n) =>
          `${n} ${n === 1 ? "stream" : "streams"}`,
        uniqueTracks: (n) =>
          `${n} ${n === 1 ? "unique track" : "unique tracks"}`,
        span: (min, max) =>
          `Across these artists, your first stream in this ranking was on ${min} and your most recent on ${max}.`,
      };
  }
}

export function formatTopArtistsPresetAnswer(
  locale: AiLocale,
  result: TopArtistsPeriodToolResult
): string {
  const t = copy(locale);
  const { startDate, endDate } = result.period;
  const d1 = formatMediumDate(`${startDate}T00:00:00.000Z`, locale);
  const d2 = formatMediumDate(`${endDate}T00:00:00.000Z`, locale);

  if (result.artists.length === 0) {
    return [t.empty(d1, d2), "", t.caveat].join("\n");
  }

  let minIso = result.artists[0].firstListenAt;
  let maxIso = result.artists[0].lastListenAt;
  for (const row of result.artists) {
    if (row.firstListenAt < minIso) minIso = row.firstListenAt;
    if (row.lastListenAt > maxIso) maxIso = row.lastListenAt;
  }

  const bullets = result.artists.map((row) =>
    t.line(
      row.artistName,
      t.listens(row.listenCount),
      t.uniqueTracks(row.uniqueTracks)
    )
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
