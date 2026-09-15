import { getSiteUrl } from "@/lib/seo/site-url";

/** Social share preview — absolute URL required by Facebook/LinkedIn crawlers. */
export const OG_IMAGE_PATH = "/brand/dashboard-preview.png";

export function getOgImage(alt: string) {
  return {
    url: `${getSiteUrl()}${OG_IMAGE_PATH}`,
    width: 2880,
    height: 1556,
    alt,
  } as const;
}
