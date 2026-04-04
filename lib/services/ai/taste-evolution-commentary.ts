/**
 * AI Commentary Service for Taste Evolution
 *
 * Accepts ONLY structured trend output from taste-evolution-core.
 * Generates a concise 1-2 paragraph narrative. No speculation.
 * References computed metrics explicitly.
 * Locale: output language (fr, en, es). All prompt content is localized so the LLM outputs in the target language.
 */

import { createGroqChatCompletion, GROQ_DEFAULT_MODEL } from "@/lib/services/ai/groq-chat";
import { getAiInsightsLabels } from "@/lib/constants/ai-insights-labels";
import type { WeekToWeekTrend } from "@/lib/dto/taste-evolution";
import { getLanguageName, type AiLocale } from "./locale-utils";

function buildSystemPrompt(locale: AiLocale, light: boolean): string {
  const lang = getLanguageName(locale);
  if (light) {
    return `You are a friendly music analyst who writes easy-to-read summaries about week-to-week taste evolution.

STRICT RULES:
1. Base your response ONLY on the structured data provided. Do not invent anything.
2. Use plain, conversational language. NO percentages, NO percentage points, NO entropy, NO technical metrics.
3. Produce 1-2 short paragraphs maximum (3-5 sentences total).
4. Describe changes qualitatively: "you discovered new genres", "Rock is gaining ground", "Artist X is rising".
5. LANGUAGE: ${lang}. You MUST respond ENTIRELY in this language. Style: warm, accessible, like talking to a friend.
6. Focus on the story: what's new, what's shifting, the overall vibe. Avoid any numbers.

Good example: "This week you're exploring more: new genres appeared and your listening became more varied. Rock is gaining ground while pop takes a step back. A few artists are climbing your personal charts."
Bad example: "Entropy increased by 0.4 and Rock gained +5pp." (too technical)`;
  }
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

/** Light summary: qualitative only, no numbers */
function buildLightSummaryLines(trends: WeekToWeekTrend[], labels: TasteEvolutionLabels): string[] {
  return trends.map((t) => {
    const parts: string[] = [
      `${t.timeRange.label} (vs ${t.previousWeekRange.label}):`,
      `  ${labels.classification}: ${t.classification}`,
      `  ${labels.volume}: ${t.volumeDelta >= 0 ? "more" : "fewer"} ${labels.listens}`,
      `  ${labels.diversity}: ${t.diversityDelta >= 0 ? "more varied" : "more focused"}, genres: ${t.genreCountPrevious} → ${t.genreCountCurrent}`,
    ];
    if (t.emergingGenres.length > 0) {
      parts.push(
        `  ${labels.emergingGenres}: ${t.emergingGenres.map((g) => g.genre).join(", ")}`
      );
    }
    if (t.decliningGenres.length > 0) {
      parts.push(
        `  ${labels.decliningGenres}: ${t.decliningGenres.map((g) => g.genre).join(", ")}`
      );
    }
    if (t.artistRankMovements.length > 0) {
      const topMoves = t.artistRankMovements.slice(0, 3).map((a) =>
        a.rankChange > 0 ? `${a.artistName} (${labels.rankDown})` : `${a.artistName} (${labels.rankUp})`
      );
      parts.push(`  ${labels.artistMovements}: ${topMoves.join(", ")}`);
    }
    return parts.join("\n");
  });
}

/** Technical summary: full metrics with numbers */
function buildTechnicalSummaryLines(
  trends: WeekToWeekTrend[],
  labels: TasteEvolutionLabels
): string[] {
  return trends.map((t) => {
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
}

type TasteEvolutionLabels = ReturnType<typeof getAiInsightsLabels>["tasteEvolution"];

/**
 * Generates AI narrative from structured trend data.
 *
 * @param trends - Array of week-to-week trend objects (deterministic output)
 * @param locale - fr | en | es - output language
 * @param light - If true, generates easy-to-read version without percentages/technical data
 * @returns 1-2 paragraph narrative string
 */
export async function generateTasteEvolutionCommentary(
  trends: WeekToWeekTrend[],
  locale: AiLocale = "fr",
  light = false
): Promise<string> {
  if (trends.length === 0) {
    return "";
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return "";
  }

  const labels = getAiInsightsLabels(locale).tasteEvolution;
  const summaryLines = light
    ? buildLightSummaryLines(trends, labels)
    : buildTechnicalSummaryLines(trends, labels);

  const promptIntro = light ? labels.promptIntroLight : labels.promptIntro;
  const promptInstruction = light ? labels.promptInstructionLight : labels.promptInstruction;

  const userPrompt = `${promptIntro}

---
${summaryLines.join("\n\n")}
---

${promptInstruction}`;

  const response = await createGroqChatCompletion({
    model: GROQ_DEFAULT_MODEL,
    messages: [
      { role: "system", content: buildSystemPrompt(locale, light) },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 400,
  });

  const content = response.choices[0]?.message?.content?.trim();
  return content ?? "";
}
