"use client";

// TRITON (triton-lang/kernels #22): the ice mountain on the north coast
// (lib/world/terrain.js shapes it; the peak never enters the frame, seals do
// not climb mountains). The follow camera only ever sees its foot, so the
// foot is the spectacle (parts/triton-glacier.js builds it):
//
//   - THE GLACIER FRONT: a wall of chunky seracs, ultramarine at the snow to
//     pale aqua up high, snow on their crowns, one violet ash layer through
//     the old ice, and the crevasses between them lit Cherenkov blue from
//     inside (every place here is radioactive; this glacier glows).
//   - THE ICE CAVE: a natural arch of ice over the river's source, icicles on
//     its lip, its throat glowing white-hot deep in. The river is born here.
//   - THE ICEFALL: the glacier breaking into tumbled blocks over the lobe
//     above the reading point.
//   - THE ANOMALY: the icefall calves, then UN-calves. A block breaks off,
//     topples onto the snow and shatters; a moment later it all plays
//     backwards, glowing Cherenkov blue, the chips flying home and the block
//     standing back up into the glacier. Three blocks, staggered, so one is
//     always on its way down or back. Quicker with the seal near, and the
//     ice's inner light brighter.
//
// Nothing here explains the kernel (SHOW, NEVER TELL): the schedule figure
// (monuments/Schedule.jsx) is no longer mounted. Snow falling up is the
// whole island's (sky/Upfall.jsx), so it is not Triton's trick.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, DoubleSide, MeshBasicMaterial, Object3D, Vector3 } from "three";
import { PLACE_BY_ID } from "../../../lib/world/places";
import { useUi } from "../../../lib/world/store";
import { mat } from "../palette";
import { buildCalver, buildChip, buildTriton, CALVER, CALVERS } from "./parts/triton-glacier";

const TRITON = PLACE_BY_ID["pr-triton-kernels-22"];

const { ice: ICE_GEO, glow: GLOW_GEO } = buildTriton();
const CALVER_GEO = buildCalver();
const CHIP_GEO = buildChip();

// One block's loop (s). It loosens, topples, lies there in pieces, then
// rewinds: chips first, then the block, glowing while time runs backwards.
const LOOP = 8.5;
const LOOSEN = 0.6; // leaning out
const LANDED = 1.3; // flat on the snow, shattered
const CHIPS_BACK = [3.5, 3.9];
const STAND_BACK = [3.9, 4.6];
const GLOW = [3.3, 3.6, 4.6, 5.8]; // rise from, full at, fade from, gone at
const TOPPLE = Math.PI / 2;
const G = 14; // m/s^2, the chips' gravity
const CHIPS_PER = 7;

const hash = (n) => {
  const s = Math.sin(n * 91.7 + 17.3) * 43758.5453;
  return s - Math.floor(s);
};
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const smooth = (a, b, t) => {
  const x = clamp01((t - a) / (b - a));
  return x * x * (3 - 2 * x);
};

// Each chip: where under the fallen block it starts (d along the fall, w
// across it), how it flies (sideways, forward, up) and how it tumbles.
const CHIPS = CALVERS.flatMap((_, b) =>
  Array.from({ length: CHIPS_PER }, (_, i) => {
    const s = b * 11 + i;
    const vy = 3.2 + 1.4 * hash(s + 3);
    return {
      block: b,
      d: 0.4 + 3 * hash(s),
      w: (hash(s + 1) - 0.5) * 1.8,
      vw: (hash(s + 2) < 0.5 ? -1 : 1) * (1.2 + 1.8 * hash(s + 4)),
      vd: 0.3 + 1.6 * hash(s + 5),
      vy,
      flight: (2 * vy) / G,
      size: 0.7 + 0.6 * hash(s + 6),
      spin: 4 + 6 * hash(s + 7),
    };
  }),
);

const dummy = new Object3D();
const pivot = new Vector3();
const WHITE = new Color(1, 1, 1);
const RADIANT = new Color(0.55, 1.9, 2.5); // multiplies the ice's own colour: Cherenkov-lit
const tint = new Color();

// Where each block is in its loop at time u, into `out`: the topple angle,
// how far its pivot has dropped and slid, and how much it glows.
function blockPose(u, base, out) {
  let s = 0; // 0 standing in the glacier, 1 flat on the snow
  let theta = 0;
  if (u < LOOSEN) {
    theta = 0.22 * smooth(0, LOOSEN, u) + Math.sin(u * 60) * 0.015 * (u / LOOSEN);
  } else if (u < LANDED) {
    const k = (u - LOOSEN) / (LANDED - LOOSEN);
    s = k * k;
    theta = 0.22 + (TOPPLE - 0.22) * k * k;
  } else if (u < STAND_BACK[0]) {
    s = 1;
    theta = TOPPLE;
  } else if (u < STAND_BACK[1]) {
    // the fall played backwards: fast off the snow, slowing into its place
    const k = 1 - (u - STAND_BACK[0]) / (STAND_BACK[1] - STAND_BACK[0]);
    s = k * k;
    theta = TOPPLE * k * k;
  }
  out.theta = theta;
  out.drop = base * s; // the pivot sinks from the ice's lip to the snow
  out.slide = 0.4 * s;
  out.glow = smooth(GLOW[0], GLOW[1], u) * (1 - smooth(GLOW[2], GLOW[3], u));
  return out;
}

