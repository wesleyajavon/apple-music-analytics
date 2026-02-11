/**
 * Locale utilities for AI services.
 * Valid locales: fr, en, es (from i18n/routing).
 */

export type AiLocale = "fr" | "en" | "es";

const LOCALE_LANGUAGE_NAMES: Record<AiLocale, string> = {
  fr: "français",
  en: "English",
  es: "español",
};

const VALID_LOCALES: AiLocale[] = ["fr", "en", "es"];

export function getLanguageName(locale: string): string {
  return LOCALE_LANGUAGE_NAMES[locale as AiLocale] ?? "English";
}

export function parseAiLocale(value: string | null | undefined): AiLocale {
  if (value && VALID_LOCALES.includes(value as AiLocale)) {
    return value as AiLocale;
  }
  return "fr"; // default
}
