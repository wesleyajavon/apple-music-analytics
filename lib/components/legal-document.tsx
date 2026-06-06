"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

type LegalSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export function LegalDocument({
  namespace,
  footer,
}: {
  namespace: "legal.privacy" | "legal.terms" | "legal.cookies";
  footer?: ReactNode;
}) {
  const t = useTranslations(namespace);
  const sections = t.raw("sections") as LegalSection[];
  const lastUpdated = t("lastUpdated");

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10 border-b border-card-border pb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t("title")}</h1>
        <p className="mt-3 text-sm text-muted">{lastUpdated}</p>
        <p className="mt-4 text-base leading-relaxed text-muted">{t("intro")}</p>
      </header>

      <div className="space-y-10">
        {sections.map((section, index) => (
          <section key={index} aria-labelledby={`legal-section-${index}`}>
            <h2
              id={`legal-section-${index}`}
              className="text-xl font-semibold text-foreground"
            >
              {section.title}
            </h2>
            <div className="mt-3 space-y-3">
              {section.paragraphs.map((paragraph, pIndex) => (
                <p key={pIndex} className="text-sm leading-relaxed text-muted sm:text-base">
                  {paragraph}
                </p>
              ))}
            </div>
            {section.bullets?.length ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted sm:text-base">
                {section.bullets.map((bullet, bIndex) => (
                  <li key={bIndex}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
        {footer}
      </div>
    </article>
  );
}
