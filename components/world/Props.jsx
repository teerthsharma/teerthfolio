"use client";

// Loose things on the ice that the seal can shove. Their physics lives in
// lib/world/motion.js (stepProps); this file seeds them into live.props and
// draws them. Placeholder: snowballs.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { live } from "../../lib/world/store";

const SEEDS = [
  [-4, 5], [4.5, 6], [-7, -1], [8, 1], [-2, 14], [3, 17], [-10, 9], [11, 10],
];

export default function Props() {
  const meshes = useRef([]);
  const props = useMemo(() => {
    live.props = SEEDS.map(([x, z]) => ({ x, z, vx: 0, vz: 0, radius: 0.55, mass: 1, spin: 0 }));
    return live.props;
  }, []);

  useFrame(() => {
    props.forEach((p, i) => {
      const m = meshes.current[i];
      if (!m) return;
      m.position.set(p.x, p.radius, p.z);
      m.rotation.x += p.vz * 0.02;
      m.rotation.z -= p.vx * 0.02;
    });
  });

  return props.map((p, i) => (
    <mesh key={i} ref={(m) => (meshes.current[i] = m)} castShadow receiveShadow>
      <sphereGeometry args={[p.radius, 20, 14]} />
      <meshStandardMaterial color="#ffffff" roughness={0.9} />
    </mesh>
  ));
}
