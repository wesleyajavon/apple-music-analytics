import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { TermsDocument } from "@/lib/components/terms-document";
import { languageAlternates } from "@/lib/seo/public-paths";

const PATH = "/legal/terms";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("legal.terms");
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

export default function TermsOfServicePage() {
  return <TermsDocument />;
}
