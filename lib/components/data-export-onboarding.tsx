"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";

type Phase = "welcome" | "pick" | "guide" | "finish";
type MusicProvider = "spotify" | "apple";

type GuideStep = {
  titleKey: "step1Title" | "step2Title" | "step3Title" | "step4Title";
  bodyKey: "step1Body" | "step2Body" | "step3Body" | "step4Body";
  imageSrc: string;
  altKey:
    | "imageAltSpotifyStep1"
    | "imageAltSpotifyStep2"
    | "imageAltAppleStep1"
    | "imageAltAppleStep2"
    | "imageAltAppleStep3"
    | "imageAltAppleStep4";
};

const SPOTIFY_STEPS: GuideStep[] = [
  {
    titleKey: "step1Title",
    bodyKey: "step1Body",
    imageSrc: "/onboarding/spotify-step-1.png",
    altKey: "imageAltSpotifyStep1",
  },
  {
    titleKey: "step2Title",
    bodyKey: "step2Body",
    imageSrc: "/onboarding/spotify-step-2.png",
    altKey: "imageAltSpotifyStep2",
  },
];

const APPLE_STEPS: GuideStep[] = [
  {
    titleKey: "step1Title",
    bodyKey: "step1Body",
    imageSrc: "/onboarding/apple-step-1.png",
    altKey: "imageAltAppleStep1",
  },
  {
    titleKey: "step2Title",
    bodyKey: "step2Body",
    imageSrc: "/onboarding/apple-step-2.png",
    altKey: "imageAltAppleStep2",
  },
  {
    titleKey: "step3Title",
    bodyKey: "step3Body",
    imageSrc: "/onboarding/apple-step-3.png",
    altKey: "imageAltAppleStep3",
  },
  {
    titleKey: "step4Title",
    bodyKey: "step4Body",
    imageSrc: "/onboarding/apple-step-4.png",
    altKey: "imageAltAppleStep4",
  },
];

