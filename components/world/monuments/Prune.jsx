"use client";

// Highway Pass's story: google/highway #3244 (place id pr-highway-3244),
// played in the mouth of the pass (components/world/land/GoogleRange.jsx
// puts it there). Props: { place, origin: [x, z] world of the local origin }.
// Local origin on the snow at the middle of the pass mouth; +z faces the
// camera and the dock.
//
// The anomaly (the pass's radiation, place.radiation): its boulders float.
// Sixteen of them hang in a row across the pass mouth, bobbing, each held up
// by a glowing crystal keel, their shadows on the snow below; four big ones
// drift higher up the pass.
//
// The story (figure.desc): the floating boulders are the keys. The old
// check sweeps the row and compares each key with every key before it: fan
// after fan of coral arcs fires until the whole dome of every pair is lit.
// Then the light drains from the top down and stops where the windows stop
// overlapping, leaving only the low mint arcs; the new check sweeps again
// and fires only those. Two amber duplicate pairs flash in both sweeps.
// Every arc is baked once into merged geometry sorted in firing order, so a
// sweep or the drain is just a draw range: no per-arc work per frame.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { CatmullRomCurve3, Color, IcosahedronGeometry, MeshBasicMaterial, Object3D, OctahedronGeometry, SphereGeometry, TubeGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useUi } from "../../../lib/world/store";
import { heightAt } from "../../../lib/world/terrain";
import { glow, mat } from "../palette";
import { DOME_PAIRS, DUP_PAIRS, KEPT_PAIRS, KEPT_TOP, KEY_COUNT, KEY_R, KEY_X, KEY_Y, MAX_HEIGHT, PRUNED_PAIRS, firedBy } from "./parts/prune-layout";

const MINT = "#2fd79c";
const MINT_LIT = "#6ff7c4";
const AMBER = "#ffbf3c";
const ROCK = "#55565f";

// ---- the arcs -----------------------------------------------------------------

const SEG = 14; // tube segments along an arc
const SIDES = 5;
const PER = SEG * SIDES * 6; // index count of one arc
const BOW = 0.28; // an arc's crown leans toward the camera by this much of its height

function arcTube(p, radius, dz = 0) {
  const x0 = KEY_X[p.i];
  const x1 = KEY_X[p.j];
  const cx = (x0 + x1) / 2;
  const rx = (x1 - x0) / 2;
  const pts = [];
  for (let s = 0; s <= 10; s++) {
    const a = Math.PI * (1 - s / 10);
    const up = Math.sin(a);
    pts.push(new Vector3(cx + rx * Math.cos(a), KEY_Y + p.h * up, dz + BOW * p.h * up));
  }
  return new TubeGeometry(new CatmullRomCurve3(pts), SEG, radius, SIDES, false);
}
const merged = (pairs, radius, dz) => mergeGeometries(pairs.map((p) => arcTube(p, radius, dz)));

const FIRE_GEO = merged(DOME_PAIRS, 0.085); // every pair, in the old sweep's order
const DRAIN_GEO = merged(PRUNED_PAIRS, 0.085); // the pairs that never overlap, lowest first
const KEPT_GEO = merged(KEPT_PAIRS, 0.105); // the pairs that do: they stay
const KEPT_LIT_GEO = merged(KEPT_PAIRS, 0.135); // the same, lit by the new sweep
const DUP_GEOS = DUP_PAIRS.map((p) => arcTube(p, 0.16, 0.06));
const DUP_J = DUP_PAIRS.map((p) => p.j);

// ---- the boulders ----------------------------------------------------------------

// The keys, then the big ones drifting higher up the pass: local x, z, size,
// float (m above the ground under it).
const BIG = [
  [-3.4, -5.5, 1.05, 2.4],
  [3.8, -7.8, 1.35, 3.0],
  [-0.9, -11.5, 1.7, 3.6],
  [2.4, -15.5, 1.25, 4.4],
];
const ROCKS = [...KEY_X.map((x, i) => [x, 0, KEY_R[i], KEY_Y, true]), ...BIG.map(([x, z, r, f]) => [x, z, r, f, false])];
const ROCK_GEO = new IcosahedronGeometry(1, 0);
const KEEL_GEO = new OctahedronGeometry(1, 0);
const SPARK_GEO = new SphereGeometry(1, 12, 8);
const rand = (i, k) => {
  const s = Math.sin(i * 91.7 + k * 17.3) * 43758.5453;
  return s - Math.floor(s);
};

