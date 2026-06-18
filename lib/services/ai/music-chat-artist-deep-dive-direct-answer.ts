/**
 * Deterministic copy for the artist deep-dive preset — no Groq round-trips.
 */

import type { MusicChatMessage } from "@/lib/dto/music-chat";
import type { AiLocale } from "@/lib/services/ai/locale-utils";
import { MUSIC_CHAT_PRESET_QUESTIONS } from "@/lib/services/ai/music-chat-tools";

export type ArtistDeepDiveToolResult = {
  found: boolean;
  requestedArtistName: string;
  period: { startDate: string | null; endDate: string | null };
  totalListens?: number;
  uniqueTracks?: number;
  firstListenAt: string | null;
  lastListenAt: string | null;
  topTracks: Array<{
    title: string;
    listenCount: number;
    genre: string | null;
    firstListenAt: string;
    lastListenAt: string;
  }>;
  yearlyBreakdown: Array<{
    year: number;
    listenCount: number;
    uniqueTracks: number;
  }>;
  artist?: { artistId: string; artistName: string };
  matchedArtistNames?: string[];
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function isArtistDeepDiveToolResult(
  value: unknown
): value is ArtistDeepDiveToolResult {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  if (typeof o.found !== "boolean" || !isNonEmptyString(o.requestedArtistName)) {
    return false;
  }
  const period = o.period;
  if (!period || typeof period !== "object") return false;
  return Array.isArray(o.topTracks) && Array.isArray(o.yearlyBreakdown);
}

/**
 * Parses artist name from preset / free-form deep-dive questions (en, fr, es UI copy).
 */
export function extractArtistNameFromDeepDiveUserMessage(content: string): string | null {
  const t = content.trim();
  if (!t) return null;
  const m = /(?:\bwith\b|\bavec\b|\bcon\b)\s+(.+?)\s*\.?\s*$/i.exec(t);
  if (!m?.[1]) return null;
  return m[1].replace(/\s+/g, " ").trim() || null;
}

export function resolveArtistNameForDeepDivePreset(
  presetArgs: { artistName?: string } | undefined,
  messages: MusicChatMessage[]
): string {
  const raw = typeof presetArgs?.artistName === "string" ? presetArgs.artistName.trim() : "";
  if (raw) return raw;

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const extracted = extractArtistNameFromDeepDiveUserMessage(m.content);
    if (extracted) return extracted;
  }

  const fallbackSentence = MUSIC_CHAT_PRESET_QUESTIONS["artist-deep-dive"];
  return (
    extractArtistNameFromDeepDiveUserMessage(fallbackSentence) ?? "Radiohead"
  );
}

