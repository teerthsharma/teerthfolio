"use client";

// A quiet stand-in sculpture: a slowly turning faceted stone in the place's
// accent. Shown until a figure's own sculpture is built.

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { mat } from "../palette";

export default function Placeholder({ place }) {
  const ref = useRef();
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.4;
  });
  return (
    <group ref={ref} position={[0, 1.6, 0]}>
      <mesh castShadow material={mat(place.color, { roughness: 0.5 })}>
        <icosahedronGeometry args={[1.1, 0]} />
      </mesh>
    </group>
  );
}
