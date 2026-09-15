import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { GuideArticle } from "@/lib/components/guide-article";
import {
  GUIDE_MESSAGE_KEYS,
  guidePath,
  isGuideSlug,
  type GuideSlug,
} from "@/lib/seo/guide-slugs";
import { languageAlternates } from "@/lib/seo/public-paths";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale) || !isGuideSlug(slug)) return {};

  const messageKey = GUIDE_MESSAGE_KEYS[slug];
  const t = await getTranslations({
    locale,
    namespace: `guides.pages.${messageKey}`,
  });
  const path = guidePath(slug);

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `/${locale}${path}`,
      languages: languageAlternates(path),
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: `/${locale}${path}`,
      type: "article",
    },
    robots: { index: true, follow: true },
  };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  if (!isGuideSlug(slug)) notFound();

  return <GuideArticle slug={slug as GuideSlug} />;
}
