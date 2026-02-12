/**
 * AI Commentary Service for Taste Evolution
 *
 * Accepts ONLY structured trend output from taste-evolution-core.
 * Generates a concise 1-2 paragraph narrative. No speculation.
 * References computed metrics explicitly.
 * Locale: output language (fr, en, es). All prompt content is localized so the LLM outputs in the target language.
 */

import Groq from "groq-sdk";
import { getAiInsightsLabels } from "@/lib/constants/ai-insights-labels";
import type { WeekToWeekTrend } from "@/lib/dto/taste-evolution";
import { getLanguageName, type AiLocale } from "./locale-utils";

function buildSystemPrompt(locale: AiLocale): string {
  const lang = getLanguageName(locale);
  return `You are a music analyst who generates concise narratives about week-to-week taste evolution.

STRICT RULES:
1. Base your response ONLY on the structured data provided. Do not invent anything.
2. Do not make any speculation or hypothesis not supported by the numbers.
3. Produce 1-2 short paragraphs maximum (3-5 sentences total).
4. Each statement must explicitly cite a metric (number, percentage, genre name).
5. LANGUAGE: ${lang}. You MUST respond ENTIRELY in this language. Style: clear, accessible.
6. Explain what changed and why it matters, without extrapolating.

Good example: "The week of Jan 15 shows an expansion of your tastes: 3 new genres appear and entropy increases by 0.4. Rock gains +5 points while pop declines."
Bad example: "You are exploring more and more." (too vague, no numbers)`;
}

/**
 * Generates AI narrative from structured trend data.
 *
 * @param trends - Array of week-to-week trend objects (deterministic output)
 * @param locale - fr | en | es - output language
 * @returns 1-2 paragraph narrative string
 */
export async function generateTasteEvolutionCommentary(
  trends: WeekToWeekTrend[],
  locale: AiLocale = "fr"
): Promise<string> {
  if (trends.length === 0) {
    return "";
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return "";
  }

  const labels = getAiInsightsLabels(locale).tasteEvolution;
  const groq = new Groq({ apiKey });

  // Build a compact summary of trends for the prompt (all labels localized)
  const summaryLines = trends.map((t) => {
    const parts: string[] = [
      `${t.timeRange.label} (vs ${t.previousWeekRange.label}):`,
      `  ${labels.volume}: ${t.volumeDelta >= 0 ? "+" : ""}${t.volumeDelta} ${labels.listens} (${t.volumeDeltaPct >= 0 ? "+" : ""}${t.volumeDeltaPct.toFixed(1)}%)`,
      `  ${labels.diversity}: ${t.diversityDelta >= 0 ? "+" : ""}${t.diversityDelta.toFixed(2)} (entropy), genres: ${t.genreCountPrevious} → ${t.genreCountCurrent}`,
      `  ${labels.classification}: ${t.classification}`,
    ];
    if (t.emergingGenres.length > 0) {
      parts.push(
        `  ${labels.emergingGenres}: ${t.emergingGenres.map((g) => `${g.genre} (+${g.deltaPct.toFixed(1)}pp)`).join(", ")}`
      );
    }
    if (t.decliningGenres.length > 0) {
      parts.push(
        `  ${labels.decliningGenres}: ${t.decliningGenres.map((g) => `${g.genre} (${g.deltaPct.toFixed(1)}pp)`).join(", ")}`
      );
    }
    if (t.artistRankMovements.length > 0) {
      const topMoves = t.artistRankMovements.slice(0, 3).map((a) =>
        a.rankChange > 0
          ? `${a.artistName} (+${a.rankChange} ${labels.rankUp})`
          : `${a.artistName} (${a.rankChange} ${labels.rankDown})`
      );
      parts.push(`  ${labels.artistMovements}: ${topMoves.join(", ")}`);
    }
    return parts.join("\n");
  });

  const userPrompt = `${labels.promptIntro}

---
${summaryLines.join("\n\n")}
---

${labels.promptInstruction}`;

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: buildSystemPrompt(locale) },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 400,
  });

  const content = response.choices[0]?.message?.content?.trim();
  return content ?? "";
}
