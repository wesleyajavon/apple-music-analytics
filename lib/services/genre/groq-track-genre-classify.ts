import type { ChatCompletionCreateParamsNonStreaming } from "groq-sdk/resources/chat/completions";
import {
  createGroqChatCompletion,
  GROQ_DEFAULT_MODEL,
} from "@/lib/services/ai/groq-chat";
import { normalizeGenreLabel } from "@/lib/services/genre/genre-normalization";

/**
 * Ultra-compact prompts to minimize Groq input/output tokens (cost).
 * Model returns: {"g":"Hip hop"} or {"g":null}
 */
const SYSTEM_PROMPT_COMPACT =
  'JSON only:{"g":string|null}. g=one short primary genre label in English; null if unsure.';

function buildUserPromptCompact(artistName: string, title: string): string {
  return `A:${artistName}\nT:${title}`;
}

function parseGenrePayload(raw: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      parsed = JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  const g = o.g ?? o.genre;
  if (g === null || g === undefined) return null;
  if (typeof g !== "string") return null;
  const trimmed = g.trim();
  if (!trimmed || /^unknown$/i.test(trimmed)) return null;
  return trimmed.slice(0, 120);
}

/**
 * Classifies a single track’s primary genre via Groq (one chat completion).
 * Uses shared rate limiter (TPM) with the rest of the app.
 */
export async function classifyPrimaryTrackGenreGroq(
  title: string,
  artistName: string
): Promise<string | null> {
  const model = (process.env.GROQ_MODEL || "").trim() || GROQ_DEFAULT_MODEL;
  const user = buildUserPromptCompact(artistName, title);

  const baseParams: ChatCompletionCreateParamsNonStreaming = {
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT_COMPACT },
      { role: "user", content: user },
    ],
    temperature: 0.15,
    max_tokens: 40,
  };

  let response;
  try {
    response = await createGroqChatCompletion({
      ...baseParams,
      response_format: { type: "json_object" },
    });
  } catch (e) {
    if (/response_format|json_object|unsupported/i.test(String((e as Error).message || e))) {
      response = await createGroqChatCompletion(baseParams);
    } else {
      throw e;
    }
  }

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) return null;

  const rawGenre = parseGenrePayload(content);
  if (!rawGenre) return null;

  return normalizeGenreLabel(rawGenre)?.trim() ?? rawGenre;
}