// How far along its flight a chip is at time u (-1: hidden inside its block).
function chipFlight(u, flight) {
  if (u < LANDED || u >= CHIPS_BACK[1]) return -1;
  if (u < CHIPS_BACK[0]) return Math.min(u - LANDED, flight);
  return flight * (1 - (u - CHIPS_BACK[0]) / (CHIPS_BACK[1] - CHIPS_BACK[0]));
}

function Calving({ lively }) {
  const blocks = useRef();
  const chips = useRef();
  const clock = useRef(0);
  const pose = useRef({});
  const iceMat = useMemo(() => mat("#ffffff", { vertexColors: true, roughness: 0.32 }), []);
  const chipMat = useMemo(() => mat("#ffffff", { vertexColors: true, roughness: 0.25 }), []);

  useLayoutEffect(() => {
    for (let b = 0; b < CALVERS.length; b++) blocks.current.setColorAt(b, WHITE);
    blocks.current.instanceColor.needsUpdate = true;
  }, []);

  useFrame((_, dt) => {
    const bm = blocks.current;
    const cm = chips.current;
    if (!bm || !cm) return;
    clock.current += Math.min(dt, 0.1) * (lively ? 1.3 : 1);
    const t = clock.current;
    const p = pose.current;

    for (let b = 0; b < CALVERS.length; b++) {
      const c = CALVERS[b];
      const u = (((t + (b * LOOP) / CALVERS.length) % LOOP) + LOOP) % LOOP;
      blockPose(u, c.base, p);
      const sin = Math.sin(c.yaw);
      const cos = Math.cos(c.yaw);
      // the pivot: the block's front bottom edge, sliding out and down
      const reach = CALVER.front + p.slide;
      pivot.set(c.x + sin * reach, c.base - p.drop, c.z + cos * reach);
      // the block's origin swings round the pivot: local (0, 0, -front) turned by theta
      const oy = CALVER.front * Math.sin(p.theta);
      const oz = -CALVER.front * Math.cos(p.theta);
      dummy.position.set(pivot.x + sin * oz, pivot.y + oy, pivot.z + cos * oz);
      dummy.rotation.set(0, c.yaw, 0);
      dummy.rotateX(p.theta);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      bm.setMatrixAt(b, dummy.matrix);
      bm.setColorAt(b, tint.copy(WHITE).lerp(RADIANT, p.glow));

      // its chips, burst from under where it lies
      for (let i = 0; i < CHIPS_PER; i++) {
        const k = b * CHIPS_PER + i;
        const f = CHIPS[k];
        const tau = chipFlight(u, f.flight);
        if (tau < 0) {
          dummy.scale.setScalar(0);
        } else {
          const d = f.d + f.vd * tau;
          const w = f.w + f.vw * tau;
          const y = 0.25 + f.vy * tau - 0.5 * G * tau * tau;
          dummy.position.set(pivot.x + sin * d + cos * w, Math.max(0.25, y), pivot.z + cos * d - sin * w);
          dummy.rotation.set(tau * f.spin, tau * f.spin * 0.7, 0);
          dummy.scale.setScalar(f.size);
        }
        dummy.updateMatrix();
        cm.setMatrixAt(k, dummy.matrix);
      }
    }
    bm.instanceMatrix.needsUpdate = true;
    bm.instanceColor.needsUpdate = true;
    cm.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={blocks} args={[CALVER_GEO, iceMat, CALVERS.length]} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh ref={chips} args={[CHIP_GEO, chipMat, CHIPS.length]} castShadow frustumCulled={false} />
    </>
  );
}

export default function Triton() {
  const near = useUi((s) => s.near === TRITON.id);
  const iceMat = useMemo(() => mat("#ffffff", { vertexColors: true, roughness: 0.32 }), []);
  // Unlit: the light is inside the ice. Its own instance, so it can breathe.
  const glowMat = useMemo(() => new MeshBasicMaterial({ vertexColors: true, side: DoubleSide }), []);
  const bright = useRef(1);

  useFrame(({ clock }, dt) => {
    bright.current += ((near ? 1.2 : 1) - bright.current) * Math.min(1, dt * 3);
    glowMat.color.setScalar(bright.current * (0.93 + 0.07 * Math.sin(clock.elapsedTime * 1.4)));
  });

  return (
    <group>
      <mesh geometry={ICE_GEO} material={iceMat} castShadow receiveShadow />
      <mesh geometry={GLOW_GEO} material={glowMat} />
      <Calving lively={near} />
    </group>
  );
}
