"use client";

import { useEffect, useMemo, useState } from "react";
import type { MusicChatMessage } from "@/lib/dto/music-chat";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Short answers type slowly; long ones catch up so the reveal stays under ~4s. */
export function getAssistantRevealDurationMs(length: number): number {
  if (length <= 0) return 0;
  return Math.min(3800, Math.max(550, Math.round(length * 3.2)));
}

function assistantRevealKey(messages: MusicChatMessage[]): string {
  const last = messages[messages.length - 1];
  if (last?.role !== "assistant" || !last.content) return "";
  return `${messages.length}:${last.content}`;
}

export function useAssistantMessageReveal(messages: MusicChatMessage[]): {
  displayMessages: MusicChatMessage[];
  isRevealing: boolean;
} {
  const revealKey = assistantRevealKey(messages);
  const [activeKey, setActiveKey] = useState(revealKey);
  const [revealedUnits, setRevealedUnits] = useState(0);

  useEffect(() => {
    if (!revealKey) {
      setActiveKey("");
      setRevealedUnits(0);
      return;
    }

    const units = Array.from(revealKey.slice(revealKey.indexOf(":") + 1));

    if (prefersReducedMotion()) {
      setActiveKey(revealKey);
      setRevealedUnits(units.length);
      return;
    }

    setActiveKey(revealKey);
    setRevealedUnits(0);
    const duration = getAssistantRevealDurationMs(units.length);
    const started = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, duration === 0 ? 1 : (now - started) / duration);
      const eased = 1 - (1 - t) * (1 - t);
      setRevealedUnits(Math.floor(eased * units.length));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [revealKey]);

  return useMemo(() => {
    const lastIndex = messages.length - 1;
    const last = messages[lastIndex];
    const isLatestAssistant = last?.role === "assistant" && Boolean(revealKey);
    const visibleUnits = !isLatestAssistant
      ? 0
      : revealKey !== activeKey
        ? 0
        : revealedUnits;
    const fullUnits = last?.role === "assistant" ? Array.from(last.content) : [];
    const isRevealing = isLatestAssistant && visibleUnits < fullUnits.length;

    const displayMessages = messages.map((message, index) => {
      if (index !== lastIndex || message.role !== "assistant") return message;
      return { ...message, content: fullUnits.slice(0, visibleUnits).join("") };
    });

    return { displayMessages, isRevealing };
  }, [messages, revealKey, activeKey, revealedUnits]);
}
