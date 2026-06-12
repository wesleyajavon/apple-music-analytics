"use client";

import dynamic from "next/dynamic";
import { useReducedMotion } from "motion/react";

const Home3DScene = dynamic(
  () => import("./home-3d-scene").then((m) => m.Home3DScene),
  { ssr: false },
);

type Home3DHeroProps = {
  variant?: "hero" | "ambient" | "dashboard";
  className?: string;
};

function StaticFallback({ className }: { className?: string }) {
  return (
    <div className={`pointer-events-none ${className ?? ""}`} aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_40%,rgb(152_80_208_/_0.18),transparent_70%)]" />
      <div className="absolute left-[12%] top-[20%] h-48 w-48 rounded-full bg-accent-violet/15 blur-3xl" />
      <div className="absolute right-[8%] top-[35%] h-56 w-56 rounded-full bg-accent-cyan/12 blur-3xl" />
      <div className="absolute bottom-[10%] left-[40%] h-40 w-40 rounded-full bg-accent-rose/10 blur-3xl" />
    </div>
  );
}

export function Home3DHero({ variant = "hero", className = "" }: Home3DHeroProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <StaticFallback className={className} />;
  }

  return (
    <Home3DScene
      variant={variant}
      className={className}
    />
  );
}
