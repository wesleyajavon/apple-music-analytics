import { OG_IMAGE_PATH } from "@/lib/seo/og-image";
import { absoluteLocalizedUrl } from "@/lib/seo/public-paths";
import { getSiteUrl } from "@/lib/seo/site-url";

const APP_NAME = "Soundprint-AI";

export type SoftwareApplicationJsonLdInput = {
  locale: string;
  description: string;
  siteUrl?: string;
};

/**
 * JSON-LD for Google SoftwareApplication / WebApplication.
 * Free product → price 0. No aggregateRating/review (only add when genuine).
 * @see https://developers.google.com/search/docs/appearance/structured-data/software-app
 */
export function buildSoftwareApplicationJsonLd({
  locale,
  description,
  siteUrl = getSiteUrl(),
}: SoftwareApplicationJsonLdInput) {
  const url = absoluteLocalizedUrl(locale, "", siteUrl);
  const image = `${siteUrl}${OG_IMAGE_PATH}`;

  return {
    "@context": "https://schema.org",
    "@type": ["SoftwareApplication", "WebApplication"],
    "@id": `${url}#software`,
    name: APP_NAME,
    description,
    url,
    image,
    applicationCategory: "MultimediaApplication",
    applicationSubCategory: "Streaming analytics",
    operatingSystem: "Web browser",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    inLanguage: locale,
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: 0,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Apple Music listening history stats",
      "Spotify listening history stats",
      "Trends and taste insights",
      "AI music insights",
      "Friend comparisons",
    ],
    publisher: {
      "@type": "Organization",
      name: APP_NAME,
      url: siteUrl,
    },
  } as const;
}

/** Escape `<` so JSON-LD is safe inside a `<script>` tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
