/**
 * Taste Profile LLM Service
 *
 * Generates a human-readable music taste profile from a normalized taste summary.
 * Uses Groq (same as AI insights) - server-side only, no API keys to client.
 *
 * Prompt design:
 * - Explicit instruction to use ONLY input data (no hallucination)
 * - Tone parameter affects wording/style, NOT factual content
 * - Structured output for clean UI rendering (description, influences, coreGenres, uniqueAspect)
 * - Locale: prompts and output language (fr, en, es)
 */

import { createGroqChatCompletion, GROQ_DEFAULT_MODEL } from "@/lib/services/ai/groq-chat";
import type { TasteSummary } from "./taste-summary-builder";
import type { TasteProfileTone } from "@/lib/dto/taste-profile";
import { getLanguageName, parseAiLocale, type AiLocale } from "./locale-utils";

const TONE_INSTRUCTIONS: Record<
  TasteProfileTone,
  Record<AiLocale, { system: string; style: string; descriptionExample: string }>
> = {
  analytical: {
    fr: {
      system: "Tu adoptes un ton analytique et objectif. Utilise un vocabulaire précis, des formulations mesurées.",
      style: "Style analytique : formulations précises, vocabulaire objectif, structure claire. Évite le lyrisme.",
      descriptionExample: "Votre goût musical...",
    },
    en: {
      system: "Adopt an analytical and objective tone. Use precise vocabulary and measured phrasing.",
      style: "Analytical style: precise formulations, objective vocabulary, clear structure. Avoid lyricism.",
      descriptionExample: "Your musical taste...",
    },
    es: {
      system: "Adopta un tono analítico y objetivo. Usa vocabulario preciso y formulaciones mesuradas.",
      style: "Estilo analítico: formulaciones precisas, vocabulario objetivo, estructura clara. Evita el lirismo.",
      descriptionExample: "Tu gusto musical...",
    },
  },
  casual: {
    fr: {
      system: "Tu adoptes un ton décontracté et accessible. Parle comme à un ami, de façon naturelle.",
      style: "Style décontracté : ton amical, phrases courtes, formulations naturelles. Pas de jargon.",
      descriptionExample: "Votre goût musical...",
    },
    en: {
      system: "Adopt a relaxed and accessible tone. Speak as to a friend, naturally.",
      style: "Casual style: friendly tone, short sentences, natural phrasing. No jargon.",
      descriptionExample: "Your musical taste...",
    },
    es: {
      system: "Adopta un tono relajado y accesible. Habla como a un amigo, de forma natural.",
      style: "Estilo casual: tono amigable, frases cortas, formulaciones naturales. Sin jerga.",
      descriptionExample: "Tu gusto musical...",
    },
  },
  poetic: {
    fr: {
      system: "Tu adoptes un ton évocateur et littéraire. Les métaphores et les images sont bienvenues.",
      style: "Style poétique : formulations évocatrices, métaphores, rythme des phrases. Reste factuel malgré le ton.",
      descriptionExample: "Votre goût musical...",
    },
    en: {
      system: "Adopt an evocative and literary tone. Metaphors and imagery are welcome.",
      style: "Poetic style: evocative formulations, metaphors, sentence rhythm. Stay factual despite the tone.",
      descriptionExample: "Your musical taste...",
    },
    es: {
      system: "Adopta un tono evocador y literario. Las metáforas e imágenes son bienvenidas.",
      style: "Estilo poético: formulaciones evocadoras, metáforas, ritmo de frases. Mantén los hechos a pesar del tono.",
      descriptionExample: "Tu gusto musical...",
    },
  },
};

function buildBaseSystemPrompt(locale: AiLocale): string {
  const lang = getLanguageName(locale);
  return `Tu es un analyste musical qui génère des profils de goût musicaux à partir de données d'écoute agrégées.

RÈGLES STRICTES:
1. Base-toi UNIQUEMENT sur les données fournies. N'invente AUCUN fait, chiffre ou artiste non présent dans l'input.
2. Ne fais aucune spéculation non supportée par les données.
3. Langue: ${lang}. Réponds ENTIÈREMENT dans cette langue.
4. Chaque section doit refléter exactement ce que les données montrent.`;
}

/**
 * Builds the system prompt with tone-specific instructions and locale.
 */
function buildSystemPrompt(tone: TasteProfileTone, locale: AiLocale): string {
  const toneConfig = TONE_INSTRUCTIONS[tone][locale];
  const basePrompt = buildBaseSystemPrompt(locale);
  return `${basePrompt}

${toneConfig.system}

Format de réponse attendu (JSON valide, pas de markdown):
{
  "description": "Un paragraphe unique commençant par '${toneConfig.descriptionExample}' ou équivalent, résumant le profil.",
  "influences": "Genres, styles, signaux culturels qui influencent ce goût (basé sur les données).",
  "coreGenres": "Genres principaux classés, concis (ex: 1. Rock 2. Pop 3. ...).",
  "uniqueAspect": "Ce qui rend ce goût distinctif selon les données (diversité, concentration, patterns)."
}`;
}

/**
 * Generates a taste profile from a normalized taste summary.
 *
 * @param summary - Deterministic taste summary from buildTasteSummary()
 * @param tone - analytical | casual | poetic - affects style only
 * @param locale - fr | en | es - output language
 * @returns Structured profile fields for UI
 */
export async function generateTasteProfile(
  summary: TasteSummary,
  tone: TasteProfileTone,
  locale: AiLocale = "fr"
): Promise<{
  description: string;
  influences: string;
  coreGenres: string;
  uniqueAspect: string;
}> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not configured. Taste profile generation is disabled."
    );
  }

  const toneConfig = TONE_INSTRUCTIONS[tone][locale];

  const userPrompt = `Voici un résumé agrégé des données d'écoute musicale d'un utilisateur:

---
${summary.text}
---

Génère un profil de goût musical structuré. ${toneConfig.style}

Réponds UNIQUEMENT avec un objet JSON valide contenant exactement les clés: description, influences, coreGenres, uniqueAspect.
Pas de texte avant ou après le JSON.`;

  const response = await createGroqChatCompletion({
    model: GROQ_DEFAULT_MODEL,
    messages: [
      { role: "system", content: buildSystemPrompt(tone, locale) },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4, // Slightly higher than insights for stylistic variety
    max_tokens: 800,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Empty response from LLM");
  }

  const parsed = parseStructuredResponse(content);
  if (!parsed) {
    throw new Error("Failed to parse taste profile from LLM response");
  }

  return parsed;
}

/**
 * Parses LLM JSON response, handling potential markdown code blocks.
 */
function parseStructuredResponse(
  content: string
): {
  description: string;
  influences: string;
  coreGenres: string;
  uniqueAspect: string;
} | null {
  let jsonStr = content.trim();
  const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) {
    jsonStr = match[1].trim();
  }

  try {
    const obj = JSON.parse(jsonStr) as Record<string, unknown>;
    const description = String(obj.description ?? "").trim();
    const influences = String(obj.influences ?? "").trim();
    const coreGenres = String(obj.coreGenres ?? "").trim();
    const uniqueAspect = String(obj.uniqueAspect ?? "").trim();

    if (!description || !influences || !coreGenres || !uniqueAspect) {
      return null;
    }

    return { description, influences, coreGenres, uniqueAspect };
  } catch {
    return null;
  }
}
