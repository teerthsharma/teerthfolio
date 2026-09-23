"use client";

// The far horizon: a ring of snow-capped ice ranges that always sits at the
// edge of view, the way a real horizon does. It rides with the camera
// (recentred under it and rescaled to its height every frame) rather than
// sitting at one fixed spot on the island: the follow camera's fixed
// 42-degree pitch only ever shows a modest disc of ground around it (see the
// note atop Atmosphere.jsx), so anything parked at one point in the world is
// either always in view or never is -- confirmed by capture, a ring fixed at
// the island's own scale never once entered frame at any zoom. Rescaling
// with camera height keeps the same peaks-just-below-the-top-edge framing at
// every zoom (a capture aid) exactly, because both the camera's height above
// the ring and its distance to it grow together. One static geometry, moved
// and scaled, never rebuilt; Island.jsx's scene fog fades it toward the sky.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, MeshBasicMaterial } from "three";
import { mulberry32 } from "../life/spawn";
import { C } from "../palette";

// The follow camera's own height above its focus (CameraRig.jsx: 42 degrees
// of elevation, 35.5 m out) -- the scale this ring's numbers below are
// drawn at; camera.position.y / REF_CY rescales it for any other height
// (zoomed in or out, or the higher overview before Start).
const REF_CY = Math.sin((42 * Math.PI) / 180) * 35.5;

const PEAKS = 34;
const RADIUS = 31; // m from the camera, at REF_CY
const JAG = 6; // m of radius jitter, so the ring reads as a range, not a drum
const VALLEY = [5, 8]; // m: the low points between summits
const PEAK_H = [10, 16]; // m: tucked just under the top-of-frame cutoff
const SKIRT = -8; // m: sunk below the valleys so no gap shows at the base

function buildRange() {
  const rand = mulberry32(20260401);
  const cap = new Color(C.snow);
  const base = new Color(C.deepIce);
  const pos = [];
  const col = [];
  const push = (x, y, z, color) => {
    pos.push(x, y, z);
    col.push(color.r, color.g, color.b);
  };
  const valleyAt = (a) => {
    const r = RADIUS + (rand() - 0.5) * JAG * 0.6;
    return { x: Math.sin(a) * r, z: -Math.cos(a) * r, h: VALLEY[0] + rand() * (VALLEY[1] - VALLEY[0]) };
  };
  const step = (Math.PI * 2) / PEAKS;
  let prev = valleyAt(0);
  for (let i = 0; i < PEAKS; i++) {
    const next = valleyAt((i + 1) * step);
    const mid = i * step + step * 0.5;
    const pr = RADIUS + (rand() - 0.5) * JAG;
    const peak = { x: Math.sin(mid) * pr, z: -Math.cos(mid) * pr, h: PEAK_H[0] + rand() * (PEAK_H[1] - PEAK_H[0]) };

    // the ridge face: valley -> summit -> next valley, snow-capped by colour
    push(prev.x, prev.h, prev.z, base);
    push(peak.x, peak.h, peak.z, cap);
    push(next.x, next.h, next.z, base);

    // the skirt below each edge, so the range meets the ground with no gap
    push(prev.x, prev.h, prev.z, base);
    push(next.x, next.h, next.z, base);
    push(next.x, SKIRT, next.z, base);
    push(prev.x, prev.h, prev.z, base);
    push(next.x, SKIRT, next.z, base);
    push(prev.x, SKIRT, prev.z, base);

    prev = next;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(pos, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(col, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export default function Horizon() {
  const ref = useRef();
  const geometry = useMemo(buildRange, []);
  const material = useMemo(() => new MeshBasicMaterial({ vertexColors: true, side: DoubleSide, toneMapped: false }), []);

  useFrame(({ camera }) => {
    const group = ref.current;
    if (!group) return;
    group.position.set(camera.position.x, 0, camera.position.z);
    group.scale.setScalar(Math.max(0.001, camera.position.y) / REF_CY);
  });

  return (
    <group ref={ref}>
      <mesh geometry={geometry} material={material} />
    </group>
  );
}
