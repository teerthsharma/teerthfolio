"use client";

// Sculpture for the "units" figure: google-deepmind/mujoco #3396 (place id
// pr-mujoco-3396). Retells the landing site's figure in 3D: island discovery
// used to allocate scratch that grew with the square of the tree count; the
// disjoint-set rebuild needs one allocation, flat. A single blue cube is that
// whole allocation — the new path. Beside it a coral block assembles from
// 1,282 cubes of the exact same size, one for every time the old path asked
// for that much again, holds, then drains back into the blue cube. Loop.
// (data/showcase.json, figure "units": labels "1,282", "new path, whole
// allocation", "old path" — the block/cube size contrast tells this without
// spelling the numbers out again; the card's headline, "1,281.6x less
// scratch", already stands in 3D type on the plinth via Monument.jsx.)
//
// Local origin: the top of the plinth; +z faces the camera and the dock.
// Props: { place, near }.

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { BoxGeometry, Color, Object3D } from "three";
import { glow, mat } from "../palette";
import { unitsBlock } from "./parts/units-layout";

const EDGE = 0.28; // every cube, lone or in the block, is this size — never enlarged to read
const GAP = 0.08; // fraction of EDGE left as a seam between cubes
const CUBE_SIZE = EDGE * (1 - GAP);
const SHOWN = 1282; // labels[3]: "1,282"

const BLOCK_X = 1.2; // block footprint centre, local x
const CUBE_POS = { x: -1.35, y: EDGE / 2, z: 0 }; // the lone cube, flush on the plinth top

const CORAL_HEX = "#d9376e"; // fig.js coral-500: the old, quadratic path
const BLUE_HEX = "#2456dc"; // fig.js blue-500: the new, linear path

const GROW = 2.2; // s: the block assembles, cube by cube
const HOLD = 2.0; // s: it stands whole
const COLLAPSE = 1.3; // s: it drains back into the blue cube
const PAUSE = 0.7; // s: only the blue cube remains — the whole story, at rest
const TOTAL = GROW + HOLD + COLLAPSE + PAUSE;

const FLY = 0.5; // s a flourish copy spends in the air
const INTERVAL = 0.22; // s between departures
const NF = 8; // concurrent flourish copies, comfortably above FLY / INTERVAL

const LAYOUT = unitsBlock(SHOWN, EDGE); // where cube n sits, in fill order — computed once
const CUBE_GEO = new BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);

const ease = (u) => u * u * (3 - 2 * u); // smoothstep: slow in, slow out
const lerp = (a, b, u) => a + (b - a) * u;
const clamp01 = (u) => (u < 0 ? 0 : u > 1 ? 1 : u);

// Scratch reused every frame: never allocate inside useFrame.
const dummy = new Object3D();
const tmpColor = new Color();
const coralColor = new Color(CORAL_HEX);
const blueColor = new Color(BLUE_HEX);

// Where the block currently holds cube #idx (block-local + the block's x
// offset, so it lines up with a flourish copy flying at the monument root).
function blockPoint(idx, out) {
  const i = Math.max(0, Math.min(SHOWN - 1, idx)) * 3;
  out.x = LAYOUT.positions[i] + BLOCK_X;
  out.y = LAYOUT.positions[i + 1];
  out.z = LAYOUT.positions[i + 2];
  return out;
}

// One flourish copy's flight for slot m at elapsed time `t` within a phase of
// length `dur`, travelling `reverse=false` cube -> block or `true` block ->
// cube. Writes its instance matrix + colour, or hides it (scale 0) when idle.
const flourishTarget = { x: 0, y: 0, z: 0 };
function placeFlourish(mesh, m, t, dur, reverse) {
  const n0 = Math.floor(t / INTERVAL);
  const idx = n0 - m;
  const dep = idx * INTERVAL;
  const age = t - dep;
  if (idx < 0 || age < 0 || age > FLY) {
    dummy.position.set(0, -5, 0);
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    mesh.setMatrixAt(m, dummy.matrix);
    return;
  }
  const u = age / FLY;
  const frac = ease(clamp01(dep / dur));
  const blockIdx = reverse ? SHOWN - 1 - Math.floor(SHOWN * frac) : Math.floor(SHOWN * frac);
  blockPoint(blockIdx, flourishTarget);
  // reverse: block -> cube (collapse). forward: cube -> block (grow). No
  // array literal here — six scalars, not a tuple, so nothing allocates.
  const sx = reverse ? flourishTarget.x : CUBE_POS.x;
  const sy = reverse ? flourishTarget.y : CUBE_POS.y;
  const sz = reverse ? flourishTarget.z : CUBE_POS.z;
  const ex = reverse ? CUBE_POS.x : flourishTarget.x;
  const ey = reverse ? CUBE_POS.y : flourishTarget.y;
  const ez = reverse ? CUBE_POS.z : flourishTarget.z;
  dummy.position.set(lerp(sx, ex, u), lerp(sy, ey, u) + Math.sin(Math.PI * u) * 0.9, lerp(sz, ez, u));
  dummy.scale.setScalar(1);
  dummy.updateMatrix();
  mesh.setMatrixAt(m, dummy.matrix);
  tmpColor.copy(reverse ? coralColor : blueColor).lerp(reverse ? blueColor : coralColor, u);
  mesh.setColorAt(m, tmpColor);
}

