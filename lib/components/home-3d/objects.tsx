"use client";

import { useFrame } from "@react-three/fiber";
import { Float, Html, RoundedBox } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { SoundprintScreenPreview, type SoundprintScreenPreviewLabels } from "./soundprint-screen-preview";

const BRAND = {
  rose: "#f04068",
  violet: "#9850d0",
  indigo: "#706fe0",
  cyan: "#4f90e0",
  emerald: "#16c784",
};

/** Concentric rings evoking a fingerprint whorl — Soundprint brand mark. */
export function FingerprintWhorl({ position = [-1.6, 0.2, 0] as [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);

  const rings = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        radius: 0.28 + i * 0.11,
        tube: 0.014 + (i % 3) * 0.005,
        y: i * 0.035,
        z: i * 0.018,
        rotY: i * 0.22,
      })),
    [],
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.z = Math.sin(t * 0.35) * 0.06;
    groupRef.current.rotation.y = 0.4 + Math.sin(t * 0.2) * 0.05;
  });

  return (
    <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.35}>
      <group ref={groupRef} position={position} rotation={[0.35, 0.55, -0.15]}>
        {rings.map((ring, i) => (
          <mesh
            key={i}
            rotation={[Math.PI / 2, ring.rotY, 0]}
            position={[0, ring.y, ring.z]}
          >
            <torusGeometry args={[ring.radius, ring.tube, 12, 48]} />
            <meshStandardMaterial
              color={BRAND.violet}
              emissive={BRAND.indigo}
              emissiveIntensity={0.35 + (i % 2) * 0.1}
              metalness={0.85}
              roughness={0.18}
              transparent
              opacity={0.92 - i * 0.04}
            />
          </mesh>
        ))}
      </group>
    </Float>
  );
}

/** Animated bar chart — listening analytics vibe. */
export function AnalyticsBars({ position = [1.5, -0.1, 0.2] as [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  const bars = useMemo(
    () =>
      [0.32, 0.58, 0.44, 0.72, 0.52, 0.88, 0.64].map((h, i) => ({
        height: h,
        x: (i - 3) * 0.18,
        color: [BRAND.rose, BRAND.violet, BRAND.cyan, BRAND.indigo, BRAND.emerald][i % 5],
      })),
    [],
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      if (!(child instanceof THREE.Mesh)) return;
      const base = bars[i]?.height ?? 0.5;
      const scaleY = base * (0.85 + Math.sin(t * 1.8 + i * 0.7) * 0.15);
      child.scale.y = scaleY;
      child.position.y = scaleY * 0.28;
    });
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
      <group ref={groupRef} position={position} rotation={[-0.15, -0.45, 0.08]}>
        <RoundedBox args={[1.55, 1.05, 0.06]} radius={0.08} smoothness={4}>
          <meshStandardMaterial
            color="#0f111c"
            metalness={0.6}
            roughness={0.35}
            transparent
            opacity={0.92}
          />
        </RoundedBox>
        {bars.map((bar, i) => (
          <mesh key={i} position={[bar.x, bar.height * 0.28, 0.05]}>
            <boxGeometry args={[0.1, bar.height * 0.56, 0.04]} />
            <meshStandardMaterial
              color={bar.color}
              emissive={bar.color}
              emissiveIntensity={0.25}
              metalness={0.4}
              roughness={0.3}
            />
          </mesh>
        ))}
      </group>
    </Float>
  );
}

/** Sine-wave surface — sound / waveform. */
export function SoundWaveSurface({ position = [0.2, -0.55, -0.3] as [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(2.8, 0.9, 48, 12);
    return geo;
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const pos = meshRef.current.geometry.attributes.position;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const wave =
        Math.sin(x * 3.2 + t * 1.6) * 0.07 +
        Math.sin(x * 5.8 + t * 2.1) * 0.035;
      pos.setZ(i, wave);
    }
    pos.needsUpdate = true;
    meshRef.current.geometry.computeVertexNormals();
  });

  return (
    <Float speed={0.9} rotationIntensity={0.1} floatIntensity={0.25}>
      <mesh ref={meshRef} geometry={geometry} position={position} rotation={[-0.6, 0.15, 0]}>
        <meshStandardMaterial
          color={BRAND.cyan}
          emissive={BRAND.indigo}
          emissiveIntensity={0.2}
          metalness={0.7}
          roughness={0.25}
          wireframe
          transparent
          opacity={0.55}
        />
      </mesh>
    </Float>
  );
}

