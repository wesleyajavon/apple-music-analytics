/**
 * Deterministic “surprising facts” engine for AI Insights.
 *
 * Charts already show tops (genre, artist, peak hour). These queries recover
 * relations the rankings hide: one-hit vs catalog, comebacks after a gap,
 * genre × weekday/hour lift, and first-heard vs recent volume.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AiInsightMoment, AiInsightMomentKind } from "@/lib/dto/ai-insights";
import type { AiLocale } from "./locale-utils";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_MOMENTS = 4;
const EN_DOW = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
const FR_DOW = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
] as const;
const ES_DOW = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
] as const;

export interface InsightFact {
  id: string;
  kind: AiInsightMomentKind;
  score: number;
  metric: string;
  href: string;
  artistId?: string;
  artistName?: string;
  /** Locale-neutral line the LLM may rephrase — names and numbers only. */
  promptLine: string;
  fallbackTitle: Record<AiLocale, string>;
  fallbackBody: Record<AiLocale, string>;
}

interface ArtistShapeRow {
  artist_id: string;
  artist_name: string;
  listen_count: bigint | number;
  unique_tracks: bigint | number;
  top_track_title: string | null;
  top_track_listens: bigint | number;
}

interface ComebackRow {
  track_id: string;
  track_title: string;
  artist_name: string;
  gap_days: number | bigint;
  recent_listens: bigint | number;
  burst_start: Date;
}

interface GenreSlotRow {
  genre: string;
  dow: number;
  hour_bucket: number;
  cell_listens: bigint | number;
  slot_listens: bigint | number;
  genre_listens: bigint | number;
  period_listens: bigint | number;
}

interface FirstHeardRow {
  artist_id: string;
  artist_name: string;
  first_heard: Date;
  lifetime_listens: bigint | number;
  recent_listens: bigint | number;
}

function toNumber(value: bigint | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "bigint" ? Number(value) : value;
}

function parseIsoRange(
  start: string,
  end: string
): { startAt: Date; endAt: Date } | null {
  if (!ISO_DATE_RE.test(start) || !ISO_DATE_RE.test(end)) return null;
  const startAt = new Date(`${start}T00:00:00.000Z`);
  const endAt = new Date(`${end}T23:59:59.999Z`);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return null;
  }
  if (startAt > endAt) return null;
  return { startAt, endAt };
}

function spanDays(startAt: Date, endAt: Date): number {
  return Math.max(
    1,
    Math.round((endAt.getTime() - startAt.getTime()) / 86_400_000)
  );
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

function artistHref(name: string): string {
  return `/dashboard/artists?q=${encodeURIComponent(name)}`;
}

function trackHref(title: string): string {
  return `/dashboard/tracks?q=${encodeURIComponent(title)}`;
}

function genreHref(genre: string): string {
  return `/dashboard/genres?q=${encodeURIComponent(genre)}`;
}

function heatmapHref(day: string): string {
  return `/dashboard/heatmap?selectedDate=${encodeURIComponent(day)}`;
}

function hourBucketLabel(hour: number): string {
  const end = hour + 3;
  return `${hour}h–${end}h`;
}

function logVolume(n: number): number {
  return Math.log1p(Math.max(0, n));
}

export function pickInsightFacts(candidates: InsightFact[]): InsightFact[] {
  const ranked = [...candidates].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.id.localeCompare(b.id);
  });
  const picked: InsightFact[] = [];
  const usedKinds = new Set<AiInsightMomentKind>();

  for (const fact of ranked) {
    if (picked.length >= MAX_MOMENTS) break;
    if (usedKinds.has(fact.kind)) continue;
    picked.push(fact);
    usedKinds.add(fact.kind);
  }
  for (const fact of ranked) {
    if (picked.length >= MAX_MOMENTS) break;
    if (picked.some((p) => p.id === fact.id)) continue;
    picked.push(fact);
  }
  return picked;
}

export function formatInsightFactsForPrompt(facts: InsightFact[]): string {
  if (facts.length === 0) return "";
  const lines = facts.map(
    (fact, index) =>
      `${index + 1}. [id=${fact.id}] [kind=${fact.kind}] [metric=${fact.metric}] ${fact.promptLine}`
  );
  return [
    "RELATIONAL FACTS (the only numbers and names you may use):",
    ...lines,
    "Do not mention a top genre, top artist, or peak hour unless that relation is already in a fact above.",
  ].join("\n");
}

