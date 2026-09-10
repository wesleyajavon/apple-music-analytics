"use client";

import { Mic2, Music2, Swords } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DASHBOARD_LIST_ROW,
  DASHBOARD_LIST_ROW_INTERACTIVE,
  DASHBOARD_LIST_SEPARATOR,
  DASHBOARD_SECTION_EYEBROW,
  DASHBOARD_SECTION_TITLE,
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

export function DuetArenaModePicker({ onSelect }: { onSelect: (mode: DuetArenaMode) => void }) {
  const t = useTranslations("duet.compare");

  const options = [
    {
      mode: "artist" as const,
      icon: Mic2,
      title: t("arenaModeArtist"),
      hint: t("arenaModeArtistHint"),
    },
    {
      mode: "track" as const,
      icon: Music2,
      title: t("arenaModeTrack"),
      hint: t("arenaModeTrackHint"),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className={`${DASHBOARD_SECTION_EYEBROW} flex items-center gap-2`}>
          <Swords className="h-3.5 w-3.5" aria-hidden />
          {t("arenaPickTitle")}
        </p>
        <h2 className={`mt-1 ${DASHBOARD_SECTION_TITLE} text-xl sm:text-2xl`}>
          {t("arenaPickDescription")}
        </h2>
      </div>

      <ul>
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <li key={option.mode}>
              <button
                type="button"
                onClick={() => onSelect(option.mode)}
                className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} ${DASHBOARD_LIST_ROW_INTERACTIVE} w-full`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center text-muted">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-sm font-semibold text-foreground">{option.title}</span>
                  <span className="mt-0.5 block text-[13px] leading-5 text-muted">{option.hint}</span>
                </span>
                <span className="shrink-0 text-[13px] font-medium text-muted">{t("arenaPickCta")}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
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
