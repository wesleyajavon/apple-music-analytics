"use client";

import { useTranslations } from "next-intl";
import { Crown, Swords } from "lucide-react";
import { EmptyState } from "@/lib/components/empty-state";
import { ErrorState } from "@/lib/components/error-state";
import {
  DASHBOARD_SPOTLIGHT_SHELL,
  DASHBOARD_SPOTLIGHT_GRADIENT_LIME,
  DASHBOARD_SPOTLIGHT_HAIRLINE_LIME,
  DASHBOARD_SPOTLIGHT_INNER_WELL,
  DASHBOARD_SPOTLIGHT_MUTED,
  DASHBOARD_SPOTLIGHT_BADGE_LIME,
  DASHBOARD_SPOTLIGHT_BADGE_DOT_LIME,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
} from "@/lib/constants/dashboard-spotlight";
import type { CompareSharedArtistsResponse } from "@/lib/dto/duet";

type DuetSharedArtistsPanelProps = {
  friendName: string;
  data?: CompareSharedArtistsResponse;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  onSelectArtist: (artistId: string, artistName: string) => void;
};

function SharedArtistsHeader({
  eyebrow,
  title,
  description,
  badge,
  totalLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
  totalLabel?: string;
}) {
  return (
    <div className={`relative px-5 pb-5 pt-6 sm:px-8 ${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">{title}</h2>
          <p className={`mt-2 max-w-2xl text-sm leading-6 ${DASHBOARD_SPOTLIGHT_MUTED}`}>{description}</p>
          {totalLabel ? (
            <p className={`mt-2 text-xs font-semibold uppercase tracking-[0.14em] ${DASHBOARD_SPOTLIGHT_MUTED}`}>
              {totalLabel}
            </p>
          ) : null}
        </div>
        <span className={DASHBOARD_SPOTLIGHT_BADGE_LIME}>
          <span className={DASHBOARD_SPOTLIGHT_BADGE_DOT_LIME} aria-hidden />
          {badge}
        </span>
      </div>
    </div>
  );
}

export function DuetSharedArtistsPanel({
  friendName,
  data,
  isLoading,
  error,
  onRetry,
  onSelectArtist,
}: DuetSharedArtistsPanelProps) {
  const t = useTranslations("duet.compare");

  return (
    <section className={DASHBOARD_SPOTLIGHT_SHELL}>
      <div className={DASHBOARD_SPOTLIGHT_GRADIENT_LIME} />
      <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_LIME} />
      <SharedArtistsHeader
        eyebrow={t("sharedArtistsEyebrow")}
        title={t("sharedArtistsTitle", { friendName })}
        description={t("sharedArtistsDescription")}
        badge={t("sharedArtistsBadge")}
        totalLabel={
          data && data.totalShared > 0
            ? t("sharedArtistsTotal", { count: data.totalShared })
            : undefined
        }
      />
      <div className="px-5 pb-6 sm:px-8">
        {isLoading ? (
          <p className={`text-sm ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("sharedArtistsLoading")}</p>
        ) : error ? (
          <ErrorState variant="startup" error={error} message={t("sharedArtistsError")} onRetry={onRetry} />
        ) : !data?.artists.length ? (
          <EmptyState
            variant="startup"
            message={t("sharedArtistsEmptyTitle")}
            description={t("sharedArtistsEmptyDescription")}
          />
        ) : (
          <ul className={`space-y-2 ${DASHBOARD_SPOTLIGHT_INNER_WELL} p-3 sm:p-4`}>
            {data.artists.map((artist) => (
              <li key={artist.artistId}>
                <button
                  type="button"
                  onClick={() => onSelectArtist(artist.artistId, artist.artistName)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-3 text-left transition-all hover:border-lime-300/70 hover:bg-lime-50/50 hover:shadow-sm dark:border-white/10 dark:bg-slate-950/40 dark:hover:border-lime-400/30 dark:hover:bg-lime-400/5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">{artist.artistName}</p>
                    <p className={`mt-1 text-xs ${DASHBOARD_SPOTLIGHT_MUTED}`}>
                      {t("sharedArtistsCounts", {
                        self: artist.selfCount,
                        friend: artist.friendCount,
                        friendName,
                      })}
                    </p>
                    <p className={`mt-0.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] ${DASHBOARD_SPOTLIGHT_MUTED}`}>
                      {t("sharedArtistsRanks", {
                        selfRank: artist.selfRank,
                        friendRank: artist.friendRank,
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {artist.winner === "self" ? (
                      <Crown className="h-4 w-4 text-lime-600 dark:text-lime-300" aria-hidden />
                    ) : artist.winner === "friend" ? (
                      <Crown className="h-4 w-4 text-cyan-500 dark:text-cyan-300" aria-hidden />
                    ) : null}
                    <span className="inline-flex items-center gap-1 rounded-full border border-lime-200/80 bg-lime-50 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-widest text-lime-700 opacity-0 transition-opacity group-hover:opacity-100 dark:border-lime-400/25 dark:bg-lime-400/10 dark:text-lime-200">
                      <Swords className="h-3 w-3" aria-hidden />
                      {t("sharedArtistsDuelCta")}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
