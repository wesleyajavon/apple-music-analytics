"use client";

import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useEffect, useState } from "react";
import { toast } from "sonner";
import { useOptimisticFilters } from "@/lib/hooks/use-optimistic-filters";
import { DashboardUserMenu } from "@/lib/components/dashboard-user-menu";
import { NotificationCenter } from "@/lib/components/notification-center";
import { useMobileSidebar } from "@/lib/components/sidebar";
import { useHideNotificationCenterForPublicDemo } from "@/lib/hooks/use-public-demo-viewer";

export type DateRangePreset = "7d" | "30d" | "ytd" | "all" | "custom";

type FixedDateRangePreset = Exclude<DateRangePreset, "custom">;

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

function toYmd(d: Date): string {
  return d.toISOString().split("T")[0];
}

function defaultCustomRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return { start: toYmd(start), end: toYmd(end) };
}

const getYearToDateRange = (): DateRange => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  return {
    startDate: startOfYear,
    endDate: now,
  };
};

const presets: Record<FixedDateRangePreset, DateRange> = {
  "7d": {
    startDate: (() => {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      return date;
    })(),
    endDate: new Date(),
  },
  "30d": {
    startDate: (() => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date;
    })(),
    endDate: new Date(),
  },
  ytd: getYearToDateRange(),
  all: {
    startDate: null,
    endDate: null,
  },
};

/** Preset actif à partir des paramètres d’URL (aligné sur les boutons du filtre). */
export function getDateRangePresetFromSearchParams(searchParams: {
  get: (key: string) => string | null;
  has: (key: string) => boolean;
}): DateRangePreset {
  const presetFromUrl = searchParams.get("preset");
  const hasStartDate = searchParams.has("startDate");
  const hasEndDate = searchParams.has("endDate");

  const p = presetFromUrl;
  if (
    p === "7d" ||
    p === "30d" ||
    p === "ytd" ||
    p === "all" ||
    p === "custom"
  ) {
    return p;
  }
  if (!hasStartDate && !hasEndDate) {
    return "all";
  }
  if (hasStartDate && hasEndDate) {
    return "custom";
  }
  return "all";
}

