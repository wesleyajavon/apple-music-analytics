"use client";

import { useId, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DashboardCinematicHeroBg } from "@/lib/components/dashboard-ui";
import { MobileBottomSheet } from "@/lib/components/mobile-bottom-sheet";
import { SoundprintBrandMark } from "@/lib/components/soundprint-brand-mark";
import { DASHBOARD_BOTTOM_NAV_OFFSET_VAR } from "@/lib/constants/dashboard-chrome";

const MOBILE_BLEED =
  `-mx-4 -mt-4 space-y-5 lg:hidden max-lg:pb-[max(2rem,calc(var(${DASHBOARD_BOTTOM_NAV_OFFSET_VAR},0px)+1.5rem))]`;
const HERO_SHELL = "relative overflow-hidden bg-gray-950 px-4 pb-5 pt-4 text-white";
const GROUP_SHELL =
  "divide-y divide-card-border overflow-hidden rounded-2xl border border-card-border bg-card-surface";
const ROW_CLASS =
  "flex min-h-11 w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm font-medium text-foreground";

type AboutMobileSheet = "whatIs" | "data" | null;

function ChevronIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function AboutMobileGroup({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  const labelId = `${id}-label`;
  return (
    <section id={id} className="px-4" aria-labelledby={labelId}>
      <h2
        id={labelId}
        className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
      >
        {title}
      </h2>
      <div className={GROUP_SHELL}>{children}</div>
    </section>
  );
}

export function AboutMobile() {
  const t = useTranslations("about");
  const tFooter = useTranslations("footer");
  const tCommon = useTranslations("common");
  const [sheet, setSheet] = useState<AboutMobileSheet>(null);
  const whatIsTitleId = useId();
  const dataTitleId = useId();

  return (
    <div className={MOBILE_BLEED}>
      <section className={HERO_SHELL}>
        <DashboardCinematicHeroBg />
        <div className="relative space-y-3">
          <SoundprintBrandMark
            size="lg"
            tone="onDark"
            showWordmark={false}
            showAiBadge={false}
            interactive={false}
            className="text-white"
          />
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-cyan">
            {t("mobile.eyebrow")}
          </p>
          <h1 className="max-w-[16rem] text-[1.55rem] font-semibold leading-[1.12] tracking-[-0.05em]">
            {t("mobile.title")}
          </h1>
          <p className="max-w-sm text-sm leading-6 text-white/70">{t("mobile.lead")}</p>
        </div>
      </section>

      <AboutMobileGroup id="about-mobile-product" title={t("mobile.groupProduct")}>
        <button type="button" className={ROW_CLASS} onClick={() => setSheet("whatIs")}>
          <span className="min-w-0 truncate">{t("mobile.whatIsTitle")}</span>
          <ChevronIcon className="h-4 w-4 shrink-0 text-muted" />
        </button>
        <button type="button" className={ROW_CLASS} onClick={() => setSheet("data")}>
          <span className="min-w-0 truncate">{t("mobile.dataTitle")}</span>
          <ChevronIcon className="h-4 w-4 shrink-0 text-muted" />
        </button>
      </AboutMobileGroup>

      <AboutMobileGroup id="about-mobile-legal" title={t("mobile.groupLegal")}>
        <Link href="/legal/privacy" className={`${ROW_CLASS} no-underline`}>
          <span className="min-w-0 truncate">{t("mobile.privacy")}</span>
          <ChevronIcon className="h-4 w-4 shrink-0 text-muted" />
        </Link>
        <Link href="/legal/terms" className={`${ROW_CLASS} no-underline`}>
          <span className="min-w-0 truncate">{t("mobile.terms")}</span>
          <ChevronIcon className="h-4 w-4 shrink-0 text-muted" />
        </Link>
        <Link href="/legal/cookies" className={`${ROW_CLASS} no-underline`}>
          <span className="min-w-0 truncate">{t("mobile.cookies")}</span>
          <ChevronIcon className="h-4 w-4 shrink-0 text-muted" />
        </Link>
      </AboutMobileGroup>

      <AboutMobileGroup id="about-mobile-credits" title={t("mobile.groupCredits")}>
        <div className="px-3.5 py-2.5">
          <p className="text-sm font-medium text-foreground">{tFooter("creatorCredit")}</p>
        </div>
        <div className="px-3.5 py-2.5">
          <p className="text-sm leading-5 text-muted">{t("mobile.affiliation")}</p>
        </div>
      </AboutMobileGroup>

      <MobileBottomSheet
        open={sheet === "whatIs"}
        onClose={() => setSheet(null)}
        ariaLabelledBy={whatIsTitleId}
        insetAboveBottomNav
      >
        <div className="px-4 pb-3 pt-1">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 id={whatIsTitleId} className="text-lg font-semibold tracking-tight text-foreground">
              {t("mobile.whatIsTitle")}
            </h2>
            <button
              type="button"
              onClick={() => setSheet(null)}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-muted"
              aria-label={tCommon("close")}
            >
              {tCommon("close")}
            </button>
          </div>
          <p className="text-sm leading-6 text-muted">{t("mobile.whatIsBody")}</p>
        </div>
      </MobileBottomSheet>

      <MobileBottomSheet
        open={sheet === "data"}
        onClose={() => setSheet(null)}
        ariaLabelledBy={dataTitleId}
        insetAboveBottomNav
      >
        <div className="px-4 pb-3 pt-1">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 id={dataTitleId} className="text-lg font-semibold tracking-tight text-foreground">
              {t("mobile.dataTitle")}
            </h2>
            <button
              type="button"
              onClick={() => setSheet(null)}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-muted"
              aria-label={tCommon("close")}
            >
              {tCommon("close")}
            </button>
          </div>
          <p className="text-sm leading-6 text-muted">{t("mobile.dataBody")}</p>
        </div>
      </MobileBottomSheet>
    </div>
  );
}
