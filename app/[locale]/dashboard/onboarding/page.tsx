import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { prisma } from "@/lib/prisma";
import { DataExportOnboarding } from "@/lib/components/data-export-onboarding";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "onboarding" });
  return { title: t("metaTitle") };
}

export default async function OnboardingPage({ params }: Props) {
  const { locale } = await params;
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect({ href: "/", locale });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { onboardingCompletedAt: true },
  });

  if (user?.onboardingCompletedAt) {
    redirect({ href: "/dashboard/overview", locale });
  }

  return <DataExportOnboarding />;
}
