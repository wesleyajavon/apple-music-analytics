import { Footer } from "@/lib/components/footer";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("legal.nav");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-card-border px-6 py-4">
        <nav className="mx-auto flex max-w-3xl flex-wrap items-center gap-4 text-sm">
          <Link href="/" className="font-semibold text-foreground hover:text-primary">
            Soundprint-AI
          </Link>
          <Link href="/legal/privacy" className="text-muted hover:text-primary">
            {t("privacy")}
          </Link>
          <Link href="/legal/terms" className="text-muted hover:text-primary">
            {t("terms")}
          </Link>
          <Link href="/legal/cookies" className="text-muted hover:text-primary">
            {t("cookies")}
          </Link>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <Footer variant="home" />
    </div>
  );
}
