import { redirect } from "@/i18n/navigation";
import { DashboardScrollWrapper } from "@/lib/components/dashboard-scroll-wrapper";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { hasTermsConsent } from "@/lib/services/user/has-terms-consent";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children, params }: Props) {
  const { locale } = await params;
  const userId = await getCurrentUserId();

  if (userId && !(await hasTermsConsent(userId))) {
    redirect({ href: "/accept-terms", locale });
  }

  return <DashboardScrollWrapper>{children}</DashboardScrollWrapper>;
}
