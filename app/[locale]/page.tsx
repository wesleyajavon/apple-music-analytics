"use client";

import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/lib/components/language-switcher";

export default function Home() {
  const t = useTranslations("home");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 relative">
      <div className="absolute top-6 right-6 min-w-[140px]">
        <Suspense fallback={<div className="h-10 w-32 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />}>
          <LanguageSwitcher placement="bottom" />
        </Suspense>
      </div>
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-center">
          {t("title")}
        </h1>
        <div className="text-center">
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t("accessDashboard")}
          </Link>
        </div>
      </div>
    </main>
  );
}
