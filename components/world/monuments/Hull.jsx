"use client";

// Sculpture for the "hull" figure: google-deepmind/mujoco #3450 (place id
// pr-mujoco-3450). The figure it retells (teerthsharma.github.io/fig.js,
// "hull —") races two ways of building a convex hull's graph on one clock:
// the OLD way scans the vertex list from the top for every corner (coral
// rays spraying everywhere, only 5 to 7 of the hull's 80 faces close in the
// time given); the NEW way writes an inverted point-id table once — each
// vertex ringing as it's written — and then every corner is one direct mint
// stroke, so the WHOLE hull closes in the same time. Faces are coloured
// mint -> blue -> violet by the order they were built, mint first.
//
// Here the race is two identical hulls side by side, sharing one build
// order (lib: parts/hull-geometry.js), on the same clock, looping: the left
// one stalls at a handful of faces while a spray of coral probes hunts
// around it; the right one snaps fully built long before the left is done,
// glints with a mint -> violet wave, then both fade and the race runs
// again. Local origin: the top of the plinth; +z faces the dock.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { BoxGeometry, BufferGeometry, Color, DynamicDrawUsage, Float32BufferAttribute, MeshBasicMaterial, Object3D, SphereGeometry } from "three";
import { mat } from "../palette";
import { buildHull } from "./parts/hull-geometry";

const HULL_R = 0.85; // metres: each hull's own radius
const GAP = 1.3; // metres from centre to each hull
const Y = 2.6; // metres: hull centre height above the plinth

const BEFORE_FACES = 6; // "it finishes 5 to 7 of the 80 faces" — fig.js
const RACE_END = 3.6; // s: how long the scan gets to find those 6
const SPACING = RACE_END / BEFORE_FACES;
const SCAN_WIN = 0.46; // s of spraying before a scanned face pops in
const AFTER_DONE = 0.85; // s: the table closes the WHOLE hull in this long
const WAVE_START = RACE_END + 0.15;
const WAVE_END = 5.25; // the hero wave sweeps the finished hull once
const CYCLE = 6.2;
const FADE = 0.35; // s: both hulls dim before the loop restarts
const RAYS = 6; // concurrent scan rays sprayed at the active before-face

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// mint -> mid (the place's own accent) -> violet, by build-order fraction —
// the figure's own ramp (fig.js M.C5/M.C7), mid swapped for this place's org
// colour so the sculpture still carries its one accent.
function ramp(target, mint, mid, violet, rf) {
  if (rf < 0.5) target.copy(mint).lerp(mid, rf * 2);
  else target.copy(mid).lerp(violet, (rf - 0.5) * 2);
}

function faceGeometry(positions) {
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  const color = new Float32BufferAttribute(new Float32Array(positions.length), 3);
  color.setUsage(DynamicDrawUsage);
  geo.setAttribute("color", color);
  geo.computeVertexNormals();
  return geo;
}

