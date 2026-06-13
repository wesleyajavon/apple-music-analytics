"use client";

import Image from "next/image";

const WAVE_BARS = [34, 62, 48, 78, 56, 92, 66, 44, 72, 58, 84, 52];

const NAV_ITEMS = [
  { label: "Your Music", active: true },
  { label: "Profil musical", active: false },
  { label: "Genres", active: false },
  { label: "AI Insights", active: false },
] as const;

const STATS = [
  { label: "Écoutes", value: "18 420", accent: "from-[#f04068] to-[#9850d0]", delta: "+12%" },
  { label: "Artistes", value: "842", accent: "from-[#9850d0] to-[#706fe0]", delta: "+8%" },
  { label: "Titres", value: "3 241", accent: "from-[#706fe0] to-[#4f90e0]", delta: "+5%" },
  { label: "Temps", value: "124 h", accent: "from-[#4f90e0] to-[#16c784]", delta: "+31%" },
] as const;

const TOP_ARTISTS = [
  { name: "Bon Iver", color: "from-[#f04068] to-[#9850d0]" },
  { name: "Radiohead", color: "from-[#706fe0] to-[#4f90e0]" },
  { name: "Frank Ocean", color: "from-[#4f90e0] to-[#16c784]" },
] as const;

function MiniAreaChart() {
  return (
    <svg viewBox="0 0 240 80" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="sp-chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9850d0" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#4f90e0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sp-chart-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f04068" />
          <stop offset="50%" stopColor="#9850d0" />
          <stop offset="100%" stopColor="#4f90e0" />
        </linearGradient>
      </defs>
      <path
        d="M0 58 L20 52 L40 56 L60 38 L80 44 L100 28 L120 34 L140 22 L160 30 L180 18 L200 26 L220 14 L240 20 L240 80 L0 80 Z"
        fill="url(#sp-chart-fill)"
        className="sp-preview-chart-fill"
      />
      <path
        d="M0 58 L20 52 L40 56 L60 38 L80 44 L100 28 L120 34 L140 22 L160 30 L180 18 L200 26 L220 14 L240 20"
        fill="none"
        stroke="url(#sp-chart-line)"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="sp-preview-chart-line"
      />
      <style>{`
        .sp-preview-chart-line {
          stroke-dasharray: 320;
          stroke-dashoffset: 320;
          animation: sp-preview-draw 2.4s ease-out forwards, sp-preview-pulse 3s ease-in-out 2.4s infinite;
        }
        .sp-preview-chart-fill {
          opacity: 0;
          animation: sp-preview-fade-in 1.2s ease-out 1.4s forwards;
        }
        @keyframes sp-preview-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes sp-preview-fade-in {
          to { opacity: 1; }
        }
        @keyframes sp-preview-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.72; }
        }
      `}</style>
    </svg>
  );
}

/**
 * Miniature animée du dashboard Soundprint-AI — utilisée sur l'écran 3D du hero.
 */