export function buildFallbackMoments(
  facts: InsightFact[],
  locale: AiLocale
): AiInsightMoment[] {
  return facts.map((fact) => ({
    id: fact.id,
    kind: fact.kind,
    title: fact.fallbackTitle[locale] ?? fact.fallbackTitle.en,
    body: fact.fallbackBody[locale] ?? fact.fallbackBody.en,
    metric: fact.metric,
    href: fact.href,
    ...(fact.artistId
      ? { artistId: fact.artistId, artistName: fact.artistName }
      : {}),
  }));
}

function oneHitFacts(rows: ArtistShapeRow[]): InsightFact[] {
  const facts: InsightFact[] = [];
  const shaped = rows
    .map((row) => {
      const listens = toNumber(row.listen_count);
      const uniqueTracks = toNumber(row.unique_tracks);
      const topListens = toNumber(row.top_track_listens);
      const share = pct(topListens, listens);
      return {
        ...row,
        listens,
        uniqueTracks,
        topListens,
        share,
      };
    })
    .filter((row) => row.listens >= 12);

  const oneHit = shaped
    .filter(
      (row) =>
        Boolean(row.top_track_title) &&
        row.share >= 55 &&
        row.uniqueTracks <= 6
    )
    .sort((a, b) => b.share - a.share || b.listens - a.listens)[0];

  const catalog = shaped
    .filter((row) => row.uniqueTracks >= 12 && row.share <= 35)
    .sort(
      (a, b) =>
        b.uniqueTracks - a.uniqueTracks || a.share - b.share || b.listens - a.listens
    )[0];

  if (oneHit?.top_track_title) {
    const contrast =
      catalog && catalog.artist_id !== oneHit.artist_id
        ? {
            en: ` ${catalog.artist_name} is the opposite: ${catalog.uniqueTracks} distinct tracks.`,
            fr: ` ${catalog.artist_name}, à l’inverse : ${catalog.uniqueTracks} titres distincts.`,
            es: ` ${catalog.artist_name} es lo contrario: ${catalog.uniqueTracks} temas distintos.`,
          }
        : { en: "", fr: "", es: "" };
    const promptContrast = catalog
      ? ` Contrast: ${catalog.artist_name} has ${catalog.uniqueTracks} distinct tracks (${catalog.share}% on its top song).`
      : "";
    facts.push({
      id: `oneHit:${oneHit.artist_id}`,
      kind: "oneHit",
      score: (oneHit.share / 100) * logVolume(oneHit.listens) * 4,
      metric: `${oneHit.share}%`,
      href: artistHref(oneHit.artist_name),
      artistId: oneHit.artist_id,
      artistName: oneHit.artist_name,
      promptLine: `${oneHit.share}% of ${oneHit.artist_name} plays are the single track "${oneHit.top_track_title}" (${oneHit.topListens}/${oneHit.listens} plays, ${oneHit.uniqueTracks} distinct tracks).${promptContrast}`,
      fallbackTitle: {
        en: "One-hit loyalty",
        fr: "Obsession one-hit",
        es: "Fidelidad de un hit",
      },
      fallbackBody: {
        en: `${oneHit.share}% of your ${oneHit.artist_name} plays are “${oneHit.top_track_title}”.${contrast.en}`,
        fr: `${oneHit.share}% de tes écoutes ${oneHit.artist_name}, c’est « ${oneHit.top_track_title} ».${contrast.fr}`,
        es: `El ${oneHit.share}% de tus plays de ${oneHit.artist_name} es « ${oneHit.top_track_title} ».${contrast.es}`,
      },
    });
  }

  if (catalog && catalog.artist_id !== oneHit?.artist_id) {
    facts.push({
      id: `catalog:${catalog.artist_id}`,
      kind: "catalog",
      score: (catalog.uniqueTracks / 20) * (1 - catalog.share / 100) * logVolume(catalog.listens),
      metric: String(catalog.uniqueTracks),
      href: artistHref(catalog.artist_name),
      artistId: catalog.artist_id,
      artistName: catalog.artist_name,
      promptLine: `${catalog.artist_name}: ${catalog.uniqueTracks} distinct tracks in ${catalog.listens} plays; top track is only ${catalog.share}% of that artist.`,
      fallbackTitle: {
        en: "Deep catalog",
        fr: "Catalogue profond",
        es: "Catálogo profundo",
      },
      fallbackBody: {
        en: `With ${catalog.artist_name} you spread ${catalog.listens} plays across ${catalog.uniqueTracks} tracks — not a single anthem.`,
        fr: `Chez ${catalog.artist_name}, ${catalog.listens} écoutes se répartissent sur ${catalog.uniqueTracks} titres — pas un seul hymne.`,
        es: `Con ${catalog.artist_name} repartes ${catalog.listens} plays en ${catalog.uniqueTracks} temas — no hay un solo himno.`,
      },
    });
  }

  return facts;
}

