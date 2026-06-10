import { redirect } from "@/i18n/navigation";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { DuetAcceptClient } from "@/lib/components/duet/duet-accept-client";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
};

export const dynamic = "force-dynamic";

export default async function DuetAcceptPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { token } = await searchParams;

  if (!token?.trim()) {
    redirect({ href: "/dashboard/duet/friends", locale });
  }

  const safeToken = token!.trim();
  const userId = await getCurrentUserId();
  if (!userId) {
    const next = `/duet/accept?token=${encodeURIComponent(safeToken)}`;
    redirect({ href: `/sign-in?next=${encodeURIComponent(next)}`, locale });
  }

  return <DuetAcceptClient token={safeToken} />;
}
