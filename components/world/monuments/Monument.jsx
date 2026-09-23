"use client";

// The shared base every contribution and lab project stands on, so twenty-two
// sculptures read as one exhibition: a two-step plinth ringed in the place's
// accent, the org's mark on a sign at the front (upstream only), and the
// landing site's headline number cast in 3D type across the front step.
//
// The sculpture on top is the 3D version of that place's figure on
// teerthsharma.github.io (place.figure.name), looked up in ./index.js. Until
// a figure has its own sculpture, Placeholder.jsx stands in.

import { Center, Text3D, useTexture } from "@react-three/drei";
import { Suspense } from "react";
import { SRGBColorSpace } from "three";
import { useUi } from "../../../lib/world/store";
import { C, mat } from "../palette";
import { SCULPTURES } from "./index";
import Placeholder from "./Placeholder";

// Plinth top height: every sculpture's local origin sits here.
export const PLINTH_TOP = 0.7;

function OrgSign({ logo, radius }) {
  const texture = useTexture(logo);
  texture.colorSpace = SRGBColorSpace;
  return (
    <group position={[radius * 0.62, 0, radius * 0.78]} rotation={[0, -0.35, 0]}>
      <mesh position={[0, 0.7, 0]} castShadow material={mat(C.charcoal)}>
        <boxGeometry args={[0.18, 1.4, 0.18]} />
      </mesh>
      <mesh position={[0, 1.55, 0]} castShadow material={mat(C.warmWhite, { roughness: 0.6 })}>
        <boxGeometry args={[1.3, 1.3, 0.14]} />
      </mesh>
      <mesh position={[0, 1.55, 0.075]}>
        <planeGeometry args={[1.05, 1.05]} />
        <meshBasicMaterial map={texture} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

function Headline({ text, color, radius }) {
  return (
    <group position={[0, 0.36, radius + 0.05]}>
      <Center disableZ>
        <Text3D font="/fonts/helvetiker_bold.typeface.json" size={0.52} height={0.16} bevelEnabled bevelSize={0.015} bevelThickness={0.02} curveSegments={5} castShadow>
          {text}
          <meshStandardMaterial color={color} roughness={0.45} />
        </Text3D>
      </Center>
    </group>
  );
}

export default function Monument({ place }) {
  const near = useUi((s) => s.near === place.id);
  const Sculpture = SCULPTURES[place.figure?.name] ?? Placeholder;
  const r = place.radius;
  const value = place.proof?.[0]?.value;
  return (
    <group>
      {/* plinth: charcoal foot, accent band, warm-white top */}
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow material={mat(C.charcoal)}>
        <cylinderGeometry args={[r * 0.98, r, 0.36, 40]} />
      </mesh>
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow material={mat(place.color, { roughness: 0.55 })}>
        <cylinderGeometry args={[r * 0.9, r * 0.92, 0.12, 40]} />
      </mesh>
      <mesh position={[0, 0.58, 0]} castShadow receiveShadow material={mat(C.warmWhite, { roughness: 0.8 })}>
        <cylinderGeometry args={[r * 0.84, r * 0.88, 0.24, 40]} />
      </mesh>

      <group position={[0, PLINTH_TOP, 0]}>
        <Sculpture place={place} near={near} />
      </group>

      {value && place.section === "upstream" && <Headline text={value} color={place.color} radius={r} />}
      {place.logo && (
        <Suspense fallback={null}>
          <OrgSign logo={place.logo} radius={r} />
        </Suspense>
      )}
    </group>
  );
}
