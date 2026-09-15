import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getSiteUrl } from "@/lib/seo/site-url";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: "metadata" });
  const siteUrl = getSiteUrl();
  const ogImage = "/brand/dashboard-preview.png";
  const faviconUrl = "/brand/favicon.png";

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: t("title"),
      template: t("titleTemplate"),
    },
    description: t("description"),
    applicationName: "Soundprint-AI",
    authors: [{ name: "Soundprint-AI" }],
    creator: "Soundprint-AI",
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: "Soundprint",
      statusBarStyle: "black-translucent",
    },
    icons: {
      icon: [{ url: faviconUrl, type: "image/png" }],
      apple: [{ url: faviconUrl, sizes: "180x180", type: "image/png" }],
    },
    openGraph: {
      type: "website",
      locale,
      siteName: "Soundprint-AI",
      title: t("title"),
      description: t("description"),
      images: [
        {
          url: ogImage,
          width: 2880,
          height: 1556,
          alt: t("ogImageAlt"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: [ogImage],
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return <>{children}</>;
}
