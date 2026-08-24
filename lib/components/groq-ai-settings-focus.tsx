"use client";

import { useEffect, useRef } from "react";
import { GROQ_AI_CONSENT_SETTINGS_HASH } from "@/lib/constants/groq-ai-settings";

function queryVisibleElement(id: string): HTMLElement | null {
  const nodes = document.querySelectorAll(`#${CSS.escape(id)}`);
  for (const node of nodes) {
    if (node instanceof HTMLElement && node.getClientRects().length > 0) {
      return node;
    }
  }
  return null;
}

/** Opens Preferences (desktop) and scrolls to the Groq consent block when the URL hash matches. */
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
    if (window.location.hash !== `#${GROQ_AI_CONSENT_SETTINGS_HASH}`) return;
    didOpenRef.current = true;
    onOpenPreferences();
  }, [onOpenPreferences]);

  useEffect(() => {
    if (window.location.hash !== `#${GROQ_AI_CONSENT_SETTINGS_HASH}`) return;
    const el = queryVisibleElement(GROQ_AI_CONSENT_SETTINGS_HASH);
    if (!el) return;

    window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [preferencesVisible]);

  return null;
}