export function buildArtistDeepDiveCacheSuffix(
  presetArgs: { artistName?: string } | undefined,
  messages: MusicChatMessage[]
): string {
  return resolveArtistNameForDeepDivePreset(presetArgs, messages)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
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

function formatPeriodLabel(
  locale: AiLocale,
  start: string | null,
  end: string | null
): string | null {
  if (!start || !end) return null;
  const d1 = formatMediumDate(`${start}T00:00:00.000Z`, locale);
  const d2 = formatMediumDate(`${end}T00:00:00.000Z`, locale);
  switch (locale) {
    case "fr":
      return `Période : du ${d1} au ${d2}.`;
    case "es":
      return `Periodo: del ${d1} al ${d2}.`;
    case "en":
    default:
      return `Period: ${d1} to ${d2}.`;
  }
}

type DeepDiveCopy = {
  notFound: (name: string) => string;
  intro: (name: string) => string;
  totals: (listens: number, tracks: number) => string;
  topTracksHeader: string;
  listens: (n: number) => string;
  trackLine: (title: string, listensPhrase: string, genre: string | null) => string;
  yearsHeader: string;
  yearLine: (y: number, listens: string, uniq: string) => string;
  span: (a: string, b: string) => string;
  caveat: string;
  uniqTracksWord: (n: number) => string;
};

function copy(locale: AiLocale): DeepDiveCopy {
  switch (locale) {
    case "fr":
      return {
        notFound: (name) =>
          `Je n’ai trouvé aucun stream pour « ${name} » dans ton historique importé pour cette requête (et le filtre de dates du tableau de bord s’applique s’il est actif). Essaie un autre nom ou vérifie tes imports.`,
        intro: (name) =>
          `Voici ton historique de streams pour ${name}, d’après les données importées.`,
        totals: (listens, tracks) =>
          `- ${listens} ${listens === 1 ? "stream au total" : "streams au total"}, ${tracks} ${tracks === 1 ? "titre différent" : "titres différents"}`,
        topTracksHeader: `Titres les plus streamés :`,
        listens: (n) =>
          `${n} ${n === 1 ? "stream" : "streams"}`,
        trackLine: (title, listensPhrase, genre) =>
          genre
            ? `- ${title} (${genre}) (${listensPhrase})`
            : `- ${title} (${listensPhrase})`,
        yearsHeader: `Répartition par année :`,
        yearLine: (y, listens, uniq) =>
          `- ${y} : ${listens}, ${uniq}`,
        span: (a, b) =>
          `Toute période confondue pour cet artiste : premier stream le ${a}, plus récent le ${b}.`,
        caveat:
          "Les totaux reposent uniquement sur l’historique de streams que tu as importé.",
        uniqTracksWord: (n) =>
          `${n} ${n === 1 ? "titre différent" : "titres différents"}`,
      };
    case "es":
      return {
        notFound: (name) =>
          `No encontré streams de « ${name} » en tu historial importado para esta consulta (y se aplica el filtro de fechas del panel si está activo). Prueba otro nombre o revisa tus importaciones.`,
        intro: (name) =>
          `Aquí va tu historial de streams con ${name}, según los datos importados.`,
        totals: (listens, tracks) =>
          `- ${listens} ${listens === 1 ? "stream en total" : "streams en total"}, ${tracks} ${tracks === 1 ? "pista distinta" : "pistas distintas"}`,
        topTracksHeader: `Canciones más streameadas:`,
        listens: (n) =>
          `${n} ${n === 1 ? "stream" : "streams"}`,
        trackLine: (title, listensPhrase, genre) =>
          genre
            ? `- ${title} (${genre}) (${listensPhrase})`
            : `- ${title} (${listensPhrase})`,
        yearsHeader: `Por año:`,
        yearLine: (y, listens, uniq) =>
          `- ${y}: ${listens}, ${uniq}`,
        span: (a, b) =>
          `En conjunto para este artista: primer stream el ${a}, el más reciente el ${b}.`,
        caveat:
          "Los totales se basan solo en el historial de streams que has importado.",
        uniqTracksWord: (n) =>
          `${n} ${n === 1 ? "pista distinta" : "pistas distintas"}`,
      };
    case "en":
    default:
      return {
        notFound: (name) =>
          `I couldn’t find any streams for “${name}” in your imported history for this request (and your dashboard date filter applies when it’s active). Try another spelling or check your imports.`,
        intro: (name) =>
          `Here’s your streaming history for ${name}, based on the data you imported.`,
        totals: (listens, tracks) =>
          `- ${listens} total ${listens === 1 ? "stream" : "streams"}, ${tracks} unique ${tracks === 1 ? "track" : "tracks"}`,
        topTracksHeader: `Most-streamed tracks:`,
        listens: (n) => `${n} ${n === 1 ? "stream" : "streams"}`,
        trackLine: (title, listensPhrase, genre) =>
          genre
            ? `- ${title} (${genre}) (${listensPhrase})`
            : `- ${title} (${listensPhrase})`,
        yearsHeader: `Streams by year:`,
        yearLine: (y, listens, uniq) =>
          `- ${y}: ${listens}, ${uniq}`,
        span: (a, b) =>
          `Overall for this artist, your first stream was on ${a} and your most recent on ${b}.`,
        caveat: "Counts are based only on streaming history you have imported.",
        uniqTracksWord: (n) =>
          `${n} unique ${n === 1 ? "track" : "tracks"}`,
      };
  }
}

export function formatArtistDeepDivePresetAnswer(
  locale: AiLocale,
  result: ArtistDeepDiveToolResult
): string {
  const t = copy(locale);
  if (!result.found) {
    return [t.notFound(result.requestedArtistName), "", t.caveat].join("\n");
  }

  const displayName = result.artist?.artistName ?? result.requestedArtistName;
  const periodLine = formatPeriodLabel(
    locale,
    result.period.startDate,
    result.period.endDate
  );

  const totalListens = result.totalListens ?? 0;
  const uniqueTracks = result.uniqueTracks ?? 0;

  const blocks: string[] = [];

  blocks.push(t.intro(displayName));
  if (periodLine) {
    blocks.push("");
    blocks.push(periodLine);
  }

  const matchNote =
    Array.isArray(result.matchedArtistNames) && result.matchedArtistNames.length > 1
      ? locale === "fr"
        ? `Noms regroupés : ${result.matchedArtistNames.join(", ")}.`
        : locale === "es"
          ? `Nombres agrupados: ${result.matchedArtistNames.join(", ")}.`
          : `Grouped names: ${result.matchedArtistNames.join(", ")}.`
      : null;
  if (matchNote) {
    blocks.push("");
    blocks.push(matchNote);
  }

  blocks.push("");
  blocks.push(t.totals(totalListens, uniqueTracks));

  if (result.topTracks.length > 0) {
    blocks.push("");
    blocks.push(t.topTracksHeader);
    for (const row of result.topTracks) {
      blocks.push(
        t.trackLine(row.title, t.listens(row.listenCount), row.genre)
      );
    }
  }

  if (result.yearlyBreakdown.length > 0) {
    blocks.push("");
    blocks.push(t.yearsHeader);
    for (const row of result.yearlyBreakdown) {
      blocks.push(
        t.yearLine(
          row.year,
          t.listens(row.listenCount),
          t.uniqTracksWord(row.uniqueTracks)
        )
      );
    }
  }

  if (result.firstListenAt && result.lastListenAt) {
    blocks.push("");
    blocks.push(
      t.span(
        formatMediumDate(result.firstListenAt, locale),
        formatMediumDate(result.lastListenAt, locale)
      )
    );
  }

  blocks.push("");
  blocks.push(t.caveat);

  return blocks.join("\n");
}
