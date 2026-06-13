import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AuthPreviewPanel } from "@/lib/components/auth-preview-panel";
import { SoundprintBrandDivider } from "@/lib/components/soundprint-brand-divider";

type AuthSplitLayoutProps = {
  children: React.ReactNode;
};

export function AuthSplitLayout({ children }: AuthSplitLayoutProps) {
  const t = useTranslations("auth");

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-background lg:grid lg:min-h-full lg:grid-cols-2 lg:bg-[#06070d] lg:text-white">
      <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_90%_at_0%_30%,rgb(152_80_208_/_0.22),transparent_52%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_8%_88%,rgb(79_144_224_/_0.14),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_18%_12%,rgb(240_64_104_/_0.1),transparent_48%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(105deg,#06070d_0%,#06070d_18%,rgb(6_7_13_/_0.92)_30%,rgb(6_7_13_/_0.55)_44%,rgb(6_7_13_/_0.15)_58%,transparent_78%)]" />
      </div>

      <SoundprintBrandDivider
        orientation="vertical"
        tone="onDark"
        logoSize="2xl"
        className="pointer-events-none absolute inset-y-0 left-1/2 z-20 hidden -translate-x-1/2 lg:flex"
      />

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col lg:min-h-full">
        <div className="flex flex-1 flex-col px-6 pb-8 pt-24 sm:px-10 sm:pb-10 lg:items-end lg:px-0 lg:pb-12 lg:pl-8 lg:pr-[4.75rem] lg:pt-32 xl:pl-10">
          <div className="my-auto w-full max-w-[24rem] lg:max-w-[27rem]">
            <div className="auth-form-surface lg:rounded-[2rem] lg:border lg:border-white/10 lg:bg-white/[0.045] lg:p-8 lg:shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.08),0_32px_80px_-40px_rgb(0_0_0_/_0.65)] lg:backdrop-blur-2xl xl:p-10 [&_.text-muted]:lg:text-white/55">
              {children}
            </div>

            <footer className="mt-6 px-1 text-center text-xs text-muted lg:mt-8 lg:text-left lg:text-white/40">
              <Link
                href="/legal/terms"
                className="font-medium underline-offset-2 transition-colors hover:text-primary lg:text-white/65 lg:hover:text-white"
              >
                {t("termsLink")}
              </Link>
              <span className="mx-2 opacity-50" aria-hidden>
                ·
              </span>
              <Link
                href="/legal/privacy"
                className="font-medium underline-offset-2 transition-colors hover:text-primary lg:text-white/65 lg:hover:text-white"
              >
                {t("privacyLink")}
              </Link>
            </footer>
          </div>
        </div>
      </div>

      <AuthPreviewPanel />
    </div>
  );
}
