"use client";

// The place itself: an ice island in open sea, one warm sun, and Teerth's
// name pressed into the snow where the seal starts.

import { Center, Text3D } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { ISLAND_RADIUS } from "../../lib/world/places";
import { live } from "../../lib/world/store";

export const SKY = "#bcd6ee";
const SNOW = "#f6f1ea";
const SEA = "#2a79b8";

// Offset from the seal to the sun. The shadow camera rides with the seal so
// the 2048 map is always spent on the part of the island in view.
const SUN = [-14, 26, 12];
const SHADOW_HALF = 26;

function Sun() {
  const light = useRef();
  useFrame(() => {
    const l = light.current;
    if (!l) return;
    const { x, z } = live.seal;
    l.position.set(x + SUN[0], SUN[1], z + SUN[2]);
    l.target.position.set(x, 0, z);
    l.target.updateMatrixWorld();
  });
  return (
    <directionalLight
      ref={light}
      color="#ffe9d2"
      intensity={2.4}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.0004}
      shadow-normalBias={0.03}
      shadow-camera-left={-SHADOW_HALF}
      shadow-camera-right={SHADOW_HALF}
      shadow-camera-top={SHADOW_HALF}
      shadow-camera-bottom={-SHADOW_HALF}
      shadow-camera-near={1}
      shadow-camera-far={80}
    />
  );
}

function NameInSnow() {
  return (
    <group position={[0, 0.02, 3]} rotation={[-Math.PI / 2, 0, 0]}>
      <Center>
        <Text3D
          font="/fonts/helvetiker_bold.typeface.json"
          size={1.6}
          height={0.35}
          letterSpacing={0.08}
          bevelEnabled
          bevelSize={0.04}
          bevelThickness={0.04}
          curveSegments={6}
          castShadow
          receiveShadow
        >
          TEERTH SHARMA
          <meshStandardMaterial color="#ffffff" roughness={0.85} />
        </Text3D>
      </Center>
    </group>
  );
}

// Click or tap on the snow: the seal slides there.
function walkHere(event) {
  if (event.delta > 8) return;
  live.target = { x: event.point.x, z: event.point.z };
  live.pendingOpen = null;
}

export default function Island() {
  return (
    <>
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[SKY, 70, 170]} />
      <hemisphereLight args={["#cfe4ff", "#f3e6d8", 1.1]} />
      <Sun />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={walkHere}>
        <circleGeometry args={[ISLAND_RADIUS, 96]} />
        <meshStandardMaterial color={SNOW} roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color={SEA} roughness={0.35} />
      </mesh>

      <NameInSnow />
    </>
  );
}
