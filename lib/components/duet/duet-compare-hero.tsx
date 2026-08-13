"use client";

import { type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowLeft,
  LineChart,
  ShieldCheck,
  Sparkles,
  Swords,
  Users,
} from "lucide-react";
import { LiveStatusDot } from "@/lib/components/live-status-dot";
import { UserAvatar } from "@/lib/components/user-avatar";

const COMPARE_HOW_IT_WORKS_STEPS = [
  {
    titleKey: "heroStep1Title",
    bodyKey: "heroStep1",
    icon: Users,
    iconClass:
      "border-violet-300/30 bg-gradient-to-br from-violet-500/30 to-violet-400/10 text-violet-100 shadow-[0_0_22px_rgba(139,92,246,0.28)]",
  },
  {
    titleKey: "heroStep2Title",
    bodyKey: "heroStep2",
    icon: LineChart,
    iconClass:
      "border-cyan-300/30 bg-gradient-to-br from-cyan-500/25 to-cyan-400/10 text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.22)]",
  },
  {
    titleKey: "heroStep3Title",
    bodyKey: "heroStep3",
    icon: Swords,
    iconClass:
      "border-pink-300/30 bg-gradient-to-br from-pink-500/25 to-pink-400/10 text-pink-100 shadow-[0_0_22px_rgba(244,114,182,0.22)]",
  },
] as const;