export default function Hull({ place, near }) {
  const hull = useMemo(() => buildHull(), []);
  const { vertexCount: NV, faceCount: NF, positions, centroids, order, ringPoints, vertexRank } = hull;

  // hull-local geometry lives at HULL_R scale so the marker/ray meshes
  // nested with it can stay in absolute metres (no group scale to fight).
  const scaledPositions = useMemo(() => positions.map((v) => v * HULL_R), [positions]);
  const scaledCentroids = useMemo(() => centroids.map((v) => v * HULL_R), [centroids]);
  const scaledRing = useMemo(() => ringPoints.map((v) => v * HULL_R), [ringPoints]);

  const beforeGeo = useMemo(() => faceGeometry(scaledPositions), [scaledPositions]);
  const afterGeo = useMemo(() => faceGeometry(scaledPositions), [scaledPositions]);
  const faceMat = useMemo(() => mat("#ffffff", { vertexColors: true, roughness: 0.4, metalness: 0.05 }), []);
  const barMat = useMemo(() => mat(place.color, { roughness: 0.55 }), [place.color]);
  const markerGeo = useMemo(() => new SphereGeometry(0.08, 8, 6), []);
  const markerMat = useMemo(() => mat("#ffffff", { roughness: 0.8 }), []);
  const rayGeo = useMemo(() => new BoxGeometry(1, 1, 1), []);
  // unlit and drawn through the hull's own faces (depthTest off), exactly
  // like the figure's own flat canvas overlay: "rays spray ... through the
  // body of the hull".
  const rayMat = useMemo(() => new MeshBasicMaterial({ color: "#d9376e", transparent: true, opacity: 0.9, depthTest: false, depthWrite: false, toneMapped: false }), []);

  const mint = useMemo(() => new Color("#0b93ab"), []);
  const violet = useMemo(() => new Color("#a66cf0"), []);
  const mid = useMemo(() => new Color(place.color), [place.color]);
  const white = useMemo(() => new Color("#ffffff"), []);
  const dim = useMemo(() => new Color("#20242b"), []);
  const scratch = useMemo(() => new Color(), []);

  const beforeGroup = useRef();
  const afterGroup = useRef();
  const beforeMarkers = useRef();
  const afterMarkers = useRef();
  const rayMesh = useRef();
  const phase = useRef(0);
  const spin = useRef(0);
  const dummy = useMemo(() => new Object3D(), []);

  // static: marker rings and pillars are placed once, never re-laid-out.
  useLayoutEffect(() => {
    for (const ref of [beforeMarkers, afterMarkers]) {
      const mesh = ref.current;
      if (!mesh) continue;
      for (let i = 0; i < NV; i++) {
        dummy.position.set(scaledRing[i * 3], scaledRing[i * 3 + 1], scaledRing[i * 3 + 2]);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, dim);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    if (rayMesh.current) {
      rayMesh.current.instanceMatrix.setUsage(DynamicDrawUsage);
      for (let k = 0; k < RAYS; k++) {
        dummy.position.set(0, 0, 0);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        rayMesh.current.setMatrixAt(k, dummy.matrix);
      }
      rayMesh.current.instanceMatrix.needsUpdate = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, dt) => {
    const boost = near ? 1.7 : 1;
    phase.current = (phase.current + dt * boost) % CYCLE;
    const t = phase.current;
    spin.current += dt * 0.18 * boost;
    if (beforeGroup.current) beforeGroup.current.rotation.y = spin.current;
    if (afterGroup.current) afterGroup.current.rotation.y = spin.current;

    const fade = t > CYCLE - FADE ? 1 - (t - (CYCLE - FADE)) / FADE : 1;

    // --- before: how many of the six get found, and by which one right now
    let builtBeforeUpTo = 0;
    for (let r = 0; r < BEFORE_FACES; r++) if (t >= r * SPACING + SCAN_WIN) builtBeforeUpTo = r + 1;
    let activeRank = -1;
    if (t < RACE_END) {
      const r0 = Math.floor(t / SPACING);
      if (r0 < BEFORE_FACES && t - r0 * SPACING < SCAN_WIN) activeRank = r0;
    }

    // --- after: the table's rank threshold, racing across the whole hull
    const afterProgress = Math.min(1, t / AFTER_DONE) * (NF - 1);
    const wave = t >= WAVE_START && t <= WAVE_END ? (t - WAVE_START) / (WAVE_END - WAVE_START) : -9;

    const glow = near ? 0.16 : 0;
    const bArr = beforeGeo.attributes.color.array;
    const aArr = afterGeo.attributes.color.array;
    for (let fi = 0; fi < NF; fi++) {
      const r = order[fi];
      const rf = r / (NF - 1);
      const o = fi * 9;

      if (r < builtBeforeUpTo) {
        ramp(scratch, mint, mid, violet, rf);
        const since = t - (r * SPACING + SCAN_WIN);
        if (since >= 0 && since < 0.3) scratch.lerp(white, (1 - since / 0.3) * 0.6);
      } else {
        scratch.copy(dim).lerp(white, glow * 0.3);
      }
      scratch.lerp(dim, 1 - fade);
      bArr[o] = scratch.r; bArr[o + 1] = scratch.g; bArr[o + 2] = scratch.b;
      bArr[o + 3] = scratch.r; bArr[o + 4] = scratch.g; bArr[o + 5] = scratch.b;
      bArr[o + 6] = scratch.r; bArr[o + 7] = scratch.g; bArr[o + 8] = scratch.b;

      if (r <= afterProgress) {
        ramp(scratch, mint, mid, violet, rf);
        const pop = clamp01(1 - (afterProgress - r) / 2.5);
        const waveAmt = wave > -1 ? Math.exp(-(((wave - rf) / 0.13) ** 2)) : 0;
        scratch.lerp(white, Math.min(0.85, pop * 0.7 + waveAmt * 0.6) + glow * 0.15);
      } else {
        scratch.copy(dim).lerp(white, glow * 0.3);
      }
      scratch.lerp(dim, 1 - fade);
      aArr[o] = scratch.r; aArr[o + 1] = scratch.g; aArr[o + 2] = scratch.b;
      aArr[o + 3] = scratch.r; aArr[o + 4] = scratch.g; aArr[o + 5] = scratch.b;
      aArr[o + 6] = scratch.r; aArr[o + 7] = scratch.g; aArr[o + 8] = scratch.b;
    }
    beforeGeo.attributes.color.needsUpdate = true;
    afterGeo.attributes.color.needsUpdate = true;

    // --- the vertex rings: mint the moment their entry is written
    if (beforeMarkers.current) {
      for (let i = 0; i < NV; i++) {
        const lit = vertexRank[i] < builtBeforeUpTo;
        scratch.copy(lit ? mint : dim).lerp(dim, 1 - fade);
        beforeMarkers.current.setColorAt(i, scratch);
      }
      beforeMarkers.current.instanceColor.needsUpdate = true;
    }
    if (afterMarkers.current) {
      for (let i = 0; i < NV; i++) {
        const lit = vertexRank[i] <= afterProgress;
        scratch.copy(lit ? mint : dim).lerp(dim, 1 - fade);
        afterMarkers.current.setColorAt(i, scratch);
      }
      afterMarkers.current.instanceColor.needsUpdate = true;
    }

    // --- the scan's rays: a burst of probes spraying from the active
    // before-face to points scattered around the whole hull, most of them
    // misses — exactly the story: many probes wasted per corner found.
    if (rayMesh.current) {
      const cx = activeRank >= 0 ? scaledCentroids[activeRank * 3] : 0;
      const cy = activeRank >= 0 ? scaledCentroids[activeRank * 3 + 1] : 0;
      const cz = activeRank >= 0 ? scaledCentroids[activeRank * 3 + 2] : 0;
      const local = activeRank >= 0 ? t - activeRank * SPACING : -1;
      for (let k = 0; k < RAYS; k++) {
        if (activeRank < 0) {
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          rayMesh.current.setMatrixAt(k, dummy.matrix);
          continue;
        }
        const period = 0.14;
        const off = (local + k * (period / RAYS)) % period;
        const rep = Math.floor((local + k * (period / RAYS)) / period);
        const targetIdx = (activeRank * 17 + k * 11 + rep * 5) % NV;
        const gr = clamp01(off / (period * 0.7));
        const tx = scaledRing[targetIdx * 3], ty = scaledRing[targetIdx * 3 + 1], tz = scaledRing[targetIdx * 3 + 2];
        const ex = cx + (tx - cx) * gr, ey = cy + (ty - cy) * gr, ez = cz + (tz - cz) * gr;
        dummy.position.set((cx + ex) / 2, (cy + ey) / 2, (cz + ez) / 2);
        dummy.lookAt(ex, ey, ez);
        const len = Math.max(0.02, Math.hypot(ex - cx, ey - cy, ez - cz));
        dummy.scale.set(0.09, 0.09, len);
        dummy.updateMatrix();
        rayMesh.current.setMatrixAt(k, dummy.matrix);
      }
      rayMesh.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* pillars: the one accent surface holding both hulls up */}
      <mesh position={[-GAP, Y * 0.5 - 0.1, 0]} castShadow receiveShadow material={barMat}>
        <boxGeometry args={[0.34, Y - HULL_R * 0.55, 0.34]} />
      </mesh>
      <mesh position={[GAP, Y * 0.5 - 0.1, 0]} castShadow receiveShadow material={barMat}>
        <boxGeometry args={[0.34, Y - HULL_R * 0.55, 0.34]} />
      </mesh>

      <group ref={beforeGroup} position={[-GAP, Y, 0]}>
        <mesh geometry={beforeGeo} material={faceMat} castShadow receiveShadow />
        <instancedMesh ref={beforeMarkers} args={[markerGeo, markerMat, NV]} />
        <instancedMesh ref={rayMesh} args={[rayGeo, rayMat, RAYS]} renderOrder={1} />
      </group>

      <group ref={afterGroup} position={[GAP, Y, 0]}>
        <mesh geometry={afterGeo} material={faceMat} castShadow receiveShadow />
        <instancedMesh ref={afterMarkers} args={[markerGeo, markerMat, NV]} />
      </group>
    </group>
  );
}
