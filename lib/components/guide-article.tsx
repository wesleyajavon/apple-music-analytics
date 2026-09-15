"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  GUIDE_MESSAGE_KEYS,
  GUIDE_SLUGS,
  type GuideSlug,
  guidePath,
} from "@/lib/seo/guide-slugs";

type GuideSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

type GuideArticleProps = {
  slug: GuideSlug;
};

export function GuideArticle({ slug }: GuideArticleProps) {
  const messageKey = GUIDE_MESSAGE_KEYS[slug];
  const t = useTranslations(`guides.pages.${messageKey}`);
  const tNav = useTranslations("guides.nav");
  const tCta = useTranslations("guides.cta");
  const sections = t.raw("sections") as GuideSection[];

  const related = GUIDE_SLUGS.filter((item) => item !== slug);

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10 border-b border-card-border pb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted">{t("intro")}</p>
      </header>

      <div className="space-y-10">
        {sections.map((section, index) => (
          <section key={section.title} aria-labelledby={`guide-section-${index}`}>
            <h2
              id={`guide-section-${index}`}
              className="text-xl font-semibold text-foreground"
            >
              {section.title}
            </h2>
            <div className="mt-3 space-y-3">
              {section.paragraphs.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 48)}
                  className="text-sm leading-relaxed text-muted sm:text-base"
                >
                  {paragraph}
                </p>
              ))}
            </div>
            {section.bullets?.length ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted sm:text-base">
                {section.bullets.map((bullet) => (
                  <li key={bullet.slice(0, 48)}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-card-border bg-card/40 p-6">
        <h2 className="text-lg font-semibold text-foreground">{tCta("title")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{tCta("body")}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/sign-up"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-95"
          >
            {tCta("primary")}
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-card-border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-card"
          >
            {tCta("secondary")}
          </Link>
        </div>
      </div>

      <nav className="mt-12 border-t border-card-border pt-8" aria-label={tNav("relatedAria")}>
        <p className="text-sm font-semibold text-foreground">{tNav("relatedTitle")}</p>
        <ul className="mt-3 space-y-2">
          {related.map((item) => (
            <li key={item}>
              <Link
                href={guidePath(item)}
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                {tNav(GUIDE_MESSAGE_KEYS[item])}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </article>
  );
}
