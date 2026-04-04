/**
 * Per-subject daily quota for Groq-backed routes under /api/ai/*.
 *
 * Storage: Redis (shared across instances) when REDIS_URL is set; otherwise an in-memory
 * counter (per Node process only — documenté pour le dev / instance unique).
 * Pas de table Prisma : pour un quota durable sans Redis, ajouter une table dédiée ou un job de nettoyage.
 *
 * Compte uniquement les consommations explicites (appels Groq réels — typiquement après cache miss).
 */

import type { NextRequest } from "next/server";
import { getRedisClient } from "@/lib/redis";
import { AppError, ErrorCodes } from "@/lib/utils/error-handler";

const REDIS_QUOTA_LUA = `
local n = redis.call('INCR', KEYS[1])
if n == 1 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
end
if n > tonumber(ARGV[2]) then
  redis.call('DECR', KEYS[1])
  return 0
end
return 1
`;

/** UTC calendar day YYYY-MM-DD */
export function getUtcDayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function secondsUntilUtcMidnight(): number {
  const now = Date.now();
  const next = Date.UTC(
    new Date(now).getUTCFullYear(),
    new Date(now).getUTCMonth(),
    new Date(now).getUTCDate() + 1
  );
  return Math.max(1, Math.floor((next - now) / 1000));
}

function encodeSubjectForKey(subject: string): string {
  return Buffer.from(subject, "utf8").toString("base64url");
}

function getRedisQuotaKey(subject: string): string {
  const day = getUtcDayString();
  return `groq:user-daily:${day}:${encodeSubjectForKey(subject)}`;
}

let memoryDay: string | null = null;
const memoryCounts = new Map<string, number>();

function resetMemoryIfNewUtcDay(): void {
  const day = getUtcDayString();
  if (memoryDay !== day) {
    memoryCounts.clear();
    memoryDay = day;
  }
}

/** In-process fallback when Redis is absent or errors. Not shared across serverless instances. */
export function tryConsumeGroqUserQuotaMemory(
  subject: string,
  limit: number
): boolean {
  resetMemoryIfNewUtcDay();
  const next = (memoryCounts.get(subject) ?? 0) + 1;
  if (next > limit) return false;
  memoryCounts.set(subject, next);
  return true;
}

async function tryConsumeGroqUserQuotaRedis(
  subject: string,
  limit: number
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) {
    return tryConsumeGroqUserQuotaMemory(subject, limit);
  }
  const key = getRedisQuotaKey(subject);
  const ttl = secondsUntilUtcMidnight();
  try {
    const raw = (await redis.eval(
      REDIS_QUOTA_LUA,
      1,
      key,
      String(ttl),
      String(limit)
    )) as number;
    return raw === 1;
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[groq-user-quota] Redis failed, using in-memory fallback:", e);
    }
    return tryConsumeGroqUserQuotaMemory(subject, limit);
  }
}

export function getGroqUserDailyQuotaLimit(): number {
  const raw = process.env.GROQ_USER_DAILY_QUOTA;
  if (raw === undefined || raw === "") return 40;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 40;
}

export function isGroqUserQuotaEnabled(): boolean {
  if (process.env.GROQ_USER_QUOTA_ENABLED === "false") return false;
  return getGroqUserDailyQuotaLimit() > 0;
}

function getClientIp(request: NextRequest): string | null {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const cf = request.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  return null;
}

/**
 * Identifiant stable pour le quota : `userId` (query ou body) prioritaire, sinon IP client.
 * Retourne null si aucun sujet fiable (quota désactivé pour cette requête — fail-open).
 */
export function resolveGroqQuotaSubject(
  request: NextRequest,
  bodyUserId?: string
): string | null {
  const q = request.nextUrl.searchParams.get("userId")?.trim();
  if (q) return `u:${q}`;
  const b = bodyUserId?.trim();
  if (b) return `u:${b}`;
  const ip = getClientIp(request);
  if (ip) return `ip:${ip}`;
  return null;
}

function nextUtcMidnightIso(): string {
  const now = new Date();
  const next = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1
  );
  return new Date(next).toISOString();
}

function createQuotaExceededError(limit: number): AppError {
  return new AppError(
    429,
    "Daily AI generation limit reached. Try again tomorrow.",
    ErrorCodes.GROQ_DAILY_QUOTA_EXCEEDED,
    { limit, resetAtUtc: nextUtcMidnightIso() }
  );
}

/**
 * Incrémente le quota et lève une AppError 429 si la limite est dépassée.
 * À appeler uniquement lorsqu’un appel Groq va réellement partir (ex. cache miss).
 */
export async function assertGroqUserQuotaForRequest(
  request: NextRequest,
  bodyUserId?: string
): Promise<void> {
  if (!isGroqUserQuotaEnabled()) return;
  const subject = resolveGroqQuotaSubject(request, bodyUserId);
  if (subject === null) return;
  const limit = getGroqUserDailyQuotaLimit();
  const allowed = await tryConsumeGroqUserQuotaRedis(subject, limit);
  if (!allowed) {
    throw createQuotaExceededError(limit);
  }
}

/** @internal tests */
export function __resetGroqUserQuotaMemoryForTests(): void {
  memoryDay = null;
  memoryCounts.clear();
}
