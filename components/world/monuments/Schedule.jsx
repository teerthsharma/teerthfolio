"use client";

// Sculpture for the "schedule" figure: triton-lang/kernels #22 (place id
// pr-triton-kernels-22). Retells the landing site's figure in 3D (see
// data/showcase.json's figure.desc and teerthsharma.github.io/fig.js's
// schedule(), long comment above "schedule — triton-kernels-22"):
//
// A causal attention matrix is a staircase pyramid, widest at the base
// (query block 9, every key up to itself) and tapering to the single sink
// block at the apex (query block 0). Column 0, the sink, is scheduled by
// every row, so it lights first — a straight line down the pyramid's left
// edge. Above the apex, ten key-block centroids float; discs grow around
// every one of them at once, and the two whose discs never touch a
// neighbour are the salience picks, held apart by construction the way the
// kernel's own topology score holds them apart by distance. Each survivor
// beams a pulse down to its own column, which every later query block reads
// too, so that column lights up tier after tier as the pyramid climbs.
// Then one program per query block starts at once and walks its own
// schedule in lockstep with every other: a tile pops forward and glows only
// when a program's walk reaches it; the ones it skips stay flat and grey.
// Once a row's whole list has grown in, an amber bead lands on its diagonal
// tile — the short lists near the apex finish first, so the beads chain
// downward, tier by tier, to the base. Then it all sinks back and loops.
// Faster and brighter once the seal is close.
//
// Local origin: the top of the plinth; +z faces the camera and the dock.
// Props: { near }.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BoxGeometry, CylinderGeometry, Object3D, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { glow, lamp, mat } from "../palette";
import {
  BEADS,
  CELL,
  CLOUD_DISC_R,
  CLOUD_POINTS,
  MAX_STEPS,
  NB,
  PULSE_TARGETS,
  SAL,
  TIER_D,
  TIER_H,
  TIERS,
  TILES,
} from "./parts/schedule-layout";

const VIOLET = "#a66cf0"; // fig.js violet-500: the schedule and its topology
const VIOLET_DEEP = "#6b35c4"; // violet-700: the cloud's ordinary centroids
const VIOLET_HOT = "#c9a3ff"; // a hot, near-white violet: the two salience picks only
const AMBER = "#d96a06"; // fig.js amber-500: the finished output beads

const TILE_SIZE = [CELL * 0.8, TIER_H * 0.68, TIER_D * 0.7];
const SAL_TILE_SIZE = [CELL * 0.86, TIER_H * 0.74, TIER_D * 0.74];
const POP = 0.2; // how far a grown tile pushes forward, +z
const BEAD_R = 0.09;
const ORB_R = 0.055;

const CYCLE_FAR = 9; // seconds per loop, far from the plinth
const CYCLE_NEAR = 6; // faster once the seal is close
const EASE = 4; // shared rate for the near/far blend: k = 1 - exp(-EASE*dt)

// Phase fractions of one loop: topology, a beat of quiet, the compute
// sweep, a hold at full brightness, then everything sinks back.
const TOPO_END = 0.26;
const PICK_START = TOPO_END - 0.08;
const SWEEP_START = 0.34;
const SWEEP_END = 0.84;
const SINK_START = 0.94;
const STEP_DUR = (SWEEP_END - SWEEP_START) / MAX_STEPS;

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smoothstep = (a, b, x) => {
  const u = clamp01((x - a) / (b - a));
  return u * u * (3 - 2 * u);
};
const sinkFactor = (p) => (p < SINK_START ? 1 : 1 - smoothstep(SINK_START, 1, p));
const stepDoneAt = (step) => SWEEP_START + step * STEP_DUR + STEP_DUR * 0.55;
function tileGrown(step, p) {
  const start = SWEEP_START + step * STEP_DUR;
  return smoothstep(start, stepDoneAt(step), p) * sinkFactor(p);
}

// Static geometry, baked once: the ten tiers merged into a single draw call,
// one tile/bead/orb/disc shape reused by every instance, and the two pulse
// beams (fixed start and direction — only their reveal animates).
const TIER_GEO = mergeGeometries(
  TIERS.map((tr) => {
    const g = new BoxGeometry(tr.w, TIER_H * 0.9, TIER_D);
    g.translate(tr.cx, tr.y, 0);
    return g;
  }),
);
const TILE_GEO = new BoxGeometry(...TILE_SIZE);
const SAL_TILE_GEO = new BoxGeometry(...SAL_TILE_SIZE);
const BEAD_GEO = new SphereGeometry(BEAD_R, 10, 8);
const ORB_GEO = new SphereGeometry(ORB_R, 10, 8);
const DISC_GEO = new SphereGeometry(1, 12, 8);
const RING_GEO = new TorusGeometry(0.1, 0.018, 8, 20);
const BEAM_GEO = new CylinderGeometry(0.022, 0.022, 1, 6, 1, true);
BEAM_GEO.translate(0, 0.5, 0); // local y 0..1, so it grows from its start point outward

