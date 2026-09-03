"use client";

import { useId, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Clock3, Disc3, Sparkles, type LucideIcon } from "lucide-react";
import { DashboardCinematicHeroBg } from "@/lib/components/dashboard-ui";
import { LiveStatusDot } from "@/lib/components/live-status-dot";
import { WaitingForImportMobileCtas } from "@/lib/components/waiting-for-import-demo";

/**
 * Bleed the empty canvas from the sticky filter bar down to the bottom nav
 * so short import CTAs do not leave a vacant dashboard surface underneath.
 */
export const DASHBOARD_MOBILE_EMPTY_BLEED =
  "-mx-4 -mt-4 -mb-4 flex min-h-[calc(100dvh-var(--dashboard-filter-height,0px)-var(--dashboard-bottom-nav-offset,0px))] flex-col lg:hidden";

const HERO_SHELL =
  "relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-950 px-4 pb-5 pt-4 text-white";

type UnlockItem = {
  icon: LucideIcon;
  titleKey: "hours" | "catalog" | "taste";
  leadKey: "hoursLead" | "catalogLead" | "tasteLead";
};

const UNLOCK_ITEMS: UnlockItem[] = [
  { icon: Clock3, titleKey: "hours", leadKey: "hoursLead" },
  { icon: Disc3, titleKey: "catalog", leadKey: "catalogLead" },
  { icon: Sparkles, titleKey: "taste", leadKey: "tasteLead" },
];

function GhostSparkline() {
  const reactId = useId();
  const fillId = `mobile-import-empty-spark-${reactId.replace(/:/g, "")}`;

  return (
    <div
      className="relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/[0.04] px-3 pb-1.5 pt-3"
      aria-hidden
    >
      <svg viewBox="0 0 280 56" className="h-12 w-full">
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(167 139 250)" stopOpacity="0.38" />
            <stop offset="100%" stopColor="rgb(167 139 250)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 40 L28 36 L56 38 L84 28 L112 32 L140 18 L168 24 L196 14 L224 20 L252 12 L280 16 L280 56 L0 56 Z"
          fill={`url(#${fillId})`}
        />
        <path
          d="M0 40 L28 36 L56 38 L84 28 L112 32 L140 18 L168 24 L196 14 L224 20 L252 12 L280 16"
          fill="none"
          stroke="rgb(103 232 249 / 0.55)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function MobileImportUnlockPreview() {
  const t = useTranslations("components.emptyState.mobileUnlock");

  return (
    <div>
      <p className="inline-flex items-center gap-2 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/70">
        <LiveStatusDot tone="cyan" size="sm" />
        {t("eyebrow")}
      </p>
      <div className="mt-3">
        <GhostSparkline />
      </div>
      <ul className="mt-3 space-y-2">
        {UNLOCK_ITEMS.map((item) => (
          <li
            key={item.titleKey}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <item.icon className="h-4 w-4 text-white/80" strokeWidth={1.5} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold tracking-[-0.01em] text-white">
                {t(item.titleKey)}
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-white/55">{t(item.leadKey)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DashboardMobileImportEmpty({
  eyebrow,
  title,
  lead,
  demoPath,
  importLabel,
  demoLabel,
  header,
  atmosphere,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  demoPath: string;
  importLabel: string;
  demoLabel?: string;
  header?: ReactNode;
  atmosphere?: ReactNode;
}) {
  const t = useTranslations("components.emptyState");

  return (
    <div className={DASHBOARD_MOBILE_EMPTY_BLEED}>
      <section className={HERO_SHELL} aria-labelledby="dashboard-mobile-import-empty-title">
        {atmosphere ?? <DashboardCinematicHeroBg />}
        <div className="relative flex min-h-0 flex-1 flex-col gap-4">
          {header}
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-cyan">
                {eyebrow}
              </p>
              <h1
                id="dashboard-mobile-import-empty-title"
                className="mt-2 max-w-[16rem] text-[1.55rem] font-semibold leading-[1.15] tracking-[-0.05em]"
              >
                {title}
              </h1>
              <p className="mt-2 max-w-sm text-sm leading-6 text-white/62">{lead}</p>
            </div>
            <WaitingForImportMobileCtas
              demoPath={demoPath}
              importLabel={importLabel}
              demoLabel={demoLabel ?? t("emptyDemoCta")}
            />
          </div>
          <div className="mt-auto pt-6">
            <MobileImportUnlockPreview />
          </div>
        </div>
      </section>
    </div>
  );
}
