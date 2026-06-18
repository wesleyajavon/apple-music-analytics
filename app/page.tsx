import Link from "next/link";
import { SoundprintLogo } from "@/lib/components/soundprint-logo";
import { StreamingProviderLogos } from "@/lib/components/streaming-provider-logos";
import { resolvePublicDemoOverviewPath } from "@/lib/services/user/public-profile-access";

export default async function Home() {
  const publicDemoPath = await resolvePublicDemoOverviewPath();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-app-shell" aria-hidden />
      <div
        className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-accent-rose/20 blur-3xl -z-10"
        aria-hidden
      />
      <div
        className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full bg-accent-cyan/20 dark:bg-accent-cyan/15 blur-3xl -z-10"
        aria-hidden
      />
      <div className="z-10 max-w-2xl w-full flex flex-col items-center text-center">
        <SoundprintLogo
          className="mb-6 flex-col gap-3"
          imageClassName="h-36 w-36 object-contain sm:h-44 sm:w-44"
          showText={false}
          priority
        />
        <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4 tracking-tight">
          Welcome to Soundprint-AI your music decoded.
        </h1>
        <p className="text-muted text-lg mb-6 max-w-md">
          Import once from Apple Music or Spotify—then explore trends, chat with your streaming data, and compare streams with friends on any artist.
        </p>
        <StreamingProviderLogos
          caption="Works with"
          spotifyLogoAlt="Spotify"
          appleMusicLogoAlt="Apple Music"
          className="mb-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-5"
        />
        {publicDemoPath ? (
        <Link
          href={publicDemoPath}
          className="group inline-flex items-center gap-2 px-8 py-4 bg-brand-gradient text-white font-semibold rounded-xl shadow-brand-glow transition-all duration-200 hover:scale-[1.02] hover:opacity-95 active:scale-[0.98]"
        >
          Explore a public dashboard demo
          <svg
            className="w-5 h-5 transition-transform group-hover:translate-x-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </Link>
        ) : null}
      </div>
    </main>
  );
}

