/**
 * AI Commentary Service for Taste Evolution
 *
 * Accepts ONLY structured trend output from taste-evolution-core.
 * Generates a concise 1-2 paragraph narrative. No speculation.
 * References computed metrics explicitly.
 * Locale: output language (fr, en, es).
 */

import Groq from "groq-sdk";
import type { WeekToWeekTrend } from "@/lib/dto/taste-evolution";
import { getLanguageName, type AiLocale } from "./locale-utils";

function buildSystemPrompt(locale: AiLocale): string {
  const lang = getLanguageName(locale);
  return `Tu es un analyste musical qui génère un récit concis sur l'évolution des goûts musicaux semaine après semaine.

RÈGLES STRICTES:
1. Base-toi UNIQUEMENT sur les données structurées fournies. N'invente rien.
2. Ne fais aucune spéculation ou hypothèse non supportée par les chiffres.
3. Produis 1 à 2 courts paragraphes maximum (3-5 phrases au total).
4. Chaque affirmation doit citer explicitement une métrique (chiffre, pourcentage, nom de genre).
5. Langue: ${lang}. Réponds ENTIÈREMENT dans cette langue. Style: clair, accessible.
6. Explique ce qui a changé et pourquoi c'est pertinent, sans extrapoler.

Exemple de bon commentaire: "La semaine du 15 jan. montre une expansion de vos goûts : 3 nouveaux genres apparaissent et l'entropie augmente de 0,4. Le rock progresse de +5 points tandis que la pop recule."
Exemple à éviter: "Vous explorez de plus en plus." (trop vague, pas de chiffre)`;
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

  const groq = new Groq({ apiKey });

  // Build a compact summary of trends for the prompt
  const summaryLines = trends.map((t) => {
    const parts: string[] = [
      `${t.timeRange.label} (vs ${t.previousWeekRange.label}):`,
      `  Volume: ${t.volumeDelta >= 0 ? "+" : ""}${t.volumeDelta} écoutes (${t.volumeDeltaPct >= 0 ? "+" : ""}${t.volumeDeltaPct.toFixed(1)}%)`,
      `  Diversité: ${t.diversityDelta >= 0 ? "+" : ""}${t.diversityDelta.toFixed(2)} (entropie), genres: ${t.genreCountPrevious} → ${t.genreCountCurrent}`,
      `  Classification: ${t.classification}`,
    ];
    if (t.emergingGenres.length > 0) {
      parts.push(
        `  Genres émergents: ${t.emergingGenres.map((g) => `${g.genre} (+${g.deltaPct.toFixed(1)}pp)`).join(", ")}`
      );
    }
    if (t.decliningGenres.length > 0) {
      parts.push(
        `  Genres en baisse: ${t.decliningGenres.map((g) => `${g.genre} (${g.deltaPct.toFixed(1)}pp)`).join(", ")}`
      );
    }
    if (t.artistRankMovements.length > 0) {
      const topMoves = t.artistRankMovements.slice(0, 3).map((a) =>
        a.rankChange > 0
          ? `${a.artistName} (+${a.rankChange} pos.)`
          : `${a.artistName} (${a.rankChange} pos.)`
      );
      parts.push(`  Mouvements artistes: ${topMoves.join(", ")}`);
    }
    return parts.join("\n");
  });

  const userPrompt = `Voici un résumé des tendances semaine-à-semaine d'évolution des goûts musicaux:

---
${summaryLines.join("\n\n")}
---

Génère 1 à 2 courts paragraphes qui expliquent ce qui a changé et pourquoi c'est pertinent.
Chaque affirmation doit citer une métrique. Pas d'introduction ni de conclusion.`;

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
