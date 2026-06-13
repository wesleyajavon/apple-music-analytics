"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Swords, UserPlus, Users } from "lucide-react";

const DUET_FRIENDS_HERO_SHELL =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 px-5 py-6 text-white shadow-2xl shadow-violet-500/15 sm:px-8 sm:py-9 lg:px-10 lg:py-10";

type DuetFriendsHeroProps = {
  friendsCount: number;
  pendingIncomingCount: number;
  pendingOutgoingCount: number;
  locale: string;
};

export function DuetFriendsHero({
  friendsCount,
  pendingIncomingCount,
  pendingOutgoingCount,
  locale,
}: DuetFriendsHeroProps) {
  const t = useTranslations("duet.friends");

  return (
    <div className={DUET_FRIENDS_HERO_SHELL}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.22),transparent_30%),radial-gradient(circle_at_80%_12%,rgba(139,92,246,0.24),transparent_32%),radial-gradient(circle_at_50%_100%,rgba(132,204,22,0.12),transparent_40%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(8,47,73,0.88)_48%,rgba(30,27,75,0.72))]" />
      <div className="absolute -left-20 top-1/4 h-64 w-64 rounded-full bg-accent-cyan/20 blur-3xl" />
      <div className="absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-accent-violet/18 blur-3xl" />

      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center">
        <div>
          <h1 className="flex flex-wrap items-center gap-3 text-3xl font-semibold tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">
            <Users className="h-9 w-9 shrink-0 text-cyan-200/90 sm:h-11 sm:w-11" aria-hidden />
            <span className="max-w-4xl text-balance">{t("heroTitle")}</span>
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">{t("heroSubtitle")}</p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {friendsCount > 0 ? (
              <Link
                href="/dashboard/duet/compare"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 transition-all hover:-translate-y-0.5 hover:bg-gray-100"
              >
                <Swords className="h-4 w-4" aria-hidden />
                {t("ctaCompare")}
              </Link>
            ) : null}
            <span className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 backdrop-blur">
              <UserPlus className="h-4 w-4" aria-hidden />
              {t("heroStatTag")}
            </span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-[2rem] bg-brand-gradient-soft blur-2xl" aria-hidden />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/35 backdrop-blur-xl">
            <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 p-4 sm:p-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <p className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  {t("heroStatBadge")}
                </p>
                <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-[0.66rem] font-semibold text-cyan-100">
                  {t("heroStatTag")}
                </span>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                  <p className="text-xl font-semibold tabular-nums tracking-tight text-white">
                    {friendsCount.toLocaleString(locale)}
                  </p>
                  <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {t("heroFriendsCount")}
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3">
                  <p className="text-xl font-semibold tabular-nums tracking-tight text-amber-100">
                    {pendingIncomingCount.toLocaleString(locale)}
                  </p>
                  <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-amber-200/70">
                    {t("heroPendingIncoming")}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                  <p className="text-xl font-semibold tabular-nums tracking-tight text-white">
                    {pendingOutgoingCount.toLocaleString(locale)}
                  </p>
                  <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {t("heroPendingOutgoing")}
                  </p>
                </div>
              </div>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-white/75">
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.55)]" aria-hidden />
                  <span>{t("heroTrust1")}</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.55)]" aria-hidden />
                  <span>{t("heroTrust2")}</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lime-400 shadow-[0_0_10px_rgba(190,242,100,0.45)]" aria-hidden />
                  <span>{t("heroTrust3")}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