export function SoundprintScreenPreview() {
  return (
    <div
      className="flex h-full w-full overflow-hidden rounded-[10px] bg-[#06070d] text-[#f7f3ff] shadow-inner"
      style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
    >
      <style>{`
        @keyframes sp-preview-bar {
          0%, 100% { transform: scaleY(0.72); }
          50% { transform: scaleY(1.18); }
        }
        .sp-preview-bar {
          transform-origin: bottom;
          animation: sp-preview-bar 1.6s ease-in-out infinite;
        }
      `}</style>
      {/* Sidebar */}
      <aside className="flex w-[72px] shrink-0 flex-col border-r border-[#28213c]/80 bg-[#090a12] px-2 py-3">
        <div className="mb-4 flex flex-col items-center gap-1">
          <Image
            src="/brand/favicon.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
          />
          <span className="text-[0.45rem] font-bold uppercase tracking-[0.12em] text-[#b06cff]">AI</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.label}
              className={`rounded-lg px-1.5 py-1.5 text-center text-[0.42rem] font-semibold leading-snug ${
                item.active
                  ? "bg-[#151827] text-[#f7f3ff] ring-1 ring-[#9850d0]/30"
                  : "text-[#a59ab8]"
              }`}
            >
              {item.label}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="relative min-w-0 flex-1 overflow-hidden bg-[#080913]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgb(240_64_104_/_0.12),transparent_40%),radial-gradient(circle_at_bottom_right,rgb(79_144_224_/_0.1),transparent_38%)]"
          aria-hidden
        />

        <div className="relative flex h-full flex-col gap-2 p-2.5">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[0.42rem] font-semibold uppercase tracking-[0.18em] text-[#b06cff]">
                Dashboard
              </p>
              <h2 className="text-[0.72rem] font-semibold tracking-[-0.03em] text-white">
                Your Music
              </h2>
            </div>
            <span className="rounded-full border border-[#4a376e]/50 bg-[#151827] px-2 py-0.5 text-[0.4rem] font-semibold text-[#a59ab8]">
              30 jours
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-1">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="relative overflow-hidden rounded-lg border border-white/[0.06] bg-[#151827]/90 p-1.5"
              >
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-br ${stat.accent} opacity-25`}
                  aria-hidden
                />
                <p className="relative text-[0.38rem] font-medium text-[#a59ab8]">{stat.label}</p>
                <p className="relative mt-0.5 text-[0.62rem] font-semibold tracking-tight text-white">
                  {stat.value}
                </p>
                <p className="relative mt-0.5 text-[0.36rem] font-semibold text-[#16c784]">{stat.delta}</p>
              </div>
            ))}
          </div>

          {/* Chart + artists */}
          <div className="grid min-h-0 flex-1 grid-cols-[1.15fr_0.85fr] gap-1.5">
            <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-white/[0.06] bg-[#0c0e18]/90 p-1.5">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[0.4rem] font-semibold uppercase tracking-[0.14em] text-[#a59ab8]">
                  Timeline
                </p>
                <span className="text-[0.38rem] font-semibold text-[#4f90e0]">+31%</span>
              </div>
              <div className="min-h-0 flex-1">
                <MiniAreaChart />
              </div>
              <div className="mt-1 flex h-7 items-end gap-0.5">
                {WAVE_BARS.slice(0, 8).map((height, index) => (
                  <div
                    key={index}
                    className="sp-preview-bar flex-1 rounded-full bg-gradient-to-t from-[#9850d0] via-[#4f90e0] to-white/80"
                    style={{
                      height: `${height * 0.28}px`,
                      animationDelay: `${index * 0.14}s`,
                    }}
                    aria-hidden
                  />
                ))}
              </div>
            </div>

            <div className="flex min-h-0 flex-col gap-1.5">
              <div className="flex-1 rounded-lg border border-white/[0.06] bg-[#0c0e18]/90 p-1.5">
                <p className="text-[0.4rem] font-semibold uppercase tracking-[0.14em] text-[#a59ab8]">
                  Top artistes
                </p>
                <div className="mt-1.5 space-y-1">
                  {TOP_ARTISTS.map((artist, i) => (
                    <div key={artist.name} className="flex items-center gap-1.5">
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${artist.color} text-[0.38rem] font-bold text-white shadow-sm`}
                      >
                        {i + 1}
                      </div>
                      <span className="truncate text-[0.42rem] font-medium text-[#f7f3ff]">
                        {artist.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-[#0c0e18]/90 p-1.5">
                <p className="text-[0.4rem] font-semibold uppercase tracking-[0.14em] text-[#a59ab8]">
                  Genres
                </p>
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {["Indie", "Alt", "R&B"].map((genre) => (
                    <span
                      key={genre}
                      className="rounded-md border border-white/[0.08] bg-[#151827] px-1 py-0.5 text-[0.36rem] font-semibold text-[#a59ab8]"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
