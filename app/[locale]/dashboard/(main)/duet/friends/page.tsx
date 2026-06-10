import { getTranslations } from "next-intl/server";
import { DuetFriendsClient } from "@/lib/components/duet/duet-friends-client";
import { DASHBOARD_SPOTLIGHT_SHELL } from "@/lib/constants/dashboard-spotlight";

export default async function DuetFriendsPage() {
  const t = await getTranslations("duet.friends");

  return (
    <div className="space-y-6">
      <header className={DASHBOARD_SPOTLIGHT_SHELL}>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          {t("pageTitle")}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t("pageDescription")}</p>
      </header>
      <DuetFriendsClient />
    </div>
  );
}
