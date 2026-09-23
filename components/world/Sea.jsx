"use client";

// The water around the island: open sea, the lighter shelf by the cliff, a
// breathing foam line, and ice floes riding the swell. Geometry comes from
// island/build.js; Island.jsx owns the ground.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { DoubleSide, MeshStandardMaterial } from "three";
import { SEA_Y } from "../../lib/world/terrain";
import Instances from "./Instances";
import { buildSea } from "./island/build";
import { C, mat } from "./palette";
import River from "./sea/River";
import Whale from "./sea/Whale";

// The open sea's own life: a slow sin-wave perturbation on the surface
// normal so it visibly shimmers, the same onBeforeCompile trick as the
// river's waterMaterial (sea/River.jsx).
function seaMaterial(time) {
  const m = new MeshStandardMaterial({ color: C.sea, roughness: 0.3, metalness: 0.05 });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace(
        "#include <beginnormal_vertex>",
        `#include <beginnormal_vertex>
        objectNormal.xy += 0.06 * vec2(sin(uTime * 0.7 + position.x * 0.15 + position.y * 0.11), cos(uTime * 0.55 - position.x * 0.1 + position.y * 0.17));`,
      );
  };
  return m;
}

export default function Sea() {
  const kit = useMemo(buildSea, []);
  const foam = useRef();
  const seaTime = useMemo(() => ({ value: 0 }), []);
  const seaMat = useMemo(() => seaMaterial(seaTime), [seaTime]);
  useFrame(({ clock }) => {
    seaTime.value = clock.elapsedTime;
    if (foam.current) foam.current.material.opacity = 0.55 + Math.sin(clock.elapsedTime * 0.9) * 0.2;
  });
  return (
    <>
      {/* the open sea: base plane, the lighter shelf by the cliff, a breathing foam line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, SEA_Y, 0]} material={seaMat}>
        <planeGeometry args={[700, 700, 64, 64]} />
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
