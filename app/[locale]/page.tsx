import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getOgImage } from "@/lib/seo/og-image";
import { languageAlternates } from "@/lib/seo/public-paths";
import HomePageClient from "./home-page-client";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: "metadata" });
  const ogImage = getOgImage(t("ogImageAlt"));

  return {
    title: {
      absolute: t("title"),
    },
    description: t("description"),
    alternates: {
      canonical: `/${locale}`,
      languages: languageAlternates(""),
    },
    // Nested openGraph replaces the parent object entirely in Next.js —
    // redeclare images or Facebook will only "infer" one from page content.
    openGraph: {
      type: "website",
      locale,
      siteName: "Soundprint-AI",
      url: `/${locale}`,
      title: t("title"),
      description: t("description"),
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: [ogImage.url],
    },
    robots: { index: true, follow: true },
  };
}

export default function HomePage() {
  return <HomePageClient />;
}
