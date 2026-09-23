"use client";

// The water around the island: open sea, the lighter shelf by the cliff, a
// breathing foam line, and ice floes riding the swell. Geometry comes from
// island/build.js; Island.jsx owns the ground.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { DoubleSide } from "three";
import Instances from "./Instances";
import { buildSea } from "./island/build";
import { C, mat } from "./palette";
import River from "./sea/River";
import Whale from "./sea/Whale";

export default function Sea() {
  const kit = useMemo(buildSea, []);
  const foam = useRef();
  useFrame(({ clock }) => {
    if (foam.current) foam.current.material.opacity = 0.55 + Math.sin(clock.elapsedTime * 0.9) * 0.2;
  });
  return (
    <>
      {/* the open sea: base plane, the lighter shelf by the cliff, a breathing foam line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
        <planeGeometry args={[700, 700]} />
        <meshStandardMaterial color={C.sea} roughness={0.3} metalness={0.05} />
      </mesh>
      <mesh geometry={kit.shallowsGeo} material={mat("#ffffff", { vertexColors: true, flat: false, roughness: 0.3 })} />
      <mesh ref={foam} geometry={kit.foamGeo}>
        <meshBasicMaterial color={C.foam} transparent opacity={0.6} side={DoubleSide} />
      </mesh>

      <Instances geometry={kit.floeTemplateGeo} items={kit.floes} material={mat("#ffffff", { vertexColors: true })} bob />

      {/* the island's fresh water: the river from Triton's ice cave, the
          lake behind the TensorFlow dam and the NVIDIA moat, one surface
          with current streaks and a foam line at every bank */}
      <River />

      {/* a humpback surfacing off the river's mouth */}
      <Whale />
    </>
  );
}