function comebackFacts(rows: ComebackRow[]): InsightFact[] {
  return rows
    .map((row) => {
      const gapDays = toNumber(row.gap_days);
      const recent = toNumber(row.recent_listens);
      const burstDay = isoDate(row.burst_start);
      return {
        id: `comeback:${row.track_id}`,
        kind: "comeback" as const,
        score: (gapDays / 30) * logVolume(recent),
        metric: `${Math.round(gapDays)}d`,
        href: heatmapHref(burstDay),
        promptLine: `Track "${row.track_title}" by ${row.artist_name} had a ${Math.round(gapDays)}-day gap, then ${recent} plays starting ${burstDay}.`,
        fallbackTitle: {
          en: "Comeback",
          fr: "Comeback",
          es: "Regreso",
        },
        fallbackBody: {
          en: `You had not played “${row.track_title}” for ${Math.round(gapDays)} days. Then ${recent} plays starting ${burstDay}.`,
          fr: `Tu n’avais plus lancé « ${row.track_title} » depuis ${Math.round(gapDays)} jours. Puis ${recent} écoutes à partir du ${burstDay}.`,
          es: `No habías puesto « ${row.track_title} » en ${Math.round(gapDays)} días. Luego ${recent} plays desde ${burstDay}.`,
        },
      };
    })
    .filter((fact) => fact.score > 0)
    .slice(0, 3);
}

function genreSlotFacts(rows: GenreSlotRow[]): InsightFact[] {
  const facts: InsightFact[] = [];
  for (const row of rows) {
    const cell = toNumber(row.cell_listens);
    const slot = toNumber(row.slot_listens);
    const genreListens = toNumber(row.genre_listens);
    const period = toNumber(row.period_listens);
    const overallShare = pct(genreListens, period);
    const slotShare = pct(cell, slot);
    if (cell < 10 || slot < 16 || overallShare < 2 || overallShare > 45) continue;
    if (slotShare < 20) continue;
    const lift = overallShare > 0 ? slotShare / overallShare : 0;
    if (lift < 2.2) continue;
    const dayEn = EN_DOW[row.dow] ?? "that day";
    const dayFr = FR_DOW[row.dow] ?? "ce jour";
    const dayEs = ES_DOW[row.dow] ?? "ese día";
    const hours = hourBucketLabel(row.hour_bucket);
    facts.push({
      id: `genreSlot:${row.genre}:${row.dow}:${row.hour_bucket}`,
      kind: "genreSlot",
      score: (lift - 1) * logVolume(cell),
      metric: `${slotShare}%`,
      href: genreHref(row.genre),
      promptLine: `${row.genre} is ${overallShare}% of all plays but ${slotShare}% of ${dayEn} ${hours} (${cell} of ${slot} plays in that slot; lift ${lift.toFixed(1)}×).`,
      fallbackTitle: {
        en: `${dayEn} ${row.genre}`,
        fr: `${dayFr} ${row.genre}`,
        es: `${dayEs} ${row.genre}`,
      },
      fallbackBody: {
        en: `${row.genre} is only ${overallShare}% overall, but ${slotShare}% of your ${dayEn} ${hours} plays.`,
        fr: `${row.genre} pèse ${overallShare}% du total, mais ${slotShare}% de tes écoutes ${dayFr} ${hours}.`,
        es: `${row.genre} es el ${overallShare}% del total, pero el ${slotShare}% de tus plays del ${dayEs} ${hours}.`,
      },
    });
  }
  return facts.sort((a, b) => b.score - a.score).slice(0, 3);
}