function beamTransform(a, b) {
  const dir = new Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
  const length = dir.length();
  dir.normalize();
  const quat = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir);
  return { start: a, quat, length };
}
const BEAMS = SAL.map((s, i) => beamTransform(CLOUD_POINTS[s], PULSE_TARGETS[i]));

const REGULAR_TILES = TILES.filter((tl) => !tl.isSalience);
const SALIENCE_TILES = TILES.filter((tl) => tl.isSalience);
const CLOUD_OTHERS = CLOUD_POINTS.filter((pt) => !pt.isSalience);
const CLOUD_SURVIVORS = CLOUD_POINTS.filter((pt) => pt.isSalience);

const dummy = new Object3D(); // scratch reused every frame: never allocate inside useFrame

export default function Schedule({ near }) {
  const nearRef = useRef(near);
  nearRef.current = near;

  const tierMat = useMemo(() => mat("#aab3c0", { roughness: 0.6 }), []);
  const tileMat = useMemo(() => mat(VIOLET, { roughness: 0.4, emissive: VIOLET, emissiveIntensity: 0.35 }).clone(), []);
  const salMat = useMemo(() => mat(VIOLET_HOT, { roughness: 0.3, emissive: VIOLET_HOT, emissiveIntensity: 1.1 }).clone(), []);
  const beadMat = useMemo(() => lamp(AMBER, 1.3).clone(), []);
  const orbMat = useMemo(() => mat(VIOLET_DEEP, { roughness: 0.4, emissive: VIOLET_DEEP, emissiveIntensity: 0.4 }), []);
  const survivorMat = useMemo(() => mat(VIOLET_HOT, { roughness: 0.3, emissive: VIOLET_HOT, emissiveIntensity: 1.1 }).clone(), []);
  const discMat = useMemo(() => glow(VIOLET, 0.16), []);
  const beamMat = useMemo(() => glow(VIOLET_HOT, 0.6), []);
  const ringMat = useMemo(() => mat(VIOLET_HOT, { roughness: 0.25, emissive: VIOLET_HOT, emissiveIntensity: 1.3 }), []);

  const regularRef = useRef(null);
  const salienceRef = useRef(null);
  const beadRef = useRef(null);
  const orbRef = useRef(null);
  const discRef = useRef(null);
  const survivorDotRef = useRef([]);
  const survivorRingRef = useRef([]);
  const beamRef = useRef([]);

  const phase = useRef(0);
  const nearK = useRef(0);

  useFrame((state, dt) => {
    const k = 1 - Math.exp(-EASE * dt);
    nearK.current += ((nearRef.current ? 1 : 0) - nearK.current) * k;
    const cycle = CYCLE_FAR - (CYCLE_FAR - CYCLE_NEAR) * nearK.current;
    phase.current = (phase.current + dt / cycle) % 1;
    const p = phase.current;
    const t = state.clock.elapsedTime;
    const glowBoost = 1 + 0.5 * nearK.current;

    tileMat.emissiveIntensity = 0.35 * glowBoost;
    salMat.emissiveIntensity = 1.1 * glowBoost;
    beadMat.emissiveIntensity = 1.3 * glowBoost;
    survivorMat.emissiveIntensity = 1.1 * glowBoost;

    // regular scheduled tiles: pop forward and settle when their row's
    // program walk reaches them
    const reg = regularRef.current;
    if (reg) {
      for (let i = 0; i < REGULAR_TILES.length; i++) {
        const tile = REGULAR_TILES[i];
        const g = tileGrown(tile.step, p);
        dummy.position.set(tile.x, tile.y, tile.z0 + g * POP);
        dummy.scale.setScalar(0.12 + 0.88 * g);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        reg.setMatrixAt(i, dummy.matrix);
      }
      reg.instanceMatrix.needsUpdate = true;
    }
    // the salience columns: the same pop, a size up and brighter, so the
    // two picked columns read as standing pillars once every row on them
    // has grown in
    const sal = salienceRef.current;
    if (sal) {
      for (let i = 0; i < SALIENCE_TILES.length; i++) {
        const tile = SALIENCE_TILES[i];
        const g = tileGrown(tile.step, p);
        dummy.position.set(tile.x, tile.y, tile.z0 + g * POP * 1.15);
        dummy.scale.setScalar(0.14 + 0.96 * g);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        sal.setMatrixAt(i, dummy.matrix);
      }
      sal.instanceMatrix.needsUpdate = true;
    }

    // output beads: land on the diagonal tile once a row's whole schedule
    // has grown in — the chain runs from the apex down to the base
    const beads = beadRef.current;
    if (beads) {
      for (let i = 0; i < BEADS.length; i++) {
        const b = BEADS[i];
        const g = smoothstep(stepDoneAt(b.lastStep), stepDoneAt(b.lastStep) + 0.05, p) * sinkFactor(p);
        dummy.position.set(b.x, b.y + 0.02 + Math.sin(t * 2 + i) * 0.012 * g, b.z);
        dummy.scale.setScalar(g);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        beads.setMatrixAt(i, dummy.matrix);
      }
      beads.instanceMatrix.needsUpdate = true;
    }

    // topology: discs grow around every centroid at once, then rest small;
    // the two survivors' discs never touch a cluster, so they read apart
    const discGrow = p < TOPO_END ? smoothstep(0, TOPO_END, p) : 0.3;
    const disc = discRef.current;
    if (disc) {
      const s = CLOUD_DISC_R * discGrow * sinkFactor(p);
      for (let i = 0; i < CLOUD_POINTS.length; i++) {
        const pt = CLOUD_POINTS[i];
        dummy.position.set(pt.x, pt.y, pt.z);
        dummy.scale.setScalar(s);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        disc.setMatrixAt(i, dummy.matrix);
      }
      disc.instanceMatrix.needsUpdate = true;
    }
    const orb = orbRef.current;
    if (orb) {
      const s = sinkFactor(p);
      for (let i = 0; i < CLOUD_OTHERS.length; i++) {
        const pt = CLOUD_OTHERS[i];
        dummy.position.set(pt.x, pt.y, pt.z);
        dummy.scale.setScalar(s);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        orb.setMatrixAt(i, dummy.matrix);
      }
      orb.instanceMatrix.needsUpdate = true;
    }

    // the pick: the two survivors' rings and pulse beams to their columns
    const pick = smoothstep(PICK_START, TOPO_END, p) * sinkFactor(p);
    for (let i = 0; i < CLOUD_SURVIVORS.length; i++) {
      const dotM = survivorDotRef.current[i];
      if (dotM) dotM.scale.setScalar(sinkFactor(p) * (1 + 0.35 * pick));
      const ring = survivorRingRef.current[i];
      if (ring) ring.scale.setScalar(pick);
      const beam = beamRef.current[i];
      if (beam) beam.scale.set(1, pick * BEAMS[i].length, 1);
    }
  });

  return (
    <group>
      <mesh geometry={TIER_GEO} material={tierMat} castShadow receiveShadow />
      <instancedMesh ref={regularRef} args={[TILE_GEO, tileMat, REGULAR_TILES.length]} castShadow frustumCulled={false} />
      <instancedMesh ref={salienceRef} args={[SAL_TILE_GEO, salMat, SALIENCE_TILES.length]} castShadow frustumCulled={false} />
      <instancedMesh ref={beadRef} args={[BEAD_GEO, beadMat, NB]} castShadow frustumCulled={false} />

      <instancedMesh ref={discRef} args={[DISC_GEO, discMat, CLOUD_POINTS.length]} frustumCulled={false} />
      <instancedMesh ref={orbRef} args={[ORB_GEO, orbMat, CLOUD_OTHERS.length]} frustumCulled={false} />
      {CLOUD_SURVIVORS.map((pt, i) => (
        <mesh key={pt.k} ref={(el) => (survivorDotRef.current[i] = el)} position={[pt.x, pt.y, pt.z]} geometry={ORB_GEO} material={survivorMat} />
      ))}
      {CLOUD_SURVIVORS.map((pt, i) => (
        <mesh key={`ring${pt.k}`} ref={(el) => (survivorRingRef.current[i] = el)} position={[pt.x, pt.y, pt.z]} geometry={RING_GEO} material={ringMat} scale={0} />
      ))}
      {BEAMS.map((b, i) => (
        <mesh
          key={i}
          ref={(el) => (beamRef.current[i] = el)}
          position={[b.start.x, b.start.y, b.start.z]}
          quaternion={b.quat}
          geometry={BEAM_GEO}
          material={beamMat}
          scale={[1, 0, 1]}
        />
      ))}
    </group>
  );
}
