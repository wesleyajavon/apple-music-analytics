import { routing } from "@/i18n/routing";
import { GUIDE_INDEXABLE_PATHS } from "@/lib/seo/guide-slugs";
import { getSiteUrl } from "@/lib/seo/site-url";

/** Public marketing / legal / guide routes (no locale prefix). Empty string = home. */
export const INDEXABLE_PATHS = [
  "",
  "/legal/privacy",
  "/legal/terms",
  "/legal/cookies",
  ...GUIDE_INDEXABLE_PATHS,
] as const;

export type IndexablePath = (typeof INDEXABLE_PATHS)[number];

export function localizedPath(locale: string, path: IndexablePath | string): string {
  const normalized =
    path === "" || path === "/"
      ? ""
      : path.startsWith("/")
        ? path
        : `/${path}`;
  return `/${locale}${normalized}`;
}

export function absoluteLocalizedUrl(
  locale: string,
  path: IndexablePath | string,
  siteUrl: string = getSiteUrl()
): string {
  return `${siteUrl}${localizedPath(locale, path)}`;
}

/** hreflang map for a path, including x-default → default locale. */
export function languageAlternates(
  path: IndexablePath | string,
  siteUrl: string = getSiteUrl()
): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = absoluteLocalizedUrl(locale, path, siteUrl);
  }
  languages["x-default"] = absoluteLocalizedUrl(
    routing.defaultLocale,
    path,
    siteUrl
  );
  return languages;
}
