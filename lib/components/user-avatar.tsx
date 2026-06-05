"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type UserAvatarSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<UserAvatarSize, string> = {
  sm: "h-9 w-9 rounded-xl text-xs",
  md: "h-11 w-11 rounded-2xl text-sm",
  lg: "h-16 w-16 rounded-2xl text-lg",
  xl: "h-24 w-24 rounded-3xl text-2xl",
};

const IMAGE_SIZES: Record<UserAvatarSize, string> = {
  sm: "36px",
  md: "44px",
  lg: "64px",
  xl: "96px",
};

export function getUserAvatarInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "User";
  const words = source.split(/[\s@._-]+/).filter(Boolean);
  const initials = words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
  return initials || "U";
}

export function UserAvatar({
  src,
  name,
  email,
  size = "md",
  alt = "",
  className = "",
}: {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  size?: UserAvatarSize;
  alt?: string;
  className?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = !!src && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden border border-white/70 bg-brand-gradient font-bold text-white shadow-lg shadow-violet-500/15 dark:border-white/10 ${SIZE_CLASSES[size]} ${className}`}
      aria-hidden={alt ? undefined : true}
    >
      {showImage ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={IMAGE_SIZES[size]}
          unoptimized
          className="object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span>{getUserAvatarInitials(name, email)}</span>
      )}
    </span>
  );
}
