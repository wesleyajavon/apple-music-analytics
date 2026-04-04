/**
 * AI Explanation Service for "When Will I Listen?" predictions.
 *
 * IMPORTANT: The AI receives ONLY the computed prediction output and supporting metrics.
 * It does NOT recompute or alter the prediction. Its role is purely to generate
 * a human-readable explanation of the deterministic result.
 * Locale: output language (fr, en, es).
 */

import { createGroqChatCompletion, GROQ_DEFAULT_MODEL } from "@/lib/services/ai/groq-chat";
import type { ListeningHabitPrediction } from "@/lib/dto/predictions";
import type { AiLocale } from "./locale-utils";

/** System prompts in target language - ensures AI responds in the same language */
const SYSTEM_PROMPTS: Record<AiLocale, string> = {
  fr: `Tu es un assistant qui explique des prédictions d'écoute musicale.

RÈGLES STRICTES:
1. Tu reçois une prédiction DÉJÀ CALCULÉE par des heuristiques statistiques. Tu ne la recalcules pas.
2. Explique UNIQUEMENT ce que les données montrent. N'invente rien.
3. Réponds UNIQUEMENT en français. Style: concis, accessible.
4. Mentionne la fenêtre horaire, le genre prédit, et le score de confiance.
5. Une ou deux phrases suffisent. Pas de liste à puces sauf si pertinent.
6. Ne dis pas "selon l'IA" ou "l'algorithme pense" - la prédiction est basée sur des données, pas sur une intuition.`,
  en: `You are an assistant that explains music listening predictions.

STRICT RULES:
1. You receive a prediction ALREADY CALCULATED by statistical heuristics. You do not recalculate it.
2. Explain ONLY what the data shows. Do not invent anything.
3. Respond ONLY in English. Style: concise, accessible.
4. Mention the time window, predicted genre, and confidence score.
5. One or two sentences are enough. No bullet points unless relevant.
6. Do not say "according to the AI" or "the algorithm thinks" - the prediction is based on data, not intuition.`,
  es: `Eres un asistente que explica predicciones de escucha musical.

REGLAS ESTRICTAS:
1. Recibes una predicción YA CALCULADA por heurísticas estadísticas. No la recalcules.
2. Explica ÚNICAMENTE lo que muestran los datos. No inventes nada.
3. Responde ÚNICAMENTE en español. Estilo: conciso, accesible.
4. Menciona la franja horaria, el género predicho y el score de confianza.
5. Una o dos frases bastan. Sin viñetas salvo si es pertinente.
6. No digas "según la IA" o "el algoritmo piensa" - la predicción se basa en datos, no en intuición.`,
};

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

  const metrics = prediction.supportingMetrics;
  const metricsText = metrics
    ? `
Support metrics:
- ${metrics.totalListensAnalyzed} listens analyzed over ${metrics.daysOfData} days
- Most active slot: ${metrics.dayName} during ${prediction.timeWindow.label}
- Peak hour: ${metrics.peakHour}h
- Genre distribution in window: ${JSON.stringify(metrics.genreDistributionInWindow)}
`
    : "";

  const userPrompt = `Here is a music listening prediction (already calculated, needs explanation):

- Predicted time window: ${prediction.timeWindow.label}
- Most likely genre: ${prediction.predictedGenre}
- Confidence score: ${prediction.confidenceScore}%
${metricsText}

Generate a short explanation (1 to 3 sentences) for the user. Explain why this prediction makes sense based on their past habits. Respond in the same language as the system instructions.`;

  const response = await createGroqChatCompletion({
    model: GROQ_DEFAULT_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPTS[locale] },
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
