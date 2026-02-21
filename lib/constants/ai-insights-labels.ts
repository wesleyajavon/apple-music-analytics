/**
 * Labels for AI insights input (metrics, summary labels).
 * Used when building the analytics summary sent to the LLM.
 * Must match locale to ensure the model outputs in the correct language.
 */

export type AiLocale = "fr" | "en" | "es";

export type TasteEvolutionLabels = {
  volume: string;
  diversity: string;
  listens: string;
  classification: string;
  emergingGenres: string;
  decliningGenres: string;
  artistMovements: string;
  rankUp: string;
  rankDown: string;
  promptIntro: string;
  promptInstruction: string;
  promptIntroLight: string;
  promptInstructionLight: string;
};

const LABELS: Record<
  AiLocale,
  {
    metrics: {
      totalListens: string;
      uniqueArtists: string;
      uniqueTracks: string;
      totalPlayTime: string;
    };
    summary: {
      period: string;
      periodConnector: string;
      genreDistribution: string;
      listens: string;
      activeHours: string;
      topArtists: string;
      evolutionVsPrevious: string;
      peakDay: string;
      peakHour: string;
    };
    tasteEvolution: TasteEvolutionLabels;
    dayNames: string[];
  }
> = {
  fr: {
    metrics: {
      totalListens: "Total d'écoutes",
      uniqueArtists: "Artistes uniques",
      uniqueTracks: "Titres uniques",
      totalPlayTime: "Temps d'écoute",
    },
    summary: {
      period: "Période",
      periodConnector: "à",
      genreDistribution: "Distribution des genres (top 10)",
      listens: "écoutes",
      activeHours: "Heures d'écoute les plus actives (top 5)",
      topArtists: "Artistes les plus écoutés (top 10)",
      evolutionVsPrevious: "Évolution vs période précédente",
      peakDay: "Jour de pic",
      peakHour: "Heure de pic",
    },
    tasteEvolution: {
      volume: "Volume",
      diversity: "Diversité",
      listens: "écoutes",
      classification: "Classification",
      emergingGenres: "Genres émergents",
      decliningGenres: "Genres en baisse",
      artistMovements: "Mouvements artistes",
      rankUp: "pos.",
      rankDown: "pos.",
      promptIntro: "Voici un résumé des tendances semaine-à-semaine d'évolution des goûts musicaux:",
      promptInstruction:
        "Génère 1 à 2 courts paragraphes qui expliquent ce qui a changé et pourquoi c'est pertinent. Chaque affirmation doit citer une métrique. Pas d'introduction ni de conclusion.",
      promptIntroLight:
        "Voici un résumé simplifié des tendances semaine-à-semaine (sans chiffres techniques):",
      promptInstructionLight:
        "Génère 1 à 2 courts paragraphes faciles à lire. Décris les changements en langage simple : nouveaux genres découverts, artistes qui montent, ambiance générale. Interdit : pourcentages, points de pourcentage, entropie, chiffres techniques. Style : conversationnel et accessible.",
    },
    dayNames: [
      "Dimanche",
      "Lundi",
      "Mardi",
      "Mercredi",
      "Jeudi",
      "Vendredi",
      "Samedi",
    ],
  },
  en: {
    metrics: {
      totalListens: "Total listens",
      uniqueArtists: "Unique artists",
      uniqueTracks: "Unique tracks",
      totalPlayTime: "Total play time",
    },
    summary: {
      period: "Period",
      periodConnector: "to",
      genreDistribution: "Genre distribution (top 10)",
      listens: "listens",
      activeHours: "Most active listening hours (top 5)",
      topArtists: "Most listened artists (top 10)",
      evolutionVsPrevious: "Change vs previous period",
      peakDay: "Peak day",
      peakHour: "Peak hour",
    },
    tasteEvolution: {
      volume: "Volume",
      diversity: "Diversity",
      listens: "listens",
      classification: "Classification",
      emergingGenres: "Emerging genres",
      decliningGenres: "Declining genres",
      artistMovements: "Artist movements",
      rankUp: "pos.",
      rankDown: "pos.",
      promptIntro: "Here is a summary of week-to-week taste evolution trends:",
      promptInstruction:
        "Generate 1-2 short paragraphs explaining what changed and why it matters. Each statement must cite a metric. No introduction or conclusion.",
      promptIntroLight:
        "Here is a simplified summary of week-to-week trends (no technical figures):",
      promptInstructionLight:
        "Generate 1-2 short, easy-to-read paragraphs. Describe changes in plain language: new genres discovered, artists rising, overall vibe. Forbidden: percentages, percentage points, entropy, technical numbers. Style: conversational and accessible.",
    },
    dayNames: [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
  },
  es: {
    metrics: {
      totalListens: "Total de escuchas",
      uniqueArtists: "Artistas únicos",
      uniqueTracks: "Títulos únicos",
      totalPlayTime: "Tiempo total de escucha",
    },
    summary: {
      period: "Período",
      periodConnector: "a",
      genreDistribution: "Distribución de géneros (top 10)",
      listens: "escuchas",
      activeHours: "Horas más activas de escucha (top 5)",
      topArtists: "Artistas más escuchados (top 10)",
      evolutionVsPrevious: "Cambio vs período anterior",
      peakDay: "Día pico",
      peakHour: "Hora pico",
    },
    tasteEvolution: {
      volume: "Volumen",
      diversity: "Diversidad",
      listens: "escuchas",
      classification: "Clasificación",
      emergingGenres: "Géneros emergentes",
      decliningGenres: "Géneros en declive",
      artistMovements: "Movimientos de artistas",
      rankUp: "pos.",
      rankDown: "pos.",
      promptIntro: "Aquí tienes un resumen de las tendencias de evolución de gustos semana a semana:",
      promptInstruction:
        "Genera 1-2 párrafos cortos que expliquen qué cambió y por qué es relevante. Cada afirmación debe citar una métrica. Sin introducción ni conclusión.",
      promptIntroLight:
        "Aquí tienes un resumen simplificado de las tendencias semana a semana (sin cifras técnicas):",
      promptInstructionLight:
        "Genera 1-2 párrafos cortos y fáciles de leer. Describe los cambios en lenguaje sencillo: nuevos géneros descubiertos, artistas que suben, ambiente general. Prohibido: porcentajes, puntos porcentuales, entropía, cifras técnicas. Estilo: conversacional y accesible.",
    },
    dayNames: [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ],
  },
};

export function getAiInsightsLabels(locale: string): (typeof LABELS)["fr"] {
  return LABELS[(locale as AiLocale) ?? "fr"] ?? LABELS.fr;
}
