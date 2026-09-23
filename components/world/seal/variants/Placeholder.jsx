"use client";

// Stand-in body until A, B and C are built. It shows the contract a variant
// keeps: animate from `drive` inside useFrame, put `headRef` on the head
// group, and render <Outfit> inside that group. Delete once no variant
// imports it.

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import Outfit, { HEAD_RADIUS } from "../Outfit";

export default function Placeholder({ near, drive, headRef, color }) {
  const body = useRef();
  const eyes = useRef();

  useFrame(() => {
    const d = drive;
    const squash = d.squash * 0.3;
    const b = body.current;
    b.position.y = d.hump * 0.12;
    b.rotation.z = d.lean + Math.sin(d.t * 18) * 0.12 * d.happy;
    b.scale.set(1 + squash * 0.5, 1 - squash + Math.sin(d.t * 2.4) * 0.015, 1 + squash * 0.5);
    headRef.current.rotation.set(-d.lookPitch, d.lookYaw, 0, "YXZ");
    eyes.current.scale.y = 1 - Math.max(d.blink, d.happy * 0.7) * 0.9;
  });

  return (
    <group ref={body}>
      <mesh castShadow position={[0, 0.42, -0.2]} scale={[0.58, 0.44, 0.95]}>
        <sphereGeometry args={[1, 32, 20]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <group ref={headRef} position={[0, 0.68, 0.5]}>
        <mesh castShadow>
          <sphereGeometry args={[HEAD_RADIUS, 32, 20]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
        <group ref={eyes} position={[0, 0.06, 0]}>
          {[-0.16, 0.16].map((x) => (
            <mesh key={x} position={[x, 0, 0.37]}>
              <sphereGeometry args={[0.1, 16, 12]} />
              <meshStandardMaterial color="#15161f" roughness={0.2} />
            </mesh>
          ))}
        </group>
        <mesh position={[0, -0.1, 0.44]} scale={[1.3, 0.9, 1]}>
          <sphereGeometry args={[0.06, 12, 8]} />
          <meshStandardMaterial color="#2d3140" roughness={0.3} />
        </mesh>
        <Outfit placeId={near} />
      </group>
    </group>
  );
}
