import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { prisma } from "@/lib/prisma";
import { SpotifyPlaygroundClient } from "@/lib/components/spotify-playground-client";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "spotifyPlayground" });
  return { title: t("metaTitle") };
}

export default async function SpotifyPlaygroundPage({ params }: Props) {
  const { locale } = await params;
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect({ href: "/", locale });
  }

  const conn = await prisma.spotifyConnection.findFirst({
    where: { userId, revokedAt: null },
    select: { spotifyDisplayName: true },
  });

  return (
    <SpotifyPlaygroundClient
      hasSpotifyConnection={Boolean(conn)}
      spotifyDisplayName={conn?.spotifyDisplayName ?? null}
    />
  );
}
