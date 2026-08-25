/**
 * Seul writer de Artist.imageUrl : Spotify Web API (client_credentials).
 * Last.fm / Replay / imports CSV ne doivent pas poser d’URL d’image.
 * Partagé par le script CLI, l’onboarding/import, sync Spotify, autres imports — et hydrate à la carte (route API image).
 */

import { Prisma } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Hosts used by Spotify Web API artist images (CDN). */
export function isSpotifyCdnArtistImageUrl(
  url: string | null | undefined
): boolean {
  const trimmed = url?.trim();
  if (!trimmed) return false;
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    return (
      host === "scdn.co" ||
      host.endsWith(".scdn.co") ||
      host === "spotifycdn.com" ||
      host.endsWith(".spotifycdn.com")
    );
  } catch {
    return false;
  }
}

const CLEAR_NON_SPOTIFY_ID_CHUNK = 500;

/**
 * Met `Artist.imageUrl` à null si l’URL n’est pas un CDN Spotify.
 * Idempotent. Les portraits sont refillés par l’enrichissement Spotify.
 */
export async function clearNonSpotifyArtistImageUrls(params?: {
  db?: typeof defaultPrisma;
  dryRun?: boolean;
}): Promise<{
  scanned: number;
  cleared: number;
  sampleHosts: string[];
}> {
  const db = params?.db ?? defaultPrisma;
  const dryRun = params?.dryRun ?? false;

  const rows = await db.artist.findMany({
    where: { imageUrl: { not: null } },
    select: { id: true, imageUrl: true },
  });

  const toClear = rows.filter(
    (row) => !isSpotifyCdnArtistImageUrl(row.imageUrl)
  );

  const hosts = new Set<string>();
  for (const row of toClear) {
    try {
      hosts.add(new URL(row.imageUrl!.trim()).hostname.toLowerCase());
    } catch {
      hosts.add("(invalid-url)");
    }
  }

  if (!dryRun && toClear.length > 0) {
    for (let i = 0; i < toClear.length; i += CLEAR_NON_SPOTIFY_ID_CHUNK) {
      const ids = toClear
        .slice(i, i + CLEAR_NON_SPOTIFY_ID_CHUNK)
        .map((row) => row.id);
      await db.artist.updateMany({
        where: { id: { in: ids } },
        data: { imageUrl: null },
      });
    }
  }

  return {
    scanned: rows.length,
    cleared: toClear.length,
    sampleHosts: [...hosts].sort(),
  };
}

export async function fetchSpotifyClientCredentialsToken(
  clientId: string,
  clientSecret: string
): Promise<string> {
  const body = new URLSearchParams({ grant_type: "client_credentials" });
  const basic = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString(
    "base64"
  );

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Spotify token: HTTP ${res.status} — ${text.slice(0, 200)}`);
  }

  const data = JSON.parse(text) as { access_token?: string };
  const token = data.access_token?.trim();
  if (!token) throw new Error("Spotify token: réponse sans access_token");
  return token;
}

type SpotifyImage = { url?: string; width?: number | null; height?: number | null };

export type SpotifyArtistItem = {
  id: string;
  name?: string;
  images?: SpotifyImage[];
};

function pickBestImageUrl(images: SpotifyImage[] | undefined): string | null {
  if (!images?.length) return null;
  let best: SpotifyImage | undefined;
  let bestArea = -1;
  for (const img of images) {
    const w = img.width ?? 0;
    const h = img.height ?? 0;
    const area = w > 0 && h > 0 ? w * h : 0;
    if (area > bestArea && img.url) {
      bestArea = area;
      best = img;
    }
  }
  if (best?.url?.trim()) return best.url.trim();
  for (let i = images.length - 1; i >= 0; i--) {
    const u = images[i]?.url?.trim();
    if (u) return u;
  }
  return null;
}

function normalizeArtistNameForSearch(raw: string): string {
  let t = raw.trim().replace(/\s+/g, " ");
  t = t.replace(/[\u2019\u2018\u0060\u00B4]/g, "'");
  t = t.replace(/"/g, "").trim();
  return t;
}

function searchQueriesForArtist(artistName: string): string[] {
  const norm = normalizeArtistNameForSearch(artistName);
  const queries: string[] = [];
  const add = (q: string) => {
    const x = q.trim();
    if (x && !queries.includes(x)) queries.push(x);
  };

  add(`artist:"${norm}"`);
  add(norm);

  const stripped = norm.replace(/'s$/i, "").trim();
  if (stripped.length >= 2 && stripped !== norm) {
    add(`artist:"${stripped}"`);
    add(stripped);
  }

  return queries;
}

function normalizedArtistKey(label: string): string {
  return normalizeArtistNameForSearch(label).toLowerCase();
}

function pickBestArtistMatch(
  items: SpotifyArtistItem[],
  originalLabel: string
): SpotifyArtistItem {
  const target = normalizedArtistKey(originalLabel);
  const targetBase = target.replace(/'s$/i, "").trim();

  const byExact = items.find(
    (it) => normalizedArtistKey(it.name ?? "") === target
  );
  if (byExact) return byExact;

  const byBase = items.find(
    (it) => normalizedArtistKey(it.name ?? "") === targetBase
  );
  if (byBase) return byBase;

  if (targetBase.length >= 3) {
    const byIncludes = items.find((it) => {
      const n = normalizedArtistKey(it.name ?? "");
      return n.includes(targetBase) || targetBase.includes(n);
    });
    if (byIncludes) return byIncludes;
  }

  return items[0]!;
}

async function spotifySearchItems(
  accessToken: string,
  query: string,
  retries: number
): Promise<SpotifyArtistItem[]> {
  const params = new URLSearchParams({
    q: query,
    type: "artist",
    limit: "10",
  });
  const url = `https://api.spotify.com/v1/search?${params.toString()}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : 5000;
    if (retries > 0) {
      await sleep(waitMs);
      return spotifySearchItems(accessToken, query, retries);
    }
    throw new Error("Spotify 429 Rate limit après nouvel essai.");
  }

  const text = await res.text();

  if (!res.ok) {
    throw new Error(
      `Spotify search: HTTP ${res.status} — ${text.slice(0, 280)}`
    );
  }

  const data = JSON.parse(text) as {
    artists?: { items?: SpotifyArtistItem[] };
  };
  return data.artists?.items ?? [];
}