function firstHeardFacts(rows: FirstHeardRow[], rangeEnd: Date): InsightFact[] {
  const facts: InsightFact[] = [];
  for (const row of rows) {
    const lifetime = toNumber(row.lifetime_listens);
    const recent = toNumber(row.recent_listens);
    if (lifetime < 15 || recent < 8) continue;
    const recentShare = pct(recent, lifetime);
    if (recentShare < 28) continue;
    const first = isoDate(row.first_heard);
    const yearsAgo =
      (rangeEnd.getTime() - row.first_heard.getTime()) / (365.25 * 86_400_000);
    if (yearsAgo < 0.75) continue;
    const yearLabel = String(row.first_heard.getUTCFullYear());
    facts.push({
      id: `firstHeard:${row.artist_id}`,
      kind: "firstHeard",
      score: (recentShare / 100) * logVolume(recent) * Math.min(yearsAgo, 8),
      metric: `${recentShare}%`,
      href: artistHref(row.artist_name),
      artistId: row.artist_id,
      artistName: row.artist_name,
      promptLine: `First played ${row.artist_name} on ${first}. ${recentShare}% of their ${lifetime} lifetime plays (${recent}) fall in the recent window of this range.`,
      fallbackTitle: {
        en: `Since ${yearLabel}`,
        fr: `Depuis ${yearLabel}`,
        es: `Desde ${yearLabel}`,
      },
      fallbackBody: {
        en: `You first heard ${row.artist_name} in ${yearLabel}. ${recentShare}% of those plays are in the latest stretch of this range.`,
        fr: `Tu as découvert ${row.artist_name} en ${yearLabel}. ${recentShare}% de ces écoutes sont dans la fenêtre récente de la période.`,
        es: `Descubriste a ${row.artist_name} en ${yearLabel}. El ${recentShare}% de esos plays está en el tramo reciente del rango.`,
      },
    });
  }
  return facts.sort((a, b) => b.score - a.score).slice(0, 3);
}

async function queryArtistShapes(
  userId: string,
  startAt: Date,
  endAt: Date
): Promise<ArtistShapeRow[]> {
  return prisma.$queryRaw<ArtistShapeRow[]>(Prisma.sql`
    -- insight-facts:artist-shape
    WITH artist_stats AS (
      SELECT
        a.id AS artist_id,
        a.name AS artist_name,
        COUNT(*)::bigint AS listen_count,
        COUNT(DISTINCT t.id)::bigint AS unique_tracks
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      JOIN "Artist" a ON t."artistId" = a.id
      WHERE l."userId" = ${userId}
        AND l."playedAt" >= ${startAt}
        AND l."playedAt" <= ${endAt}
      GROUP BY a.id, a.name
      HAVING COUNT(*) >= 12
      ORDER BY COUNT(*) DESC
      LIMIT 40
    ),
    top_tracks AS (
      SELECT DISTINCT ON (t."artistId")
        t."artistId" AS artist_id,
        t.title AS top_track_title,
        COUNT(*)::bigint AS top_track_listens
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      WHERE l."userId" = ${userId}
        AND l."playedAt" >= ${startAt}
        AND l."playedAt" <= ${endAt}
        AND t."artistId" IN (SELECT artist_id FROM artist_stats)
      GROUP BY t."artistId", t.id, t.title
      ORDER BY t."artistId", COUNT(*) DESC, t.title ASC
    )
    SELECT
      s.artist_id,
      s.artist_name,
      s.listen_count,
      s.unique_tracks,
      tt.top_track_title,
      tt.top_track_listens
    FROM artist_stats s
    JOIN top_tracks tt ON tt.artist_id = s.artist_id
  `);
}

async function queryComebacks(
  userId: string,
  endAt: Date,
  recentStart: Date
): Promise<ComebackRow[]> {
  return prisma.$queryRaw<ComebackRow[]>(Prisma.sql`
    -- insight-facts:comeback
    WITH recent AS (
      SELECT
        t.id AS track_id,
        t.title AS track_title,
        a.name AS artist_name,
        COUNT(*)::bigint AS recent_listens,
        MIN(l."playedAt") AS burst_start
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      JOIN "Artist" a ON t."artistId" = a.id
      WHERE l."userId" = ${userId}
        AND l."playedAt" >= ${recentStart}
        AND l."playedAt" <= ${endAt}
      GROUP BY t.id, t.title, a.name
      HAVING COUNT(*) >= 5
    ),
    prior AS (
      SELECT
        r.track_id,
        MAX(l."playedAt") AS last_before
      FROM recent r
      JOIN "Listen" l ON l."trackId" = r.track_id
      WHERE l."userId" = ${userId}
        AND l."playedAt" < r.burst_start
      GROUP BY r.track_id
    )
    SELECT
      r.track_id,
      r.track_title,
      r.artist_name,
      EXTRACT(EPOCH FROM (r.burst_start - p.last_before)) / 86400.0 AS gap_days,
      r.recent_listens,
      r.burst_start
    FROM recent r
    JOIN prior p ON p.track_id = r.track_id
    WHERE p.last_before IS NOT NULL
      AND r.burst_start - p.last_before >= INTERVAL '90 days'
    ORDER BY gap_days DESC, r.recent_listens DESC
    LIMIT 8
  `);
}

