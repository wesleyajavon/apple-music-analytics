"use client";

import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useCallback, useRef, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  isRecentAuthRequiredError,
  redirectToRecentSignIn,
} from "@/lib/auth/recent-auth-client";
import { useOptimisticFilters } from "@/lib/hooks/use-optimistic-filters";

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
  const locale = useLocale();

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

  const downloadFile = useCallback(
    async (url: string, defaultFilename: string, exportType: string) => {
      const toastId = toast.loading(t("toastExportInProgress", { type: exportType }));
      try {
        const response = await fetch(url);
        if (!response.ok) {
          const errorPayload = (await response.json().catch(() => null)) as {
            error?: string;
            code?: string;
          } | null;
          if (isRecentAuthRequiredError(errorPayload)) {
            toast.error(t("recentAuthRequired"), { id: toastId });
            redirectToRecentSignIn(window.location.pathname + window.location.search);
            return;
          }
          throw new Error(errorPayload?.error || t("toastExportErrorFallback"));
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;

        const contentDisposition = response.headers.get("content-disposition");
        const filename = contentDisposition
          ? contentDisposition.split("filename=")[1]?.replace(/"/g, "") || defaultFilename
          : defaultFilename;

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);

        toast.success(t("toastExportSuccess", { type: exportType }), {
          id: toastId,
          description: t("toastFileDownloaded", { filename }),
        });
      } catch (error) {
        console.error("Erreur lors de l'export:", error);
        const errorMessage =
          error instanceof Error ? error.message : t("toastExportErrorFallback");
        toast.error(t("toastExportError", { type: exportType }), {
          id: toastId,
          description: errorMessage,
        });
      }
    },
    [t]
  );

  const handleExportCsv = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("format", "csv");

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    const exportUrl = `/api/export/listens?${params.toString()}`;
    await downloadFile(exportUrl, "listens.csv", "CSV");
  }, [searchParams, downloadFile]);

  const handleExportStats = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("format", "json");

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    const exportUrl = `/api/export/stats?${params.toString()}`;
    await downloadFile(exportUrl, "stats.json", "JSON");
  }, [searchParams, downloadFile]);

  const handleExportPdf = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("format", "pdf");
    params.set("locale", locale);

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const startYear = start.getFullYear();
      const endYear = end.getFullYear();

      const isFullYear =
        start.getMonth() === 0 &&
        start.getDate() === 1 &&
        end.getMonth() === 11 &&
        end.getDate() === 31 &&
        startYear === endYear;

      if (isFullYear) {
        params.set("year", startYear.toString());
      } else {
        params.set("startDate", startDate);
        params.set("endDate", endDate);
      }
    } else {
      const currentYear = new Date().getFullYear();
      params.set("year", currentYear.toString());
    }

    const exportUrl = `/api/export/report?${params.toString()}`;
    await downloadFile(exportUrl, "rapport.pdf", "PDF");
  }, [searchParams, downloadFile, locale]);

  return (
    <div className="px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 shrink-0">
            {t("period")}
          </span>
          <div
            ref={containerRef}
            className="relative flex items-center bg-gray-50 dark:bg-gray-800/80 p-1.5 rounded-xl border border-gray-100 dark:border-gray-700/50"
          >
            {indicatorStyle && (
              <div
                className="absolute h-[calc(100%-12px)] top-1.5 bg-accent-violet rounded-lg transition-all duration-300 ease-out shadow-sm"
                style={{
                  left: `${indicatorStyle.left}px`,
                  width: `${indicatorStyle.width}px`,
                }}
              />
            )}
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
                  className={`
                    relative z-10 px-4 py-2 text-sm font-semibold rounded-md
                    transition-all duration-200
                    ${
                      isActive
                        ? "text-white"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }
                  `}
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
                className={`
                  relative px-4 py-2 text-sm font-semibold rounded-md
                  transition-all duration-200
                  ${
                    currentPreset === "custom"
                      ? "text-white"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }
                `}
              >
                {t("presets.custom")}
              </button>
              {customOpen ? (
                <div
                  role="dialog"
                  aria-label={t("customDialogLabel")}
                  className="absolute left-0 top-[calc(100%+0.5rem)] z-50 min-w-[min(100vw-2rem,18rem)] rounded-xl border border-gray-100 bg-white p-4 shadow-lg dark:border-gray-700/50 dark:bg-gray-900"
                >
                  <div className="flex flex-col gap-3">
                    <label className="flex flex-col gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                      {t("customStart")}
                      <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                      {t("customEnd")}
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    </label>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setCustomOpen(false)}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        {t("customCancel")}
                      </button>
                      <button
                        type="button"
                        onClick={applyCustomRange}
                        className="rounded-lg bg-accent-violet px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
                      >
                        {t("customApply")}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 pl-4 border-l border-gray-100 dark:border-gray-700/50">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mr-2 hidden sm:inline">
            {t("exportLabel")}
          </span>
          <button
            onClick={handleExportCsv}
            className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-accent-emerald dark:hover:text-accent-emerald hover:bg-accent-emerald/10 dark:hover:bg-accent-emerald/10 rounded-lg transition-colors"
            title={t("exportCsvTitle")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          <button
            onClick={handleExportStats}
            className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-accent-indigo dark:hover:text-accent-indigo hover:bg-accent-indigo/10 dark:hover:bg-accent-indigo/10 rounded-lg transition-colors"
            title={t("exportStatsTitle")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </button>
          <button
            onClick={handleExportPdf}
            className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-accent-rose dark:hover:text-accent-rose hover:bg-accent-rose/10 dark:hover:bg-accent-rose/10 rounded-lg transition-colors"
            title={t("exportPdfTitle")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
