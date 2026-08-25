"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  NOTIFICATION_CENTER_MAX_ITEMS,
  NOTIFICATION_CENTER_STORAGE_KEY,
  NOTIFICATION_SOURCE_DEDUPE_MS,
} from "@/lib/constants/notification-storage";
import { removeDuplicateSourcesWithinWindow } from "@/lib/utils/notification-dedupe";

export type NotificationSeverity = "info" | "success" | "warning" | "error";

export type NotificationItem = {
  id: string;
  title: string;
  body?: string;
  createdAt: string;
  read: boolean;
  severity?: NotificationSeverity;
  href?: string;
  source?: string;
  /** Réaffichage correct des traductions après persistance (notif Groq). */
  genreGroqNudge?: {
    pct: number;
    count: number;
  };
  /** Injecté depuis GET /api/duet/friends — non persisté en localStorage. */
  duetFriendRequest?: {
    friendshipId: string;
    requesterName: string;
  };
  /** Réaffichage correct des traductions après persistance (import). */
  importComplete?: {
    count: number;
  };
  /** Réaffichage correct des traductions après persistance (backfill Groq). */
  genreBackfillResult?: {
    jobId: string;
    status: "completed" | "failed";
  };
};

export type AddNotificationInput = {
  title: string;
  body?: string;
  severity?: NotificationSeverity;
  href?: string;
  source?: string;
  genreGroqNudge?: {
    pct: number;
    count: number;
  };
  importComplete?: {
    count: number;
  };
  genreBackfillResult?: {
    jobId: string;
    status: "completed" | "failed";
  };
};

function isNotificationItem(x: unknown): x is NotificationItem {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.title !== "string" ||
    typeof o.createdAt !== "string" ||
    typeof o.read !== "boolean"
  ) {
    return false;
  }
  if (o.genreGroqNudge !== undefined) {
    const g = o.genreGroqNudge;
    if (g === null || typeof g !== "object") return false;
    const gx = g as Record<string, unknown>;
    if (typeof gx.pct !== "number" || typeof gx.count !== "number") return false;
  }
  if (o.duetFriendRequest !== undefined) {
    const d = o.duetFriendRequest;
    if (d === null || typeof d !== "object") return false;
    const dx = d as Record<string, unknown>;
    if (typeof dx.friendshipId !== "string" || typeof dx.requesterName !== "string") return false;
  }
  if (o.importComplete !== undefined) {
    const ic = o.importComplete;
    if (ic === null || typeof ic !== "object") return false;
    if (typeof (ic as Record<string, unknown>).count !== "number") return false;
  }
  if (o.genreBackfillResult !== undefined) {
    const g = o.genreBackfillResult;
    if (g === null || typeof g !== "object") return false;
    const gx = g as Record<string, unknown>;
    if (typeof gx.jobId !== "string") return false;
    if (gx.status !== "completed" && gx.status !== "failed") return false;
  }
  return true;
}

function readStored(): NotificationItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_CENTER_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter(isNotificationItem).slice(0, NOTIFICATION_CENTER_MAX_ITEMS);
  } catch {
    return [];
  }
}

function sortByNewest(items: NotificationItem[]): NotificationItem[] {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

type NotificationCenterContextValue = {
  items: NotificationItem[];
  unreadCount: number;
  hydrated: boolean;
  addNotification: (input: AddNotificationInput) => void;
  markRead: (id: string) => void;
  markReadBySource: (source: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
};

const NotificationCenterContext = createContext<NotificationCenterContextValue | null>(null);

export function NotificationCenterProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(sortByNewest(readStored()));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(NOTIFICATION_CENTER_STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* quota or private mode */
    }
  }, [items, hydrated]);

  const addNotification = useCallback((input: AddNotificationInput) => {
    const item: NotificationItem = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title: input.title,
      body: input.body,
      severity: input.severity ?? "info",
      href: input.href,
      source: input.source,
      ...(input.genreGroqNudge !== undefined
        ? { genreGroqNudge: input.genreGroqNudge }
        : {}),
      ...(input.importComplete !== undefined
        ? { importComplete: input.importComplete }
        : {}),
      ...(input.genreBackfillResult !== undefined
        ? { genreBackfillResult: input.genreBackfillResult }
        : {}),
      createdAt: new Date().toISOString(),
      read: false,
    };
    const nowMs = Date.now();
    setItems((prev) => {
      const withoutRecentDup =
        input.source != null && input.source !== ""
          ? removeDuplicateSourcesWithinWindow(
              prev,
              input.source,
              nowMs,
              NOTIFICATION_SOURCE_DEDUPE_MS
            )
          : prev;
      const withoutServerDuet =
        input.source != null && input.source.startsWith("duet-friend-request:")
          ? withoutRecentDup.filter((n) => !n.source?.startsWith("duet-friend-request:"))
          : withoutRecentDup;
      return sortByNewest([item, ...withoutServerDuet]).slice(0, NOTIFICATION_CENTER_MAX_ITEMS);
    });
  }, []);

  const markRead = useCallback((id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markReadBySource = useCallback((source: string) => {
    setItems((prev) =>
      prev.map((n) => (n.source === source ? { ...n, read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
  }, []);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const value = useMemo(
    () => ({
      items,
      hydrated,
      unreadCount,
      addNotification,
      markRead,
      markReadBySource,
      markAllRead,
      clearAll,
    }),
    [
      items,
      hydrated,
      unreadCount,
      addNotification,
      markRead,
      markReadBySource,
      markAllRead,
      clearAll,
    ]
  );

  return (
    <NotificationCenterContext.Provider value={value}>{children}</NotificationCenterContext.Provider>
  );
}

export function useNotifications(): NotificationCenterContextValue {
  const ctx = useContext(NotificationCenterContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationCenterProvider");
  }
  return ctx;
}

/** Hors provider (ex. tests) : pas d’inbox partagée. */
export function useNotificationsSafe(): NotificationCenterContextValue | null {
  return useContext(NotificationCenterContext);
}
