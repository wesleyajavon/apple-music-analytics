import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { CookiePolicyDocument } from "@/lib/components/cookie-policy-document";
import { languageAlternates } from "@/lib/seo/public-paths";

const PATH = "/legal/cookies";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("legal.cookies");
  return {
    title: t("title"),
    description: t("intro"),
    alternates: {
      canonical: `/${locale}${PATH}`,
      languages: languageAlternates(PATH),
    },
    robots: { index: true, follow: true },
  };
}

export default function CookiePolicyPage() {
  return <CookiePolicyDocument />;
}
