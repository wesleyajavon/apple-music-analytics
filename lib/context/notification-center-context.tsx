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
      return sortByNewest([item, ...withoutRecentDup]).slice(0, NOTIFICATION_CENTER_MAX_ITEMS);
    });
  }, []);

  const markRead = useCallback((id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
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
      markAllRead,
      clearAll,
    }),
    [items, hydrated, unreadCount, addNotification, markRead, markAllRead, clearAll]
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
