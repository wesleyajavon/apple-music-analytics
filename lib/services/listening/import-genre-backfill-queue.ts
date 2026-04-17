import { Prisma } from "@prisma/client";
import { RateLimitError } from "groq-sdk";
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
const GROQ_RATE_LIMIT_EXTRA_ATTEMPTS = 3;
const GROQ_IMPORT_DEBUG_RATE_LIMIT = process.env.GROQ_IMPORT_DEBUG_RATE_LIMIT === "true";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isGroq429Error(err: unknown): boolean {
  return (
    err instanceof RateLimitError ||
    (err instanceof Error &&
      "status" in err &&
      (err as { status?: number }).status === 429)
  );
}

function groqRateLimitRetryDelayMs(
  headers: RateLimitError["headers"] | undefined
): number {
  if (!headers) return 12_000;
  const h = headers as Record<string, string | undefined>;
  const retryAfter = h["retry-after"];
  if (retryAfter) {
    const sec = parseFloat(retryAfter);
    if (!Number.isNaN(sec)) {
      return Math.min(Math.ceil(sec * 1000) + 250, 90_000);
    }
  }
  const resetTokens = h["x-ratelimit-reset-tokens"];
  if (resetTokens) {
    const sec = parseFloat(String(resetTokens).replace(/s$/i, ""));
    if (!Number.isNaN(sec)) {
      return Math.min(Math.ceil(sec * 1000) + 250, 90_000);
    }
  }
  return 12_000;
}

function logGroqRateLimitDebug(
  message: string,
  details?: Record<string, string | number | undefined>
): void {
  if (!GROQ_IMPORT_DEBUG_RATE_LIMIT) return;
  const base = "[groq-import-rate-limit]";
  if (!details) {
    console.info(`${base} ${message}`);
    return;
  }
  const compact = Object.entries(details)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
  console.info(`${base} ${message}${compact ? ` ${compact}` : ""}`);
}

function getGroqImportDailyCallBudget(): number {
  const raw = process.env.GROQ_IMPORT_DAILY_CALL_BUDGET;
  if (raw == null || raw.trim() === "") return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

async function getTodayGroqImportCallsUsed(): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const rows = await prisma.importGenreBackfillJob.aggregate({
    _sum: { apiRequestsUsed: true },
    where: {
      provider: "groq",
      createdAt: { gte: start },
    },
  });
  return Number(rows._sum.apiRequestsUsed ?? 0);
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
  const dailyBudget = getGroqImportDailyCallBudget();
  if (dailyBudget > 0) {
    const usedToday = await getTodayGroqImportCallsUsed();
    if (usedToday >= dailyBudget) {
      throw new Error(
        `GROQ_IMPORT_DAILY_CALL_BUDGET reached for today (${usedToday}/${dailyBudget}).`
      );
    }
  }

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
  // Developer plan baseline defaults: faster throughput with conservative headroom.
  const delayMs = Number(process.env.GROQ_IMPORT_DELAY_MS ?? 1000);
  const maxLlmCalls = Number(process.env.GROQ_IMPORT_MAX_LLM_CALLS ?? 800);
  const maxTracks = Number(process.env.GROQ_IMPORT_MAX_TRACKS ?? 800);

  const created = await prisma.importGenreBackfillJob.create({
    data: {
      userId,
      provider: "groq",
      status: "pending",
      targetUnknownPct:
        Number.isFinite(targetUnknownPct) && targetUnknownPct >= 0 && targetUnknownPct <= 100
          ? targetUnknownPct
          : 15,
      delayMs: Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : 1000,
      maxApiRequests: Number.isFinite(maxLlmCalls) && maxLlmCalls >= 1 ? maxLlmCalls : 800,
      maxArtists: Number.isFinite(maxTracks) && maxTracks >= 1 ? maxTracks : 800,
    },
    select: { id: true, status: true },
  });

  return { jobId: created.id, status: created.status, reused: false };
}

