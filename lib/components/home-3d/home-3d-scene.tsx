"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { useTranslations } from "next-intl";
import * as THREE from "three";
import { buildSoundprintScreenPreviewLabels } from "./soundprint-screen-preview";
import {
  AnalyticsBars,
  FingerprintWhorl,
  GenerativeKnot,
  GlassOrb,
  MockDashboardCard,
  SoundWaveSurface,
} from "./objects";
import type { SoundprintScreenPreviewLabels } from "./soundprint-screen-preview";

function SceneContent({
  variant,
  screenLabels,
}: {
  variant: "hero" | "ambient" | "dashboard";
  screenLabels: SoundprintScreenPreviewLabels;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { pointer } = useThree();

  useFrame(() => {
    if (!groupRef.current) return;
    const parallaxY = variant === "dashboard" ? 0.08 : 0.12;
    const parallaxX = variant === "dashboard" ? 0.04 : 0.06;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      pointer.x * parallaxY,
      0.04,
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      -pointer.y * parallaxX,
      0.04,
    );
  });

  if (variant === "dashboard") {
    return (
      <group ref={groupRef}>
        <MockDashboardCard position={[0, 0, 0]} scale={1.35} screenLabels={screenLabels} />
      </group>
    );
  }

  if (variant === "ambient") {
    return (
      <group ref={groupRef}>
        <FingerprintWhorl position={[-0.9, 0, 0]} />
        <AnalyticsBars position={[0.9, 0, 0]} />
        <GlassOrb position={[-0.3, 0.5, 0.2]} scale={0.85} color="#4f90e0" />
        <GlassOrb position={[0.4, -0.4, 0.1]} scale={0.65} color="#9850d0" />
      </group>
    );
  }

  return (
    <group ref={groupRef}>
      <FingerprintWhorl />
      <MockDashboardCard screenLabels={screenLabels} />
      <AnalyticsBars position={[0.3, -0.35, 0.35]} />
      <SoundWaveSurface />
      <GenerativeKnot />
      <GlassOrb position={[-0.55, -0.35, 0.45]} scale={0.9} />
      <GlassOrb position={[0.95, 0.55, 0.15]} scale={0.7} color="#f04068" />
      <GlassOrb position={[-1.05, 0.55, -0.1]} scale={0.55} color="#16c784" />
    </group>
  );
}

function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[4, 6, 5]} intensity={1} color="#ffffff" />
      <pointLight position={[-3, 2, 2]} intensity={1.4} color="#9850d0" />
      <pointLight position={[3, -1, 1]} intensity={1.1} color="#4f90e0" />
      <pointLight position={[0, 3, -2]} intensity={0.65} color="#f04068" />
      <hemisphereLight args={["#706fe0", "#06070d", 0.35]} />
    </>
  );
}

export type Home3DSceneProps = {
  variant?: "hero" | "ambient" | "dashboard";
  className?: string;
};

export function Home3DScene({ variant = "hero", className = "" }: Home3DSceneProps) {
  const tScreen = useTranslations("home.heroDashboardPreview.screen");
  const screenLabels = useMemo(
    () => buildSoundprintScreenPreviewLabels(tScreen),
    [tScreen],
  );
  const cameraZ = variant === "dashboard" ? 3.4 : 4.2;

  return (
    <div className={`pointer-events-none ${className}`} aria-hidden>
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, cameraZ]} fov={42} />
        <SceneLights />
        <SceneContent variant={variant} screenLabels={screenLabels} />
      </Canvas>
    </div>
  );
}
