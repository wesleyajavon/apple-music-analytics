"use client";

import { motion } from "motion/react";
import { Disc3, Mic2, Music2, Swords } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  downloadShareCardImage,
  shareCardWithCaption,
  type ShareCardOutcome,
} from "@/lib/utils/share-card/browser-share";

export type DuetArenaMode = "artist" | "track" | "genre";

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
      accent:
        "border-lime-200/90 bg-gradient-to-br from-lime-50/95 via-white to-violet-50/70 hover:border-lime-300 dark:border-lime-400/30 dark:from-lime-950/40 dark:via-slate-950/70 dark:to-violet-950/30",
      iconClass: "text-lime-600 dark:text-lime-300",
    },
    {
      mode: "track" as const,
      icon: Music2,
      title: t("arenaModeTrack"),
      hint: t("arenaModeTrackHint"),
      accent:
        "border-cyan-200/90 bg-gradient-to-br from-cyan-50/95 via-white to-violet-50/70 hover:border-cyan-300 dark:border-cyan-400/30 dark:from-cyan-950/40 dark:via-slate-950/70 dark:to-violet-950/30",
      iconClass: "text-cyan-600 dark:text-cyan-300",
    },
    {
      mode: "genre" as const,
      icon: Disc3,
      title: t("arenaModeGenre"),
      hint: t("arenaModeGenreHint"),
      accent:
        "border-fuchsia-200/90 bg-gradient-to-br from-fuchsia-50/95 via-white to-violet-50/70 hover:border-fuchsia-300 dark:border-fuchsia-400/30 dark:from-fuchsia-950/40 dark:via-slate-950/70 dark:to-violet-950/30",
      iconClass: "text-fuchsia-600 dark:text-fuchsia-300",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-[1.35rem] border border-dashed border-violet-300/70 bg-violet-50/50 px-4 py-4 text-center dark:border-violet-400/25 dark:bg-violet-950/25">
        <p className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-200">
          <Swords className="h-4 w-4" aria-hidden />
          {t("arenaPickTitle")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {t("arenaPickDescription")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option, index) => {
          const Icon = option.icon;
          return (
            <motion.button
              key={option.mode}
              type="button"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.06 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(option.mode)}
              className={`group flex flex-col items-start gap-3 rounded-[1.35rem] border p-5 text-left shadow-sm transition-shadow hover:shadow-md ${option.accent}`}
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-white/80 bg-white/90 shadow-sm dark:border-white/10 dark:bg-white/10 ${option.iconClass}`}
              >
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <span>
                <span className="block text-lg font-bold text-slate-900 dark:text-white">{option.title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {option.hint}
                </span>
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-violet-600 transition-colors group-hover:text-violet-500 dark:text-violet-300">
                {t("arenaPickCta")}
              </span>
            </motion.button>
          );
        })}
      </div>
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
    { value: "genre", label: t("arenaSwitchGenre"), icon: Disc3 },
  ];

  return (
    <div
      role="tablist"
      aria-label={t("arenaToggleLabel")}
      className="inline-flex w-full flex-wrap gap-1 rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1 dark:border-white/10 dark:bg-black/30 sm:w-auto"
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
            className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all sm:flex-none ${
              selected
                ? "bg-white text-violet-800 shadow-sm dark:bg-violet-500/20 dark:text-violet-100"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
