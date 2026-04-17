import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type UnknownStats = {
  total: number;
  unknown: number;
  ratio: number;
};

type UnknownArtistRow = {
  artistId: string;
  artistName: string;
  unknownListens: bigint;
};

let workerRunning = false;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

async function getUserUnknownTrackStats(userId: string): Promise<UnknownStats> {
  const totalRows = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
    SELECT COUNT(DISTINCT l."trackId")::bigint AS total
    FROM "Listen" l
    WHERE l."userId" = ${userId}
  `);
  const unknownRows = await prisma.$queryRaw<Array<{ unknown: bigint }>>(Prisma.sql`
    SELECT COUNT(DISTINCT l."trackId")::bigint AS unknown
    FROM "Listen" l
    JOIN "Track" t ON t.id = l."trackId"
    WHERE l."userId" = ${userId}
      AND t."genre" IS NULL
  `);
  const total = Number(totalRows[0]?.total ?? 0n);
  const unknown = Number(unknownRows[0]?.unknown ?? 0n);
  return {
    total,
    unknown,
    ratio: total > 0 ? (unknown / total) * 100 : 0,
  };
}

async function getTopUnknownArtistsByUserListens(userId: string, limit: number) {
  const rows = await prisma.$queryRaw<UnknownArtistRow[]>(Prisma.sql`
    SELECT
      a.id AS "artistId",
      a.name AS "artistName",
      COUNT(l.id)::bigint AS "unknownListens"
    FROM "Listen" l
    JOIN "Track" t ON t.id = l."trackId"
    JOIN "Artist" a ON a.id = t."artistId"
    WHERE l."userId" = ${userId}
      AND t."genre" IS NULL
    GROUP BY a.id, a.name
    ORDER BY COUNT(l.id) DESC, a.name ASC
    LIMIT ${limit}
  `);
  return rows.map((row) => ({
    artistId: row.artistId,
    artistName: row.artistName,
    unknownListens: Number(row.unknownListens),
  }));
}

function createSpotifyClient(opts: {
  clientId: string;
  clientSecret: string;
  delayMs: number;
  maxApiRequests: number;
}) {
  const SPOTIFY_ACCOUNTS = "https://accounts.spotify.com/api/token";
  const SPOTIFY_API = "https://api.spotify.com/v1";

  let cachedToken: string | null = null;
  let tokenExpiresAt = 0;
  let requestCount = 0;

  async function getAccessToken() {
    const now = Date.now();
    if (cachedToken && now < tokenExpiresAt - 30_000) {
      return cachedToken;
    }
    const body = new URLSearchParams({ grant_type: "client_credentials" });
    const basic = Buffer.from(`${opts.clientId}:${opts.clientSecret}`, "utf8").toString("base64");
    const res = await fetch(SPOTIFY_ACCOUNTS, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!res.ok) {
      throw new Error(`Spotify token failed: ${res.status}`);
    }
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    cachedToken = data.access_token ?? null;
    tokenExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;
    if (!cachedToken) throw new Error("Spotify token missing access_token");
    return cachedToken;
  }

  async function spotifyGet(url: string, state?: { authRetry?: boolean; rate429Count?: number }) {
    if (requestCount >= opts.maxApiRequests) {
      const e = new Error("MAX_API_REQUESTS");
      (e as Error & { code?: string }).code = "MAX_API_REQUESTS";
      throw e;
    }
    await sleep(opts.delayMs);
    const token = await getAccessToken();
    requestCount += 1;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const authRetry = state?.authRetry === true;
    const rate429Count = state?.rate429Count ?? 0;

    if (res.status === 401 && !authRetry) {
      cachedToken = null;
      tokenExpiresAt = 0;
      return spotifyGet(url, { authRetry: true, rate429Count });
    }
    if (res.status === 429 && rate429Count < 5) {
      const retryAfter = parseInt(res.headers.get("Retry-After") || "5", 10);
      await sleep(retryAfter * 1000);
      return spotifyGet(url, { authRetry, rate429Count: rate429Count + 1 });
    }
    return res;
  }

  async function fetchPrimaryGenreForArtistName(artistName: string) {
    const q = `artist:"${artistName.replace(/"/g, " ").trim()}"`;
    const searchUrl = `${SPOTIFY_API}/search?${new URLSearchParams({
      q,
      type: "artist",
      limit: "5",
    })}`;
    const searchRes = await spotifyGet(searchUrl);
    if (!searchRes.ok) return { genre: null as string | null, reason: "search_failed" };
    const searchJson = (await searchRes.json()) as {
      artists?: { items?: Array<{ id?: string; name?: string; popularity?: number }> };
    };
    const items = searchJson.artists?.items ?? [];
    if (items.length === 0) return { genre: null as string | null, reason: "no_artist_match" };

    const target = normalizeText(artistName);
    let bestId: string | null = null;
    let bestScore = -1;
    for (const item of items) {
      if (!item.id || !item.name) continue;
      const candidate = normalizeText(item.name);
      let score = 0;
      if (candidate === target) score = 100;
      else if (candidate.includes(target) || target.includes(candidate)) score = 70;
      else score = 10;
      score += Math.min(20, Math.floor((item.popularity ?? 0) / 5));
      if (score > bestScore) {
        bestScore = score;
        bestId = item.id;
      }
    }
    if (!bestId) return { genre: null as string | null, reason: "no_artist_match" };

    const artistRes = await spotifyGet(`${SPOTIFY_API}/artists/${encodeURIComponent(bestId)}`);
    if (!artistRes.ok) return { genre: null as string | null, reason: "artist_failed" };
    const artistJson = (await artistRes.json()) as { genres?: string[] };
    const genres = artistJson.genres ?? [];
    if (!Array.isArray(genres) || genres.length === 0) {
      return { genre: null as string | null, reason: "empty_genres" };
    }
    return { genre: genres[0], reason: null as string | null };
  }

  return {
    fetchPrimaryGenreForArtistName,
    getRequestCount: () => requestCount,
  };
}