async function spotifySearchFirstArtist(
  accessToken: string,
  artistName: string,
  retries: number
): Promise<{ id: string; name: string; imageUrl: string | null } | null> {
  const queries = searchQueriesForArtist(artistName);

  for (let qi = 0; qi < queries.length; qi++) {
    const q = queries[qi]!;
    if (qi > 0) await sleep(120);

    const items = await spotifySearchItems(accessToken, q, retries);
    if (items.length === 0) continue;

    const pick = pickBestArtistMatch(items, artistName);
    const imageUrl = pickBestImageUrl(pick.images);

    return {
      id: pick.id,
      name: pick.name ?? artistName,
      imageUrl,
    };
  }

  return null;
}

async function fetchArtistDetailImageUrl(
  accessToken: string,
  spotifyId: string,
  retries: number
): Promise<string | null> {
  const url = `https://api.spotify.com/v1/artists/${encodeURIComponent(spotifyId)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 429 && retries > 0) {
    const retryAfter = Number(res.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : 5000;
    await sleep(waitMs);
    return fetchArtistDetailImageUrl(accessToken, spotifyId, retries - 1);
  }

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} — ${text.slice(0, 280)}`);
  }

  const data = JSON.parse(text) as SpotifyArtistItem;
  return pickBestImageUrl(data.images);
}

async function fetchArtistImagesById(
  accessToken: string,
  ids: string[],
  concurrency: number,
  delayBetweenBatchesMs: number,
  logDetailError?: (spotifyId: string, message: string) => void
): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  const unique = [...new Set(ids)];
  if (unique.length === 0) return out;

  for (let i = 0; i < unique.length; i += concurrency) {
    if (i > 0) await sleep(delayBetweenBatchesMs);
    const batch = unique.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      batch.map((id) => fetchArtistDetailImageUrl(accessToken, id, 2))
    );
    for (let j = 0; j < batch.length; j++) {
      const id = batch[j]!;
      const r = settled[j]!;
      if (r.status === "fulfilled") {
        out.set(id, r.value);
      } else {
        const msg =
          r.reason instanceof Error ? r.reason.message : String(r.reason);
        logDetailError?.(id, msg);
        out.set(id, null);
      }
    }
  }
  return out;
}

export async function queryTopArtistRowsByListenCount(params: {
  userId?: string;
  limit: number;
  db?: typeof defaultPrisma;
}): Promise<
  Array<{ artist_id: string; artist_name: string; image_url: string | null }>
