/** Ratio minimal (tracks distincts `genre IS NULL` / bibliothèque) pour considérer une « majorité » inconnue et pousser la classification IA (≥ cette valeur %). */
export const GENRE_AI_NUDGE_UNKNOWN_RATIO_MIN_PCT = 50;

/** Évite une notif hors sol sur des bibliothèques trop petites. */
export const GENRE_AI_NUDGE_MIN_DISTINCT_TRACKS = 15;

/** Ne pas spammer : dernier jeton envoyé depuis le tableau de bord + pas de nouvelle tentative avant ce délai. */
export const GENRE_AI_NUDGE_COOLDOWN_MS = 72 * 60 * 60 * 1000;

export const GENRE_AI_NUDGE_LAST_PROMPT_STORAGE_KEY = "soundprint-genre-groq-nudge-last-prompt-v1";

/** `source` sur `NotificationItem` pour dédoublonnage / filtrage. */
export const GENRE_AI_NUDGE_NOTIFICATION_SOURCE = "genre-groq-unknown-majority";
