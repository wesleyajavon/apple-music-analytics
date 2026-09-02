"use client";

import { ListTree, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { SoundprintLogo } from "@/lib/components/soundprint-logo";

export function HomeAskSoundprintPreview({ className }: { className?: string }) {
  const tChat = useTranslations("askSoundprint");
  const tDemo = useTranslations("home.soundprintAiChatDemo");

  return (
    <div
      className={["relative mx-auto w-full max-w-[20.5rem]", className].filter(Boolean).join(" ")}
      role="img"
      aria-label={tDemo("sectionEyebrow")}
    >
      <div className="relative overflow-hidden rounded-[2.6rem] border-[5px] border-[#1c1d24] bg-[#050508] p-[5px] shadow-[0_40px_80px_-24px_rgba(0,0,0,0.88)] ring-1 ring-white/12">
        <div className="absolute left-1/2 top-2 z-10 h-5 w-[4.4rem] -translate-x-1/2 rounded-full bg-black" />
        <div className="relative flex min-h-[26.5rem] flex-col overflow-hidden rounded-[2.15rem] bg-[#080913]">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgb(152_80_208_/_0.18),transparent_42%),radial-gradient(circle_at_bottom_right,rgb(79_144_224_/_0.1),transparent_40%)]"
            aria-hidden
          />

          <div className="relative flex items-center gap-2 border-b border-white/10 px-4 pb-3 pt-8">
            <SoundprintLogo
              src="/brand/favicon.png"
              showText={false}
              alt=""
              imageClassName="h-7 w-7 object-contain"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-white">
                {tChat("title")}
              </p>
              <p className="truncate text-[0.65rem] text-white/45">{tChat("compactTrust")}</p>
            </div>
            <span className="ml-auto shrink-0 rounded-full border border-white/12 px-2 py-0.5 text-[0.58rem] font-medium uppercase tracking-[0.14em] text-white/45">
              {tChat("betaBadge")}
            </span>
          </div>

          <div className="relative flex flex-1 flex-col justify-end gap-3 px-3.5 py-4">
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md border border-white/10 bg-white/10 px-3.5 py-2.5">
              <p className="text-[0.82rem] leading-5 text-white/90">{tDemo("previewQuestion")}</p>
            </div>
            <div className="mr-1 flex max-w-[92%] items-end gap-2">
              <span className="mb-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
                <SoundprintLogo
                  src="/brand/favicon.png"
                  showText={false}
                  alt=""
                  imageClassName="h-4 w-4 object-contain"
                />
              </span>
              <div className="rounded-2xl rounded-bl-md border border-white/10 bg-white/5 px-3.5 py-2.5">
                <p className="whitespace-pre-line text-[0.82rem] leading-5 text-white/82">
                  {tDemo("previewAnswer")}
                </p>
              </div>
            </div>
          </div>

          <div className="relative px-3 pb-4">
            <div
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[#050508]/85 px-2 py-1.5"
              aria-hidden
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/40">
                <ListTree className="h-4 w-4" />
              </span>
              <span className="min-h-9 flex-1 px-1 py-1.5 text-[13px] leading-5 text-white/35">
                {tDemo("previewPlaceholder")}
              </span>
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-sm shadow-violet-500/25">
                <Send className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