> {
  const { userId, limit } = params;
  const db = params.db ?? defaultPrisma;

  const query = Prisma.sql`
    SELECT 
      a.id AS artist_id,
      a.name AS artist_name,
      a."imageUrl" AS image_url
    FROM "Listen" l
    JOIN "Track" t ON l."trackId" = t.id
    JOIN "Artist" a ON t."artistId" = a.id
    WHERE 1=1
      ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
    GROUP BY a.id, a.name, a."imageUrl"
    ORDER BY COUNT(*) DESC
    LIMIT ${limit}
  `;

  return db.$queryRaw(query);
}

export type EnrichTopUserArtistsFromSpotifyResult = {
  /** false si aucun appel Spotify (credentials manquants côté appelant ou 0 lignes à traiter) */
  ran: boolean;
  updated: number;
  skippedNoSpotifyMatch: number;
  skippedNoImageUrl: number;
  searchFailures: number;
};

export async function enrichTopUserArtistsFromSpotify(params: {
  /** Omit pour agréger toutes les écoutes en base (script CLI sans --user-id). */
  userId?: string;
  clientId: string;
  clientSecret: string;
  /** Nombre d’artistes (par écoutes) à traiter */
  limit?: number;
  /** Quand true, remplace même si imageUrl existe déjà (équivalent --force CLI) */
  force?: boolean;
  delayMs?: number;
  /** 1–3 : requêtes GET /v1/artists/{id} en parallèle */
  artistDetailConcurrency?: number;
  dryRun?: boolean;
  db?: typeof defaultPrisma;
  /** Journalisation optionnelle (ex. CLI) */
  log?: (msg: string) => void;
}): Promise<EnrichTopUserArtistsFromSpotifyResult> {
  const empty: EnrichTopUserArtistsFromSpotifyResult = {
    ran: false,
    updated: 0,
    skippedNoSpotifyMatch: 0,
    skippedNoImageUrl: 0,
    searchFailures: 0,
  };

  const clientId = params.clientId.trim();
  const clientSecret = params.clientSecret.trim();
  if (!clientId || !clientSecret) return empty;

  const limit =
    typeof params.limit === "number" && params.limit >= 1
      ? Math.min(params.limit, 500)
      : 50;
  const force = params.force ?? false;
  const delayMs = Math.max(
    0,
    typeof params.delayMs === "number" ? params.delayMs : 400
  );
  const artistDetailConcurrency = Math.min(
    3,
    Math.max(
      1,
      typeof params.artistDetailConcurrency === "number"
        ? params.artistDetailConcurrency
        : 3
    )
  );
  const dryRun = params.dryRun ?? false;
  const db = params.db ?? defaultPrisma;
  const log = params.log ?? (() => {});

  let accessToken: string;
  try {
    accessToken = await fetchSpotifyClientCredentialsToken(
      clientId,
      clientSecret
    );
  } catch (e) {
    log(`Spotify enrich: token error — ${(e as Error).message}`);
    return { ...empty, ran: false, searchFailures: 1 };
  }

  const rows = await queryTopArtistRowsByListenCount({
    userId: params.userId ?? undefined,
    limit,
    db,
  });

  if (rows.length === 0) {
    return empty;
  }

  const needSearch: typeof rows = [];
  for (const row of rows) {
    const hasImg = Boolean(row.image_url?.trim());
    if (!force && hasImg) continue;
    needSearch.push(row);
  }

  if (needSearch.length === 0) {
    return { ...empty, ran: true };
  }

  const spotifyIdByDbId = new Map<string, string>();
  let searchFailures = 0;
  let noMatch = 0;

  for (let i = 0; i < needSearch.length; i++) {
    const row = needSearch[i]!;
    await sleep(delayMs);

    try {
      const match = await spotifySearchFirstArtist(
        accessToken,
        row.artist_name,
        2
      );

      if (!match?.id) {
        noMatch++;
        continue;
      }

      spotifyIdByDbId.set(row.artist_id, match.id);
    } catch (e) {
      searchFailures++;
      log(
        `Spotify enrich search error "${row.artist_name}": ${(e as Error).message}`
      );
    }
  }

  const ids = [...new Set(spotifyIdByDbId.values())];

  const imageBySpotifyId = await fetchArtistImagesById(
    accessToken,
    ids,
    artistDetailConcurrency,
    delayMs,
    (id, msg) => log(`GET /artists/${id}: ${msg}`)
  );

  let updated = 0;
  let skippedNoUrl = 0;

  for (const row of needSearch) {
    const sid = spotifyIdByDbId.get(row.artist_id);
    if (!sid) continue;

    let url = imageBySpotifyId.get(sid) ?? null;
    if (!url?.trim()) {
      skippedNoUrl++;
      continue;
    }
    url = url.trim();

    if (!dryRun) {
      await db.artist.update({
        where: { id: row.artist_id },
        data: { imageUrl: url },
      });
    }
    updated++;
  }

  return {
    ran: true,
    updated,
    skippedNoSpotifyMatch: noMatch,
    skippedNoImageUrl: skippedNoUrl,
    searchFailures,
  };
}

