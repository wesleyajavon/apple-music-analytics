"use client";

import { useTranslations } from "next-intl";
import { HOME_JOURNEY_NAV_ITEMS, type HomeJourneyNavLabelKey } from "@/lib/constants/home-journey-nav";

const STEP_STYLES: Record<
  HomeJourneyNavLabelKey,
  { ring: string; badge: string; dot: string }
> = {
  import: {
    ring: "hover:border-violet-400/35 hover:bg-violet-500/[0.06]",
    badge: "border-violet-400/25 bg-violet-500/10 text-violet-200",
    dot: "bg-violet-400",
  },
  explore: {
    ring: "hover:border-cyan-400/35 hover:bg-cyan-500/[0.06]",
    badge: "border-cyan-400/25 bg-cyan-500/10 text-cyan-100",
    dot: "bg-cyan-400",
  },
  interact: {
    ring: "hover:border-fuchsia-400/35 hover:bg-fuchsia-500/[0.06]",
    badge: "border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-100",
    dot: "bg-fuchsia-400",
  },
};

type HomeJourneyStepsProps = {
  className?: string;
};

export function HomeJourneySteps({ className }: HomeJourneyStepsProps) {
  const t = useTranslations("home.journey");
  const tNav = useTranslations("home.journey.nav");

  return (
    <nav
      aria-label={t("stepsListAriaLabel")}
      className={["w-full min-w-0 max-w-2xl", className].filter(Boolean).join(" ")}
    >
      <ol className="grid gap-2.5 sm:grid-cols-3 sm:gap-3">
        {HOME_JOURNEY_NAV_ITEMS.map((item, index) => {
          const styles = STEP_STYLES[item.labelKey];
          const stepLabel = tNav(item.labelKey);
          const verb = t(`steps.${item.labelKey}.verb`);

          return (
            <li key={item.href}>
              <a
                href={item.href}
                aria-label={t("stepLinkAria", { step: stepLabel })}
                className={`group flex h-full flex-col rounded-2xl border border-card-border bg-card-surface/70 px-3.5 py-3 shadow-card backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${styles.ring}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full border px-1.5 font-mono text-[0.65rem] font-bold tabular-nums ${styles.badge}`}
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot} opacity-80`}
                    aria-hidden
                  />
                  <span className="text-sm font-semibold tracking-[-0.02em] text-foreground">
                    {stepLabel}
                  </span>
                </div>
                <span className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-muted">
                  {verb}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