async function runSingleJob(
  jobId: string,
  options?: { maxTracksThisRun?: number }
): Promise<void> {
  const maxTracksThisRun =
    options?.maxTracksThisRun != null && options.maxTracksThisRun > 0
      ? Math.floor(options.maxTracksThisRun)
      : Number.MAX_SAFE_INTEGER;

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
      apiRequestsUsed: true,
      artistsProcessed: true,
      artistsMapped: true,
      tracksUpdated: true,
      status: true,
    },
  });
  if (!job) return;
  if (started.count === 0 && job.status !== "running") return;

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

    let artistsProcessed = job.artistsProcessed;
    let artistsMapped = job.artistsMapped;
    let tracksUpdated = job.tracksUpdated;
    let llmCalls = job.apiRequestsUsed;
    let stoppedByLlmCallCap = false;
    let stoppedByDailyBudget = false;
    let stoppedBySliceLimit = false;
    let rateLimit429Count = 0;
    const dailyBudget = getGroqImportDailyCallBudget();
    const usedTodayAtStart = dailyBudget > 0 ? await getTodayGroqImportCallsUsed() : 0;
    let processedThisRun = 0;

    for (const row of candidates) {
      if (processedThisRun >= maxTracksThisRun) {
        stoppedBySliceLimit = true;
        break;
      }
      const currentStats = await getUserUnknownTrackStats(job.userId);
      if (currentStats.ratio <= job.targetUnknownPct) break;
      if (llmCalls >= job.maxApiRequests) {
        stoppedByLlmCallCap = true;
        break;
      }
      if (dailyBudget > 0 && usedTodayAtStart + llmCalls >= dailyBudget) {
        stoppedByDailyBudget = true;
        break;
      }

      artistsProcessed += 1;
      processedThisRun += 1;
      await sleep(Math.max(0, job.delayMs));

      try {
        let genre: string | null = null;
        let done = false;
        for (let attempt = 0; attempt < GROQ_RATE_LIMIT_EXTRA_ATTEMPTS; attempt++) {
          if (llmCalls >= job.maxApiRequests) {
            stoppedByLlmCallCap = true;
            break;
          }
          if (dailyBudget > 0 && usedTodayAtStart + llmCalls >= dailyBudget) {
            stoppedByDailyBudget = true;
            break;
          }
          llmCalls += 1;
          try {
            genre = await classifyPrimaryTrackGenreGroq(row.title, row.artistName);
            done = true;
            break;
          } catch (err) {
            const is429 = isGroq429Error(err);
            const isLastAttempt = attempt === GROQ_RATE_LIMIT_EXTRA_ATTEMPTS - 1;
            if (!is429 || isLastAttempt) {
              throw err;
            }
            rateLimit429Count += 1;
            const headers = err instanceof RateLimitError ? err.headers : undefined;
            const retryDelayMs = groqRateLimitRetryDelayMs(
              headers
            );
            const h = (headers ?? {}) as Record<string, string | undefined>;
            logGroqRateLimitDebug("429 received, retrying", {
              attempt: attempt + 1,
              maxAttempts: GROQ_RATE_LIMIT_EXTRA_ATTEMPTS,
              retryAfter: h["retry-after"],
              resetTokens: h["x-ratelimit-reset-tokens"],
              remainingTokens: h["x-ratelimit-remaining-tokens"],
              remainingRequests: h["x-ratelimit-remaining-requests"],
              sleepMs: retryDelayMs,
            });
            await sleep(retryDelayMs);
          }
        }

        if (stoppedByLlmCallCap) break;
        if (stoppedByDailyBudget) break;
        if (!done) continue;

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

      if (stoppedByLlmCallCap) break;
      if (stoppedByDailyBudget) break;
    }

    const finalStats = await getUserUnknownTrackStats(job.userId);
    const stoppedByBudgetMessage =
      stoppedByDailyBudget && dailyBudget > 0
        ? `Daily Groq import budget reached (${usedTodayAtStart + llmCalls}/${dailyBudget}).`
        : null;
    await prisma.importGenreBackfillJob.update({
      where: { id: jobId },
      data: {
        status: stoppedByDailyBudget ? "failed" : stoppedBySliceLimit ? "running" : "completed",
        finishedAt: stoppedBySliceLimit ? null : new Date(),
        currentUnknownPct: finalStats.ratio,
        artistsProcessed,
        artistsMapped,
        tracksUpdated,
        apiRequestsUsed: llmCalls,
        errorMessage: stoppedByBudgetMessage,
      },
    });
    logGroqRateLimitDebug("job completed", {
      jobId,
      llmCalls,
      stoppedBySliceLimit: stoppedBySliceLimit ? 1 : 0,
      stoppedByDailyBudget: stoppedByDailyBudget ? 1 : 0,
      rateLimit429Count,
      artistsProcessed,
      tracksUpdated,
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

async function findNextGroqBackfillJobId(): Promise<string | null> {
  const running = await prisma.importGenreBackfillJob.findFirst({
    where: { status: "running", provider: "groq" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (running) return running.id;
  const pending = await prisma.importGenreBackfillJob.findFirst({
    where: { status: "pending", provider: "groq" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return pending?.id ?? null;
}

export async function triggerImportGenreBackfillWorker(): Promise<void> {
  if (workerRunning) return;
  workerRunning = true;
  try {
    while (true) {
      const nextId = await findNextGroqBackfillJobId();
      if (!nextId) break;
      await runSingleJob(nextId);
    }
  } finally {
    workerRunning = false;
  }
}

export async function triggerImportGenreBackfillWorkerRunOnce(): Promise<{
  processed: boolean;
  jobId: string | null;
}> {
  const nextId = await findNextGroqBackfillJobId();
  if (!nextId) return { processed: false, jobId: null };
  const sliceSizeRaw = Number(process.env.GROQ_IMPORT_RUN_ONCE_MAX_TRACKS ?? 25);
  const sliceSize = Number.isFinite(sliceSizeRaw) && sliceSizeRaw > 0 ? Math.floor(sliceSizeRaw) : 25;
  await runSingleJob(nextId, { maxTracksThisRun: sliceSize });
  return { processed: true, jobId: nextId };
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
