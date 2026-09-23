"use client";

// The player. Placeholder body: the pose plumbing (position, heading, speed
// from live.seal) is the contract; the body inside <group ref={body}> is
// meant to be replaced.

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { live } from "../../lib/world/store";

export default function Seal() {
  const root = useRef();
  const body = useRef();

  useFrame((state) => {
    const s = live.seal;
    root.current.position.set(s.x, 0, s.z);
    root.current.rotation.y = s.heading;
    // Galumph: seals move by humping forward, so the body bobs with speed.
    const t = state.clock.elapsedTime;
    const gait = Math.min(s.speed / 6, 1);
    body.current.position.y = Math.abs(Math.sin(t * 9)) * 0.18 * gait;
  });

  return (
    <group ref={root}>
      <group ref={body}>
        <mesh castShadow position={[0, 0.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[0.55, 1.1, 8, 16]} />
          <meshStandardMaterial color="#6f7f94" roughness={0.6} />
        </mesh>
        <mesh castShadow position={[0, 0.95, 0.85]}>
          <sphereGeometry args={[0.48, 24, 16]} />
          <meshStandardMaterial color="#7d8da2" roughness={0.6} />
        </mesh>
        {[-0.18, 0.18].map((x) => (
          <mesh key={x} position={[x, 1.08, 1.25]}>
            <sphereGeometry args={[0.08, 12, 8]} />
            <meshStandardMaterial color="#111" roughness={0.2} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
