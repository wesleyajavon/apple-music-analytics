import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CookiePolicyDocument } from "@/lib/components/cookie-policy-document";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.cookies");
  return { title: t("title"), description: t("intro") };
}

export default function CookiePolicyPage() {
  return <CookiePolicyDocument />;
}
