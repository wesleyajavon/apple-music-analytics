import { afterEach, describe, expect, it, vi } from "vitest";
import {
  INDEXABLE_PATHS,
  absoluteLocalizedUrl,
  languageAlternates,
  localizedPath,
} from "@/lib/seo/public-paths";
import { getSiteUrl } from "@/lib/seo/site-url";

describe("getSiteUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers NEXT_PUBLIC_SITE_URL and strips trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com/");
    expect(getSiteUrl()).toBe("https://example.com");
  });

  it("falls back to the production Soundprint domain", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    expect(getSiteUrl()).toBe("https://www.soundprint-ai.com");
  });
});

describe("public SEO paths", () => {
  it("builds localized paths for home and nested routes", () => {
    expect(localizedPath("fr", "")).toBe("/fr");
    expect(localizedPath("en", "/legal/privacy")).toBe("/en/legal/privacy");
  });

  it("builds absolute URLs and hreflang alternates", () => {
    const siteUrl = "https://www.soundprint-ai.com";
    expect(absoluteLocalizedUrl("es", "/legal/terms", siteUrl)).toBe(
      "https://www.soundprint-ai.com/es/legal/terms"
    );

    const languages = languageAlternates("", siteUrl);
    expect(languages.fr).toBe("https://www.soundprint-ai.com/fr");
    expect(languages.en).toBe("https://www.soundprint-ai.com/en");
    expect(languages.es).toBe("https://www.soundprint-ai.com/es");
    expect(languages["x-default"]).toBe("https://www.soundprint-ai.com/fr");
  });

  it("lists only marketing and legal surfaces as indexable", () => {
    expect(INDEXABLE_PATHS).toEqual([
      "",
      "/legal/privacy",
      "/legal/terms",
      "/legal/cookies",
    ]);
  });
});
