"use client";

import { useEffect, useState } from "react";
import { useDuetFriends } from "@/lib/hooks/use-duet";
import { DUET_PENDING_INCOMING_POLL_MS } from "@/lib/constants/duet-friend-request-notification";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Demandes d'ami entrantes depuis le serveur (Friendship pending incoming).
 * Polling léger pour alimenter le badge du centre de notifications.
 */
export function useDuetPendingIncoming(options?: { enabled?: boolean }) {
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    void createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => setHasSession(!!data.user?.id));
  }, []);

  const enabled = (options?.enabled ?? true) && hasSession === true;

  const { data, isLoading, isFetching } = useDuetFriends({
    enabled,
    refetchInterval: enabled ? DUET_PENDING_INCOMING_POLL_MS : false,
    refetchOnWindowFocus: enabled,
    staleTime: 30_000,
  });

  return {
    pendingIncoming: data?.pendingIncoming ?? [],
    pendingCount: data?.pendingIncoming.length ?? 0,
    isLoading: enabled && (isLoading || hasSession === null),
    isFetching: enabled && isFetching,
  };
}
