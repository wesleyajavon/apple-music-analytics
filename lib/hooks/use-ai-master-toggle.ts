"use client";

import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type AiMasterStatus = {
  enabled: boolean;
  envLocked: boolean;
  consentRequired?: boolean;
};

export const AI_MASTER_QUERY_KEY = ["ai-master-status"] as const;

async function fetchAiMasterStatus(): Promise<AiMasterStatus> {
  const res = await fetch("/api/settings/ai-master", { credentials: "same-origin" });
  if (!res.ok) {
    return { enabled: true, envLocked: false };
  }
  return (await res.json()) as AiMasterStatus;
}

export function useAiMasterToggle() {
  const t = useTranslations("aiMasterToggle");
  const queryClient = useQueryClient();

  const { data: status } = useQuery({
    queryKey: AI_MASTER_QUERY_KEY,
    queryFn: fetchAiMasterStatus,
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: async (nextEnabled: boolean) => {
      const res = await fetch("/api/settings/ai-master", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      const data = (await res.json()) as AiMasterStatus & { error?: string };
      if (res.status === 403) {
        return {
          enabled: false,
          envLocked: data.envLocked === true,
          consentRequired: data.consentRequired === true,
        };
      }
      if (!res.ok || typeof data.enabled !== "boolean") {
        throw new Error(data.error ?? "Failed to update AI setting");
      }
      return { enabled: data.enabled, envLocked: false, consentRequired: data.consentRequired === true };
    },
    onSuccess: (next) => {
      queryClient.setQueryData(AI_MASTER_QUERY_KEY, next);
      void queryClient.invalidateQueries();
    },
  });

  const resolved = status ?? { enabled: false, envLocked: false, consentRequired: false };

  return {
    t,
    enabled: resolved.enabled,
    locked: resolved.envLocked || resolved.consentRequired === true,
    consentRequired: resolved.consentRequired === true,
    pending: mutation.isPending,
    onToggle: (nextEnabled: boolean) => mutation.mutate(nextEnabled),
  };
}
