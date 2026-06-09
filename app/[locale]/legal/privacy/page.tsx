import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PrivacyDocument } from "@/lib/components/privacy-document";
import { getGdprContactEmail } from "@/lib/constants/gdpr-contact";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.privacy");
  return { title: t("title"), description: t("intro") };
}

export default function PrivacyPolicyPage() {
  const contactEmail = getGdprContactEmail();
  return <PrivacyDocument contactEmail={contactEmail} />;
}
