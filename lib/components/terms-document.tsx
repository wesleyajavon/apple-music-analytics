"use client";

import { useTranslations } from "next-intl";
import { LegalDocument } from "@/lib/components/legal-document";
import { LegalRelatedLinks } from "@/lib/components/legal-related-links";

export function TermsDocument() {
  const t = useTranslations("legal.terms");

  return (
    <LegalDocument
      namespace="legal.terms"
      footer={
        <LegalRelatedLinks
          title={t("related.title")}
          description={t("related.description")}
          links={[
            { href: "/legal/privacy", label: t("related.privacyLink") },
            { href: "/legal/cookies", label: t("related.cookiesLink") },
          ]}
        />
      }
    />
  );
}
