/**
 * Groq TPM + RPM sliding windows (same 60s window Groq documents for TPM/RPM headers).
 * Reserves **both** dimensions atomically (Redis Lua) so we do not leak one slot when the other blocks.
 * Uses Redis when REDIS_URL is set (distributed across serverless instances),
 * otherwise in-process windows (dev / single instance), serialized to avoid races.
 */

import { getRedisClient } from "@/lib/redis";
import {
  getGroqEffectiveRpmBudget,
  getGroqEffectiveTpmBudget,
  isGroqRateLimitEnabled,
} from "@/lib/services/ai/groq-config";
import type { ChatCompletionCreateParamsNonStreaming } from "groq-sdk/resources/chat/completions";

const WINDOW_MS = 60_000;
const REDIS_TPM_ZSET_KEY = "groq:tpm:window";
const REDIS_TPM_SEQ_KEY = "groq:tpm:seq";
const REDIS_RPM_ZSET_KEY = "groq:rpm:window";
const REDIS_RPM_SEQ_KEY = "groq:rpm:seq";
const MAX_ACQUIRE_WAIT_MS = 120_000;

/** Atomically prune TPM/RPM windows, check both caps, then record one chat completion worth of usage. */
const ACQUIRE_TPM_RPM_LUA = `
local tpm_zkey = KEYS[1]
local tpm_seqkey = KEYS[2]
local rpm_zkey = KEYS[3]
local rpm_seqkey = KEYS[4]
local now = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local tpm_cost = tonumber(ARGV[3])
local tpm_limit = tonumber(ARGV[4])
local rpm_limit = tonumber(ARGV[5])

local cutoff = now - window_ms
redis.call('ZREMRANGEBYSCORE', tpm_zkey, 0, cutoff)
redis.call('ZREMRANGEBYSCORE', rpm_zkey, 0, cutoff)

local tpm_members = redis.call('ZRANGE', tpm_zkey, 0, -1)
local tpm_total = 0
for _, m in ipairs(tpm_members) do
  local c = tonumber(string.match(m, '^(%d+):'))
  if c then tpm_total = tpm_total + c end
end

local rpm_count = redis.call('ZCARD', rpm_zkey)

local function wait_for(zkey)
  local oldest = redis.call('ZRANGE', zkey, 0, 0, 'WITHSCORES')
  local wait_ms = 500
  if oldest and #oldest >= 2 then
    local oldest_ts = tonumber(oldest[2])
    if oldest_ts then
      local w = window_ms - (now - oldest_ts) + 50
      if w > 0 then wait_ms = math.min(w, 30000) end
    end
  end
  return wait_ms
end

if tpm_total + tpm_cost > tpm_limit then
  return {0, 1, wait_for(tpm_zkey)}
end
if rpm_count + 1 > rpm_limit then
  return {0, 2, wait_for(rpm_zkey)}
end

local tpm_uniq = redis.call('INCR', tpm_seqkey)
redis.call('PEXPIRE', tpm_seqkey, 86400)
local tpm_member = tostring(tpm_cost) .. ':' .. tostring(now) .. ':' .. tostring(tpm_uniq)
redis.call('ZADD', tpm_zkey, now, tpm_member)
redis.call('PEXPIRE', tpm_zkey, window_ms + 1000)

local rpm_uniq = redis.call('INCR', rpm_seqkey)
redis.call('PEXPIRE', rpm_seqkey, 86400)
local rpm_member = '1:' .. tostring(now) .. ':' .. tostring(rpm_uniq)
redis.call('ZADD', rpm_zkey, now, rpm_member)
redis.call('PEXPIRE', rpm_zkey, window_ms + 1000)

return {1, 0, 0}
`;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type MemoryEntry = { t: number; cost: number };
const memoryTpmWindow: MemoryEntry[] = [];
/** One entry per outbound completion attempt (cost always 1); mirrors RPM. */
const memoryRpmWindow: MemoryEntry[] = [];
let memoryChain: Promise<void> = Promise.resolve();

function pruneMemoryWindow(entries: MemoryEntry[], now: number): void {
  for (;;) {
    const first = entries[0];
    if (!first || first.t > now - WINDOW_MS) break;
    entries.shift();
  }
}

function memoryTpmTotal(): number {
  return memoryTpmWindow.reduce((s, e) => s + e.cost, 0);
}

function memoryRpmTotal(): number {
  return memoryRpmWindow.reduce((s, e) => s + e.cost, 0);
}

