/**
 * Canonical public origin for SEO (metadataBase, sitemap, robots, Open Graph).
 * Prefer NEXT_PUBLIC_SITE_URL in production (e.g. https://www.soundprint-ai.com).
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    return stripTrailingSlash(explicit);
  }

  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProduction) {
    return stripTrailingSlash(`https://${vercelProduction}`);
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return stripTrailingSlash(`https://${vercelUrl}`);
  }

  return "https://www.soundprint-ai.com";
}

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}
