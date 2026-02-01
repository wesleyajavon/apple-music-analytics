"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useRef, useEffect, useState } from "react";
import { toast } from "sonner";
import { useOptimisticFilters } from "@/lib/hooks/use-optimistic-filters";

export type DateRangePreset = "7d" | "30d" | "ytd" | "all";

interface DateRange {
  label: string;
  startDate: Date | null;
  endDate: Date | null;
}

const getYearToDateRange = (): DateRange => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  return {
    label: "YTD",
    startDate: startOfYear,
    endDate: now,
  };
};

const presets: Record<DateRangePreset, DateRange> = {
  "7d": {
    label: "7d",
    startDate: (() => {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      return date;
    })(),
    endDate: new Date(),
  },
  "30d": {
    label: "30d",
    startDate: (() => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date;
    })(),
    endDate: new Date(),
  },
  ytd: getYearToDateRange(),
  all: {
    label: "All",
    startDate: null,
    endDate: null,
  },
};

export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { prefetchWithOptimisticUpdate } = useOptimisticFilters();

  // Déterminer le preset actif : si pas de preset dans l'URL et pas de dates, c'est "all"
  const presetFromUrl = searchParams.get("preset") as DateRangePreset | null;
  const hasStartDate = searchParams.has("startDate");
  const hasEndDate = searchParams.has("endDate");
  
  const currentPreset: DateRangePreset = presetFromUrl 
    ? presetFromUrl 
    : (!hasStartDate && !hasEndDate) 
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
      // Récupérer les dates actuelles (anciennes)
      const oldStartDate = searchParams.get("startDate") || undefined;
      const oldEndDate = searchParams.get("endDate") || undefined;

      // Recalculer YTD au moment du clic pour avoir la date actuelle
      const range =
        preset === "ytd" ? getYearToDateRange() : presets[preset];
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

      // Mettre à jour le cache de manière optimiste AVANT la navigation
      // Cela permet d'afficher immédiatement les anciennes données pendant le chargement
      if (newStartDate && newEndDate) {
        // Ne pas attendre la fin du préchargement pour naviguer
        // Cela permet une mise à jour immédiate de l'UI
        prefetchWithOptimisticUpdate(
          oldStartDate,
          oldEndDate,
          undefined, // oldPeriod non utilisé pour DateRangeFilter
          newStartDate,
          newEndDate,
          undefined // newPeriod non utilisé pour DateRangeFilter
        ).catch((error) => {
          console.error("Erreur lors du préchargement optimiste:", error);
        });
      }

      router.push(`${pathname}?${params.toString()}`);
      
      // Afficher un toast de confirmation pour le changement de filtre
      const presetLabel = presets[preset].label;
      toast.success("Filtre mis à jour", {
        description: `Période sélectionnée : ${presetLabel}`,
        duration: 2000,
      });
    },
    [router, pathname, searchParams, prefetchWithOptimisticUpdate]
  );

  const presetEntries = Object.entries(presets) as [
    DateRangePreset,
    DateRange,
  ][];

  // Fonction générique pour télécharger un fichier
  const downloadFile = useCallback(async (url: string, defaultFilename: string, exportType: string) => {
    const toastId = toast.loading(`Export ${exportType} en cours...`);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Erreur lors de l'export");
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
      
      toast.success(`Export ${exportType} réussi`, {
        id: toastId,
        description: `Le fichier ${filename} a été téléchargé avec succès`,
      });
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
      const errorMessage = error instanceof Error ? error.message : "Une erreur est survenue lors de l'export";
      toast.error(`Erreur lors de l'export ${exportType}`, {
        id: toastId,
        description: errorMessage,
      });
    }
  }, []);

  // Fonction pour exporter les écoutes en CSV
  const handleExportCsv = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("format", "csv");

    // Récupérer les dates actuelles depuis les searchParams
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (startDate) {
      params.set("startDate", startDate);
    }
    if (endDate) {
      params.set("endDate", endDate);
    }

    const exportUrl = `/api/export/listens?${params.toString()}`;
    await downloadFile(exportUrl, "listens.csv", "CSV");
  }, [searchParams, downloadFile]);

  // Fonction pour exporter les statistiques en JSON
  const handleExportStats = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("format", "json");

    // Récupérer les dates actuelles depuis les searchParams
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (startDate) {
      params.set("startDate", startDate);
    }
    if (endDate) {
      params.set("endDate", endDate);
    }

    const exportUrl = `/api/export/stats?${params.toString()}`;
    await downloadFile(exportUrl, "stats.json", "JSON");
  }, [searchParams, downloadFile]);

  // Fonction pour générer le rapport PDF annuel
  const handleExportPdf = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("format", "pdf");

    // Récupérer les dates actuelles depuis les searchParams
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Si les dates couvrent une année complète, utiliser le paramètre year
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const startYear = start.getFullYear();
      const endYear = end.getFullYear();
      
      // Vérifier si c'est une année complète (1er jan au 31 déc)
      const isFullYear = 
        start.getMonth() === 0 && start.getDate() === 1 &&
        end.getMonth() === 11 && end.getDate() === 31 &&
        startYear === endYear;
      
      if (isFullYear) {
        params.set("year", startYear.toString());
      } else {
        params.set("startDate", startDate);
        params.set("endDate", endDate);
      }
    } else {
      // Par défaut, utiliser l'année en cours
      const currentYear = new Date().getFullYear();
      params.set("year", currentYear.toString());
    }

    const exportUrl = `/api/export/report?${params.toString()}`;
    await downloadFile(exportUrl, "rapport.pdf", "PDF");
  }, [searchParams, downloadFile]);

  return (
    <div className="bg-white dark:bg-gray-800/95 border-b border-gray-100 dark:border-gray-700/50 px-4 sm:px-6 py-3 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 shrink-0">
            Période
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
            {presetEntries.map(([key, preset]) => {
              const isActive = currentPreset === key;
              return (
                <button
                  key={key}
                  ref={(el) => {
                    buttonRefs.current[key] = el;
                  }}
                  onClick={() => updateDateRange(key)}
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
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Groupe d'export */}
        <div className="flex items-center gap-1 pl-4 border-l border-gray-100 dark:border-gray-700/50">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mr-2 hidden sm:inline">
            Export
          </span>
          <button
            onClick={handleExportCsv}
            className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-accent-emerald dark:hover:text-accent-emerald hover:bg-accent-emerald/10 dark:hover:bg-accent-emerald/10 rounded-lg transition-colors"
            title="Exporter les écoutes en CSV"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          <button
            onClick={handleExportStats}
            className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-accent-indigo dark:hover:text-accent-indigo hover:bg-accent-indigo/10 dark:hover:bg-accent-indigo/10 rounded-lg transition-colors"
            title="Exporter les statistiques en JSON"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </button>
          <button
            onClick={handleExportPdf}
            className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-accent-rose dark:hover:text-accent-rose hover:bg-accent-rose/10 dark:hover:bg-accent-rose/10 rounded-lg transition-colors"
            title="Générer le rapport PDF annuel"
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

