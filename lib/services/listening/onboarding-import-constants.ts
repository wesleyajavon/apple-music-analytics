/** Limite par requête JSON (reste sous le plafond Vercel ~4,5 Mo sur le corps). */
export const ONBOARDING_IMPORT_MAX_JSON_BATCH_ROWS = 8_000;

/** Limite métier d'un import onboarding complet, après normalisation des plays. */
export const ONBOARDING_IMPORT_MAX_PARSED_ROWS = 250_000;
