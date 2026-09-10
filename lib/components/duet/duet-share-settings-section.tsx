"use client";

import { useTranslations } from "next-intl";
import { SettingsSwitch } from "@/app/[locale]/dashboard/(main)/settings/settings-shared";
import { useDuetMutations, useDuetSettings } from "@/lib/hooks/use-duet";

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
        <h3 className="text-sm font-semibold text-foreground">{t("title")}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{t("description")}</p>
      </div>

      <div className="flex flex-col gap-3 border-t border-glass-hairline pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-foreground">{t("allowRequests")}</p>
        <SettingsSwitch
          aria-label={t("allowRequests")}
          checked={data?.allowFriendRequests ?? true}
          disabled={isLoading || updateSettings.isPending}
          onChange={(next) => updateSettings.mutate({ allowFriendRequests: next })}
        />
      </div>

      <p className="text-xs leading-relaxed text-muted">{t("consentHint")}</p>
      <p className="text-xs leading-relaxed text-muted">{t("friendMusicHint")}</p>
      <p className="text-xs leading-relaxed text-muted">{t("revokeHint")}</p>
    </div>
  );
}
