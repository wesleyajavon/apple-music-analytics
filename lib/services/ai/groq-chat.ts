/**
 * Single entrypoint for Groq chat completions: rate limit + SDK retries.
 */

import Groq from "groq-sdk";
import type { ChatCompletion } from "groq-sdk/resources/chat/completions";
import type { ChatCompletionCreateParamsNonStreaming } from "groq-sdk/resources/chat/completions";
import { GROQ_DEFAULT_MODEL, resolveGroqModel } from "@/lib/services/ai/groq-config";
import {
  acquireGroqTokens,
  estimateGroqChatTokens,
} from "@/lib/services/ai/groq-rate-limiter";

const GROQ_MAX_SDK_RETRIES = 8;

/** Extra completion budget so gpt-oss reasoning tokens do not starve `content`. */
const GPT_OSS_REASONING_HEADROOM = 512;

export { GROQ_DEFAULT_MODEL };

function isGptOssModel(model: string): boolean {
  return model.startsWith("openai/gpt-oss-");
}

function withGroqModelDefaults(
  params: ChatCompletionCreateParamsNonStreaming
): ChatCompletionCreateParamsNonStreaming {
  const model = resolveGroqModel(params.model);
  const next: ChatCompletionCreateParamsNonStreaming = { ...params, model };

  if (!isGptOssModel(model)) {
    return next;
  }

  if (next.reasoning_effort == null) {
    next.reasoning_effort = "low";
  }
  if (next.include_reasoning == null) {
    next.include_reasoning = false;
  }

  const requested = next.max_completion_tokens ?? next.max_tokens ?? 500;
  next.max_completion_tokens = requested + GPT_OSS_REASONING_HEADROOM;
  delete next.max_tokens;

  return next;
}

/**
 * Creates a Groq chat completion after acquiring TPM + RPM sliding-window budgets (60s).
 */
export async function createGroqChatCompletion(
  params: ChatCompletionCreateParamsNonStreaming
): Promise<ChatCompletion> {
  const request = withGroqModelDefaults(params);
  await acquireGroqTokens(estimateGroqChatTokens(request));
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }
  const groq = new Groq({ apiKey, maxRetries: GROQ_MAX_SDK_RETRIES });
  return groq.chat.completions.create(request);
}
