import { getAvatarBackgroundColor } from "@/lib/components/artist-avatar-utils";
import { getUserAvatarInitials } from "@/lib/components/user-avatar";

const LOCAL_AVATAR_SIZE = 256;

export function loadCanvasImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Same-origin initials avatar — avoids ui-avatars CORS issues on canvas export. */
export function createLocalInitialsAvatar(
  name: string,
  colorIndex: number,
  size = LOCAL_AVATAR_SIZE
): Promise<HTMLImageElement> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Promise.reject(new Error("Canvas 2D context unavailable"));
  }

  ctx.fillStyle = getAvatarBackgroundColor(colorIndex);
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  const initials = getUserAvatarInitials(name);
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${Math.round(size * 0.36)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initials, size / 2, size / 2 + size * 0.02);

  const dataUrl = canvas.toDataURL("image/png");

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to create local avatar"));
    img.src = dataUrl;
  });
}

export async function loadShareCardAvatar(
  url: string | null | undefined,
  fallbackName: string,
  colorIndex: number
): Promise<HTMLImageElement> {
  const primary = url?.trim();
  if (primary) {
    const loaded = await loadCanvasImage(primary);
    if (loaded) return loaded;
  }

  return createLocalInitialsAvatar(fallbackName, colorIndex);
}
