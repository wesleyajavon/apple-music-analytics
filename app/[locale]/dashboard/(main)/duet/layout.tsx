import { redirect } from "@/i18n/navigation";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

export default async function DuetLayout({ children, params }: Props) {
  const { locale } = await params;
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect({ href: "/sign-in?next=/dashboard/duet/friends", locale });
  }
  return children;
}
