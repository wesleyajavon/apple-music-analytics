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
 */

import Groq from "groq-sdk";
import type { TasteSummary } from "./taste-summary-builder";
import type { TasteProfileTone } from "@/lib/dto/taste-profile";

const TONE_INSTRUCTIONS: Record<
  TasteProfileTone,
  { system: string; style: string }
> = {
  analytical: {
    system:
      "Tu adoptes un ton analytique et objectif. Utilise un vocabulaire précis, des formulations mesurées.",
    style:
      "Style analytique : formulations précises, vocabulaire objectif, structure claire. Évite le lyrisme.",
  },
  casual: {
    system:
      "Tu adoptes un ton décontracté et accessible. Parle comme à un ami, de façon naturelle.",
    style:
      "Style décontracté : ton amical, phrases courtes, formulations naturelles. Pas de jargon.",
  },
  poetic: {
    system:
      "Tu adoptes un ton évocateur et littéraire. Les métaphores et les images sont bienvenues.",
    style:
      "Style poétique : formulations évocatrices, métaphores, rythme des phrases. Reste factuel malgré le ton.",
  },
};

const BASE_SYSTEM_PROMPT = `Tu es un analyste musical qui génère des profils de goût musicaux à partir de données d'écoute agrégées.

RÈGLES STRICTES:
1. Base-toi UNIQUEMENT sur les données fournies. N'invente AUCUN fait, chiffre ou artiste non présent dans l'input.
2. Ne fais aucune spéculation non supportée par les données.
3. Langue: français.
4. Chaque section doit refléter exactement ce que les données montrent.`;

/**
 * Builds the system prompt with tone-specific instructions.
 * Tone affects wording and style only - factual grounding is unchanged.
 */
function buildSystemPrompt(tone: TasteProfileTone): string {
  const toneConfig = TONE_INSTRUCTIONS[tone];
  return `${BASE_SYSTEM_PROMPT}

${toneConfig.system}

Format de réponse attendu (JSON valide, pas de markdown):
{
  "description": "Un paragraphe unique commençant par 'Votre goût musical...' ou équivalent, résumant le profil.",
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
 * @returns Structured profile fields for UI
 */
export async function generateTasteProfile(
  summary: TasteSummary,
  tone: TasteProfileTone
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

  const groq = new Groq({ apiKey });
  const toneConfig = TONE_INSTRUCTIONS[tone];

  const userPrompt = `Voici un résumé agrégé des données d'écoute musicale d'un utilisateur:

---
${summary.text}
---

Génère un profil de goût musical structuré. ${toneConfig.style}

Réponds UNIQUEMENT avec un objet JSON valide contenant exactement les clés: description, influences, coreGenres, uniqueAspect.
Pas de texte avant ou après le JSON.`;

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: buildSystemPrompt(tone) },
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