async function queryGenreSlots(
  userId: string,
  startAt: Date,
  endAt: Date
): Promise<GenreSlotRow[]> {
  return prisma.$queryRaw<GenreSlotRow[]>(Prisma.sql`
    -- insight-facts:genre-slot
    WITH listens AS (
      SELECT
        NULLIF(BTRIM(t.genre), '') AS genre,
        EXTRACT(DOW FROM l."playedAt")::int AS dow,
        (EXTRACT(HOUR FROM l."playedAt")::int / 3) * 3 AS hour_bucket
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      WHERE l."userId" = ${userId}
        AND l."playedAt" >= ${startAt}
        AND l."playedAt" <= ${endAt}
        AND t.genre IS NOT NULL
        AND BTRIM(t.genre) <> ''
    ),
    period AS (
      SELECT COUNT(*)::bigint AS period_listens FROM listens
    ),
    genre_tot AS (
      SELECT genre, COUNT(*)::bigint AS genre_listens
      FROM listens
      GROUP BY genre
    ),
    cells AS (
      SELECT genre, dow, hour_bucket, COUNT(*)::bigint AS cell_listens
      FROM listens
      GROUP BY genre, dow, hour_bucket
    ),
    slots AS (
      SELECT dow, hour_bucket, SUM(cell_listens)::bigint AS slot_listens
      FROM cells
      GROUP BY dow, hour_bucket
    )
    SELECT
      c.genre,
      c.dow,
      c.hour_bucket,
      c.cell_listens,
      s.slot_listens,
      g.genre_listens,
      p.period_listens
    FROM cells c
    JOIN slots s ON s.dow = c.dow AND s.hour_bucket = c.hour_bucket
    JOIN genre_tot g ON g.genre = c.genre
    CROSS JOIN period p
    WHERE c.cell_listens >= 10
      AND s.slot_listens >= 16
    ORDER BY c.cell_listens DESC
    LIMIT 40
  `);
}

async function queryFirstHeard(
  userId: string,
  startAt: Date,
  endAt: Date,
  recentStart: Date
): Promise<FirstHeardRow[]> {
  return prisma.$queryRaw<FirstHeardRow[]>(Prisma.sql`
    -- insight-facts:first-heard
    WITH period_artists AS (
      SELECT
        a.id AS artist_id,
        a.name AS artist_name,
        COUNT(*)::bigint AS period_listens
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      JOIN "Artist" a ON t."artistId" = a.id
      WHERE l."userId" = ${userId}
        AND l."playedAt" >= ${startAt}
        AND l."playedAt" <= ${endAt}
      GROUP BY a.id, a.name
      HAVING COUNT(*) >= 10
      ORDER BY COUNT(*) DESC
      LIMIT 40
    )
    SELECT
      pa.artist_id,
      pa.artist_name,
      MIN(l."playedAt") AS first_heard,
      COUNT(*)::bigint AS lifetime_listens,
      COUNT(*) FILTER (
        WHERE l."playedAt" >= ${recentStart} AND l."playedAt" <= ${endAt}
      )::bigint AS recent_listens
    FROM period_artists pa
    JOIN "Track" t ON t."artistId" = pa.artist_id
    JOIN "Listen" l ON l."trackId" = t.id AND l."userId" = ${userId}
    GROUP BY pa.artist_id, pa.artist_name
  `);
}

export async function collectInsightFacts(
  userId: string,
  rangeStart: string,
  rangeEnd: string
): Promise<InsightFact[]> {
  const range = parseIsoRange(rangeStart, rangeEnd);
  if (!range) return [];

  const { startAt, endAt } = range;
  const days = spanDays(startAt, endAt);
  const comebackRecentDays = days >= 60 ? 14 : days >= 21 ? 7 : 0;
  const firstHeardRecentDays = Math.min(90, Math.max(14, Math.floor(days / 3)));
  const comebackRecentStart = new Date(
    endAt.getTime() - Math.max(comebackRecentDays, 1) * 86_400_000
  );
  const firstHeardRecentStart = new Date(
    endAt.getTime() - firstHeardRecentDays * 86_400_000
  );

  const [artistRows, comebackRows, genreRows, firstHeardRows] =
    await Promise.all([
      queryArtistShapes(userId, startAt, endAt),
      comebackRecentDays > 0
        ? queryComebacks(userId, endAt, comebackRecentStart)
        : Promise.resolve([] as ComebackRow[]),
      queryGenreSlots(userId, startAt, endAt),
      queryFirstHeard(userId, startAt, endAt, firstHeardRecentStart),
    ]);

  const candidates = [
    ...oneHitFacts(artistRows),
    ...comebackFacts(comebackRows),
    ...genreSlotFacts(genreRows),
    ...firstHeardFacts(firstHeardRows, endAt),
  ];

  return pickInsightFacts(candidates);
}
