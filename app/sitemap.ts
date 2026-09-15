import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import {
  INDEXABLE_PATHS,
  absoluteLocalizedUrl,
  languageAlternates,
} from "@/lib/seo/public-paths";
import { getSiteUrl } from "@/lib/seo/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  return INDEXABLE_PATHS.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: absoluteLocalizedUrl(locale, path, siteUrl),
      lastModified,
      changeFrequency: path === "" ? ("weekly" as const) : ("monthly" as const),
      priority: path === "" ? 1 : 0.6,
      alternates: {
        languages: languageAlternates(path, siteUrl),
      },
    }))
  );
}
