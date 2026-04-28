/**
 * Short optional Groq explanation for listening-habit heuristic prediction.
 */

import { GROQ_DEFAULT_MODEL } from "@/lib/services/ai/groq-config";
import { createGroqChatCompletion } from "@/lib/services/ai/groq-chat";
import type { ListeningHabitPrediction } from "@/lib/dto/predictions";
import { getLanguageName, parseAiLocale } from "@/lib/services/ai/locale-utils";

function buildPrompt(prediction: ListeningHabitPrediction, locale: string): string {
  const aiLoc = parseAiLocale(locale);
  const lang = getLanguageName(aiLoc);
  const g = prediction.supportingMetrics?.genreDistributionInWindow
    ? JSON.stringify(prediction.supportingMetrics.genreDistributionInWindow)
    : "{}";
  return `Tu es un assistant analytics musicales. Résume en 2 phrases maximum (langue: ${lang}) pourquoi cet utilisateur a des chances d'écouter surtout du « ${prediction.predictedGenre} » ${prediction.supportingMetrics?.dayName ? `(${prediction.supportingMetrics.dayName})` : ""} vers ${prediction.timeWindow.label} (confiance ~${prediction.confidenceScore}%). Genre dans la fenêtre: ${g}. Réponds uniquement avec le texte, sans titre.`;
}

export async function explainListeningHabitPrediction(
  prediction: ListeningHabitPrediction,
  locale: string = "fr"
): Promise<string> {
  try {
    const completion = await createGroqChatCompletion({
      model: GROQ_DEFAULT_MODEL,
      temperature: 0.55,
      max_tokens: 220,
      messages: [
        {
          role: "user",
          content: buildPrompt(prediction, locale),
        },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim();
    return text ?? "";
  } catch {
    return "";
  }
}
