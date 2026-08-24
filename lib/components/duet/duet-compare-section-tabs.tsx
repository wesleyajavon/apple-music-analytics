"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { BarChart3, Mic2, Users } from "lucide-react";

export { buildCompareFriendHref } from "@/lib/utils/duet-compare-href";

export type DuetCompareSection = "overview" | "shared" | "target";

const SECTIONS: {
  id: DuetCompareSection;
  labelKey: "sectionOverview" | "sectionShared" | "sectionTarget";
  hintKey: "sectionOverviewHint" | "sectionSharedHint" | "sectionTargetHint";
  icon: typeof BarChart3;
}[] = [
  {
    id: "overview",
    labelKey: "sectionOverview",
    hintKey: "sectionOverviewHint",
    icon: BarChart3,
  },
  {
    id: "shared",
    labelKey: "sectionShared",
    hintKey: "sectionSharedHint",
    icon: Users,
  },
  {
    id: "target",
    labelKey: "sectionTarget",
    hintKey: "sectionTargetHint",
    icon: Mic2,
  },
];

export function isDuetCompareSection(value: string | null | undefined): value is DuetCompareSection {
  return value === "overview" || value === "shared" || value === "target";
}

export function resolveCompareSection(searchParams: {
  get: (key: string) => string | null;
}): DuetCompareSection {
  const section = searchParams.get("section");
  if (isDuetCompareSection(section)) return section;

  const hasTargetDeepLink =
    searchParams.get("arenaMode") ||
    searchParams.get("entityType") ||
    searchParams.get("entityId");

  if (hasTargetDeepLink) return "target";
  return "overview";
}

type DuetCompareSectionTabsProps = {
  activeSection: DuetCompareSection;
};

export function DuetCompareSectionTabs({ activeSection }: DuetCompareSectionTabsProps) {
  const t = useTranslations("duet.compare");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setSection = useCallback(
    (section: DuetCompareSection) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("section", section);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return (
    <nav aria-label={t("sectionNavLabel")} className="space-y-3">
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
        {SECTIONS.map(({ id, labelKey, hintKey, icon: Icon }) => {
          const isActive = activeSection === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-[4.25rem] flex-1 flex-col items-start gap-1 rounded-2xl border px-4 py-3 text-left transition-all sm:min-w-[10rem] ${
                isActive
                  ? "border-violet-300/80 bg-violet-50 shadow-sm ring-1 ring-violet-200/60 dark:border-violet-400/35 dark:bg-violet-500/10 dark:ring-violet-400/20"
                  : "border-slate-200/80 bg-white/80 hover:border-violet-200 hover:bg-violet-50/40 dark:border-white/10 dark:bg-slate-950/40 dark:hover:border-violet-400/25 dark:hover:bg-violet-500/5"
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon
                  className={`h-4 w-4 shrink-0 ${isActive ? "text-violet-600 dark:text-violet-300" : "text-slate-500 dark:text-slate-400"}`}
                  aria-hidden
                />
                <span
                  className={`text-sm font-bold ${isActive ? "text-violet-800 dark:text-violet-100" : "text-slate-800 dark:text-slate-200"}`}
                >
                  {t(labelKey)}
                </span>
              </span>
              <span className={`text-xs leading-snug ${isActive ? "text-violet-700/80 dark:text-violet-200/80" : "text-slate-500 dark:text-slate-400"}`}>
                {t(hintKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function buildCompareTargetParams(
  baseParams: URLSearchParams,
  artistId: string,
  artistName: string
): URLSearchParams {
  const params = new URLSearchParams(baseParams.toString());
  params.set("section", "target");
  params.set("arenaMode", "artist");
  params.set("entityType", "artist");
  params.set("entityId", artistId);
  params.set("entityName", artistName);
  return params;
}
