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

/** Prompt strings for genre trends chart AI summary (aligned with filters on /dashboard/genres/trends). */
export type GenreTrendsAiLabels = {
  aggregationDay: string;
  aggregationWeek: string;
  aggregationMonth: string;
  filterAllData: string;
  filterCustomRange: string;
  firstHalf: string;
  secondHalf: string;
  totalListens: string;
  shareOfSelection: string;
  deltaVsFirstHalf: string;
  peakBucket: string;
  timelineNoteFull: string;
  timelineNoteDownsampled: string;
  genresCappedNote: string;
  bucketsInSeries: string;
  genresInAnalysis: string;
  timelineSection: string;
  promptIntroTechnical: string;
  promptInstructionTechnical: string;
  promptIntroLight: string;
  promptInstructionLight: string;
};

/** Prompt strings for artist trends chart AI summary (/dashboard/artists/trends). */
export type ArtistTrendsAiLabels = Omit<
  GenreTrendsAiLabels,
  "genresCappedNote" | "genresInAnalysis"
> & {
  artistsCappedNote: string;
  artistsInAnalysis: string;
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
    genreTrends: GenreTrendsAiLabels;
    artistTrends: ArtistTrendsAiLabels;
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
    genreTrends: {
      aggregationDay: "agrégation par jour (un point par jour calendaire)",
      aggregationWeek: "agrégation par semaine (semaine calendaire)",
      aggregationMonth: "agrégation par mois calendaire",
      filterAllData: "filtre temporel : toute l'historique disponible (bornes min/max des écoutes)",
      filterCustomRange: "filtre temporel : plage personnalisée",
      firstHalf: "première moitié de la série (par nombre de buckets)",
      secondHalf: "seconde moitié de la série",
      totalListens: "écoutes totales sur la période",
      shareOfSelection: "part parmi les genres sélectionnés pour l'analyse (%)",
      deltaVsFirstHalf: "variation 2e moitié vs 1re moitié (écoutes et % relatif à la 1re moitié)",
      peakBucket: "bucket de pic (date / libellé affiché sur le graphique)",
      timelineNoteFull: "Série temporelle : tous les buckets sont listés ci-dessous (effectif modéré).",
      timelineNoteDownsampled:
        "Série temporelle : échantillonnage uniforme des buckets pour limiter la taille du contexte ; les totaux et comparaisons 1re/2e moitié restent calculés sur la série complète.",
      genresCappedNote:
        "Limite : seuls les genres les plus écoutés parmi la sélection sont analysés (top par volume).",
      bucketsInSeries: "Nombre de buckets dans la série",
      genresInAnalysis: "Genres analysés",
      timelineSection: "Série temporelle (aperçu)",
      promptIntroTechnical:
        "Contexte analytique pour le graphique « tendances par genre ». Les métriques ci-dessous décrivent exactement ce que l'utilisateur voit (filtres, agrégation, genres cochés).",
      promptInstructionTechnical:
        "Rédige 1 à 2 paragraphes courts, ton analytique et précis. Base-toi uniquement sur les données fournies. Mentionne le type d'agrégation, la plage temporelle, les genres concernés, les volumes, la comparaison 1re/2e moitié et les pics si utiles. Chaque affirmation doit s'appuyer sur un chiffre ou un nom de genre présent dans le bloc. Pas d'introduction ni de conclusion formelle.",
      promptIntroLight:
        "Résumé qualitatif des tendances par genre (même contexte que le graphique ; chiffres ci-dessous pour référence interne).",
      promptInstructionLight:
        "Rédige 1 à 2 paragraphes accessibles, sans jargon. Décris l'évolution ressentie (genres qui montent, qui reculent, dynamique globale). Évite les pourcentages et les chiffres précis ; pas d'introduction ni de conclusion formelle.",
    },
    artistTrends: {
      aggregationDay: "agrégation par jour (un point par jour calendaire)",
      aggregationWeek: "agrégation par semaine (semaine calendaire)",
      aggregationMonth: "agrégation par mois calendaire",
      filterAllData: "filtre temporel : toute l'historique disponible (bornes min/max des écoutes)",
      filterCustomRange: "filtre temporel : plage personnalisée",
      firstHalf: "première moitié de la série (par nombre de buckets)",
      secondHalf: "seconde moitié de la série",
      totalListens: "écoutes totales sur la période",
      shareOfSelection: "part parmi les artistes sélectionnés pour l'analyse (%)",
      deltaVsFirstHalf: "variation 2e moitié vs 1re moitié (écoutes et % relatif à la 1re moitié)",
      peakBucket: "bucket de pic (date / libellé affiché sur le graphique)",
      timelineNoteFull: "Série temporelle : tous les buckets sont listés ci-dessous (effectif modéré).",
      timelineNoteDownsampled:
        "Série temporelle : échantillonnage uniforme des buckets pour limiter la taille du contexte ; les totaux et comparaisons 1re/2e moitié restent calculés sur la série complète.",
      artistsCappedNote:
        "Limite : seuls les artistes les plus écoutés parmi la sélection sont analysés (top par volume).",
      bucketsInSeries: "Nombre de buckets dans la série",
      artistsInAnalysis: "Artistes analysés",
      timelineSection: "Série temporelle (aperçu)",
      promptIntroTechnical:
        "Contexte analytique pour le graphique « tendances par artiste ». Les métriques ci-dessous décrivent exactement ce que l'utilisateur voit (filtres, agrégation, artistes sélectionnés).",
      promptInstructionTechnical:
        "Rédige 1 à 2 paragraphes courts, ton analytique et précis. Base-toi uniquement sur les données fournies. Mentionne le type d'agrégation, la plage temporelle, les artistes concernés, les volumes, la comparaison 1re/2e moitié et les pics si utiles. Chaque affirmation doit s'appuyer sur un chiffre ou un nom d'artiste présent dans le bloc. Pas d'introduction ni de conclusion formelle.",
      promptIntroLight:
        "Résumé qualitatif des tendances par artiste (même contexte que le graphique ; chiffres ci-dessous pour référence interne).",
      promptInstructionLight:
        "Rédige 1 à 2 paragraphes accessibles, sans jargon. Décris l'évolution ressentie (artistes qui montent, qui reculent, dynamique globale). Évite les pourcentages et les chiffres précis ; pas d'introduction ni de conclusion formelle.",
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
      totalListens: "Total plays",
      uniqueArtists: "Different artists",
      uniqueTracks: "Different tracks",
      totalPlayTime: "Listening time",
    },
    summary: {
      period: "Period",
      periodConnector: "to",
      genreDistribution: "Genre distribution (top 10)",
      listens: "plays",
      activeHours: "Most active listening hours (top 5)",
      topArtists: "Top artists (top 10)",
      evolutionVsPrevious: "Change vs previous period",
      peakDay: "Peak day",
      peakHour: "Peak hour",
    },
    tasteEvolution: {
      volume: "Volume",
      diversity: "Diversity",
      listens: "plays",
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
    genreTrends: {
      aggregationDay: "aggregation: daily (one point per calendar day)",
      aggregationWeek: "aggregation: weekly (calendar week)",
      aggregationMonth: "aggregation: calendar month",
      filterAllData: "time filter: full listening history (min/max listen dates)",
      filterCustomRange: "time filter: custom date range",
      firstHalf: "first half of the series (by bucket count)",
      secondHalf: "second half of the series",
      totalListens: "total plays in range",
      shareOfSelection: "share among analyzed selected genres (%)",
      deltaVsFirstHalf: "2nd half vs 1st half change (plays and % vs first half)",
      peakBucket: "peak bucket (date / chart label)",
      timelineNoteFull: "Timeline: all buckets listed below (moderate count).",
      timelineNoteDownsampled:
        "Timeline: uniformly downsampled buckets to cap context size; totals and half-split metrics are computed on the full series.",
      genresCappedNote: "Limit: only the highest-volume selected genres are included.",
      bucketsInSeries: "Buckets in series",
      genresInAnalysis: "Genres in this analysis",
      timelineSection: "Timeline (preview)",
      promptIntroTechnical:
        "Analytical context for the genre trends chart. The metrics below match what the user sees (filters, aggregation, selected genres).",
      promptInstructionTechnical:
        "Write 1-2 short paragraphs in a technical, precise tone. Use only the provided data. Mention aggregation, date range, genres analyzed, volumes, first/second half comparison, and peaks where relevant. Each claim must reference a number or genre name from the block. No formal intro or outro.",
      promptIntroLight:
        "Qualitative summary of genre trends (same chart context; figures below for internal reference).",
      promptInstructionLight:
        "Write 1-2 accessible paragraphs with no jargon. Describe the overall story (rising genres, declining ones). Avoid exact percentages and numbers; no formal intro or outro.",
    },
    artistTrends: {
      aggregationDay: "aggregation: daily (one point per calendar day)",
      aggregationWeek: "aggregation: weekly (calendar week)",
      aggregationMonth: "aggregation: calendar month",
      filterAllData: "time filter: full listening history (min/max listen dates)",
      filterCustomRange: "time filter: custom date range",
      firstHalf: "first half of the series (by bucket count)",
      secondHalf: "second half of the series",
      totalListens: "total plays in range",
      shareOfSelection: "share among analyzed selected artists (%)",
      deltaVsFirstHalf: "2nd half vs 1st half change (plays and % vs first half)",
      peakBucket: "peak bucket (date / chart label)",
      timelineNoteFull: "Timeline: all buckets listed below (moderate count).",
      timelineNoteDownsampled:
        "Timeline: uniformly downsampled buckets to cap context size; totals and half-split metrics are computed on the full series.",
      artistsCappedNote:
        "Limit: only the highest-volume selected artists are included.",
      bucketsInSeries: "Buckets in series",
      artistsInAnalysis: "Artists in this analysis",
      timelineSection: "Timeline (preview)",
      promptIntroTechnical:
        "Analytical context for the artist trends chart. The metrics below match what the user sees (filters, aggregation, selected artists).",
      promptInstructionTechnical:
        "Write 1-2 short paragraphs in a technical, precise tone. Use only the provided data. Mention aggregation, date range, artists analyzed, volumes, first/second half comparison, and peaks where relevant. Each claim must reference a number or artist name from the block. No formal intro or outro.",
      promptIntroLight:
        "Qualitative summary of artist trends (same chart context; figures below for internal reference).",
      promptInstructionLight:
        "Write 1-2 accessible paragraphs with no jargon. Describe the overall story (rising artists, declining ones). Avoid exact percentages and numbers; no formal intro or outro.",
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
    genreTrends: {
      aggregationDay: "agregación por día (un punto por día natural)",
      aggregationWeek: "agregación por semana (semana calendario)",
      aggregationMonth: "agregación por mes calendario",
      filterAllData: "filtro temporal: todo el historial disponible (fechas min/max de escuchas)",
      filterCustomRange: "filtro temporal: rango personalizado",
      firstHalf: "primera mitad de la serie (por número de buckets)",
      secondHalf: "segunda mitad de la serie",
      totalListens: "escuchas totales en el rango",
      shareOfSelection: "parte entre los géneros seleccionados analizados (%)",
      deltaVsFirstHalf: "cambio 2ª mitad vs 1ª mitad (escuchas y % respecto a la 1ª mitad)",
      peakBucket: "bucket pico (fecha / etiqueta del gráfico)",
      timelineNoteFull: "Línea temporal: se listan todos los buckets (tamaño moderado).",
      timelineNoteDownsampled:
        "Línea temporal: muestreo uniforme de buckets para limitar el contexto; totales y mitades se calculan sobre la serie completa.",
      genresCappedNote:
        "Límite: solo se analizan los géneros más escuchados de la selección (top por volumen).",
      bucketsInSeries: "Buckets en la serie",
      genresInAnalysis: "Géneros analizados",
      timelineSection: "Línea temporal (vista previa)",
      promptIntroTechnical:
        "Contexto analítico del gráfico de tendencias por género. Las métricas coinciden con lo que ve el usuario (filtros, agregación, géneros marcados).",
      promptInstructionTechnical:
        "Escribe 1-2 párrafos cortos, tono técnico y preciso. Usa solo los datos proporcionados. Menciona agregación, rango, géneros, volúmenes, comparación de mitades y picos si aplica. Cada afirmación debe citar un número o nombre de género del bloque. Sin introducción ni conclusión formal.",
      promptIntroLight:
        "Resumen cualitativo de tendencias por género (mismo contexto; cifras solo como referencia interna).",
      promptInstructionLight:
        "Escribe 1-2 párrafos claros, sin jerga. Describe la historia (géneros al alza, a la baja). Evita porcentajes y cifras exactas; sin introducción ni conclusión formal.",
    },
    artistTrends: {
      aggregationDay: "agregación por día (un punto por día natural)",
      aggregationWeek: "agregación por semana (semana calendario)",
      aggregationMonth: "agregación por mes calendario",
      filterAllData: "filtro temporal: todo el historial disponible (fechas min/max de escuchas)",
      filterCustomRange: "filtro temporal: rango personalizado",
      firstHalf: "primera mitad de la serie (por número de buckets)",
      secondHalf: "segunda mitad de la serie",
      totalListens: "escuchas totales en el rango",
      shareOfSelection: "parte entre los artistas seleccionados analizados (%)",
      deltaVsFirstHalf: "cambio 2ª mitad vs 1ª mitad (escuchas y % respecto a la 1ª mitad)",
      peakBucket: "bucket pico (fecha / etiqueta del gráfico)",
      timelineNoteFull: "Línea temporal: se listan todos los buckets (tamaño moderado).",
      timelineNoteDownsampled:
        "Línea temporal: muestreo uniforme de buckets para limitar el contexto; totales y mitades se calculan sobre la serie completa.",
      artistsCappedNote:
        "Límite: solo se analizan los artistas más escuchados de la selección (top por volumen).",
      bucketsInSeries: "Buckets en la serie",
      artistsInAnalysis: "Artistas analizados",
      timelineSection: "Línea temporal (vista previa)",
      promptIntroTechnical:
        "Contexto analítico del gráfico de tendencias por artista. Las métricas coinciden con lo que ve el usuario (filtros, agregación, artistas seleccionados).",
      promptInstructionTechnical:
        "Escribe 1-2 párrafos cortos, tono técnico y preciso. Usa solo los datos proporcionados. Menciona agregación, rango, artistas, volúmenes, comparación de mitades y picos si aplica. Cada afirmación debe citar un número o nombre de artista del bloque. Sin introducción ni conclusión formal.",
      promptIntroLight:
        "Resumen cualitativo de tendencias por artista (mismo contexto; cifras solo como referencia interna).",
      promptInstructionLight:
        "Escribe 1-2 párrafos claros, sin jerga. Describe la historia (artistas al alza, a la baja). Evita porcentajes y cifras exactas; sin introducción ni conclusión formal.",
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
