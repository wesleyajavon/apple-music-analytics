/**
 * AI Explanation Service for "When Will I Listen?" predictions.
 *
 * IMPORTANT: The AI receives ONLY the computed prediction output and supporting metrics.
 * It does NOT recompute or alter the prediction. Its role is purely to generate
 * a human-readable explanation of the deterministic result.
 * Locale: output language (fr, en, es).
 */

import Groq from "groq-sdk";
import type { ListeningHabitPrediction } from "@/lib/dto/predictions";
import { getLanguageName, type AiLocale } from "./locale-utils";

function buildSystemPrompt(locale: AiLocale): string {
  const lang = getLanguageName(locale);
  return `Tu es un assistant qui explique des prédictions d'écoute musicale.

RÈGLES STRICTES:
1. Tu reçois une prédiction DÉJÀ CALCULÉE par des heuristiques statistiques. Tu ne la recalcules pas.
2. Explique UNIQUEMENT ce que les données montrent. N'invente rien.
3. Langue: ${lang}. Réponds ENTIÈREMENT dans cette langue. Style: concis, accessible.
4. Mentionne la fenêtre horaire, le genre prédit, et le score de confiance.
5. Une ou deux phrases suffisent. Pas de liste à puces sauf si pertinent.
6. Ne dis pas "selon l'IA" ou "l'algorithme pense" - la prédiction est basée sur des données, pas sur une intuition.`;
}

/**
 * Generates a concise natural-language explanation of a listening habit prediction.
 * The AI does NOT recompute or alter the prediction - it only explains it.
 *
 * @param prediction - The pre-computed prediction from listening-habit-heuristics
 * @param locale - fr | en | es - output language
 * @returns A short explanation string (1-3 sentences)
 */
export async function explainListeningHabitPrediction(
  prediction: ListeningHabitPrediction,
  locale: AiLocale = "fr"
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not configured. AI explanation is disabled."
    );
  }

  const groq = new Groq({ apiKey });

  const metrics = prediction.supportingMetrics;
  const metricsText = metrics
    ? `
Métriques de support:
- ${metrics.totalListensAnalyzed} écoutes analysées sur ${metrics.daysOfData} jours
- Créneau le plus actif: ${metrics.dayName} entre ${prediction.timeWindow.label}
- Heure de pic: ${metrics.peakHour}h
- Répartition des genres dans la fenêtre: ${JSON.stringify(metrics.genreDistributionInWindow)}
`
    : "";

  const userPrompt = `Voici une prédiction d'écoute musicale (déjà calculée, à expliquer):

- Fenêtre horaire prédite: ${prediction.timeWindow.label}
- Genre le plus probable: ${prediction.predictedGenre}
- Score de confiance: ${prediction.confidenceScore}%
${metricsText}

Génère une explication courte (1 à 3 phrases) pour l'utilisateur. Explique pourquoi cette prédiction a du sens d'après ses habitudes passées.`;

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: buildSystemPrompt(locale) },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    max_tokens: 200,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Empty response from LLM");
  }

  return content;
}
