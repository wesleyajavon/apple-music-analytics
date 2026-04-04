/**
 * DTOs for Explain My Taste (taste profile) feature
 * Input: aggregated analytics only (no raw listening events)
 * Output: structured text fields for UI rendering
 */

import type { AiInsightsInput } from "@/lib/dto/ai-insights";

/**
 * Extended input for taste profile - includes diversity metrics.
 * Reuses AiInsightsInput structure; diversity fields are optional
 * for backward compatibility with minimal analytics.
 */
export interface TasteProfileInput extends AiInsightsInput {
  /** Total listens (for diversity metrics) */
  totalListens?: number;
  /** Unique artists count (for diversity metrics) */
  uniqueArtists?: number;
  /** Unique tracks count (for diversity metrics) */
  uniqueTracks?: number;
}

/**
 * Tone variants for profile generation.
 * Affects wording and style only, NOT factual content.
 */
export type TasteProfileTone = "analytical" | "casual" | "poetic";

/**
 * Structured output from the taste profile LLM.
 * Each field is a distinct section for clean UI rendering.
 */
export interface TasteProfileResponse {
  /** One-paragraph "Your music taste is..." description */
  description: string;
  /** Influences: genres, styles, cultural signals */
  influences: string;
  /** Core genres ranked, concise */
  coreGenres: string;
  /** What makes this taste unique */
  uniqueAspect: string;
  /** Whether response was served from cache */
  cached: boolean;
  /** True when AI is disabled (AI_MASTER_ENABLED / cookie). */
  aiUnavailable?: boolean;
}
