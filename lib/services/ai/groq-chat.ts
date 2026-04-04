/**
 * Single entrypoint for Groq chat completions: rate limit + SDK retries.
 */

import Groq from "groq-sdk";
import type { ChatCompletion } from "groq-sdk/resources/chat/completions";
import type { ChatCompletionCreateParamsNonStreaming } from "groq-sdk/resources/chat/completions";
import { GROQ_DEFAULT_MODEL } from "@/lib/services/ai/groq-config";
import {
  acquireGroqTokens,
  estimateGroqChatTokens,
} from "@/lib/services/ai/groq-rate-limiter";

const GROQ_MAX_SDK_RETRIES = 8;

export { GROQ_DEFAULT_MODEL };

/**
 * Creates a Groq chat completion after acquiring TPM budget (sliding window).
 */
export async function createGroqChatCompletion(
  params: ChatCompletionCreateParamsNonStreaming
): Promise<ChatCompletion> {
  await acquireGroqTokens(estimateGroqChatTokens(params));
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }
  const groq = new Groq({ apiKey, maxRetries: GROQ_MAX_SDK_RETRIES });
  return groq.chat.completions.create(params);
}
