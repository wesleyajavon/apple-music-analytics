import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { prisma } from "@/lib/prisma";
import { DataExportOnboarding } from "@/lib/components/data-export-onboarding";
import { wantsOnboardingImportReentry } from "@/lib/utils/onboarding-route";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Record<string, string | string[] | undefined>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "onboarding" });
  return { title: t("metaTitle") };
}

export default async function OnboardingPage({
  params,
  searchParams = {},
}: Props) {
  const { locale } = await params;
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect({ href: "/", locale });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { onboardingCompletedAt: true },
  });

  const openImportWizard =
    !user?.onboardingCompletedAt || wantsOnboardingImportReentry(searchParams);

  if (!openImportWizard) {
    redirect({ href: "/dashboard/overview", locale });
  }

  return <DataExportOnboarding />;
}
