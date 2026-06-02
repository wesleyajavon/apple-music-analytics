"use client";

import { useAiMasterToggle } from "@/lib/hooks/use-ai-master-toggle";

type AiMasterToggleSwitchProps = {
  showLabel?: boolean;
  className?: string;
};

export function AiMasterToggleSwitch({ showLabel = true, className = "" }: AiMasterToggleSwitchProps) {
  const { t, enabled, locked, pending, onToggle } = useAiMasterToggle();

  return (
    <div
      className={`flex items-center gap-3 ${className}`.trim()}
      role="group"
      aria-label={t("ariaLabel")}
    >
      {showLabel ? (
        <span className="select-none text-sm font-medium text-muted-foreground">{t("label")}</span>
      ) : null}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-disabled={locked || pending}
        disabled={locked || pending}
        title={locked ? t("lockedHint") : undefined}
        onClick={() => onToggle(!enabled)}
        className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          enabled ? "bg-emerald-600" : "bg-muted"
        } ${locked || pending ? "opacity-60" : ""}`}
      >
        <span
          className={`pointer-events-none block h-6 w-6 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
