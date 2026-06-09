"use client";

import { useEffect } from "react";
import { GROQ_AI_CONSENT_SETTINGS_HASH } from "@/lib/constants/groq-ai-settings";

/** Opens mobile disclosures and scrolls to the Groq consent block when the URL hash matches. */
export function GroqAiSettingsFocus() {
  useEffect(() => {
    if (window.location.hash !== `#${GROQ_AI_CONSENT_SETTINGS_HASH}`) return;

    const el = document.getElementById(GROQ_AI_CONSENT_SETTINGS_HASH);
    if (!el) return;

    const details = el.closest("details");
    if (details && !details.open) {
      details.open = true;
    }

    window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  return null;
}