export async function enqueueSpotifyImportGenreBackfillJob(
  userId: string
): Promise<{
  jobId: string;
  status: "pending" | "running" | "completed" | "failed";
  reused: boolean;
}> {
  const existing = await prisma.importGenreBackfillJob.findFirst({
    where: {
      userId,
      provider: "spotify",
      status: { in: ["pending", "running"] },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true },
  });
  if (existing) {
    return { jobId: existing.id, status: existing.status, reused: true };
  }

  const targetUnknownPct = Number(process.env.SPOTIFY_IMPORT_TARGET_UNKNOWN_PCT ?? 15);
  const delayMs = Number(process.env.SPOTIFY_IMPORT_DELAY_MS ?? 300);
  const maxApiRequests = Number(process.env.SPOTIFY_IMPORT_MAX_API_REQUESTS ?? 250);
  const maxArtists = Number(process.env.SPOTIFY_IMPORT_MAX_ARTISTS ?? 200);

  const created = await prisma.importGenreBackfillJob.create({
    data: {
      userId,
      provider: "spotify",
      status: "pending",
      targetUnknownPct:
        Number.isFinite(targetUnknownPct) && targetUnknownPct >= 0 && targetUnknownPct <= 100
          ? targetUnknownPct
          : 15,
      delayMs: Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : 300,
      maxApiRequests: Number.isFinite(maxApiRequests) && maxApiRequests >= 1 ? maxApiRequests : 250,
      maxArtists: Number.isFinite(maxArtists) && maxArtists >= 1 ? maxArtists : 200,
    },
    select: { id: true, status: true },
  });

  return { jobId: created.id, status: created.status, reused: false };
}

