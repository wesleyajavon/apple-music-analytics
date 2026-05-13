import { ApiError } from "@/lib/api-client";

export type GroqQuotaDetails = {
  limit?: number;
  resetAtUtc?: string;
};

export function isGroqDailyQuotaError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.code === "GROQ_DAILY_QUOTA_EXCEEDED";
}

export const GROQ_GENRE_CLASSIFICATION_ACTIVE_CODE = "GROQ_GENRE_CLASSIFICATION_ACTIVE" as const;

/** Réponse 423 : classification des genres en cours — fonctionnalités IA interactives mises en pause. */
export function isGroqGenreClassificationBlockingError(error: unknown): error is ApiError {
  return (
    error instanceof ApiError && error.code === GROQ_GENRE_CLASSIFICATION_ACTIVE_CODE
  );
}

/**
 * Message utilisateur pour quota IA (429 + code GROQ_DAILY_QUOTA_EXCEEDED), ou null si autre erreur.
 */
export function getGroqQuotaUserFacingMessage(
  error: unknown,
  t: (key: string, values?: Record<string, string | number>) => string,
  locale: string
): string | null {
  if (!isGroqDailyQuotaError(error)) return null;
  const d = error.details as GroqQuotaDetails | undefined;
  if (d?.limit != null && d?.resetAtUtc) {
    const resetFormatted = new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(d.resetAtUtc));
    return t("groqDailyQuotaExceededDetailed", {
      limit: d.limit,
      resetTime: resetFormatted,
    });
  }
  return t("groqDailyQuotaExceeded");
}
