/**
 * Composant réutilisable pour afficher un état de chargement
 */

"use client";

import { useTranslations } from "next-intl";
import { SoundprintBrandMark } from "@/lib/components/soundprint-brand-mark";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({
  message,
  className = "",
}: LoadingStateProps) {
  const t = useTranslations("components.loadingState");
  const displayMessage = message ?? t("defaultMessage");
  const pleaseWait = t("pleaseWait");

  return (
    <div className={`flex items-center justify-center py-16 ${className}`}>
      <div className="text-center">
        <div className="mb-8 flex justify-center opacity-90">
          <SoundprintBrandMark
            showWordmark={false}
            interactive={false}
            className="animate-pulse opacity-90"
          />
        </div>
        <div className="inline-block relative mb-6">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-card-border border-t-primary"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-6 w-6 rounded-full bg-primary opacity-75"></div>
          </div>
        </div>
        <p className="text-base font-medium text-gray-700 dark:text-gray-300">{displayMessage}</p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {pleaseWait}
        </p>
      </div>
    </div>
  );
}