export default function Units({ near }) {
  const blockRef = useRef();
  const flourishRef = useRef();
  const blueRef = useRef();
  const coralMat = useRef();
  const blueMat = useRef();
  const vt = useRef(0);

  // Give each material its own instance to animate (mat() is a shared,
  // read-only cache): built once, mutated in place from here on.
  if (!coralMat.current) coralMat.current = mat(CORAL_HEX, { roughness: 0.5, emissive: CORAL_HEX, emissiveIntensity: 0.1 }).clone();
  if (!blueMat.current) blueMat.current = mat(BLUE_HEX, { roughness: 0.4, emissive: BLUE_HEX, emissiveIntensity: 0.3 }).clone();

  // The block's cubes sit at their final positions from the first frame;
  // only how many of them are drawn (mesh.count) ever changes.
  useEffect(() => {
    const mesh = blockRef.current;
    if (!mesh) return;
    // dummy is shared with the per-frame flourish loop below, which may
    // already have run (and zeroed its scale) by the time this effect fires
    // — reset both explicitly rather than trust whatever dummy was left at.
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    for (let n = 0; n < SHOWN; n++) {
      dummy.position.set(LAYOUT.positions[n * 3], LAYOUT.positions[n * 3 + 1], LAYOUT.positions[n * 3 + 2]);
      dummy.updateMatrix();
      mesh.setMatrixAt(n, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = 0;
  }, []);

  useFrame((_, dt) => {
    const speedMul = near ? 1.6 : 1;
    const glowMul = near ? 1.5 : 1;
    vt.current += dt * speedMul;
    const phase = vt.current % TOTAL;

    let landed = SHOWN;
    let flourishT = -1;
    let flourishDur = GROW;
    let flourishReverse = false;
    if (phase < GROW) {
      landed = Math.floor(SHOWN * ease(phase / GROW));
      flourishT = phase;
    } else if (phase < GROW + HOLD) {
      landed = SHOWN;
    } else if (phase < GROW + HOLD + COLLAPSE) {
      const u = (phase - GROW - HOLD) / COLLAPSE;
      landed = SHOWN - Math.floor(SHOWN * ease(u));
      flourishT = phase - GROW - HOLD;
      flourishDur = COLLAPSE;
      flourishReverse = true;
    } else {
      landed = 0;
    }

    if (blockRef.current) blockRef.current.count = landed;
    coralMat.current.emissiveIntensity = (0.08 + 0.05 * Math.sin(vt.current * 2.2)) * glowMul;

    const inPause = phase >= GROW + HOLD + COLLAPSE;
    const flashAge = inPause ? phase - (GROW + HOLD + COLLAPSE) : -1;
    const flash = flashAge >= 0 ? Math.exp(-flashAge * 6) : 0;
    blueMat.current.emissiveIntensity = (0.3 + flash * 1.4) * glowMul;
    if (blueRef.current) blueRef.current.scale.setScalar(1 + Math.sin(vt.current * 2) * 0.04 + flash * 0.15);

    const fMesh = flourishRef.current;
    if (fMesh) {
      for (let m = 0; m < NF; m++) {
        if (flourishT < 0) {
          dummy.position.set(0, -5, 0);
          dummy.scale.setScalar(0);
          dummy.updateMatrix();
          fMesh.setMatrixAt(m, dummy.matrix);
        } else {
          placeFlourish(fMesh, m, flourishT, flourishDur, flourishReverse);
        }
      }
      fMesh.instanceMatrix.needsUpdate = true;
      if (fMesh.instanceColor) fMesh.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      <group position={[BLOCK_X, 0, 0]}>
        <instancedMesh ref={blockRef} args={[CUBE_GEO, coralMat.current, SHOWN]} castShadow receiveShadow frustumCulled={false} />
      </group>

      {/* The lone cube stays literally tiny — same size as one block cube,
          the whole point of the story — so a halo + a spotlit ring on the
          ground mark the spot the way the figure gives it its own shadow. */}
      <group ref={blueRef} position={[CUBE_POS.x, CUBE_POS.y, CUBE_POS.z]}>
        <mesh castShadow material={blueMat.current}>
          <boxGeometry args={[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]} />
        </mesh>
        <mesh material={glow(BLUE_HEX, 0.3)}>
          <sphereGeometry args={[CUBE_SIZE * 2.4, 14, 10]} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -EDGE / 2 + 0.01, 0]} material={glow(BLUE_HEX, 0.35)}>
          <ringGeometry args={[CUBE_SIZE * 1.4, CUBE_SIZE * 4, 28]} />
        </mesh>
      </group>

      <instancedMesh ref={flourishRef} args={[CUBE_GEO, mat("#ffffff", { roughness: 0.45 }), NF]} castShadow frustumCulled={false} />
    </group>
  );
}
