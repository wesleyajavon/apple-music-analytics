export function createShareCardCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  return canvas;
}

export function getShareCardContext(
  canvas: HTMLCanvasElement
): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable");
  }
  return ctx;
}

export async function encodeCanvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to encode share image"));
          return;
        }
        resolve(blob);
      },
      "image/png",
      1
    );
  });
}
