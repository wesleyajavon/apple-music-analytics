"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDashboardExports } from "@/lib/hooks/use-dashboard-exports";
import {
  DASHBOARD_SPOTLIGHT_BTN_SECONDARY,
  DASHBOARD_SPOTLIGHT_GRADIENT_CYAN,
  DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN,
  DASHBOARD_SPOTLIGHT_SHELL,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
  DASHBOARD_SPOTLIGHT_MUTED,
} from "@/lib/constants/dashboard-spotlight";

type DashboardDataExportsSectionProps = {
  variant?: "settings" | "compact" | "embedded";
};

export function DashboardDataExportsSection({ variant = "settings" }: DashboardDataExportsSectionProps) {
  const t = useTranslations("settings");
  const tExport = useTranslations("components.dateRangeFilter");
  const { exportCsv, exportStats, exportPdf } = useDashboardExports();

  const exportActions = [
    {
      key: "csv",
      label: tExport("exportMenuCsv"),
      format: "CSV",
      title: tExport("exportCsvTitle"),
      onClick: exportCsv,
      accentClass: "hover:bg-accent-emerald/10 hover:text-accent-emerald",
    },
    {
      key: "json",
      label: tExport("exportMenuJson"),
      format: "JSON",
      title: tExport("exportStatsTitle"),
      onClick: exportStats,
      accentClass: "hover:bg-accent-indigo/10 hover:text-accent-indigo",
    },
    {
      key: "pdf",
      label: tExport("exportMenuPdf"),
      format: "PDF",
      title: tExport("exportPdfTitle"),
      onClick: exportPdf,
      accentClass: "hover:bg-accent-rose/10 hover:text-accent-rose",
    },
  ] as const;

  if (variant === "compact") {
    return (
      <div className="space-y-3">
        <p className={`text-sm leading-relaxed ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("dashboardExportsBody")}</p>
        <div className="grid gap-2">
          {exportActions.map((action) => (
            <button
              key={action.key}
              type="button"
              title={action.title}
              onClick={() => void action.onClick()}
              className={`${DASHBOARD_SPOTLIGHT_BTN_SECONDARY} inline-flex min-h-11 w-full items-center justify-between gap-3 px-4`}
            >
              <span className="font-medium">{action.label}</span>
              <span className="font-mono text-xs text-muted">{action.format}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const exportButtons = (
    <div className={`grid gap-2 ${variant === "embedded" ? "sm:grid-cols-3" : "p-5 sm:grid-cols-3 sm:p-6"}`}>
      {exportActions.map((action) => (
        <button
          key={action.key}
          type="button"
          title={action.title}
          onClick={() => void action.onClick()}
          className={`flex min-h-11 flex-col items-start gap-1 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-left transition-colors dark:border-white/10 dark:bg-black/20 ${action.accentClass}`}
        >
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted">
            {action.format}
          </span>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">{action.label}</span>
        </button>
      ))}
    </div>
  );

  if (variant === "embedded") {
    return exportButtons;
  }

  return (
    <div className={`relative ${DASHBOARD_SPOTLIGHT_SHELL} transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/10 dark:hover:shadow-black/35`}>
      <div className={DASHBOARD_SPOTLIGHT_GRADIENT_CYAN} aria-hidden />
      <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN} aria-hidden />
      <div className="relative">
        <div className={`${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM} px-5 py-4 sm:px-6 sm:py-5`}>
          <div className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 dark:border-white/10 dark:bg-white/10">
              <Download className="h-5 w-5 text-slate-700 dark:text-slate-200" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h3 id="settings-dashboard-exports-heading" className="text-lg font-semibold text-slate-900 dark:text-white">
                {t("dashboardExportsTitle")}
              </h3>
              <p className={`mt-1.5 text-sm leading-relaxed ${DASHBOARD_SPOTLIGHT_MUTED}`}>
                {t("dashboardExportsBody")}
              </p>
            </div>
          </div>
        </div>
        {exportButtons}
      </div>
    </div>
  );
}
