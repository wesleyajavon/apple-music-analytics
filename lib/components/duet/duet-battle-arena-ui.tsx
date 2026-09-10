"use client";

import { Mic2, Music2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DASHBOARD_SEGMENTED_PILL,
  DASHBOARD_SEGMENTED_PILL_ACTIVE,
  DASHBOARD_SEGMENTED_TRACK,
} from "@/lib/components/dashboard-ui";
import {
  downloadShareCardImage,
  shareCardWithCaption,
  type ShareCardOutcome,
} from "@/lib/utils/share-card/browser-share";

export type DuetArenaMode = "artist" | "track";

/** @deprecated Use ShareCardOutcome from lib/utils/share-card/browser-share */
export type DuetBattleShareOutcome = ShareCardOutcome;

const SHARE_IMAGE_FILENAME = "soundprint-duel.png";

export function downloadDuetBattleImage(imageBlob: Blob): void {
  downloadShareCardImage(imageBlob, SHARE_IMAGE_FILENAME);
}

export async function shareDuetBattleResult(
  text: string,
  imageBlob?: Blob
): Promise<DuetBattleShareOutcome> {
  return shareCardWithCaption(text, imageBlob, SHARE_IMAGE_FILENAME);
}

export function DuetArenaModeToggle({
  mode,
  onChange,
}: {
  mode: DuetArenaMode;
  onChange: (mode: DuetArenaMode) => void;
}) {
  const t = useTranslations("duet.compare");

  const segments: { value: DuetArenaMode; label: string; icon: typeof Mic2 }[] = [
    { value: "artist", label: t("arenaSwitchArtist"), icon: Mic2 },
    { value: "track", label: t("arenaSwitchTrack"), icon: Music2 },
  ];

  return (
    <div
      role="tablist"
      aria-label={t("arenaToggleLabel")}
      className={`${DASHBOARD_SEGMENTED_TRACK} w-full sm:w-auto`}
    >
      {segments.map((segment) => {
        const Icon = segment.icon;
        const selected = mode === segment.value;
        return (
          <button
            key={segment.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(segment.value)}
            className={`${selected ? DASHBOARD_SEGMENTED_PILL_ACTIVE : DASHBOARD_SEGMENTED_PILL} flex-1 gap-2 sm:flex-none`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