// ---- the loop ------------------------------------------------------------------------

const CYCLE_FAR = 11; // s
const CYCLE_NEAR = 7.5;
const S1 = [0.02, 0.3]; // the old sweep
const DRAIN = [0.4, 0.56];
const S2 = [0.6, 0.8]; // the new sweep
const OUT = [0.93, 0.99]; // the kept arcs go out, right to left, and it loops

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const span = (p, [a, b]) => clamp01((p - a) / (b - a));
const X0 = KEY_X[0] - 0.6;
const X1 = KEY_X[KEY_COUNT - 1] + 0.6;
// the last key a sweep at x has reached
function reached(x) {
  let k = -1;
  while (k < KEY_COUNT - 1 && KEY_X[k + 1] <= x) k++;
  return k;
}

const dummy = new Object3D();
const tint = new Color();
const white = new Color("#ffffff");

export default function Prune({ place, origin = [place.x, place.z] }) {
  const near = useUi((s) => s.near === place.id);
  const nearRef = useRef(near);
  nearRef.current = near;

  const coral = place.radiation ?? place.color;
  const fireMat = mat(coral, { flat: false, roughness: 0.45, emissive: coral, emissiveIntensity: 0.55 });
  const keptMat = mat(MINT, { flat: false, roughness: 0.45, emissive: MINT, emissiveIntensity: 0.35 });
  const keptLitMat = mat(MINT_LIT, { flat: false, roughness: 0.4, emissive: MINT_LIT, emissiveIntensity: 0.9 });
  const dupMat = mat(AMBER, { flat: false, roughness: 0.4, emissive: AMBER, emissiveIntensity: 1.3 });
  const rockMat = mat(ROCK, { roughness: 0.85 });
  const keelMat = useMemo(() => new MeshBasicMaterial({ color: "#ffffff", toneMapped: false }), []);
  const sparkMat = useMemo(() => new MeshBasicMaterial({ color: "#fff6ea", toneMapped: false }), []);
  const haloMat = useMemo(() => glow(coral, 0.4).clone(), [coral]);

  // where each boulder rests: its float height over the ground under it
  const rest = useMemo(() => ROCKS.map(([x, z, , f, key]) => (key ? f : heightAt(origin[0] + x, origin[1] + z) + f)), [origin]);

  const fire = useRef(null);
  const drain = useRef(null);
  const kept = useRef(null);
  const keptLit = useRef(null);
  const dups = useRef([]);
  const rocks = useRef(null);
  const keels = useRef(null);
  const spark = useRef(null);
  const halo = useRef(null);
  const phase = useRef(0);
  const nearK = useRef(0);

  useLayoutEffect(() => {
    const k = keels.current;
    if (!k) return;
    for (let i = 0; i < ROCKS.length; i++) k.setColorAt(i, tint.set(coral));
    k.instanceColor.needsUpdate = true;
  }, [coral]);

  useFrame((state, dt) => {
    nearK.current += ((nearRef.current ? 1 : 0) - nearK.current) * (1 - Math.exp(-4 * dt));
    const cycle = CYCLE_FAR - (CYCLE_FAR - CYCLE_NEAR) * nearK.current;
    phase.current = (phase.current + Math.min(dt, 0.1) / cycle) % 1;
    const p = phase.current;
    const t = state.clock.elapsedTime;

    // the sweeps: where the light is along the row, and which key it has reached
    const u1 = span(p, S1);
    const u2 = span(p, S2);
    const sweeping = (p >= S1[0] && p < S1[1]) || (p >= S2[0] && p < S2[1]);
    const sx = X0 + (X1 - X0) * (p < S2[0] ? u1 : u2);
    const k1 = p < S1[1] ? reached(sx) : KEY_COUNT - 1;

    // the old check: every pair fires, fan by fan, then drains from the top
    const inFire = p < DRAIN[0];
    fire.current.visible = inFire;
    fire.current.geometry.setDrawRange(0, PER * firedBy(DOME_PAIRS, k1));
    const cut = MAX_HEIGHT - (MAX_HEIGHT - KEPT_TOP) * span(p, DRAIN);
    let n = 0;
    while (n < PRUNED_PAIRS.length && PRUNED_PAIRS[n].h < cut) n++;
    drain.current.visible = !inFire && p < DRAIN[1];
    drain.current.geometry.setDrawRange(0, PER * n);

    // the new check: the kept arcs stay, and its sweep fires only those
    const out = reached(X1 - (X1 - X0) * span(p, OUT));
    kept.current.visible = !inFire;
    kept.current.geometry.setDrawRange(0, PER * firedBy(KEPT_PAIRS, p < OUT[0] ? KEY_COUNT : out));
    const k2 = p < S2[0] ? -1 : p < S2[1] ? reached(sx) : p < OUT[0] ? KEY_COUNT : out;
    keptLit.current.geometry.setDrawRange(0, PER * firedBy(KEPT_PAIRS, k2));

    // the duplicates: amber, in both sweeps, as the light reaches them
    for (let d = 0; d < DUP_J.length; d++) {
      const m = dups.current[d];
      if (!m) continue;
      const j = DUP_J[d];
      const at = (KEY_X[j] - X0) / (X1 - X0);
      const hit = (u) => u > at && u < at + 0.16;
      m.visible = (p >= S1[0] && p < DRAIN[0] && hit(u1)) || (p >= S2[0] && p < OUT[0] && hit(u2));
    }

    // the spark that carries each sweep
    spark.current.visible = sweeping;
    halo.current.visible = sweeping;
    if (sweeping) {
      spark.current.position.set(sx, KEY_Y + 0.05, 0.25);
      halo.current.position.copy(spark.current.position);
      const pulse = 1 + 0.12 * Math.sin(t * 22);
      spark.current.scale.setScalar(0.26 * pulse);
      halo.current.scale.setScalar(0.8 * pulse);
      haloMat.color.set(p < S2[0] ? coral : MINT_LIT);
    }

    // the boulders: bobbing on their keels, a keel flaring as the spark passes
    const bob = 1 + 0.6 * nearK.current;
    for (let i = 0; i < ROCKS.length; i++) {
      const [x, z, r, , key] = ROCKS[i];
      const y = rest[i] + (key ? 0.07 : 0.22) * bob * Math.sin(t * (key ? 1.1 : 0.55) + i * 1.9);
      dummy.position.set(x, y, z);
      dummy.rotation.set(rand(i, 1) * 3, rand(i, 2) * 6 + (key ? 0 : t * 0.06), rand(i, 3) * 3);
      dummy.scale.set(r, r * 0.84, r * 0.94);
      dummy.updateMatrix();
      rocks.current.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x, y - r * 0.78, z);
      dummy.rotation.set(0, rand(i, 4) * 3, 0);
      dummy.scale.set(r * 0.34, r * 0.72, r * 0.34);
      dummy.updateMatrix();
      keels.current.setMatrixAt(i, dummy.matrix);
      if (key) {
        const flare = sweeping ? clamp01(1 - Math.abs(sx - x) / 0.9) : 0;
        keels.current.setColorAt(i, tint.set(coral).lerp(white, flare * 0.85));
      }
    }
    rocks.current.instanceMatrix.needsUpdate = true;
    keels.current.instanceMatrix.needsUpdate = true;
    keels.current.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={rocks} args={[ROCK_GEO, rockMat, ROCKS.length]} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh ref={keels} args={[KEEL_GEO, keelMat, ROCKS.length]} frustumCulled={false} />
      <mesh ref={fire} geometry={FIRE_GEO} material={fireMat} />
      <mesh ref={drain} geometry={DRAIN_GEO} material={fireMat} visible={false} />
      <mesh ref={kept} geometry={KEPT_GEO} material={keptMat} visible={false} />
      <mesh ref={keptLit} geometry={KEPT_LIT_GEO} material={keptLitMat} />
      {DUP_GEOS.map((g, d) => (
        <mesh key={d} ref={(m) => (dups.current[d] = m)} geometry={g} material={dupMat} visible={false} />
      ))}
      <mesh ref={spark} geometry={SPARK_GEO} material={sparkMat} visible={false} />
      <mesh ref={halo} geometry={SPARK_GEO} material={haloMat} visible={false} />
    </group>
  );
}
