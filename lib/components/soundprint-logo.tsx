import Image from "next/image";

type SoundprintLogoProps = {
  src?: string;
  className?: string;
  imageClassName?: string;
  textClassName?: string;
  showText?: boolean;
  priority?: boolean;
};

const LOGO_SRC = "/brand/soundprint-ai-logo.png";

export function SoundprintLogo({
  src = LOGO_SRC,
  className = "",
  imageClassName = "h-8 w-8 rounded-lg",
  textClassName = "text-sm font-semibold tracking-wide text-foreground",
  showText = true,
  priority = false,
}: SoundprintLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Image
        src={src}
        alt={showText ? "" : "Soundprint-AI"}
        width={256}
        height={256}
        className={`object-cover ${imageClassName}`}
        priority={priority}
      />
      {showText ? <span className={textClassName}>Soundprint-AI</span> : null}
    </span>
  );
}
