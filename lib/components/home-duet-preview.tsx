"use client";

import { useTranslations } from "next-intl";
import { SoundprintLogo } from "@/lib/components/soundprint-logo";

const SELF_LISTENS = 847;
const FRIEND_LISTENS = 612;

const DUAL_CHART_POINTS = [
  { self: 12, friend: 8 },
  { self: 18, friend: 14 },
  { self: 15, friend: 22 },
  { self: 28, friend: 19 },
  { self: 24, friend: 31 },
  { self: 35, friend: 27 },
  { self: 42, friend: 38 },
  { self: 38, friend: 45 },
  { self: 52, friend: 41 },
  { self: 48, friend: 55 },
];

function buildPolyline(points: number[], width: number, height: number, padY = 6) {
  const max = Math.max(...points, 1);
  const step = width / Math.max(points.length - 1, 1);
  return points
    .map((value, index) => {
      const x = index * step;
      const y = height - padY - (value / max) * (height - padY * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

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
      ? "border-violet-300/30 bg-violet-500/25 text-violet-100"
      : "border-cyan-300/30 bg-cyan-500/20 text-cyan-100";

  return (
    <span className="relative inline-flex">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-bold ${toneClasses}`}
      >
        {initials}
      </span>
      {winner ? (
        <span
          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-amber-200/40 bg-amber-400/90 text-[0.55rem]"
          aria-hidden
        >
          ★
        </span>
      ) : null}
    </span>
  );
}

export function HomeDuetPreview() {
  const t = useTranslations("home.duetPreview");

  const total = SELF_LISTENS + FRIEND_LISTENS;
  const selfPct = total > 0 ? (SELF_LISTENS / total) * 100 : 50;
  const friendPct = total > 0 ? 100 - selfPct : 50;

  const signalRows = [
    {
      label: t("signalRows.yourPlays"),
      value: SELF_LISTENS.toLocaleString(),
      accentClassName: "bg-accent-violet",
    },
    {
      label: t("signalRows.friendPlays", { friendName: t("friendName") }),
      value: FRIEND_LISTENS.toLocaleString(),
      accentClassName: "bg-accent-cyan",
    },
    {
      label: t("signalRows.margin"),
      value: t("signalValues.margin"),
      accentClassName: "bg-accent-rose",
    },
  ];

  const arenaModes = [
    { key: "artist", label: t("arenaModes.artist"), active: true },
    { key: "track", label: t("arenaModes.track"), active: false },
    { key: "genre", label: t("arenaModes.genre"), active: false },
  ] as const;

  const workflowSteps = [t("workflow.step1"), t("workflow.step2"), t("workflow.step3")];

  const selfLine = buildPolyline(
    DUAL_CHART_POINTS.map((point) => point.self),
    280,
    72
  );
  const friendLine = buildPolyline(
    DUAL_CHART_POINTS.map((point) => point.friend),
    280,
    72
  );

  return (
    <div id="product" className="relative z-10 scroll-mt-24">
      <div
        className="absolute -inset-6 rounded-[2rem] bg-brand-gradient-soft blur-2xl"
        aria-hidden
      />
      <div className="relative space-y-3 rounded-[2rem] border border-card-border bg-surface-glass p-3 shadow-card backdrop-blur-xl">
        <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950 p-3 shadow-2xl shadow-black/30">
          <div
            className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full bg-accent-violet/25 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-accent-cyan/20 blur-3xl"
            aria-hidden
          />

          <div className="relative flex items-center justify-between border-b border-white/10 px-3 pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
            </div>
            <div className="flex items-center gap-2">
              <SoundprintLogo
                src="/brand/favicon.png"
                showText={false}
                imageClassName="h-6 w-6 object-contain"
              />
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-slate-400">
                {t("label")}
              </p>
            </div>
          </div>

          <div className="relative grid gap-3 p-2 pt-4 sm:grid-cols-[0.88fr_1.12fr]">
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <div
                  className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-accent-violet/20 blur-2xl"
                  aria-hidden
                />
                <div className="relative">
                  <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-violet-200">
                    {t("arenaEyebrow")}
                  </p>
                  <p className="mt-2 text-lg font-semibold leading-snug tracking-tight text-white sm:text-xl">
                    {t("artistName")}
                  </p>
                </div>

                <div className="relative mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-violet-300/20 bg-black/25 p-3">
                    <div className="flex items-center gap-2">
                      <PreviewAvatar initials={t("selfInitials")} tone="violet" winner />
                      <p className="text-xs font-semibold text-violet-100">{t("selfName")}</p>
                    </div>
                    <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-white">
                      {SELF_LISTENS.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl border border-cyan-300/20 bg-black/25 p-3">
                    <div className="flex items-center gap-2">
                      <PreviewAvatar initials={t("friendInitials")} tone="cyan" />
                      <p className="truncate text-xs font-semibold text-cyan-100">
                        {t("friendName")}
                      </p>
                    </div>
                    <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-white">
                      {FRIEND_LISTENS.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="relative mt-3 flex h-3 overflow-hidden rounded-full bg-black/30 ring-1 ring-white/10">
                  <div
                    className="bg-gradient-to-r from-violet-500 to-violet-400"
                    style={{ width: `${selfPct}%` }}
                    aria-hidden
                  />
                  <div
                    className="bg-gradient-to-r from-cyan-400 to-cyan-300"
                    style={{ width: `${friendPct}%` }}
                    aria-hidden
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {t("trendLabel")}
                  </p>
                  <div className="flex items-center gap-3 text-[0.62rem] font-semibold uppercase tracking-[0.14em]">
                    <span className="inline-flex items-center gap-1.5 text-violet-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-400" aria-hidden />
                      {t("selfName")}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-cyan-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" aria-hidden />
                      {t("friendName")}
                    </span>
                  </div>
                </div>
                <svg
                  viewBox="0 0 280 72"
                  className="h-16 w-full sm:h-20"
                  role="img"
                  aria-label={t("trendLabel")}
                >
                  <defs>
                    <linearGradient id="duet-preview-self" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(139 92 246 / 0.35)" />
                      <stop offset="100%" stopColor="rgb(139 92 246 / 0)" />
                    </linearGradient>
                    <linearGradient id="duet-preview-friend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(34 211 238 / 0.28)" />
                      <stop offset="100%" stopColor="rgb(34 211 238 / 0)" />
                    </linearGradient>
                  </defs>
                  <polyline
                    points={`${selfLine} 280,72 0,72`}
                    fill="url(#duet-preview-self)"
                    stroke="none"
                  />
                  <polyline
                    points={`${friendLine} 280,72 0,72`}
                    fill="url(#duet-preview-friend)"
                    stroke="none"
                  />
                  <polyline
                    points={selfLine}
                    fill="none"
                    stroke="rgb(167 139 250)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline
                    points={friendLine}
                    fill="none"
                    stroke="rgb(34 211 238)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {arenaModes.map((mode) => (
                  <div
                    key={mode.key}
                    className={`rounded-2xl border p-2 text-center text-[0.65rem] font-semibold ${
                      mode.active
                        ? "border-violet-300/30 bg-violet-500/15 text-violet-100"
                        : "border-white/10 bg-white/[0.05] text-slate-300"
                    }`}
                  >
                    {mode.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-xs font-semibold text-cyan-200">{t("insightEyebrow")}</p>
              <p className="mt-3 text-xl font-semibold leading-snug tracking-tight text-white sm:text-2xl">
                {t("winnerHeadline")}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-300">{t("insightCopy")}</p>
              <div className="mt-5 grid gap-2">
                {signalRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between rounded-2xl bg-black/20 p-3 ring-1 ring-white/10"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.accentClassName}`}
                        aria-hidden
                      />
                      <span className="truncate text-sm font-medium text-slate-200">
                        {row.label}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-white">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 hidden space-y-3 sm:block">
                {workflowSteps.map((step, index) => (
                  <div
                    key={step}
                    className="flex items-center gap-3 rounded-2xl bg-black/20 p-3 text-sm text-slate-200 ring-1 ring-white/10"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 font-mono text-xs text-cyan-100">
                      0{index + 1}
                    </span>
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
