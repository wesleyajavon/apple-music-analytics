"use client";

import { useTranslations } from "next-intl";
import { LegalDocument } from "@/lib/components/legal-document";
import { LegalRelatedLinks } from "@/lib/components/legal-related-links";

export function PrivacyDocument() {
  const t = useTranslations("legal.privacy");

  return (
    <LegalDocument
      namespace="legal.privacy"
      footer={
        <LegalRelatedLinks
          title={t("related.title")}
          description={t("related.description")}
          links={[
            { href: "/legal/terms", label: t("related.termsLink") },
            { href: "/legal/cookies", label: t("related.cookiesLink") },
          ]}
        />
      }
    />
  );
}
