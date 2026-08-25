"use client";

import { useTranslations } from "next-intl";
import { SettingsSwitch } from "@/app/[locale]/dashboard/(main)/settings/settings-shared";
import { DASHBOARD_SPOTLIGHT_MUTED } from "@/lib/constants/dashboard-spotlight";
import { useDuetMutations, useDuetSettings } from "@/lib/hooks/use-duet";
import type { DuetShareScope } from "@prisma/client";

export function DuetShareSettingsSection() {
  const t = useTranslations("duet.settings");
  const { data, isLoading, error } = useDuetSettings();
  const { updateSettings } = useDuetMutations();

  if (error) {
    return (
      <p className="text-sm text-red-600 dark:text-red-300" role="alert">
        {t("error")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t("title")}</h3>
        <p className={`mt-1.5 text-sm leading-relaxed ${DASHBOARD_SPOTLIGHT_MUTED}`}>
          {t("description")}
        </p>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200/80 pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-slate-900 dark:text-white">{t("allowRequests")}</p>
        <SettingsSwitch
          aria-label={t("allowRequests")}
          checked={data?.allowFriendRequests ?? true}
          disabled={isLoading || updateSettings.isPending}
          onChange={(next) => updateSettings.mutate({ allowFriendRequests: next })}
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200/80 pt-4 dark:border-white/10">
        <label htmlFor="duet-default-scope" className="text-sm font-medium text-slate-900 dark:text-white">
          {t("defaultScope")}
        </label>
        <select
          id="duet-default-scope"
          disabled={isLoading || updateSettings.isPending}
          value={data?.defaultShareScope ?? "aggregates"}
          onChange={(e) =>
            updateSettings.mutate({ defaultShareScope: e.target.value as DuetShareScope })
          }
          className="max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black/30"
        >
          <option value="aggregates">{t("scopeAggregates")}</option>
          <option value="full">{t("scopeFull")}</option>
        </select>
      </div>

      <p className={`text-xs leading-relaxed ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("consentHint")}</p>
      <p className={`text-xs leading-relaxed ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("friendMusicHint")}</p>
    </div>
  );
}
