import { redirect } from "@/i18n/navigation";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { prisma } from "@/lib/prisma";
import { GenreBackfillGlobalBadge } from "@/lib/components/genre-backfill-global-badge";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

/**
 * Authenticated users who have not finished the data-export onboarding
 * are redirected to /dashboard/onboarding (public demo viewers are unaffected).
 */
export default async function DashboardMainLayout({ children, params }: Props) {
  const { locale } = await params;
  const userId = await getCurrentUserId();

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingCompletedAt: true },
    });
    if (!user?.onboardingCompletedAt) {
      redirect({ href: "/dashboard/onboarding", locale });
    }
  }

  return (
    <>
      <GenreBackfillGlobalBadge />
      {children}
    </>
  );
}
