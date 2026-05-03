"use client";

import { useEffect, useMemo, useState } from "react";
import { getPublicProfileUserId } from "@/lib/constants/public-profile";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function usePublicDemoViewer(userId?: string | null): boolean {
  const publicProfileUserId = useMemo(() => getPublicProfileUserId(), []);
  const [authUserId, setAuthUserId] = useState<string | null | undefined>(
    undefined
  );

  useEffect(() => {
    let mounted = true;
    const supabase = createSupabaseBrowserClient();

    async function loadAuthUser() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setAuthUserId(data.user?.id ?? null);
    }

    loadAuthUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setAuthUserId(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return authUserId === null && !!publicProfileUserId && userId === publicProfileUserId;
}
