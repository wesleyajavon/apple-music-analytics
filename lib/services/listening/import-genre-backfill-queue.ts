import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { classifyPrimaryTrackGenreGroq } from "@/lib/services/genre/groq-track-genre-classify";

type UnknownStats = {
  total: number;
  unknown: number;
  ratio: number;
};

type CandidateTrackRow = {
  id: string;
  title: string;
  artistName: string;
};

let workerRunning = false;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  const total = Number(totalRows[0]?.total ?? 0);
  const unknown = Number(unknownRows[0]?.unknown ?? 0);
  return {
    total,
    unknown,
    ratio: total > 0 ? (unknown / total) * 100 : 0,
  };
}

/**
 * After import: unknown tracks exist and we could offer LLM backfill (Groq must be configured to run).
 */
export async function getGroqImportGenreBackfillEligibility(userId: string): Promise<{
  unknownTrackCount: number;
  unknownRatio: number;
  totalTrackCount: number;
  groqConfigured: boolean;
}> {
  const stats = await getUserUnknownTrackStats(userId);
  return {
    unknownTrackCount: stats.unknown,
    unknownRatio: stats.ratio,
    totalTrackCount: stats.total,
    groqConfigured: Boolean(process.env.GROQ_API_KEY?.trim()),
  };
}

async function fetchTopUnknownTracksForUser(
  userId: string,
  limit: number
): Promise<CandidateTrackRow[]> {
  const rows = await prisma.$queryRaw<CandidateTrackRow[]>(Prisma.sql`
    SELECT t.id, t.title, a.name AS "artistName"
    FROM "Track" t
    JOIN "Artist" a ON a.id = t."artistId"
    INNER JOIN "Listen" l ON l."trackId" = t.id
    WHERE l."userId" = ${userId}
      AND t.genre IS NULL
    GROUP BY t.id, t.title, a.name
    ORDER BY COUNT(l.id)::bigint DESC, t.title ASC
    LIMIT ${limit}
  `);
  return rows;
}

export async function enqueueGroqImportGenreBackfillJob(userId: string): Promise<{
  jobId: string;
  status: "pending" | "running" | "completed" | "failed";
  reused: boolean;
}> {
  const existing = await prisma.importGenreBackfillJob.findFirst({
    where: {
      userId,
      provider: "groq",
      status: { in: ["pending", "running"] },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true },
  });
  if (existing) {
    return { jobId: existing.id, status: existing.status, reused: true };
  }

  const targetUnknownPct = Number(process.env.GROQ_IMPORT_TARGET_UNKNOWN_PCT ?? 15);
  const delayMs = Number(process.env.GROQ_IMPORT_DELAY_MS ?? 400);
  const maxLlmCalls = Number(process.env.GROQ_IMPORT_MAX_LLM_CALLS ?? 250);
  const maxTracks = Number(process.env.GROQ_IMPORT_MAX_TRACKS ?? 200);

  const created = await prisma.importGenreBackfillJob.create({
    data: {
      userId,
      provider: "groq",
      status: "pending",
      targetUnknownPct:
        Number.isFinite(targetUnknownPct) && targetUnknownPct >= 0 && targetUnknownPct <= 100
          ? targetUnknownPct
          : 15,
      delayMs: Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : 400,
      maxApiRequests: Number.isFinite(maxLlmCalls) && maxLlmCalls >= 1 ? maxLlmCalls : 250,
      maxArtists: Number.isFinite(maxTracks) && maxTracks >= 1 ? maxTracks : 200,
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
      provider: true,
      targetUnknownPct: true,
      delayMs: true,
      maxApiRequests: true,
      maxArtists: true,
    },
  });
  if (!job) return;

  if (job.provider !== "groq") {
    await prisma.importGenreBackfillJob.update({
      where: { id: jobId },
      data: {
        status: "failed",
        errorMessage: "This job type is no longer supported (use Groq LLM flow).",
        finishedAt: new Date(),
      },
    });
    return;
  }

  if (!process.env.GROQ_API_KEY?.trim()) {
    await prisma.importGenreBackfillJob.update({
      where: { id: jobId },
      data: {
        status: "failed",
        errorMessage: "Missing GROQ_API_KEY",
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

    const candidates = await fetchTopUnknownTracksForUser(
      job.userId,
      Math.max(1, job.maxArtists)
    );

    let artistsProcessed = 0;
    let artistsMapped = 0;
    let tracksUpdated = 0;
    let llmCalls = 0;

    for (const row of candidates) {
      const currentStats = await getUserUnknownTrackStats(job.userId);
      if (currentStats.ratio <= job.targetUnknownPct) break;
      if (llmCalls >= job.maxApiRequests) break;

      artistsProcessed += 1;
      await sleep(Math.max(0, job.delayMs));

      try {
        llmCalls += 1;
        const genre = await classifyPrimaryTrackGenreGroq(row.title, row.artistName);
        if (genre) {
          const upd = await prisma.track.updateMany({
            where: { id: row.id, genre: null },
            data: { genre },
          });
          if (upd.count > 0) {
            artistsMapped += 1;
            tracksUpdated += upd.count;
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "LLM error";
        await prisma.importGenreBackfillJob.update({
          where: { id: jobId },
          data: {
            status: "failed",
            errorMessage: message.slice(0, 1000),
            finishedAt: new Date(),
            artistsProcessed,
            artistsMapped,
            tracksUpdated,
            apiRequestsUsed: llmCalls,
            currentUnknownPct: (await getUserUnknownTrackStats(job.userId)).ratio,
          },
        });
        return;
      }

      const stats = await getUserUnknownTrackStats(job.userId);
      await prisma.importGenreBackfillJob.update({
        where: { id: jobId },
        data: {
          currentUnknownPct: stats.ratio,
          artistsProcessed,
          artistsMapped,
          tracksUpdated,
          apiRequestsUsed: llmCalls,
        },
      });
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
        apiRequestsUsed: llmCalls,
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
        where: { status: "pending", provider: "groq" },
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
    where: { userId, provider: "groq" },
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
