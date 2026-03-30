"use client";

import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useCallback, useRef, useEffect, useState } from "react";
import { toast } from "sonner";
import { useOptimisticFilters } from "@/lib/hooks/use-optimistic-filters";

export type DateRangePreset = "7d" | "30d" | "ytd" | "all";

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

const getYearToDateRange = (): DateRange => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  return {
    startDate: startOfYear,
    endDate: now,
  };
};

const presets: Record<DateRangePreset, DateRange> = {
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

export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { prefetchWithOptimisticUpdate } = useOptimisticFilters();
  const t = useTranslations("components.dateRangeFilter");
  const locale = useLocale();

  // Déterminer le preset actif : si pas de preset dans l'URL et pas de dates, c'est "all"
  const presetFromUrl = searchParams.get("preset") as DateRangePreset | null;
  const hasStartDate = searchParams.has("startDate");
  const hasEndDate = searchParams.has("endDate");

  const currentPreset: DateRangePreset = presetFromUrl
    ? presetFromUrl
    : !hasStartDate && !hasEndDate
      ? "all"
      : "30d";
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

  const updateDateRange = useCallback(
    async (preset: DateRangePreset) => {
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

  const presetEntries = Object.entries(presets) as [DateRangePreset, DateRange][];

  const downloadFile = useCallback(
    async (url: string, defaultFilename: string, exportType: string) => {
      const toastId = toast.loading(t("toastExportInProgress", { type: exportType }));
      try {
        const response = await fetch(url);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || t("toastExportErrorFallback"));
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
