import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TermsDocument } from "@/lib/components/terms-document";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.terms");
  return { title: t("title"), description: t("intro") };
}

export default function TermsOfServicePage() {
  return <TermsDocument />;
}