async function runSingleJob(jobId: string): Promise<void> {
  const started = await prisma.importGenreBackfillJob.updateMany({
    where: { id: jobId, status: "pending" },
    data: {
      status: "running",
      startedAt: new Date(),
      errorMessage: null,
      apiRequestsUsed: 0,
      artistsProcessed: 0,
      artistsMapped: 0,
      tracksUpdated: 0,
    },
  });
  if (started.count === 0) return;

  const job = await prisma.importGenreBackfillJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      userId: true,
      targetUnknownPct: true,
      delayMs: true,
      maxApiRequests: true,
      maxArtists: true,
    },
  });
  if (!job) return;

  const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
  const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!spotifyClientId || !spotifyClientSecret) {
    await prisma.importGenreBackfillJob.update({
      where: { id: jobId },
      data: {
        status: "failed",
        errorMessage: "Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET",
        finishedAt: new Date(),
      },
    });
    return;
  }

  try {
    const stats0 = await getUserUnknownTrackStats(job.userId);
    await prisma.importGenreBackfillJob.update({
      where: { id: jobId },
      data: { initialUnknownPct: stats0.ratio, currentUnknownPct: stats0.ratio },
    });
    if (stats0.total === 0 || stats0.ratio <= job.targetUnknownPct) {
      await prisma.importGenreBackfillJob.update({
        where: { id: jobId },
        data: { status: "completed", finishedAt: new Date(), currentUnknownPct: stats0.ratio },
      });
      return;
    }

    const spotify = createSpotifyClient({
      clientId: spotifyClientId,
      clientSecret: spotifyClientSecret,
      delayMs: Math.max(0, job.delayMs),
      maxApiRequests: Math.max(1, job.maxApiRequests),
    });
    const artists = await getTopUnknownArtistsByUserListens(job.userId, Math.max(1, job.maxArtists));

    let artistsProcessed = 0;
    let artistsMapped = 0;
    let tracksUpdated = 0;

    for (const artist of artists) {
      const currentStats = await getUserUnknownTrackStats(job.userId);
      if (currentStats.ratio <= job.targetUnknownPct) break;

      artistsProcessed += 1;
      let mappedInThisArtist = false;
      try {
        const resolved = await spotify.fetchPrimaryGenreForArtistName(artist.artistName);
        if (resolved.genre) {
          const update = await prisma.track.updateMany({
            where: { artistId: artist.artistId, genre: null },
            data: { genre: resolved.genre },
          });
          if (update.count > 0) {
            artistsMapped += 1;
            tracksUpdated += update.count;
            mappedInThisArtist = true;
          }
        }
      } catch (err) {
        const e = err as Error & { code?: string };
        if (e.code === "MAX_API_REQUESTS") break;
      }

      const stats = await getUserUnknownTrackStats(job.userId);
      await prisma.importGenreBackfillJob.update({
        where: { id: jobId },
        data: {
          currentUnknownPct: stats.ratio,
          artistsProcessed,
          artistsMapped,
          tracksUpdated,
          apiRequestsUsed: spotify.getRequestCount(),
        },
      });

      // tiny pause when we did mutate a lot of rows to smooth DB bursts
      if (mappedInThisArtist) {
        await sleep(50);
      }
    }

    const finalStats = await getUserUnknownTrackStats(job.userId);
    await prisma.importGenreBackfillJob.update({
      where: { id: jobId },
      data: {
        status: "completed",
        finishedAt: new Date(),
        currentUnknownPct: finalStats.ratio,
        artistsProcessed,
        artistsMapped,
        tracksUpdated,
        apiRequestsUsed: spotify.getRequestCount(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown backfill error";
    await prisma.importGenreBackfillJob.update({
      where: { id: jobId },
      data: {
        status: "failed",
        errorMessage: message.slice(0, 1000),
        finishedAt: new Date(),
      },
    });
  }
}

export async function triggerImportGenreBackfillWorker(): Promise<void> {
  if (workerRunning) return;
  workerRunning = true;
  try {
    while (true) {
      const next = await prisma.importGenreBackfillJob.findFirst({
        where: { status: "pending", provider: "spotify" },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (!next) break;
      await runSingleJob(next.id);
    }
  } finally {
    workerRunning = false;
  }
}

export async function getLatestImportGenreBackfillJob(userId: string) {
  return prisma.importGenreBackfillJob.findFirst({
    where: { userId, provider: "spotify" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      targetUnknownPct: true,
      delayMs: true,
      maxApiRequests: true,
      maxArtists: true,
      apiRequestsUsed: true,
      artistsProcessed: true,
      artistsMapped: true,
      tracksUpdated: true,
      initialUnknownPct: true,
      currentUnknownPct: true,
      errorMessage: true,
      createdAt: true,
      startedAt: true,
      finishedAt: true,
      updatedAt: true,
    },
  });
}
