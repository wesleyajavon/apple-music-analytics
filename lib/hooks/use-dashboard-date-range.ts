"use client";

import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useOptimisticFilters } from "@/lib/hooks/use-optimistic-filters";

export type DateRangePreset = "7d" | "30d" | "ytd" | "all" | "custom";

export type FixedDateRangePreset = Exclude<DateRangePreset, "custom">;

type DateRange = {
  startDate: Date | null;
  endDate: Date | null;
};

function toYmd(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function defaultCustomRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return { start: toYmd(start), end: toYmd(end) };
}

function getYearToDateRange(): DateRange {
  const now = new Date();
  return {
    startDate: new Date(now.getFullYear(), 0, 1),
    endDate: now,
  };
}

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

export const FIXED_DATE_RANGE_PRESETS: FixedDateRangePreset[] = ["7d", "30d", "ytd", "all"];

/** Preset actif à partir des paramètres d’URL (aligné sur les boutons du filtre). */
export function getDateRangePresetFromSearchParams(searchParams: {
  get: (key: string) => string | null;
  has: (key: string) => boolean;
}): DateRangePreset {
  const presetFromUrl = searchParams.get("preset");
  const hasStartDate = searchParams.has("startDate");
  const hasEndDate = searchParams.has("endDate");

  if (
    presetFromUrl === "7d" ||
    presetFromUrl === "30d" ||
    presetFromUrl === "ytd" ||
    presetFromUrl === "all" ||
    presetFromUrl === "custom"
  ) {
    return presetFromUrl;
  }
  if (!hasStartDate && !hasEndDate) {
    return "all";
  }
  if (hasStartDate && hasEndDate) {
    return "custom";
  }
  return "all";
}

export function useDashboardDateRange() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { prefetchWithOptimisticUpdate } = useOptimisticFilters();
  const t = useTranslations("components.dateRangeFilter");

  const currentPreset = getDateRangePresetFromSearchParams(searchParams);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const syncCustomFieldsFromUrl = useCallback(() => {
    const start = searchParams.get("startDate");
    const end = searchParams.get("endDate");
    if (start && end) {
      setCustomStart(start);
      setCustomEnd(end);
      return;
    }
    const fallback = defaultCustomRange();
    setCustomStart(fallback.start);
    setCustomEnd(fallback.end);
  }, [searchParams]);

  const updateDateRange = useCallback(
    async (preset: FixedDateRangePreset) => {
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
          undefined,
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
    [router, pathname, searchParams, prefetchWithOptimisticUpdate, t],
  );

  const applyCustomRange = useCallback((): boolean => {
    let start = customStart.trim();
    let end = customEnd.trim();
    if (!start || !end) {
      toast.error(t("customInvalidRange"));
      return false;
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
      undefined,
    ).catch((error) => {
      console.error("Erreur lors du préchargement optimiste:", error);
    });
    router.push(`${pathname}?${params.toString()}`);
    const presetLabel = t("presets.custom");
    toast.success(t("toastFilterUpdated"), {
      description: t("toastPeriodSelected", { label: presetLabel }),
      duration: 2000,
    });
    return true;
  }, [
    customStart,
    customEnd,
    searchParams,
    pathname,
    router,
    prefetchWithOptimisticUpdate,
    t,
  ]);

  return {
    currentPreset,
    searchParams,
    customStart,
    customEnd,
    setCustomStart,
    setCustomEnd,
    syncCustomFieldsFromUrl,
    updateDateRange,
    applyCustomRange,
  };
}
