"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { HomeBlurFadeReveal, HomeTextReveal } from "@/lib/components/home-animations";

const FAQ_KEYS = ["export", "deepdive", "privacy", "pricing"] as const;

type HomeClosingSectionProps = {
  isAuthenticated: boolean;
  publicDemoPath: string | null;
};

function ArrowRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  );
}

function ChevronDownIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export function HomeClosingSection({
  isAuthenticated,
  publicDemoPath,
}: HomeClosingSectionProps) {
  const t = useTranslations("home.closingSection");

  return (
    <section
      id="faq"
      className="mx-auto w-full max-w-7xl scroll-mt-28 px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8"
    >
      <div className="mx-auto max-w-3xl text-center lg:mx-0 lg:text-left">
        <HomeBlurFadeReveal>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            {t("eyebrow")}
          </p>
        </HomeBlurFadeReveal>
        <HomeTextReveal
          as="h2"
          onScroll
          className="mx-auto mt-3 block max-w-2xl text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl lg:mx-0"
          text={t("title")}
          stagger={0.04}
        />
      </div>

      <div className="mx-auto mt-10 max-w-2xl space-y-3 lg:mx-0">
        {FAQ_KEYS.map((key, index) => (
          <HomeBlurFadeReveal key={key} delay={0.06 * index}>
            <details className="group rounded-2xl border border-card-border bg-card-surface/80 backdrop-blur-sm open:shadow-card">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold tracking-[-0.01em] text-foreground transition-colors hover:text-primary [&::-webkit-details-marker]:hidden">
                {t(`faq.${key}.question`)}
                <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="px-5 pb-5 pt-0 text-sm leading-7 text-muted">{t(`faq.${key}.answer`)}</p>
            </details>
          </HomeBlurFadeReveal>
        ))}
      </div>

      <HomeBlurFadeReveal delay={0.28}>
        <div className="mx-auto mt-12 max-w-xl border-t border-card-border pt-10 text-center lg:mx-0 lg:text-left">
          <p className="text-xl font-semibold tracking-[-0.03em] text-foreground sm:text-2xl">
            {t("cta.title")}
          </p>

          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
            <Link
              href={isAuthenticated ? "/dashboard" : "/sign-up"}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-7 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:opacity-95 sm:w-auto"
            >
              {isAuthenticated ? t("cta.dashboard") : t("cta.signUp")}
              <ArrowRightIcon />
            </Link>
            {publicDemoPath ? (
              <Link
                href={publicDemoPath}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-card-border bg-card-surface px-6 py-3 text-sm font-semibold text-foreground shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover sm:w-auto"
              >
                {t("cta.demo")}
                <ArrowRightIcon />
              </Link>
            ) : null}
          </div>

          <p className="mt-4 text-xs leading-6 text-muted">
            {t("cta.microcopy")}
            {" · "}
            <Link href="/legal/privacy" className="font-medium text-primary transition-colors hover:text-primary/80">
              {t("cta.privacyLink")}
            </Link>
            {" · "}
            <Link href="/legal/terms" className="font-medium text-primary transition-colors hover:text-primary/80">
              {t("cta.termsLink")}
            </Link>
          </p>
        </div>
      </HomeBlurFadeReveal>
    </section>
  );
}