/** Glass orb — Luma-style refractive accent. */
export function GlassOrb({
  position,
  scale = 1,
  color = BRAND.violet,
}: {
  position: [number, number, number];
  scale?: number;
  color?: string;
}) {
  return (
    <Float speed={1.8} rotationIntensity={0.25} floatIntensity={0.5}>
      <mesh position={position} scale={scale}>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshPhysicalMaterial
          color={color}
          metalness={0.05}
          roughness={0.06}
          transmission={0.92}
          thickness={0.45}
          transparent
          opacity={0.88}
          clearcoat={1}
          clearcoatRoughness={0.08}
          ior={1.45}
          emissive={color}
          emissiveIntensity={0.18}
          reflectivity={0.9}
        />
      </mesh>
    </Float>
  );
}

/** Floating mock dashboard card — realistic Soundprint-AI screen in 3D. */
export function MockDashboardCard({
  position = [1.85, 0.45, -0.15] as [number, number, number],
  scale = 1,
  screenLabels,
}: {
  position?: [number, number, number];
  scale?: number;
  screenLabels: SoundprintScreenPreviewLabels;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const isCentered = position[0] === 0 && position[1] === 0 && position[2] === 0;
  const screenSize = useMemo(
    () => (isCentered ? { w: 1.52, h: 1.02, depth: 0.07 } : { w: 1.35, h: 0.95, depth: 0.05 }),
    [isCentered],
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    const baseY = isCentered ? -0.22 : -0.35;
    groupRef.current.rotation.y = baseY + Math.sin(state.clock.elapsedTime * 0.25) * 0.04;
  });

  return (
    <Float speed={1.1} rotationIntensity={0.12} floatIntensity={0.3}>
      <group
        ref={groupRef}
        position={position}
        scale={scale}
        rotation={isCentered ? [0.06, -0.22, 0.01] : [0.08, -0.35, 0.02]}
      >
        {/* Monitor bezel */}
        <RoundedBox args={[screenSize.w + 0.08, screenSize.h + 0.08, screenSize.depth]} radius={0.05} smoothness={4}>
          <meshStandardMaterial color="#030408" metalness={0.65} roughness={0.35} />
        </RoundedBox>

        {/* Screen glass rim */}
        <RoundedBox
          args={[screenSize.w, screenSize.h, screenSize.depth * 0.35]}
          radius={0.04}
          smoothness={4}
          position={[0, 0, screenSize.depth * 0.38]}
        >
          <meshStandardMaterial color="#0a0b12" metalness={0.4} roughness={0.25} />
        </RoundedBox>

        {/* Real dashboard UI mapped on screen face */}
        <Html
          transform
          occlude
          distanceFactor={isCentered ? 1.55 : 1.72}
          position={[0, 0, screenSize.depth * 0.52]}
          style={{
            width: isCentered ? 640 : 560,
            height: isCentered ? 430 : 380,
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <div className="h-full w-full overflow-hidden rounded-[12px] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.08)]">
            <SoundprintScreenPreview labels={screenLabels} />
          </div>
        </Html>

        {/* macOS traffic lights */}
        {(["#f87171", "#fbbf24", "#34d399"] as const).map((color, i) => (
          <mesh key={color} position={[-screenSize.w * 0.42 + i * 0.05, screenSize.h * 0.42, screenSize.depth * 0.55]}>
            <sphereGeometry args={[0.014, 10, 10]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} />
          </mesh>
        ))}

        {/* Subtle screen glow */}
        <mesh position={[0, 0, screenSize.depth * 0.2]}>
          <planeGeometry args={[screenSize.w * 1.05, screenSize.h * 1.05]} />
          <meshBasicMaterial
            color="#9850d0"
            transparent
            opacity={0.06}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </Float>
  );
}

/** Torus knot accent — abstract AI / generative motif. */
export function GenerativeKnot({ position = [-0.4, 0.65, -0.5] as [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x = state.clock.elapsedTime * 0.12;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.18;
  });

  return (
    <Float speed={2} rotationIntensity={0.3} floatIntensity={0.45}>
      <mesh ref={meshRef} position={position} scale={0.14}>
        <torusKnotGeometry args={[1, 0.32, 128, 24, 2, 3]} />
        <meshStandardMaterial
          color={BRAND.rose}
          emissive={BRAND.violet}
          emissiveIntensity={0.35}
          metalness={0.9}
          roughness={0.12}
          wireframe
          transparent
          opacity={0.5}
        />
      </mesh>
    </Float>
  );
}
