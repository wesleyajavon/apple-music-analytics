import { headers } from "next/headers";
import { redirect } from "@/i18n/navigation";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { isActivePublicProfileUserId } from "@/lib/services/user/public-profile-access";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

function readUserIdFromRequestUrl(headerList: Headers): string | null {
  const rawUrl = headerList.get("x-url");
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl).searchParams.get("userId");
  } catch {
    return null;
  }
}

export default async function DuetLayout({ children, params }: Props) {
  const { locale } = await params;
  const userId = await getCurrentUserId();
  if (!userId) {
    const headerList = await headers();
    const demoUserId = readUserIdFromRequestUrl(headerList);
    const allowPublicDemo = demoUserId ? await isActivePublicProfileUserId(demoUserId) : false;
    if (!allowPublicDemo) {
      redirect({ href: "/sign-in?next=/dashboard/duet/friends", locale });
    }
  }
  return children;
}
