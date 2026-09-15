import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
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

  return {
    title: {
      absolute: t("title"),
    },
    description: t("description"),
    alternates: {
      canonical: `/${locale}`,
      languages: languageAlternates(""),
    },
    openGraph: {
      url: `/${locale}`,
      title: t("title"),
      description: t("description"),
    },
    robots: { index: true, follow: true },
  };
}

export default function HomePage() {
  return <HomePageClient />;
}
