import Image from "next/image";
import { useTranslations } from "next-intl";
import { AUTH_PREVIEW_ARTISTS } from "@/lib/constants/auth-artist-preview";
import { DashboardPreviewShell } from "@/lib/components/dashboard-preview-shell";

export function AuthPreviewPanel() {
  const tOverview = useTranslations("overview");
  const tAuth = useTranslations("auth");

  return (
    <div
      className="pointer-events-none absolute inset-y-0 right-0 z-[1] hidden lg:flex lg:w-[58%] xl:w-[54%] lg:items-center lg:justify-end lg:pr-6 xl:pr-10"
      aria-hidden
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_90%_80%_at_72%_48%,rgb(152_80_208_/_0.28),transparent_62%)]"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_50%_45%_at_88%_72%,rgb(240_64_104_/_0.18),transparent_58%)]"
        aria-hidden
      />

      <DashboardPreviewShell
        badge={tOverview("artistSpotlight.badge")}
        badgeAccent="violet"
        title={tOverview("artistSpotlight.title")}
        description={tAuth("authPreviewSpotlightDescription")}
        tilt
        className="max-w-[min(100%,920px)]"
      >
        <div className="grid grid-cols-3 gap-3 xl:gap-4">
          {AUTH_PREVIEW_ARTISTS.map((artist, index) => (
            <div
              key={artist.name}
              className="overflow-hidden rounded-[1.35rem] border border-white/[0.08] bg-[#0c0e18] p-1.5 shadow-xl shadow-black/40 ring-1 ring-white/[0.05]"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.1rem] bg-slate-900">
                <Image
                  src={artist.imageSrc}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(min-width: 1280px) 180px, (min-width: 1024px) 16vw, 0px"
                  priority={index === 0}
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10"
                  aria-hidden
                />
                <span className="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-slate-950/90 text-sm font-black text-white shadow-lg shadow-black/40 xl:h-10 xl:w-10 xl:text-base">
                  {index + 1}
                </span>
                <div className="absolute inset-x-2 bottom-2 rounded-2xl border border-white/10 bg-slate-950/85 px-3 py-2.5 backdrop-blur-sm">
                  <p className="truncate text-center text-sm font-semibold tracking-[-0.03em] text-white xl:text-base">
                    {artist.name}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DashboardPreviewShell>
    </div>
  );
}
