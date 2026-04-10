import { redirect } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function DashboardPage({
  params,
  searchParams = {},
}: Props) {
  const { locale } = await params;
  const q = new URLSearchParams();
  for (const [key, val] of Object.entries(searchParams)) {
    if (val === undefined) continue;
    if (Array.isArray(val)) {
      for (const v of val) q.append(key, v);
    } else {
      q.append(key, val);
    }
  }
  const qs = q.toString();
  redirect({
    href: qs ? `/dashboard/overview?${qs}` : "/dashboard/overview",
    locale,
  });
}

