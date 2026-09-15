import { describe, expect, it } from "vitest";
import {
  buildSoftwareApplicationJsonLd,
  serializeJsonLd,
} from "@/lib/seo/software-application-json-ld";

describe("buildSoftwareApplicationJsonLd", () => {
  it("describes Soundprint as a free streaming-stats web app", () => {
    const jsonLd = buildSoftwareApplicationJsonLd({
      locale: "en",
      description: "Import your Apple Music or Spotify history.",
      siteUrl: "https://www.soundprint-ai.com",
    });

    expect(jsonLd["@type"]).toEqual(["SoftwareApplication", "WebApplication"]);
    expect(jsonLd.name).toBe("Soundprint-AI");
    expect(jsonLd.url).toBe("https://www.soundprint-ai.com/en");
    expect(jsonLd["@id"]).toBe("https://www.soundprint-ai.com/en#software");
    expect(jsonLd.applicationCategory).toBe("MultimediaApplication");
    expect(jsonLd.operatingSystem).toBe("Web browser");
    expect(jsonLd.inLanguage).toBe("en");
    expect(jsonLd.isAccessibleForFree).toBe(true);
    expect(jsonLd.offers).toEqual({
      "@type": "Offer",
      price: 0,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    });
    expect(jsonLd.image).toBe(
      "https://www.soundprint-ai.com/brand/dashboard-preview.png"
    );
    expect(jsonLd).not.toHaveProperty("aggregateRating");
    expect(jsonLd).not.toHaveProperty("review");
  });

  it("localizes the canonical URL per locale", () => {
    const fr = buildSoftwareApplicationJsonLd({
      locale: "fr",
      description: "Stats de streaming.",
      siteUrl: "https://www.soundprint-ai.com",
    });
    expect(fr.url).toBe("https://www.soundprint-ai.com/fr");
    expect(fr.inLanguage).toBe("fr");
  });
});

describe("serializeJsonLd", () => {
  it("escapes angle brackets for safe script injection", () => {
    expect(serializeJsonLd({ name: "a</script>b" })).toBe(
      '{"name":"a\\u003c/script>b"}'
    );
  });
});
