/**
 * LLM Service for AI Insights
 *
 * Server-side only. Uses Groq API (free tier) to generate
 * data-grounded insights from aggregated analytics.
 *
 * Prompt design: Explicit references to metrics, no speculation,
 * 3-5 concise bullet points. Output is factual and readable.
 */

import Groq from "groq-sdk";
import type { AnalyticsSummary } from "./analytics-summarizer";

const INSIGHTS_SYSTEM_PROMPT = `Tu es un analyste musical qui génère des insights concis à partir de données d'écoute agrégées.

RÈGLES STRICTES:
1. Base-toi UNIQUEMENT sur les données fournies. N'invente rien.
2. Ne fais aucune spéculation ou hypothèse non supportée par les chiffres.
3. Produis exactement 3 à 5 points sous forme de puces.
4. Chaque point doit citer explicitement au moins une métrique (chiffre, pourcentage, nom).
5. Langue: français. Style: clair, accessible à un utilisateur non technique.
6. Évite les formules génériques ("Vous écoutez beaucoup de musique"). Sois spécifique.

Exemple de bon insight: "Le rock représente 42% de vos écoutes, dominant largement les autres genres."
Exemple à éviter: "Vous avez des goûts musicaux variés." (trop vague, pas de chiffre)`;

/**
 * Generates AI insights from a normalized analytics summary.
 * Uses Groq (free tier) with Llama 3.1 8B for structured, factual output.
 *
 * @param summary - Deterministic analytics summary from summarizeAnalytics()
 * @returns Array of 3-5 insight strings (bullet points)
 */
export async function generateInsights(
  summary: AnalyticsSummary
): Promise<string[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not configured. AI insights are disabled."
    );
  }

  const groq = new Groq({ apiKey });

  // Prompt explicitly references the structured data to ground the model
  const userPrompt = `Voici un résumé agrégé des données d'écoute musicale d'un utilisateur:

---
${summary.text}
---

Génère 3 à 5 insights concis et factuels. Chaque insight doit:
- Citer au moins un chiffre ou une donnée du résumé
- Être une phrase complète, lisible
- Ne pas spéculer au-delà des données

Réponds UNIQUEMENT avec une liste numérotée (1. 2. 3. ...), une insight par ligne. Pas d'introduction ni de conclusion.`;

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant", // Fast, free tier on Groq
    messages: [
      { role: "system", content: INSIGHTS_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3, // Low temperature for factual, consistent output
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Empty response from LLM");
  }

  // Parse numbered list into array of insight strings
  const insights = content
    .split(/\n+/)
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter((s) => s.length > 0)
    .slice(0, 5); // Cap at 5

  if (insights.length < 1) {
    throw new Error("Failed to parse insights from LLM response");
  }

  return insights;
}
