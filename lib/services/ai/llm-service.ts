/**
 * LLM Service for AI Insights
 *
 * Server-side only. Uses Groq API (free tier) to generate
 * data-grounded insights from aggregated analytics.
 *
 * Prompt design: Explicit references to metrics, no speculation,
 * 3-5 concise bullet points. Output is factual and readable.
 * Locale: output language (fr, en, es).
 */

import type { AnalyticsSummary } from "./analytics-summarizer";
import { createGroqChatCompletion, GROQ_DEFAULT_MODEL } from "@/lib/services/ai/groq-chat";
import { getLanguageName, type AiLocale } from "./locale-utils";

const SYSTEM_PROMPTS: Record<
  AiLocale,
  (lang: string) => string
> = {
  fr: (lang) => `Tu es un analyste musical qui génère des insights concis à partir de données d'écoute agrégées.

RÈGLES STRICTES:
1. Base-toi UNIQUEMENT sur les données fournies. N'invente rien.
2. Ne fais aucune spéculation ou hypothèse non supportée par les chiffres.
3. Produis exactement 3 à 5 points sous forme de puces.
4. Chaque point doit citer explicitement au moins une métrique (chiffre, pourcentage, nom).
5. Langue: ${lang}. Réponds ENTIÈREMENT dans cette langue. Style: clair, accessible à un utilisateur non technique.
6. Évite les formules génériques ("Vous écoutez beaucoup de musique"). Sois spécifique.

Exemple de bon insight: "Le rock représente 42% de vos écoutes, dominant largement les autres genres."
Exemple à éviter: "Vous avez des goûts musicaux variés." (trop vague, pas de chiffre)`,
  en: (lang) => `You are a music analyst who generates concise insights from aggregated listening data.

STRICT RULES:
1. Base yourself ONLY on the data provided. Do not invent anything.
2. Do not make any speculation or hypothesis not supported by the numbers.
3. Produce exactly 3 to 5 bullet points.
4. Each point must explicitly cite at least one metric (number, percentage, name).
5. Language: ${lang}. Respond ENTIRELY in this language. Style: clear, accessible to a non-technical user.
6. Avoid generic phrases ("You listen to a lot of music"). Be specific.

Good insight example: "Rock represents 42% of your listens, dominating other genres."
Bad example to avoid: "You have varied musical tastes." (too vague, no numbers)`,
  es: (lang) => `Eres un analista musical que genera insights concisos a partir de datos de escucha agregados.

REGLAS ESTRICTAS:
1. Basa tu respuesta ÚNICAMENTE en los datos proporcionados. No inventes nada.
2. No hagas especulaciones ni hipótesis no apoyadas por los números.
3. Produce exactamente 3 a 5 puntos en forma de viñetas.
4. Cada punto debe citar explícitamente al menos una métrica (número, porcentaje, nombre).
5. Idioma: ${lang}. Responde ENTERAMENTE en este idioma. Estilo: claro, accesible para un usuario no técnico.
6. Evita fórmulas genéricas ("Escuchas mucha música"). Sé específico.

Ejemplo de buen insight: "El rock representa el 42% de tus escuchas, dominando ampliamente los demás géneros."
Ejemplo a evitar: "Tienes gustos musicales variados." (demasiado vago, sin cifras)`,
};

function buildInsightsSystemPrompt(locale: AiLocale): string {
  const lang = getLanguageName(locale);
  return SYSTEM_PROMPTS[locale](lang);
}

const USER_PROMPTS: Record<AiLocale, string> = {
  fr: `Voici un résumé agrégé des données d'écoute musicale d'un utilisateur:

---
{summary}
---

Génère 3 à 5 insights concis et factuels. Chaque insight doit:
- Citer au moins un chiffre ou une donnée du résumé
- Être une phrase complète, lisible
- Ne pas spéculer au-delà des données

Réponds UNIQUEMENT avec une liste numérotée (1. 2. 3. ...), une insight par ligne. Pas d'introduction ni de conclusion.`,
  en: `Here is an aggregated summary of a user's music listening data:

---
{summary}
---

Generate 3 to 5 concise, factual insights. Each insight must:
- Cite at least one number or data point from the summary
- Be a complete, readable sentence
- Not speculate beyond the data

Respond ONLY with a numbered list (1. 2. 3. ...), one insight per line. No introduction or conclusion.`,
  es: `Aquí tienes un resumen agregado de los datos de escucha musical de un usuario:

---
{summary}
---

Genera 3 a 5 insights concisos y factuales. Cada insight debe:
- Citar al menos un número o dato del resumen
- Ser una frase completa y legible
- No especular más allá de los datos

Responde ÚNICAMENTE con una lista numerada (1. 2. 3. ...), un insight por línea. Sin introducción ni conclusión.`,
};

/**
 * Generates AI insights from a normalized analytics summary.
 * Uses Groq (free tier) with Llama 3.1 8B for structured, factual output.
 *
 * @param summary - Deterministic analytics summary from summarizeAnalytics()
 * @param locale - fr | en | es - output language
 * @returns Array of 3-5 insight strings (bullet points)
 */
export async function generateInsights(
  summary: AnalyticsSummary,
  locale: AiLocale = "fr"
): Promise<string[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not configured. AI insights are disabled."
    );
  }

  // Prompt in target language so the model receives consistent context
  const userPrompt = (USER_PROMPTS[locale] ?? USER_PROMPTS.fr).replace(
    "{summary}",
    summary.text
  );

  const response = await createGroqChatCompletion({
    model: GROQ_DEFAULT_MODEL,
    messages: [
      { role: "system", content: buildInsightsSystemPrompt(locale) },
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
