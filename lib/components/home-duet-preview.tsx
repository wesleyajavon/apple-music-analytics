"use client";

import Image from "next/image";
import { Crown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { LiveStatusDot } from "@/lib/components/live-status-dot";
import {
  HOME_DUET_PREVIEW_ARTIST_IMAGE,
  HOME_DUET_PREVIEW_FRIEND_LISTENS,
  HOME_DUET_PREVIEW_MARGIN,
  HOME_DUET_PREVIEW_SELF_LISTENS,
} from "@/lib/constants/home-interact-preview";

function PreviewAvatar({
  initials,
  tone,
  winner,
}: {
  initials: string;
  tone: "violet" | "cyan";
  winner?: boolean;
}) {
  const toneClasses =
    tone === "violet"
      ? "border-violet-300/35 bg-violet-500/25 text-violet-100"
      : "border-cyan-300/35 bg-cyan-500/20 text-cyan-100";

  return (
    <span className="relative inline-flex">
      <span
        className={`flex h-16 w-16 items-center justify-center rounded-full border text-lg font-bold sm:h-[4.5rem] sm:w-[4.5rem] sm:text-xl ${toneClasses} ${
          winner ? "ring-2 ring-amber-300/70 ring-offset-2 ring-offset-[#080913]" : ""
        }`}
      >
        {initials}
      </span>
      {winner ? (
        <span
          className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-amber-200/40 bg-amber-400 text-[#3b2a08] shadow-[0_8px_18px_-8px_rgba(251,191,36,0.9)]"
          aria-hidden
        >
          <Crown className="h-3.5 w-3.5" strokeWidth={2.4} />
        </span>
      ) : null}
    </span>
  );
}

export function HomeDuetPreview({ className }: { className?: string }) {
  const t = useTranslations("home.duetPreview");
  const locale = useLocale();

  const total = HOME_DUET_PREVIEW_SELF_LISTENS + HOME_DUET_PREVIEW_FRIEND_LISTENS;
  const selfPct = total > 0 ? (HOME_DUET_PREVIEW_SELF_LISTENS / total) * 100 : 50;
  const friendPct = total > 0 ? 100 - selfPct : 50;

  return (
    <div
      className={["relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#080913] p-5 shadow-[0_22px_50px_-18px_rgba(0,0,0,0.85)] sm:p-7 lg:p-8", className]
        .filter(Boolean)
        .join(" ")}
      role="img"
      aria-label={t("label")}
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
      >
        <Image
          src={HOME_DUET_PREVIEW_ARTIST_IMAGE}
          alt=""
          fill
          className="object-cover object-top opacity-[0.16]"
          sizes="(min-width: 1024px) 720px, 100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#080913]/55 via-[#080913]/82 to-[#080913]" />
      </div>
      <div
        className="pointer-events-none absolute -left-16 top-8 h-48 w-48 rounded-full bg-violet-500/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-10 bottom-0 h-52 w-52 rounded-full bg-cyan-400/18 blur-3xl"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 select-none font-black tracking-[-0.08em] text-[6.5rem] text-white/[0.045] sm:text-[8rem]"
        aria-hidden
      >
        VS
      </span>

      <div className="relative flex items-start justify-between gap-3">
        <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-white/55 sm:text-[0.68rem]">
          {t("periodMeta")}
        </p>
        <span className="inline-flex items-center gap-2 rounded-full border border-pink-300/20 bg-pink-400/10 px-2.5 py-1 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-pink-100">
          <LiveStatusDot tone="pink" />
          {t("liveBadge")}
        </span>
      </div>

      <div className="relative mt-6 flex flex-col items-center text-center">
        <div className="relative h-[4.75rem] w-[4.75rem] overflow-hidden rounded-[1.15rem] bg-[#10111c] shadow-[0_22px_50px_-18px_rgba(0,0,0,0.85)] ring-1 ring-white/10 sm:h-20 sm:w-20">
          <Image
            src={HOME_DUET_PREVIEW_ARTIST_IMAGE}
            alt=""
            fill
            className="object-cover"
            sizes="80px"
          />
        </div>
        <p className="mt-3 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-white/70">
          {t("arenaEyebrow")}
        </p>
        <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
          {t("artistName")}
        </p>
      </div>

      <div className="relative mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
        <div className="flex flex-col items-center text-center">
          <PreviewAvatar initials={t("selfInitials")} tone="violet" winner />
          <p className="mt-3 text-sm font-semibold text-violet-100">{t("selfName")}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-white sm:text-4xl">
            {HOME_DUET_PREVIEW_SELF_LISTENS.toLocaleString(locale)}
          </p>
          <p className="mt-0.5 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-white/45">
            {t("playsLabel")}
          </p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <span className="rounded-full border border-pink-300/35 bg-pink-400/15 px-3 py-1.5 text-[0.72rem] font-black uppercase tracking-[0.22em] text-pink-100">
            {t("vsLabel")}
          </span>
          <span className="max-w-[6.5rem] text-center text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-emerald-300">
            {t("leadLabel")}
          </span>
        </div>

        <div className="flex flex-col items-center text-center">
          <PreviewAvatar initials={t("friendInitials")} tone="cyan" />
          <p className="mt-3 truncate text-sm font-semibold text-cyan-100">{t("friendName")}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-white sm:text-4xl">
            {HOME_DUET_PREVIEW_FRIEND_LISTENS.toLocaleString(locale)}
          </p>
          <p className="mt-0.5 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-white/45">
            {t("playsLabel")}
          </p>
        </div>
      </div>

      <div className="relative mt-7 space-y-3">
        <div
          className="flex h-3.5 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10"
          aria-hidden
        >
          <div
            className="bg-gradient-to-r from-violet-500 to-violet-400"
            style={{ width: `${selfPct}%` }}
          />
          <div
            className="bg-gradient-to-r from-cyan-400 to-cyan-300"
            style={{ width: `${friendPct}%` }}
          />
        </div>
        <p className="text-center text-lg font-semibold tracking-tight text-white sm:text-xl">
          {t("winnerHeadline")}
        </p>
        <p className="text-center text-sm text-white/55">
          {t("marginCaption", {
            count: HOME_DUET_PREVIEW_MARGIN.toLocaleString(locale),
          })}
        </p>
      </div>
    </div>
  );
}
