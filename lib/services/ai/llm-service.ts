/**
 * LLM Service for AI Insights
 *
 * Server-side only. Uses Groq API (free tier) to generate
 * data-grounded insights from aggregated analytics.
 *
 * Prompt design: natural, human tone; explicit references to metrics,
 * no speculation, 3-5 concise bullet points. Locale: fr | en | es.
 */

import type { AnalyticsSummary } from "./analytics-summarizer";
import { createGroqChatCompletion, GROQ_DEFAULT_MODEL } from "@/lib/services/ai/groq-chat";
import type { AiInsightMoment } from "@/lib/dto/ai-insights";
import { getLanguageName, type AiLocale } from "./locale-utils";
import {
  buildFallbackMoments,
  formatInsightFactsForPrompt,
  type InsightFact,
} from "./insight-facts";

const SYSTEM_PROMPTS: Record<AiLocale, (lang: string) => string> = {
  fr: (lang) => `Tu es un analyste musical qui transforme des données d'écoute agrégées en observations utiles, naturelles et faciles à lire.

RÈGLES STRICTES:
1. Base-toi UNIQUEMENT sur les données fournies. N'invente rien.
2. Ne fais aucune spéculation ou hypothèse non supportée par les données.
3. Produis exactement 3 à 5 points sous forme de puces.
4. Chaque point doit exprimer une idée claire sur l'habitude d'écoute, puis l'appuyer avec une donnée du résumé.
5. Langue: ${lang}. Réponds ENTIÈREMENT dans cette langue.
6. Style: chaleureux, humain, précis, sans jargon. Évite de commencer par des chiffres bruts.
7. Tu peux arrondir les pourcentages à l'entier le plus proche si cela rend la phrase plus naturelle, mais ne change jamais le sens.

Exemple de bon insight: "Votre écoute penche nettement vers le rock: il représente environ 42% de vos écoutes, ce qui en fait votre point d'ancrage musical sur cette période."
Exemple à éviter: "Rock: 42%, Pop: 18%, Jazz: 11%." (trop technique, sans interprétation)`,
  en: (lang) => `You are a music analyst who turns aggregated listening data into useful, natural, easy-to-read observations.

STRICT RULES:
1. Base yourself ONLY on the data provided. Do not invent anything.
2. Do not make any speculation or hypothesis not supported by the data.
3. Produce exactly 3 to 5 bullet points.
4. Each point must express one clear idea about the listening habit, then support it with a data point from the summary.
5. Language: ${lang}. Respond ENTIRELY in this language.
6. Style: warm, human, precise, and jargon-free. Avoid opening with raw numbers.
7. You may round percentages to the nearest whole number when it reads more naturally, but never change the meaning.

Good insight example: "Your listening leans strongly toward rock: it accounts for about 42% of your plays, making it your musical anchor for this period."
Bad example to avoid: "Rock: 42%, Pop: 18%, Jazz: 11%." (too technical, no interpretation)`,
  es: (lang) => `Eres un analista musical que convierte datos agregados de escucha en observaciones útiles, naturales y fáciles de leer.

REGLAS ESTRICTAS:
1. Basa tu respuesta ÚNICAMENTE en los datos proporcionados. No inventes nada.
2. No hagas especulaciones ni hipótesis no apoyadas por los datos.
3. Produce exactamente 3 a 5 puntos en forma de viñetas.
4. Cada punto debe expresar una idea clara sobre el hábito de escucha y apoyarla con un dato del resumen.
5. Idioma: ${lang}. Responde ENTERAMENTE en este idioma.
6. Estilo: cálido, humano, preciso y sin jerga. Evita empezar con números en bruto.
7. Puedes redondear porcentajes al número entero más cercano si la frase suena más natural, pero nunca cambies el sentido.

Ejemplo de buen insight: "Tu escucha se inclina claramente hacia el rock: representa alrededor del 42% de tus reproducciones, convirtiéndose en tu punto de referencia musical en este período."
Ejemplo a evitar: "Rock: 42%, Pop: 18%, Jazz: 11%." (demasiado técnico, sin interpretación)`,
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

Génère 3 à 5 insights naturels et utiles. Chaque insight doit:
- Mettre l'idée principale en mots simples avant de citer la donnée qui la justifie
- Rester précis et fidèle au résumé
- Éviter le jargon, les formulations de tableau de bord et les listes de chiffres sans explication
- Ne pas spéculer au-delà des données

Réponds UNIQUEMENT avec une liste numérotée (1. 2. 3. ...), une insight par ligne. Pas d'introduction ni de conclusion.`,
  en: `Here is an aggregated summary of a user's music listening data:

---
{summary}
---

Generate 3 to 5 natural, useful insights. Each insight must:
- Put the main idea in simple words before citing the data that supports it
- Stay precise and faithful to the summary
- Avoid jargon, dashboard-style phrasing, and lists of numbers without explanation
- Not speculate beyond the data

Respond ONLY with a numbered list (1. 2. 3. ...), one insight per line. No introduction or conclusion.`,
  es: `Aquí tienes un resumen agregado de los datos de escucha musical de un usuario:

---
{summary}
---

Genera 3 a 5 insights naturales y útiles. Cada insight debe:
- Expresar la idea principal con palabras sencillas antes de citar el dato que la respalda
- Mantenerse preciso y fiel al resumen
- Evitar jerga, frases de panel técnico y listas de números sin explicación
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
    temperature: 0.3,
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Empty response from LLM");
  }

  const insights = content
    .split(/\n+/)
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter((s) => s.length > 0)
    .slice(0, 5);

  if (insights.length < 1) {
    throw new Error("Failed to parse insights from LLM response");
  }

  return insights;
}

const MOMENT_SYSTEM_PROMPTS: Record<AiLocale, (lang: string) => string> = {
  fr: (lang) =>
    `Tu racontes 4 moments d'écoute que les classements ne montrent pas.
RÈGLES: langue ${lang}. Uniquement les faits fournis — aucun nom ou chiffre inventé. Interdit de reformuler un palmarès (top genre / top artiste / heure de pic seuls). Ton: naturel, précis. JSON uniquement: {"moments":[{"id":"...","title":"...","body":"..."}]}`,
  en: (lang) =>
    `You tell 4 listening moments the rankings do not show.
RULES: language ${lang}. Use only the supplied facts — invent no names or numbers. Do not restate a leaderboard (top genre / top artist / peak hour alone). Tone: natural, precise. JSON only: {"moments":[{"id":"...","title":"...","body":"..."}]}`,
  es: (lang) =>
    `Cuentas 4 momentos de escucha que las clasificaciones no muestran.
REGLAS: idioma ${lang}. Solo los hechos dados — sin nombres ni cifras inventados. No reformules un ranking (top género / top artista / hora pico solos). Tono natural y preciso. Solo JSON: {"moments":[{"id":"...","title":"...","body":"..."}]}`,
};

function extractJsonObject(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? raw).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Phrases selected relational facts into 4 typed moments. Never invents entities.
 * Falls back to deterministic copy when the model is unavailable or off-schema.
 */
export async function generateInsightMoments(
  facts: InsightFact[],
  locale: AiLocale = "fr"
): Promise<AiInsightMoment[]> {
  const fallback = buildFallbackMoments(facts, locale);
  if (facts.length === 0) return [];

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return fallback;

  const lang = getLanguageName(locale);
  const userPrompt = `${formatInsightFactsForPrompt(facts)}\n\nWrite exactly ${facts.length} moments. Reuse each fact id.`;

  try {
    const response = await createGroqChatCompletion({
      model: GROQ_DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content: MOMENT_SYSTEM_PROMPTS[locale](lang),
        },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 700,
    });
    const content = response.choices[0]?.message?.content?.trim();
    if (!content) return fallback;

    const parsed = extractJsonObject(content) as {
      moments?: Array<{ id?: string; title?: string; body?: string }>;
    } | null;
    const byId = new Map(
      (parsed?.moments ?? [])
        .filter((row) => row.id && row.title && row.body)
        .map((row) => [row.id as string, row])
    );

    return facts.map((fact, index) => {
      const base = fallback[index];
      const drafted = byId.get(fact.id);
      if (!drafted || !base) return base;
      return {
        ...base,
        title: drafted.title!.trim() || base.title,
        body: drafted.body!.trim() || base.body,
      };
    });
  } catch {
    return fallback;
  }
}
