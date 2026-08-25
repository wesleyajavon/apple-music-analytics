"use client";

import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback } from "react";
import { toast } from "sonner";
import {
  isRecentAuthRequiredError,
  redirectToRecentSignIn,
} from "@/lib/auth/recent-auth-client";

export function useDashboardExports() {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("components.dateRangeFilter");

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

  const exportCsv = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("format", "csv");

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    const exportUrl = `/api/export/listens?${params.toString()}`;
    await downloadFile(exportUrl, "listens.csv", "CSV");
  }, [searchParams, downloadFile]);

  const exportStats = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("format", "json");

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    const exportUrl = `/api/export/stats?${params.toString()}`;
    await downloadFile(exportUrl, "stats.json", "JSON");
  }, [searchParams, downloadFile]);

  const exportPdf = useCallback(async () => {
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

  return { exportCsv, exportStats, exportPdf };
}
