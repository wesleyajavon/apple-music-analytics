import { Footer } from "@/lib/components/footer";
import { SoundprintBrandMark } from "@/lib/components/soundprint-brand-mark";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { GUIDE_MESSAGE_KEYS, GUIDE_SLUGS, guidePath } from "@/lib/seo/guide-slugs";

export default async function GuidesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tNav = await getTranslations("guides.nav");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-card-border px-6 py-4">
        <nav className="mx-auto flex max-w-3xl flex-wrap items-center gap-4 text-sm">
          <Link
            href="/"
            className="group rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Soundprint-AI"
          >
            <SoundprintBrandMark size="sm" />
          </Link>
          {GUIDE_SLUGS.map((slug) => (
            <Link
              key={slug}
              href={guidePath(slug)}
              className="text-muted hover:text-primary"
            >
              {tNav(GUIDE_MESSAGE_KEYS[slug])}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <Footer variant="home" />
    </div>
  );
}
