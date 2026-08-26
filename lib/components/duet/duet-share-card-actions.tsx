"use client";

import { useState } from "react";
import { Download, Share2 } from "lucide-react";
import {
  downloadShareCardImage,
  shareCardWithCaption,
  type ShareCardOutcome,
} from "@/lib/utils/share-card/browser-share";

type DuetShareCardActionsProps = {
  canShare: boolean;
  buildImageBlob: () => Promise<Blob>;
  buildCaption: () => string;
  shareLabel: string;
  downloadLabel: string;
  preparingLabel: string;
  sharedImageLabel: string;
  sharedTextLabel: string;
  copiedLabel: string;
  savedLabel: string;
  variant?: "hero" | "scorecard" | "mobile";
  downloadFilename?: string;
};

function resolveShareFeedback(
  outcome: ShareCardOutcome,
  labels: {
    sharedImage: string;
    sharedText: string;
    copied: string;
  }
): string {
  if (outcome === "shared-image") return labels.sharedImage;
  if (outcome === "shared-text") return labels.sharedText;
  return labels.copied;
}

export function DuetShareCardActions({
  canShare,
  buildImageBlob,
  buildCaption,
  shareLabel,
  downloadLabel,
  preparingLabel,
  sharedImageLabel,
  sharedTextLabel,
  copiedLabel,
  savedLabel,
  variant = "scorecard",
  downloadFilename,
}: DuetShareCardActionsProps) {
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"share" | "download" | null>(null);

  if (!canShare) return null;

  const buttonClass =
    variant === "hero"
      ? "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-white/15 disabled:opacity-60"
      : variant === "mobile"
        ? "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-violet-200/90 bg-white px-3 text-sm font-semibold text-violet-800 shadow-sm transition-colors hover:bg-violet-50 disabled:opacity-60 dark:border-violet-400/25 dark:bg-violet-500/10 dark:text-violet-100 dark:hover:bg-violet-500/20"
        : "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-violet-200/90 bg-white/90 px-3 py-1.5 text-xs font-semibold text-violet-800 shadow-sm transition-colors hover:bg-violet-50 disabled:opacity-60 dark:border-violet-400/25 dark:bg-violet-500/10 dark:text-violet-100 dark:hover:bg-violet-500/20";

  const downloadButtonClass =
    variant === "hero"
      ? "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/90 shadow-sm transition-colors hover:bg-white/10 disabled:opacity-60"
      : variant === "mobile"
        ? "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-card-border bg-card-surface px-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60 dark:hover:bg-white/10"
        : "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15";

  async function handleShare() {
    setBusyAction("share");
    setShareFeedback(preparingLabel);

    try {
      const imageBlob = await buildImageBlob();
      const result = await shareCardWithCaption(buildCaption(), imageBlob, downloadFilename);
      setShareFeedback(
        resolveShareFeedback(result, {
          sharedImage: sharedImageLabel,
          sharedText: sharedTextLabel,
          copied: copiedLabel,
        })
      );
      window.setTimeout(() => setShareFeedback(null), 3200);
    } catch {
      setShareFeedback(null);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDownload() {
    setBusyAction("download");
    setDownloadFeedback(preparingLabel);

    try {
      const imageBlob = await buildImageBlob();
      downloadShareCardImage(imageBlob, downloadFilename);
      setDownloadFeedback(savedLabel);
      window.setTimeout(() => setDownloadFeedback(null), 3200);
    } catch {
      setDownloadFeedback(null);
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className={variant === "mobile" ? "flex items-stretch gap-2" : "flex flex-wrap items-center justify-center gap-2"}>
      <button
        type="button"
        disabled={busyAction !== null}
        onClick={() => void handleShare()}
        className={buttonClass}
      >
        <Share2 className="h-3.5 w-3.5" aria-hidden />
        {shareFeedback ?? shareLabel}
      </button>
      <button
        type="button"
        disabled={busyAction !== null}
        onClick={() => void handleDownload()}
        className={downloadButtonClass}
      >
        <Download className="h-3.5 w-3.5" aria-hidden />
        {downloadFeedback ?? downloadLabel}
      </button>
    </div>
  );
}
