"use client";

import { useTranslations } from "next-intl";
import { WhenWillIListenWidget } from "@/lib/components/when-will-i-listen-widget";

export default function WhenWillIListenPage() {
  const t = useTranslations("when-will-i-listen");
  return (
    <div className="px-4 py-6 sm:px-0">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
          {t("subtitle")}
        </p>
      </header>

      <WhenWillIListenWidget includeExplanation />
    </div>
  );
}
