"use client";

import { useTranslations } from "next-intl";
import { GdprContactBlock } from "@/lib/components/gdpr-contact-block";
import { LegalDocument } from "@/lib/components/legal-document";
import { LegalRelatedLinks } from "@/lib/components/legal-related-links";

type PrivacyDocumentProps = {
  contactEmail?: string | null;
};

export function PrivacyDocument({ contactEmail }: PrivacyDocumentProps) {
  const t = useTranslations("legal.privacy");

  return (
    <LegalDocument
      namespace="legal.privacy"
      footer={
        <>
          {contactEmail ? (
            <GdprContactBlock
              title={t("contact.title")}
              body={t("contact.body")}
              email={contactEmail}
              emailAriaLabel={t("contact.emailAriaLabel", { email: contactEmail })}
            />
          ) : (
            <section className="mt-10 rounded-xl border border-card-border bg-card/40 p-5">
              <h2 className="text-lg font-semibold text-foreground">{t("contact.title")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t("contact.fallback")}</p>
            </section>
          )}
          <div className="mt-10">
            <LegalRelatedLinks
              title={t("related.title")}
              description={t("related.description")}
              links={[
                { href: "/legal/terms", label: t("related.termsLink") },
                { href: "/legal/cookies", label: t("related.cookiesLink") },
              ]}
            />
          </div>
        </>
      }
    />
  );
}
