"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { HomeBlurFadeReveal, HomeKineticText } from "@/lib/components/home-animations";

const FAQ_KEYS = ["what", "export", "privacy", "pricing"] as const;

function ChevronDownIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function legalLinkClassName(className?: string) {
  return [
    "font-medium text-white/80 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white/50",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export function HomeClosingSection() {
  const t = useTranslations("home.closingSection");
  const tLegal = useTranslations("legal.nav");

  return (
    <section id="faq" className="scroll-mt-28 mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
      <div className="mx-auto max-w-3xl text-center lg:mx-0 lg:text-left">
        <HomeBlurFadeReveal>
          <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/70 sm:text-xs">
            {t("eyebrow")}
          </p>
        </HomeBlurFadeReveal>
        <HomeKineticText
          as="h2"
          onScroll
          scramble={false}
          stagger={0.028}
          className="mx-auto mt-3 block max-w-2xl text-[1.85rem] font-semibold leading-[1.15] tracking-[-0.045em] text-white min-[380px]:text-[2.05rem] sm:text-4xl sm:leading-[1.08] lg:mx-0"
          text={t("title")}
        />
      </div>

      <div className="mx-auto mt-10 max-w-2xl space-y-3 lg:mx-0">
        {FAQ_KEYS.map((key, index) => (
          <HomeBlurFadeReveal key={key} delay={0.06 * index}>
            <details className="group rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm open:bg-white/[0.07]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold tracking-[-0.01em] text-white transition-colors hover:text-white/80 [&::-webkit-details-marker]:hidden">
                {t(`faq.${key}.question`)}
                <ChevronDownIcon className="h-4 w-4 shrink-0 text-white/45 transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="px-5 pb-5 pt-0 text-sm leading-7 text-white/55">
                {key === "privacy"
                  ? t.rich(`faq.${key}.answer`, {
                      privacy: (chunks) => (
                        <Link href="/legal/privacy" className={legalLinkClassName()}>
                          {chunks}
                        </Link>
                      ),
                      terms: (chunks) => (
                        <Link href="/legal/terms" className={legalLinkClassName()}>
                          {chunks}
                        </Link>
                      ),
                    })
                  : t(`faq.${key}.answer`)}
              </p>
            </details>
          </HomeBlurFadeReveal>
        ))}
      </div>

      <HomeBlurFadeReveal delay={0.28} className="mx-auto mt-8 max-w-2xl lg:mx-0">
        <nav
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-white/45 lg:justify-start"
          aria-label={t("legalLinksAria")}
        >
          <Link
            href="/legal/privacy"
            className="transition-colors hover:text-white"
          >
            {tLegal("privacy")}
          </Link>
          <Link href="/legal/terms" className="transition-colors hover:text-white">
            {tLegal("terms")}
          </Link>
          <Link href="/legal/cookies" className="transition-colors hover:text-white">
            {tLegal("cookies")}
          </Link>
        </nav>
      </HomeBlurFadeReveal>
    </section>
  );
}