async function acquireMemoryCombined(estimatedTokens: number): Promise<void> {
  const tpmLimit = getGroqEffectiveTpmBudget();
  const rpmLimit = getGroqEffectiveRpmBudget();
  const started = Date.now();
  for (;;) {
    const now = Date.now();
    if (now - started > MAX_ACQUIRE_WAIT_MS) {
      return;
    }
    pruneMemoryWindow(memoryTpmWindow, now);
    pruneMemoryWindow(memoryRpmWindow, now);
    const tpmSum = memoryTpmTotal();
    const rpmSum = memoryRpmTotal();
    if (tpmSum + estimatedTokens <= tpmLimit && rpmSum + 1 <= rpmLimit) {
      memoryTpmWindow.push({ t: now, cost: estimatedTokens });
      memoryRpmWindow.push({ t: now, cost: 1 });
      return;
    }
    let wait = 500;
    const tpmOldest = memoryTpmWindow[0];
    const rpmOldest = memoryRpmWindow[0];
    if (tpmSum + estimatedTokens > tpmLimit && tpmOldest && tpmOldest.t <= now) {
      wait = Math.max(
        wait,
        Math.min(WINDOW_MS - (now - tpmOldest.t) + 50, 5000)
      );
    }
    if (rpmSum + 1 > rpmLimit && rpmOldest && rpmOldest.t <= now) {
      wait = Math.max(
        wait,
        Math.min(WINDOW_MS - (now - rpmOldest.t) + 50, 5000)
      );
    }
    await sleep(Math.max(50, Math.min(wait, 3000)));
  }
}

function acquireMemorySerialized(estimatedTokens: number): Promise<void> {
  const next = memoryChain.then(() => acquireMemoryCombined(estimatedTokens));
  memoryChain = next.catch(() => {});
  return next;
}

async function acquireRedisCombined(estimatedTokens: number): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    await acquireMemorySerialized(estimatedTokens);
    return;
  }

  const tpmLimit = getGroqEffectiveTpmBudget();
  const rpmLimit = getGroqEffectiveRpmBudget();
  const started = Date.now();

  for (;;) {
    const now = Date.now();
    if (now - started > MAX_ACQUIRE_WAIT_MS) {
      return;
    }

    try {
      const raw = (await redis.eval(
        ACQUIRE_TPM_RPM_LUA,
        4,
        REDIS_TPM_ZSET_KEY,
        REDIS_TPM_SEQ_KEY,
        REDIS_RPM_ZSET_KEY,
        REDIS_RPM_SEQ_KEY,
        String(now),
        String(WINDOW_MS),
        String(estimatedTokens),
        String(tpmLimit),
        String(rpmLimit)
      )) as [number, number, number];

      const ok = raw[0];
      if (ok === 1) return;

      const waitMs = Math.min(Math.max(raw[2] ?? 500, 50), 5000);
      await sleep(waitMs);
    } catch {
      await acquireMemorySerialized(estimatedTokens);
      return;
    }
  }
}

/**
 * TPM pre-acquire must not reserve the full Groq completion upper bound — large max_tokens would
 * exceed the sliding minute budget and stall each step for MINUTE+ (music chat chains several calls).
 * Groq TPM is enforced upstream; under-estimating here avoids self-deadlock while still pacing bursts.
 */
const GROQ_TPM_RESERVE_OUTPUT_CAP = 3072;

/**
 * Rough token estimate for chat completions (input + reserved output for sliding window pacing).
 */
export function estimateGroqChatTokens(
  params: Pick<
    ChatCompletionCreateParamsNonStreaming,
    "messages" | "max_tokens"
  >
): number {
  let chars = 0;
  for (const m of params.messages) {
    const c = m.content;
    if (typeof c === "string") {
      chars += c.length;
    } else if (Array.isArray(c)) {
      for (const part of c) {
        if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
          chars += part.text.length;
        }
      }
    }
  }
  const inputTokens = Math.ceil(chars / 4);
  const configured = params.max_tokens ?? 500;
  const reservedOutput = Math.min(configured, GROQ_TPM_RESERVE_OUTPUT_CAP);
  return inputTokens + reservedOutput;
}

/**
 * Waits until this completion fits rolling **TPM** and **RPM** budgets (same 60s window), then records both.
 */
export async function acquireGroqTokens(estimatedTokens: number): Promise<void> {
  if (!isGroqRateLimitEnabled()) {
    return;
  }
  const cost = Math.max(1, Math.ceil(estimatedTokens));
  await acquireRedisCombined(cost);
}
