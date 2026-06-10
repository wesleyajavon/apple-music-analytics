export type ShareCardOutcome = "shared-image" | "shared-text" | "copied";

const DEFAULT_FILENAME = "soundprint-share.png";

export function downloadShareCardImage(
  imageBlob: Blob,
  filename: string = DEFAULT_FILENAME
): void {
  const url = URL.createObjectURL(imageBlob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function shareCardWithCaption(
  text: string,
  imageBlob?: Blob,
  filename: string = DEFAULT_FILENAME
): Promise<ShareCardOutcome> {
  if (typeof navigator === "undefined") {
    throw new Error("Share is only available in the browser");
  }

  if (imageBlob) {
    const file = new File([imageBlob], filename, { type: "image/png" });
    const canShareFiles =
      typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });

    if (canShareFiles && typeof navigator.share === "function") {
      try {
        await navigator.share({ text, files: [file] });
        return "shared-image";
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw error;
        }
      }
    }
  }

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ text });
      return "shared-text";
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }
    }
  }

  await navigator.clipboard.writeText(text);
  return "copied";
}
