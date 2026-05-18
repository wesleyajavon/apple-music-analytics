import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { prisma } from "@/lib/prisma";
import { SpotifyPartialSyncPreviewClient } from "@/lib/components/spotify-partial-sync-preview-client";
import { DASHBOARD_ONBOARDING_REIMPORT_PATH } from "@/lib/utils/onboarding-route";

/**
 * Outside `dashboard/(main)` on purpose: available whenever the user has linked Spotify,
 * whether or not data-export onboarding is marked complete (unlike most dashboard pages).
 */
type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "partialSyncPreview" });
  return { title: t("metaTitle") };
}

export default async function SpotifySnapshotPage({ params }: Props) {
  const { locale } = await params;
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect({ href: "/", locale });
  }

  const conn = await prisma.spotifyConnection.findFirst({
    where: { userId, revokedAt: null },
    select: { spotifyDisplayName: true },
  });

  if (conn) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <SpotifyPartialSyncPreviewClient spotifyDisplayName={conn.spotifyDisplayName} />
      </div>
    );
  }

  redirect({ href: DASHBOARD_ONBOARDING_REIMPORT_PATH, locale });
}
