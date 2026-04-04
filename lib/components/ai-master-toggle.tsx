"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";

type AiMasterStatus = {
  enabled: boolean;
  envLocked: boolean;
};

/**
 * Toggle bas droite : active/désactive l’IA pour ce navigateur (cookie httpOnly).
 * Si `AI_MASTER_ENABLED=false` côté serveur, le toggle est désactivé.
 */
export function AiMasterToggle() {
  const t = useTranslations("aiMasterToggle");
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AiMasterStatus>({
    enabled: true,
    envLocked: false,
  });
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/ai-master", { credentials: "same-origin" });
      if (!res.ok) return;
      const data = (await res.json()) as AiMasterStatus;
      setStatus(data);
    } catch {
      /* keep previous status */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onToggle = async (nextEnabled: boolean) => {
    if (!status || status.envLocked || pending) return;
    setPending(true);
    try {
      const res = await fetch("/api/settings/ai-master", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      const data = await res.json();
      if (res.ok && data && typeof data.enabled === "boolean") {
        setStatus({ enabled: data.enabled, envLocked: false });
        await queryClient.invalidateQueries();
      } else if (res.status === 403) {
        setStatus({ enabled: false, envLocked: true });
      }
    } finally {
      setPending(false);
    }
  };

  const locked = status.envLocked;
  const enabled = status.enabled;

  return (
    <div
      className="fixed bottom-6 right-6 z-[100] flex max-w-[min(100vw-2rem,20rem)] items-center gap-3 rounded-2xl border border-border bg-background/95 px-4 py-3 text-sm shadow-lg backdrop-blur-sm"
      role="group"
      aria-label={t("ariaLabel")}
    >
      <span className="select-none text-muted-foreground">{t("label")}</span>
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