export function DataExportOnboarding() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("welcome");
  const [provider, setProvider] = useState<MusicProvider | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps = useMemo(() => {
    if (provider === "spotify") return SPOTIFY_STEPS;
    if (provider === "apple") return APPLE_STEPS;
    return [];
  }, [provider]);

  const completeOnboarding = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/user/onboarding/complete", { method: "POST" });
      if (!res.ok) throw new Error("complete_failed");
      router.push("/dashboard/overview");
    } catch {
      toast.error(t("completeError"));
    } finally {
      setIsSubmitting(false);
    }
  }, [router, t]);

  const spotifyPrivacyUrl = t("spotifyUrls.privacy");
  const applePrivacyUrl = t("appleUrls.privacy");

  function selectProvider(p: MusicProvider) {
    setProvider(p);
    setStepIndex(0);
    setPhase("guide");
  }

  function goNextGuide() {
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
      return;
    }
    setPhase("finish");
  }

  function goBackGuide() {
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
      return;
    }
    setPhase("pick");
    setProvider(null);
  }

  const cardClass =
    "mx-auto w-full max-w-3xl rounded-2xl border border-gray-200/90 bg-white/95 p-6 shadow-lg shadow-gray-200/30 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/90 dark:shadow-none sm:p-8";

  const primaryBtn =
    "inline-flex min-h-[44px] items-center justify-center rounded-xl bg-accent-violet px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-accent-violet/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";

  const secondaryBtn =
    "inline-flex min-h-[44px] items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-900";

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <div className={cardClass}>
        {phase === "welcome" && (
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              {t("welcomeEyebrow")}
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              {t("welcomeTitle")}
            </h1>
            <section
              className="rounded-xl border border-sky-200/80 bg-sky-50/90 px-4 py-3 text-sm leading-relaxed text-sky-950 dark:border-sky-900/40 dark:bg-sky-950/25 dark:text-sky-100"
              aria-labelledby="onboarding-why-not-api-heading"
            >
              <h2
                id="onboarding-why-not-api-heading"
                className="text-base font-semibold text-sky-950 dark:text-sky-50"
              >
                {t("whyNotApiTitle")}
              </h2>
              <p className="mt-2 text-sky-900/95 dark:text-sky-100/95">{t("whyNotApiBody")}</p>
            </section>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {t("welcomeBody")}
            </p>
            <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm leading-relaxed text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              <strong className="font-semibold">{t("welcomeNoteStrong")}</strong>
              {t("welcomeNoteRest")}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <button type="button" className={primaryBtn} onClick={() => setPhase("pick")}>
                {t("continue")}
              </button>
              <button
                type="button"
                className={`${secondaryBtn} text-gray-600 dark:text-gray-400`}
                onClick={() => void completeOnboarding()}
                disabled={isSubmitting}
              >
                {t("skipForNow")}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("skipHint")}</p>
          </div>
        )}

        {phase === "pick" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                {t("pickTitle")}
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{t("pickSubtitle")}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => selectProvider("spotify")}
                className="group flex flex-col items-start rounded-2xl border-2 border-gray-200 bg-gradient-to-br from-[#1DB954]/10 to-transparent p-6 text-left transition-all hover:border-[#1DB954]/60 hover:shadow-md dark:border-gray-700 dark:from-[#1DB954]/15 dark:hover:border-[#1DB954]/50"
              >
                <span className="text-lg font-bold text-gray-900 dark:text-white">{t("pickSpotify")}</span>
                <span className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("pickSpotifyHint")}</span>
                <span className="mt-4 text-sm font-semibold text-[#169c46] group-hover:underline dark:text-[#1ed760]">
                  {t("continue")} →
                </span>
              </button>

              <button
                type="button"
                onClick={() => selectProvider("apple")}
                className="group flex flex-col items-start rounded-2xl border-2 border-gray-200 bg-gradient-to-br from-gray-100/80 to-transparent p-6 text-left transition-all hover:border-gray-400 hover:shadow-md dark:border-gray-700 dark:from-gray-800/50 dark:hover:border-gray-500"
              >
                <span className="text-lg font-bold text-gray-900 dark:text-white">{t("pickApple")}</span>
                <span className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("pickAppleHint")}</span>
                <span className="mt-4 text-sm font-semibold text-accent-violet group-hover:underline">
                  {t("continue")} →
                </span>
              </button>
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-100 pt-6 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" className={secondaryBtn} onClick={() => setPhase("welcome")}>
                {t("back")}
              </button>
              <button
                type="button"
                className="text-sm font-medium text-gray-500 underline-offset-4 hover:text-gray-800 hover:underline dark:text-gray-400 dark:hover:text-gray-200"
                onClick={() => void completeOnboarding()}
                disabled={isSubmitting}
              >
                {t("skipForNow")}
              </button>
            </div>
          </div>
        )}

        {phase === "guide" && provider && steps[stepIndex] && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400" aria-live="polite">
                {t("stepProgress", { current: stepIndex + 1, total: steps.length })}
              </p>
            </div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
              {t(`${provider}.${steps[stepIndex].titleKey}` as Parameters<typeof t>[0])}
            </h2>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {t(`${provider}.${steps[stepIndex].bodyKey}` as Parameters<typeof t>[0])}
            </p>

            <a
              href={provider === "spotify" ? spotifyPrivacyUrl : applePrivacyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={secondaryBtn}
              aria-label={`${provider === "spotify" ? t("openSpotifyPrivacy") : t("openApplePrivacy")} (${t("externalLinkAria")})`}
            >
              {provider === "spotify" ? t("openSpotifyPrivacy") : t("openApplePrivacy")} ↗
            </a>

            <figure className="overflow-hidden rounded-xl border border-gray-200/90 bg-gray-50 dark:border-gray-700 dark:bg-gray-950/50">
              <Image
                src={steps[stepIndex].imageSrc}
                alt={t(steps[stepIndex].altKey)}
                width={1280}
                height={720}
                className="h-auto w-full object-contain"
                sizes="(max-width: 768px) 100vw, 42rem"
                priority={stepIndex === 0}
              />
            </figure>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 dark:border-gray-800 sm:flex-row sm:justify-between">
              <button type="button" className={secondaryBtn} onClick={goBackGuide}>
                {t("back")}
              </button>
              <button type="button" className={primaryBtn} onClick={goNextGuide}>
                {t("next")}
              </button>
            </div>
          </div>
        )}

        {phase === "finish" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">{t("finishTitle")}</h2>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{t("finishBody")}</p>
            <button
              type="button"
              className={primaryBtn}
              onClick={() => void completeOnboarding()}
              disabled={isSubmitting}
            >
              {isSubmitting ? t("finishing") : t("goToDashboard")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
