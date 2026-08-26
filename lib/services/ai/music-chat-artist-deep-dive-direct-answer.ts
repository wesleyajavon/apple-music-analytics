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

const DEEP_DIVE_HISTORY_INTENT_RE =
  /\b(?:listening history|streaming history|historique|historial|deep[\s-]?dive|deepdive)\b/i;

const DEEP_DIVE_PREFIX_RE =
  /^(?:(?:un|une|le|la|the|an|a|my|mon|mi)\s+)?(?:artist(?:e)?\s+)?deep[\s-]?dive(?:\s+(?:artiste?|for|on|of|about|sur|de|pour))?\s*[:\-]?\s+(.+)$/i;

const DEEP_DIVE_INLINE_RE =
  /\b(?:artist(?:e)?\s+)?deep[\s-]?dive(?:\s+artiste)?\s+(?:sur|de|on|for|of|about|pour)\s+(.+)$/i;

const ABOUT_ARTIST_RES: RegExp[] = [
  /^(?:(?:please|can you|could you)\s+)?tell me(?: more)? about\s+(.+)$/i,
  /^(?:what can you (?:tell|say)(?: me)? about)\s+(.+)$/i,
  /^(?:what about)\s+(.+)$/i,
  /^(?:who(?:'s| is))\s+(.+)$/i,
  /^(?:parle[- ]moi(?:-en)? (?:de|d['’])|dis[- ]moi(?: en plus)? (?:sur|de|d['’]))\s*(.+)$/i,
  /^(?:c['’]est qui|c['’]est quoi)\s+(.+)$/i,
  /^(?:h[aá]blame de|cu[eé]ntame (?:sobre|de)|qui[eé]n es)\s+(.+)$/i,
];

const PERIOD_OR_COMPARISON_RE =
  /\b(?:vs\.?|versus|compared|compar(?:e|er|aison)|entre)\b|\b(?:in|en|durante|during|since|depuis)\s+(?:19|20)\d{2}\b|\b(?:19|20)\d{2}\s*(?:vs\.?|versus|and|et|to|à)\s*(?:19|20)\d{2}\b/i;

const NON_ARTIST_ABOUT_SUBJECT_RE =
  /\b(?:top tracks?|top songs?|top artists?|genres?|late[\s-]?night|night ?time|taste(?:\s+shift)?|playlist|evolution|obsess|listening habits?|time of day|this year|last year)\b|^my\s+(?:top|late|taste|genre|listen|music|histor|year|habit)|^me$|^you$|^this$|^that$|^music$|^soundprint$/i;

function sanitizeInferredArtistName(raw: string): string | null {
  const name = raw
    .replace(/\s+/g, " ")
    .replace(/^["«“']+|["»”']+$/g, "")
    .replace(/\s+(?:please|stp|s['’]il te pla[iî]t|por favor)$/i, "")
    .replace(/^(?:the artist|l['’]artiste|el artista|artist(?:e)?|the band)\s+/i, "")
    .trim();
  if (name.length < 2 || name.length > 120) return null;
  if (/\b(?:in|en|during|pendant|durante)\b/i.test(name)) return null;
  if (NON_ARTIST_ABOUT_SUBJECT_RE.test(name)) return null;
  return name;
}

function extractAboutArtistSubject(content: string): string | null {
  for (const re of ABOUT_ARTIST_RES) {
    const match = re.exec(content);
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * Narrow free-text detector: artist deep-dive intent + a usable artist name.
 * Returns null when Groq should handle the question instead.
 */
export function inferArtistDeepDiveFromUserMessage(content: string): string | null {
  const trimmed = content.trim().replace(/[.!?…]+$/u, "").trim();
  if (!trimmed) return null;
  if (PERIOD_OR_COMPARISON_RE.test(trimmed)) return null;

  if (DEEP_DIVE_HISTORY_INTENT_RE.test(trimmed)) {
    const fromWith = extractArtistNameFromDeepDiveUserMessage(trimmed);
    if (fromWith) {
      const sanitized = sanitizeInferredArtistName(fromWith);
      if (sanitized) return sanitized;
    }
  }

  const prefixed = DEEP_DIVE_PREFIX_RE.exec(trimmed);
  if (prefixed?.[1]) {
    const sanitized = sanitizeInferredArtistName(prefixed[1]);
    if (sanitized) return sanitized;
  }

  const inline = DEEP_DIVE_INLINE_RE.exec(trimmed);
  if (inline?.[1]) {
    const sanitized = sanitizeInferredArtistName(inline[1]);
    if (sanitized) return sanitized;
  }

  const aboutSubject = extractAboutArtistSubject(trimmed);
  if (aboutSubject) {
    return sanitizeInferredArtistName(aboutSubject);
  }

  return null;
}

export function inferArtistDeepDiveFromMessages(
  messages: MusicChatMessage[]
): string | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const entry = messages[i];
    if (entry.role !== "user") continue;
    return inferArtistDeepDiveFromUserMessage(entry.content);
  }
  return null;
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
