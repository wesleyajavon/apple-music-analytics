import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getSiteUrl } from "@/lib/seo/site-url";

/** Private / app surfaces that should not be crawled (all locales). */
const DISALLOW_SUFFIXES = [
  "/dashboard",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/update-password",
  "/accept-terms",
  "/duet/accept",
  "/api-docs",
] as const;

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  const disallow = [
    "/api/",
    ...routing.locales.flatMap((locale) =>
      DISALLOW_SUFFIXES.map((suffix) => `/${locale}${suffix}`)
    ),
  ];

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow,
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