function CompareHowItWorksPanel({ friendsReadyCount }: { friendsReadyCount?: number }) {
  const t = useTranslations("duet.compare");

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-slate-400">
              {t("heroStatBadge")}
            </p>
            <span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-2.5 py-1 text-[0.66rem] font-semibold text-violet-100">
              {t("heroStatTag")}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-white/60">{t("heroTrustPanelHint")}</p>
        </div>
        {friendsReadyCount != null && friendsReadyCount > 0 ? (
          <span className="shrink-0 rounded-full border border-emerald-300/30 bg-emerald-400/12 px-3 py-1.5 text-xs font-semibold text-emerald-100">
            {t("pickerReadyCount", { count: friendsReadyCount })}
          </span>
        ) : null}
      </div>

      <ol className="mt-4 space-y-2.5">
        {COMPARE_HOW_IT_WORKS_STEPS.map(({ titleKey, bodyKey, icon: Icon, iconClass }) => (
          <li
            key={titleKey}
            className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3.5 transition-colors hover:border-white/16 hover:bg-white/[0.07]"
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${iconClass}`}
              aria-hidden
            >
              <Icon className="h-4 w-4" strokeWidth={2.1} />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-semibold text-white">{t(titleKey)}</p>
              <p className="mt-0.5 text-sm leading-5 text-white/65">{t(bodyKey)}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-4 flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3 text-xs leading-5 text-white/55">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300/80" aria-hidden />
        <span>{t("heroPrivacyNote")}</span>
      </p>
    </>
  );
}

const DUET_COMPARE_HERO_SHELL =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 px-5 py-6 text-white shadow-2xl shadow-violet-500/15 sm:px-8 sm:py-9 lg:px-10 lg:py-10";

type BattleHeroProps = {
  mode: "picker" | "battle";
  viewerName: string;
  viewerAvatar?: string | null;
  friendName?: string;
  friendAvatar?: string | null;
  selfTotal?: number;
  friendTotal?: number;
  locale: string;
  friendsReadyCount?: number;
  shareActions?: ReactNode;
};

export function DuetCompareHero({
  mode,
  viewerName,
  viewerAvatar,
  friendName,
  friendAvatar,
  selfTotal = 0,
  friendTotal = 0,
  locale,
  friendsReadyCount,
  shareActions,
}: BattleHeroProps) {
  const t = useTranslations("duet.compare");

  const total = selfTotal + friendTotal;
  const selfPct = total > 0 ? Math.round((selfTotal / total) * 100) : 50;
  const friendPct = total > 0 ? 100 - selfPct : 50;
  const margin = Math.abs(selfTotal - friendTotal);
  const leader =
    selfTotal > friendTotal ? "self" : friendTotal > selfTotal ? "friend" : "tie";

  return (
    <div className={DUET_COMPARE_HERO_SHELL}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.28),transparent_30%),radial-gradient(circle_at_80%_12%,rgba(236,72,153,0.18),transparent_32%),radial-gradient(circle_at_50%_100%,rgba(6,182,212,0.16),transparent_40%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.88)_48%,rgba(88,28,135,0.65))]" />
      <div className="absolute -left-20 top-1/4 h-64 w-64 rounded-full bg-accent-violet/25 blur-3xl" />
      <div className="absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-pink-500/15 blur-3xl" />
      <div className="absolute right-1/4 top-0 h-48 w-48 rounded-full bg-accent-cyan/12 blur-3xl" />

      <div className="relative">
        {mode === "battle" && friendName ? (
          <Link
            href="/dashboard/duet/compare"
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 backdrop-blur transition-colors hover:bg-white/15 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            {t("changeFriend")}
          </Link>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-100 backdrop-blur">
              <LiveStatusDot tone="pink" />
              {t("heroEyebrow")}
            </div>

            <h1 className="flex flex-wrap items-center gap-3 text-3xl font-semibold tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">
              <Swords className="h-9 w-9 shrink-0 text-pink-300/90 sm:h-11 sm:w-11" aria-hidden />
              <span className="max-w-4xl text-balance">
                {mode === "battle" && friendName ? t("heroTitleBattle") : t("heroTitle")}
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
              {mode === "battle" && friendName
                ? t("heroSubtitleBattle", { friendName })
                : t("heroSubtitle")}
            </p>

            {mode === "picker" ? (
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/dashboard/duet/friends"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 transition-all hover:-translate-y-0.5 hover:bg-gray-100"
                >
                  <Sparkles className="h-4 w-4" aria-hidden />
                  {t("goToFriends")}
                </Link>
              </div>
            ) : null}
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-brand-gradient-soft blur-2xl" aria-hidden />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/35 backdrop-blur-xl">
              <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 p-4 sm:p-5">
                {mode === "battle" && friendName ? (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col items-center gap-2 text-center">
                        <UserAvatar name={viewerName} src={viewerAvatar} size="lg" />
                        <p className="max-w-[7rem] truncate text-sm font-semibold text-white">{viewerName}</p>
                        <p className="text-2xl font-bold tabular-nums text-violet-200">
                          {selfTotal.toLocaleString(locale)}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-center gap-1">
                        <span className="rounded-full border border-pink-300/30 bg-pink-400/15 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-pink-100">
                          VS
                        </span>
                        {leader === "tie" ? (
                          <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">
                            {t("scoreboardTie")}
                          </span>
                        ) : (
                          <span className="text-center text-[0.65rem] font-semibold uppercase tracking-wider text-emerald-300">
                            {leader === "self"
                              ? t("scoreboardLeads", { name: viewerName })
                              : t("scoreboardLeads", { name: friendName })}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col items-center gap-2 text-center">
                        <UserAvatar name={friendName} src={friendAvatar} size="lg" />
                        <p className="max-w-[7rem] truncate text-sm font-semibold text-white">{friendName}</p>
                        <p className="text-2xl font-bold tabular-nums text-cyan-200">
                          {friendTotal.toLocaleString(locale)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="bg-gradient-to-r from-violet-500 to-violet-400 transition-all duration-700"
                          style={{ width: `${selfPct}%` }}
                        />
                        <div
                          className="bg-gradient-to-r from-cyan-400 to-cyan-300 transition-all duration-700"
                          style={{ width: `${friendPct}%` }}
                        />
                      </div>
                      {margin > 0 && leader !== "tie" ? (
                        <p className="text-center text-xs text-white/60">
                          {t("scoreboardMargin", { margin: margin.toLocaleString(locale) })}
                        </p>
                      ) : null}
                    </div>

                    {shareActions ? <div className="pt-1">{shareActions}</div> : null}
                  </div>
                ) : (
                  <CompareHowItWorksPanel friendsReadyCount={friendsReadyCount} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
