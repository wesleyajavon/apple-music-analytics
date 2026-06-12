import Image from "next/image";
import { useTranslations } from "next-intl";
import { AUTH_PREVIEW_ARTISTS } from "@/lib/constants/auth-artist-preview";

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

      <div className="relative w-full max-w-[min(100%,920px)] [transform:perspective(1400px)_rotateY(-3deg)]">
        <div
          className="absolute -inset-10 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,rgb(152_80_208_/_0.35),transparent_68%)] blur-3xl"
          aria-hidden
        />

        <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-gradient-to-br from-[#06070d] via-[#070812] to-[#0c0e18] shadow-[0_32px_80px_-24px_rgb(0_0_0_/_0.75)] ring-1 ring-white/[0.06]">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(152,80,208,0.14),transparent_32%),radial-gradient(circle_at_90%_10%,rgba(79,144,224,0.12),transparent_34%)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent"
            aria-hidden
          />

          <div className="relative border-b border-white/[0.06] px-6 py-5 xl:px-7 xl:py-6">
            <h2 className="max-w-xl text-2xl font-semibold tracking-[-0.05em] text-white xl:text-[2rem] xl:leading-tight">
              {tOverview("artistSpotlight.title")}
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400 xl:text-[0.9375rem]">
              {tAuth("authPreviewSpotlightDescription")}
            </p>
          </div>

          <div className="relative grid grid-cols-3 gap-3 p-4 pt-3 xl:gap-4 xl:p-5 xl:pt-4">
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
        </div>
      </div>
    </div>
  );
}
