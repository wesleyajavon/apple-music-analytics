"use client";

import { useEffect, useRef } from "react";
import { DUET_SHARE_SETTINGS_HASH } from "@/lib/constants/duet-settings";
import { GROQ_AI_CONSENT_SETTINGS_HASH } from "@/lib/constants/groq-ai-settings";

const PREFERENCES_HASHES = new Set([GROQ_AI_CONSENT_SETTINGS_HASH, DUET_SHARE_SETTINGS_HASH]);

function hashTargetId(): string | null {
  const hash = window.location.hash.replace(/^#/, "");
  return PREFERENCES_HASHES.has(hash) ? hash : null;
}

function queryVisibleElement(id: string): HTMLElement | null {
  const nodes = document.querySelectorAll(`#${CSS.escape(id)}`);
  for (const node of nodes) {
    if (node instanceof HTMLElement && node.getClientRects().length > 0) {
      return node;
    }
  }
  return null;
}

/** Opens Preferences (desktop) and scrolls to Groq or Duet sharing when the URL hash matches. */
export function GroqAiSettingsFocus({
  preferencesVisible,
  onOpenPreferences,
}: {
  preferencesVisible: boolean;
  onOpenPreferences: () => void;
}) {
  const didOpenRef = useRef(false);

  useEffect(() => {
    if (didOpenRef.current) return;
    if (!hashTargetId()) return;
    didOpenRef.current = true;
    onOpenPreferences();
  }, [onOpenPreferences]);

  useEffect(() => {
    const id = hashTargetId();
    if (!id) return;
    const el = queryVisibleElement(id);
    if (!el) return;

    window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [preferencesVisible]);

  return null;
}
