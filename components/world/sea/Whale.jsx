"use client";

// A humpback that surfaces offshore, past the river's mouth on the
// north-east coast: most of a slow patrol arc it swims hidden below the
// opaque sea plane, then it breaches — back arching through the surface,
// the dorsal hump clearing the water, a small spout, flukes lifting as it
// dives back under. Geometry from sea/build.js (no React, built once).

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { buildWhale } from "./build";
import { glow, mat } from "../palette";
import { SEA_Y } from "../../../lib/world/terrain";

// Offshore, clear of the rock field and the icebergs (island/build.js), in
// open sea past the river's mouth (~98, -39).
const PATROL = { x: 118, z: -20, radius: 14 };
const CYCLE = 17; // s: one loop of the patrol carries one breach
const SURFACE_AT = 0.6; // fraction of the cycle where the breach peaks
const SURFACE_SPAN = 0.26; // fraction of the cycle spent rising/falling
const REST_Y = SEA_Y - 5.5; // hidden below the opaque sea plane
const PEAK_Y = SEA_Y + 1.1; // back and hump clear the surface

export default function Whale() {
  const { whale, flukes, tail } = useMemo(buildWhale, []);
  const group = useRef();
  const flukeGroup = useRef();
  const spout = useRef();
  const bodyMat = useMemo(() => mat("#ffffff", { vertexColors: true, roughness: 0.35 }), []);
  const spoutMat = useMemo(() => glow("#eef6ff", 0.5).clone(), []);

  useFrame(({ clock }) => {
    const u = (clock.elapsedTime % CYCLE) / CYCLE;
    const angle = 0.6 + u * Math.PI * 0.8; // a slow arc, not a full circle
    const cx = PATROL.x + Math.cos(angle) * PATROL.radius;
    const cz = PATROL.z + Math.sin(angle) * PATROL.radius;

    const d = Math.abs(u - SURFACE_AT) / (SURFACE_SPAN / 2);
    const rise = Math.max(0, 1 - d);
    const breach = rise * rise * (3 - 2 * rise); // smoothstep, 0 under, 1 at the peak

    const g = group.current;
    if (g) {
      g.position.set(cx, REST_Y + (PEAK_Y - REST_Y) * breach, cz);
      g.rotation.y = -angle - Math.PI / 2; // face the way it swims
      g.rotation.x = breach * 0.16; // a slight nose-down arch at the peak
    }
    if (flukeGroup.current) flukeGroup.current.rotation.x = -0.55 + breach * 0.85; // lift as it rolls back under
    if (spout.current) {
      const s = breach > 0.75 ? (breach - 0.75) / 0.25 : 0;
      spout.current.scale.setScalar(0.35 + s * 1.4);
      spout.current.material.opacity = s * 0.5;
    }
  });

  return (
    <group ref={group}>
      <mesh geometry={whale} material={bodyMat} castShadow />
      <group ref={flukeGroup} position={[0, 0, tail]}>
        <mesh geometry={flukes} material={bodyMat} castShadow />
      </group>
      <mesh ref={spout} position={[0, 2.3, 3.2]} material={spoutMat}>
        <sphereGeometry args={[0.5, 8, 6]} />
      </mesh>
    </group>
  );
}
