import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getGdprContactEmail } from "@/lib/constants/gdpr-contact";
import { AccountSettingsClient } from "./account-settings-client";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "settings" });
  return { title: t("metaTitle") };
}

export default function SettingsPage() {
  const gdprContactEmail = getGdprContactEmail();
  return (
    <div className="px-4 py-6 pb-8 sm:px-0 lg:pb-6">
      <AccountSettingsClient gdprContactEmail={gdprContactEmail} />
    </div>
  );
}