export type EnrichSingleArtistImageIfMissingResult =
  | {
      ok: true;
      /** true si une image a été résolue sur Spotify mais était déjà en base inchangée */
      skippedAlreadyHad: boolean;
      imageUrl: string | null;
    }
  | { ok: false; reason: "no_credentials" | "artist_not_found" | "spotify_auth_failed" };

/**
 * Résout l’URL d’image Spotify pour un artiste en base sans image (ou tous si force).
 * Une requête de recherche + une requête GET /artists/{id} pour une image HD.
 */
export async function enrichArtistImageFromSpotifyIfMissing(params: {
  artistDbId: string;
  clientId: string;
  clientSecret: string;
  /** Quand false (défaut), ne fait rien si imageUrl existe déjà */
  force?: boolean;
  dryRun?: boolean;
  db?: typeof defaultPrisma;
}): Promise<EnrichSingleArtistImageIfMissingResult> {
  const clientId = params.clientId.trim();
  const clientSecret = params.clientSecret.trim();
  if (!clientId || !clientSecret) {
    return { ok: false, reason: "no_credentials" };
  }

  const db = params.db ?? defaultPrisma;
  const force = params.force ?? false;
  const dryRun = params.dryRun ?? false;

  const artist = await db.artist.findUnique({
    where: { id: params.artistDbId },
    select: { id: true, name: true, imageUrl: true },
  });

  if (!artist) {
    return { ok: false, reason: "artist_not_found" };
  }

  const hasImg = Boolean(artist.imageUrl?.trim());
  if (!force && hasImg) {
    return {
      ok: true,
      skippedAlreadyHad: true,
      imageUrl: artist.imageUrl!.trim(),
    };
  }

  let accessToken: string;
  try {
    accessToken = await fetchSpotifyClientCredentialsToken(
      clientId,
      clientSecret
    );
  } catch {
    return { ok: false, reason: "spotify_auth_failed" };
  }

  let match;
  try {
    match = await spotifySearchFirstArtist(accessToken, artist.name, 2);
  } catch {
    return {
      ok: true,
      skippedAlreadyHad: hasImg,
      imageUrl: artist.imageUrl?.trim() ?? null,
    };
  }

  if (!match?.id) {
    return {
      ok: true,
      skippedAlreadyHad: hasImg,
      imageUrl: artist.imageUrl?.trim() ?? null,
    };
  }

  let url: string | null = null;
  try {
    url = await fetchArtistDetailImageUrl(accessToken, match.id, 2);
  } catch {
    url = match.imageUrl ?? null;
  }

  const trimmed = url?.trim();
  if (!trimmed) {
    return {
      ok: true,
      skippedAlreadyHad: hasImg,
      imageUrl: artist.imageUrl?.trim() ?? null,
    };
  }

  if (!dryRun) {
    await db.artist.update({
      where: { id: artist.id },
      data: { imageUrl: trimmed },
    });
  }

  return {
    ok: true,
    skippedAlreadyHad: false,
    imageUrl: trimmed,
  };
}

/** Limite commune après import onboarding / sync — uniquement si imageUrl vide (force: false). */
export const POST_IMPORT_SPOTIFY_ARTIST_IMAGE_LIMIT = 20;

/**
 * Enrichissement léger après sync : ne pas bloquer la réponse HTTP du sync.
 */
export function schedulePostImportSpotifyArtistImageEnrichment(params: {
  userId: string;
  /** Surcharge pour les tests uniquement */
  limit?: number;
  delayMs?: number;
  log?: (msg: string) => void;
}): void {
  const creds = getSpotifyClientCredentialsFromEnv();
  if (!creds) return;

  void enrichTopUserArtistsFromSpotify({
    userId: params.userId,
    ...creds,
    limit:
      typeof params.limit === "number"
        ? params.limit
        : POST_IMPORT_SPOTIFY_ARTIST_IMAGE_LIMIT,
    force: false,
    delayMs: params.delayMs ?? 350,
    log: params.log,
  }).catch((e) => {
    const msg = e instanceof Error ? e.message : String(e);
    (params.log ?? console.error)(`Spotify post-import enrich: ${msg}`);
  });
}

export function getSpotifyClientCredentialsFromEnv(): {
  clientId: string;
  clientSecret: string;
} | null {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}