export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { prefetchWithOptimisticUpdate } = useOptimisticFilters();
  const t = useTranslations("components.dateRangeFilter");
  const tSidebar = useTranslations("sidebar");
  const { toggle: toggleMobileSidebar } = useMobileSidebar();
  const hideNotificationCenter = useHideNotificationCenterForPublicDemo(
    searchParams.get("userId")
  );

  const currentPreset: DateRangePreset = getDateRangePresetFromSearchParams(searchParams);

  const [customOpen, setCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const customWrapRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
  } | null>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Calcule la position de l'indicateur actif
  useEffect(() => {
    const activeButton = buttonRefs.current[currentPreset];
    if (activeButton && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      setIndicatorStyle({
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width,
      });
    }
  }, [currentPreset]);

  // Recalculer la position lors du redimensionnement de la fenêtre
  useEffect(() => {
    const handleResize = () => {
      const activeButton = buttonRefs.current[currentPreset];
      if (activeButton && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();
        setIndicatorStyle({
          left: buttonRect.left - containerRect.left,
          width: buttonRect.width,
        });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [currentPreset]);

  useEffect(() => {
    if (!customOpen) return;
    const s = searchParams.get("startDate");
    const e = searchParams.get("endDate");
    if (s && e) {
      setCustomStart(s);
      setCustomEnd(e);
    } else {
      const d = defaultCustomRange();
      setCustomStart(d.start);
      setCustomEnd(d.end);
    }
  }, [customOpen, searchParams]);

  useEffect(() => {
    if (currentPreset !== "custom") {
      setCustomOpen(false);
    }
  }, [currentPreset]);

  useEffect(() => {
    if (!customOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (customWrapRef.current && !customWrapRef.current.contains(e.target as Node)) {
        setCustomOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [customOpen]);

  useEffect(() => {
    if (!customOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCustomOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [customOpen]);

  const updateDateRange = useCallback(
    async (preset: FixedDateRangePreset) => {
      setCustomOpen(false);
      const oldStartDate = searchParams.get("startDate") || undefined;
      const oldEndDate = searchParams.get("endDate") || undefined;

      const range = preset === "ytd" ? getYearToDateRange() : presets[preset];
      const params = new URLSearchParams(searchParams.toString());

      let newStartDate: string | undefined;
      let newEndDate: string | undefined;

      if (preset === "all") {
        params.delete("preset");
        params.delete("startDate");
        params.delete("endDate");
      } else {
        params.set("preset", preset);
        if (range.startDate) {
          newStartDate = range.startDate.toISOString().split("T")[0];
          params.set("startDate", newStartDate);
        }
        if (range.endDate) {
          newEndDate = range.endDate.toISOString().split("T")[0];
          params.set("endDate", newEndDate);
        }
      }

      if (newStartDate && newEndDate) {
        prefetchWithOptimisticUpdate(
          oldStartDate,
          oldEndDate,
          undefined,
          newStartDate,
          newEndDate,
          undefined
        ).catch((error) => {
          console.error("Erreur lors du préchargement optimiste:", error);
        });
      }

      router.push(`${pathname}?${params.toString()}`);

      const presetLabel = t(`presets.${preset}`);
      toast.success(t("toastFilterUpdated"), {
        description: t("toastPeriodSelected", { label: presetLabel }),
        duration: 2000,
      });
    },
    [router, pathname, searchParams, prefetchWithOptimisticUpdate, t]
  );

  const applyCustomRange = useCallback(() => {
    let start = customStart.trim();
    let end = customEnd.trim();
    if (!start || !end) {
      toast.error(t("customInvalidRange"));
      return;
    }
    if (start > end) {
      [start, end] = [end, start];
    }
    const oldStartDate = searchParams.get("startDate") || undefined;
    const oldEndDate = searchParams.get("endDate") || undefined;
    const params = new URLSearchParams(searchParams.toString());
    params.set("preset", "custom");
    params.set("startDate", start);
    params.set("endDate", end);
    prefetchWithOptimisticUpdate(
      oldStartDate,
      oldEndDate,
      undefined,
      start,
      end,
      undefined
    ).catch((error) => {
      console.error("Erreur lors du préchargement optimiste:", error);
    });
    router.push(`${pathname}?${params.toString()}`);
    setCustomOpen(false);
    const presetLabel = t("presets.custom");
    toast.success(t("toastFilterUpdated"), {
      description: t("toastPeriodSelected", { label: presetLabel }),
      duration: 2000,
    });
  }, [
    customStart,
    customEnd,
    searchParams,
    pathname,
    router,
    prefetchWithOptimisticUpdate,
    t,
  ]);

  const presetEntries = Object.entries(presets) as [FixedDateRangePreset, DateRange][];

  const presetButtonClass = (active: boolean) =>
    [
      "relative z-10 shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-200",
      "max-lg:min-h-8 lg:min-h-0 lg:px-4 lg:py-2 lg:text-sm",
      active ? "text-white" : "text-muted hover:text-foreground",
    ].join(" ");

  const presetStrip = (
    <div
      ref={containerRef}
      className="relative flex min-w-0 flex-1 items-center overflow-x-auto overscroll-x-contain rounded-xl border border-card-border bg-surface p-0.5 [-ms-overflow-style:none] [scrollbar-width:none] lg:max-w-full lg:overflow-visible lg:p-1 [&::-webkit-scrollbar]:hidden"
    >
      {indicatorStyle ? (
        <div
          className="absolute top-1 h-[calc(100%-8px)] bg-brand-gradient rounded-lg transition-all duration-300 ease-out shadow-sm lg:top-1.5 lg:h-[calc(100%-12px)]"
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
          }}
        />
      ) : null}
      {presetEntries.map(([key]) => {
        const isActive = currentPreset === key;
        return (
          <button
            key={key}
            ref={(el) => {
              buttonRefs.current[key] = el;
            }}
            onClick={() => updateDateRange(key)}
            title={t(`presets.${key}`)}
            className={presetButtonClass(isActive)}
          >
            {t(`presets.${key}`)}
          </button>
        );
      })}
      <div ref={customWrapRef} className="relative z-10">
        <button
          type="button"
          ref={(el) => {
            buttonRefs.current.custom = el;
          }}
          onClick={() => setCustomOpen((v) => !v)}
          title={t("presets.custom")}
          aria-expanded={customOpen}
          aria-haspopup="dialog"
          className={presetButtonClass(currentPreset === "custom")}
        >
          {t("presets.custom")}
        </button>
        {customOpen ? (
          <div
            role="dialog"
            aria-label={t("customDialogLabel")}
            className="absolute left-0 top-[calc(100%+0.5rem)] z-50 min-w-[min(100vw-2rem,18rem)] rounded-xl border border-card-border bg-surface-raised p-4 shadow-card max-lg:fixed max-lg:inset-x-4 max-lg:bottom-[calc(5.5rem+env(safe-area-inset-bottom))] max-lg:top-auto max-lg:min-w-0"
          >
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
                {t("customStart")}
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="rounded-lg border border-card-border bg-card px-2 py-2.5 text-base text-foreground lg:py-1.5 lg:text-sm"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
                {t("customEnd")}
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="rounded-lg border border-card-border bg-card px-2 py-2.5 text-base text-foreground lg:py-1.5 lg:text-sm"
                />
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCustomOpen(false)}
                  className="min-h-10 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-primary/10 lg:min-h-0 lg:py-1.5"
                >
                  {t("customCancel")}
                </button>
                <button
                  type="button"
                  onClick={applyCustomRange}
                  className="min-h-10 rounded-lg bg-brand-gradient px-3 py-2 text-sm font-semibold text-white hover:opacity-95 lg:min-h-0 lg:py-1.5"
                >
                  {t("customApply")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  const headerActions = (
    <>
      {!hideNotificationCenter ? <NotificationCenter /> : null}
      <DashboardUserMenu />
    </>
  );

  return (
    <div className="px-3 py-2 lg:px-8 lg:py-3">
      <div className="flex min-w-0 items-center gap-2 lg:justify-between lg:gap-4">
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-card-border bg-card-surface text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          aria-label={tSidebar("openMenu")}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="hidden shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted lg:inline">
          {t("period")}
        </span>
        {presetStrip}
        <div className="flex shrink-0 items-center gap-0.5 lg:gap-3">{headerActions}</div>
      </div>
    </div>
  );
}
