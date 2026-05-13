/** Clé localStorage pour le centre de notifications (MVP client-only). */
export const NOTIFICATION_CENTER_STORAGE_KEY = "soundprint-notification-center-v1";

/** Limite de taille pour éviter de gonfler le stockage local. */
export const NOTIFICATION_CENTER_MAX_ITEMS = 100;

/** Fenêtre (ms) pendant laquelle une nouvelle notif avec le même `source` remplace l’ancienne. */
export const NOTIFICATION_SOURCE_DEDUPE_MS = 120_000;
