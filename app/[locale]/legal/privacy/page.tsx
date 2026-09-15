import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PrivacyDocument } from "@/lib/components/privacy-document";
import { getGdprContactEmail } from "@/lib/constants/gdpr-contact";
import { languageAlternates } from "@/lib/seo/public-paths";

const PATH = "/legal/privacy";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("legal.privacy");
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

export default function PrivacyPolicyPage() {
  const contactEmail = getGdprContactEmail();
  return <PrivacyDocument contactEmail={contactEmail} />;
}
