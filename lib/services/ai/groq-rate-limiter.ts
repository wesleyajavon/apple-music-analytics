/**
 * Groq TPM-style sliding window: limits estimated token *budget* per rolling minute.
 * Uses Redis when REDIS_URL is set (distributed across serverless instances),
 * otherwise an in-process sliding window (dev / single instance).
 */

import { getRedisClient } from "@/lib/redis";
import {
  getGroqEffectiveTpmBudget,
  isGroqRateLimitEnabled,
} from "@/lib/services/ai/groq-config";
import type { ChatCompletionCreateParamsNonStreaming } from "groq-sdk/resources/chat/completions";

const WINDOW_MS = 60_000;
const REDIS_ZSET_KEY = "groq:tpm:window";
const REDIS_SEQ_KEY = "groq:tpm:seq";
const MAX_ACQUIRE_WAIT_MS = 120_000;

const ACQUIRE_LUA = `
local zkey = KEYS[1]
local seqkey = KEYS[2]
local now = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local cost = tonumber(ARGV[3])
local limit = tonumber(ARGV[4])

redis.call('ZREMRANGEBYSCORE', zkey, 0, now - window_ms)
local members = redis.call('ZRANGE', zkey, 0, -1)
local total = 0
for i, m in ipairs(members) do
  local c = tonumber(string.match(m, '^(%d+):'))
  if c then total = total + c end
end
if total + cost > limit then
  local oldest = redis.call('ZRANGE', zkey, 0, 0, 'WITHSCORES')
  local wait_ms = 500
  if oldest and #oldest >= 2 then
    local oldest_ts = tonumber(oldest[2])
    if oldest_ts then
      local w = window_ms - (now - oldest_ts) + 50
      if w > 0 then wait_ms = math.min(w, 30000) end
    end
  end
  return {0, total, wait_ms}
end
local uniq = redis.call('INCR', seqkey)
redis.call('PEXPIRE', seqkey, 86400)
local member = tostring(cost) .. ':' .. tostring(now) .. ':' .. tostring(uniq)
redis.call('ZADD', zkey, now, member)
redis.call('PEXPIRE', zkey, window_ms + 1000)
return {1, total + cost, 0}
`;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type MemoryEntry = { t: number; cost: number };
const memoryWindow: MemoryEntry[] = [];
let memoryChain: Promise<void> = Promise.resolve();

function pruneMemory(now: number): void {
  for (;;) {
    const first = memoryWindow[0];
    if (!first || first.t > now - WINDOW_MS) break;
    memoryWindow.shift();
  }
}

function memoryWindowTotal(): number {
  return memoryWindow.reduce((s, e) => s + e.cost, 0);
}

async function acquireMemory(estimatedTokens: number): Promise<void> {
  const limit = getGroqEffectiveTpmBudget();
  const started = Date.now();
  for (;;) {
    const now = Date.now();
    if (now - started > MAX_ACQUIRE_WAIT_MS) {
      return;
    }
    pruneMemory(now);
    const total = memoryWindowTotal();
    if (total + estimatedTokens <= limit) {
      memoryWindow.push({ t: now, cost: estimatedTokens });
      return;
    }
    const oldest = memoryWindow[0];
    const wait =
      oldest && oldest.t <= now
        ? Math.min(
            WINDOW_MS - (now - oldest.t) + 50,
            5000
          )
        : 500;
    await sleep(Math.max(50, Math.min(wait, 3000)));
  }
}

function acquireMemorySerialized(estimatedTokens: number): Promise<void> {
  const next = memoryChain.then(() => acquireMemory(estimatedTokens));
  memoryChain = next.catch(() => {});
  return next;
}

async function acquireRedis(estimatedTokens: number): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    await acquireMemorySerialized(estimatedTokens);
    return;
  }

  const limit = getGroqEffectiveTpmBudget();
  const started = Date.now();

  for (;;) {
    const now = Date.now();
    if (now - started > MAX_ACQUIRE_WAIT_MS) {
      return;
    }

    try {
      const raw = (await redis.eval(
        ACQUIRE_LUA,
        2,
        REDIS_ZSET_KEY,
        REDIS_SEQ_KEY,
        String(now),
        String(WINDOW_MS),
        String(estimatedTokens),
        String(limit)
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
 * Rough token estimate for chat completions (input + reserved output).
 * Conservative enough to avoid TPM spikes on Groq free tier.
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
  const output = params.max_tokens ?? 500;
  return inputTokens + output;
}

/**
 * Waits until this request would fit within the rolling TPM budget, then records it.
 */
export async function acquireGroqTokens(estimatedTokens: number): Promise<void> {
  if (!isGroqRateLimitEnabled()) {
    return;
  }
  const cost = Math.max(1, Math.ceil(estimatedTokens));
  await acquireRedis(cost);
}
