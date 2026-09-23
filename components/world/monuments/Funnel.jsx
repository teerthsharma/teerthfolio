"use client";

// Sculpture for the "funnel" figure: google-deepmind/mujoco_warp #1541 (place id pr-mujoco-warp-1541).
// Tells the same story as that figure on teerthsharma.github.io, in 3D.
// Local origin: the top of the plinth; +z faces the camera and the dock.
// Props: { place, near }.
//
// The story, looped: a 22x22 = 484-cell pair matrix (one cell per pair of
// the scene's 22 kinematic trees) rises from the plinth -- the scratch the
// old GPU kernel carried onto the device every step. Its diagonal briefly
// flares as the 22 per-tree entries it condenses to, then those 22 entries
// lift off as a floating forest and the matrix fades to a ghost behind them.
// The forest runs a disjoint-set union in three rounds -- a thread joins two
// trees, a bead walks the join, the absorbed tree takes the root's colour
// and sinks a level -- then every pointer snaps straight to its root
// (height collapses to two levels, islands pull into tight clusters). The
// ghost matrix then lights every cell whose two trees share an island: the
// 484-cell answer, read off 22 entries.
//
// Numbers are the card's own: 1.513x faster, scratch 7,929,856 B to 180,224
// (both already cast in 3D type by Monument.jsx's headline/org sign), and
// "22 entries, one per tree" / "in place of 484 cells, one per pair of
// trees" from figure.labels -- told here as counts (22 beads, a 22x22 floor)
// rather than repeated as text, per the brief's "prefer shapes to words".

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BoxGeometry, Color, CylinderGeometry, IcosahedronGeometry, MathUtils, Object3D, Vector3 } from "three";
import { clamp, damp, smoothstep } from "../life/util";
import { C, mat } from "../palette";
import { HOME, N, GRID, ISLAND_COUNT, ROUNDS, clusterOffset, colorRound, compressedDepth, depthSnapshots, finalRoot, islandOf, sameIsland } from "./parts/funnel-data";

const { lerp } = MathUtils;

// ---- footprint & look (metres) -----------------------------------------
const CELL = 0.14;
const SPACING = 0.15;
const HALF = ((GRID - 1) / 2) * SPACING; // floor spans +-1.575 m: inside the 3.4 m budget
const REST_H = 0.22;
const GHOST_H = 0.05;
const PEAK_H = 0.42;
const LIT_H = 0.34;
const HEIGHT_BY_DEPTH = [2.6, 1.85, 1.3, 0.95]; // root .. depth-3, same ratio as the figure's ZL
const COMPRESSED_HEIGHT = [2.6, 1.6]; // [root, member] once every pointer snaps straight
const ROOT_R = 0.3;
const MEMBER_R = 0.2;
const THREAD_R = 0.045;
const TRAVEL_R = 0.11;
const THREAD_SLOTS = 8; // >= the busiest round's pair count

// ---- timing (seconds, at rest -- `near` speeds the clock up) ------------
const BUILD_DUR = 2.0;
const RISE = 0.6; // how long one floor cell takes to rise once its turn starts
const COLLAPSE_DUR = 1.4;
const LIFT_DUR = 1.0;
const ROUND_DUR = 1.3;
const ROUND_COUNT = ROUNDS.length;
const COMPRESS_DUR = 1.0;
const HOLD_DUR = 1.6;
const T1 = BUILD_DUR; // build -> collapse
const T2 = T1 + COLLAPSE_DUR; // collapse -> lift
const T3 = T2 + LIFT_DUR; // lift -> union (forest fully up)
const T4 = T3 + ROUND_COUNT * ROUND_DUR; // union -> compress
const T5 = T4 + COMPRESS_DUR; // compress -> hold (the answer)
const LOOP = T5 + HOLD_DUR;

// ---- static geometry, built once ----------------------------------------
const CELL_GEO = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0); // base at y=0, grows up
const BEAD_GEO = new IcosahedronGeometry(1, 0);
const THREAD_GEO = new CylinderGeometry(1, 1, 1, 6); // unit segment along Y, centred at origin
const TRAVEL_GEO = new IcosahedronGeometry(1, 1);

const FLOOR_MAT = mat("#ffffff", { flat: true, roughness: 0.85 });
const BEAD_MAT = mat("#ffffff", { flat: true, roughness: 0.4 });
const TRAVEL_MAT = mat("#ffffff", { flat: true, roughness: 0.3 });

const MATRIX_BASE = new Color(C.metal); // the allocated scratch: brushed, neutral
const GHOST_COLOR = new Color(C.warmWhite).lerp(new Color(C.metal), 0.15);
const BEAD_NEUTRAL = new Color(C.ice); // an entry before it has joined an island
const WHITE = new Color("#ffffff");
const UP = new Vector3(0, 1, 0);

function setSegment(mesh, ax, ay, az, bx, by, bz, radius) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz) || 0.001;
  _dir.set(dx / len, dy / len, dz / len);
  mesh.quaternion.setFromUnitVectors(UP, _dir);
  mesh.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
  mesh.scale.set(radius, len, radius);
}
const _dir = new Vector3();

export default function Funnel({ place, near }) {
  const floorRef = useRef(null);
  const beadRef = useRef(null);
  const travelRef = useRef(null);
  const threadRefs = useRef([]);

  const kRef = useRef(0);
  const clockRef = useRef(0);
  const heightNowRef = useRef(new Float32Array(N));

  const dummy = useMemo(() => new Object3D(), []);
  const tmpColor = useMemo(() => new Color(), []);

  // Islands share this monument's one accent, distinguished by lightness
  // only -- the "one accent, near-neutral bodies" rule, kept even here.
  const islandColors = useMemo(() => {
    const base = new Color(place.color);
    const count = Math.max(1, ISLAND_COUNT);
    return Array.from({ length: count }, (_, i) => {
      const l = count <= 1 ? 0 : (i / (count - 1) - 0.5) * 0.34;
      return base.clone().offsetHSL(0, 0, l);
    });
  }, [place.color]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    kRef.current += ((near ? 1 : 0) - kRef.current) * damp(4, dt);
    const k = kRef.current;
    const speed = 1 + 0.6 * k;
    clockRef.current += dt * speed;
    const t = clockRef.current % LOOP;
    const bright = 0.15 * k;
    const sway = state.clock.elapsedTime;

    // ---- the 22x22 pair matrix -------------------------------------
    const floor = floorRef.current;
    if (floor) {
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          const idx = r * GRID + c;
          const diag = r === c;
          let h;
          if (t < T1) {
            const cellStart = idx * ((BUILD_DUR - RISE) / (GRID * GRID));
            const raw = clamp((t - cellStart) / RISE, 0, 1);
            h = smoothstep(0, 1, raw) * REST_H;
            tmpColor.copy(MATRIX_BASE);
          } else if (t < T2) {
            const p = smoothstep(0, 1, (t - T1) / COLLAPSE_DUR);
            h = diag ? lerp(REST_H, PEAK_H, p) : lerp(REST_H, GHOST_H, p);
            tmpColor.copy(MATRIX_BASE);
          } else if (t < T3) {
            const p = smoothstep(0, 1, (t - T2) / LIFT_DUR);
            h = diag ? lerp(PEAK_H, GHOST_H, p) : GHOST_H;
            tmpColor.copy(MATRIX_BASE).lerp(GHOST_COLOR, p);
          } else {
            h = GHOST_H;
            tmpColor.copy(GHOST_COLOR);
            if (t >= T5 && sameIsland(r, c)) {
              const holdP = (t - T5) / HOLD_DUR;
              const hp = smoothstep(0, 0.25, holdP) * (1 - smoothstep(0.75, 1, holdP));
              h = lerp(GHOST_H, LIT_H, hp);
              tmpColor.lerp(islandColors[islandOf(r)], hp);
              if (bright > 0) tmpColor.lerp(WHITE, bright * hp);
            }
          }
          dummy.position.set(c * SPACING - HALF, 0, r * SPACING - HALF);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(CELL, Math.max(h, 0.001), CELL);
          dummy.updateMatrix();
          floor.setMatrixAt(idx, dummy.matrix);
          floor.setColorAt(idx, tmpColor);
        }
      }
      floor.instanceMatrix.needsUpdate = true;
      if (floor.instanceColor) floor.instanceColor.needsUpdate = true;
    }

    // ---- the forest: 22 entries, one per tree ------------------------
    let forestScale = 0;
    if (t >= T2 && t < T3) forestScale = smoothstep(0, 1, (t - T2) / LIFT_DUR);
    else if (t >= T3 && t < T5 + HOLD_DUR * 0.7) forestScale = 1;
    else if (t >= T5 + HOLD_DUR * 0.7) forestScale = 1 - smoothstep(0, HOLD_DUR * 0.3, t - (T5 + HOLD_DUR * 0.7));

    const unionElapsed = clamp(t - T3, 0, ROUND_COUNT * ROUND_DUR);
    const roundIdx = clamp(Math.floor(unionElapsed / ROUND_DUR), 0, ROUND_COUNT - 1);
    const roundLocal = smoothstep(0, 1, (unionElapsed - roundIdx * ROUND_DUR) / ROUND_DUR);
    const compressP = t >= T4 ? smoothstep(0, 1, (Math.min(t, T5) - T4) / COMPRESS_DUR) : 0;

    const bead = beadRef.current;
    if (bead) {
      for (let i = 0; i < N; i++) {
        const isRoot = compressedDepth[i] === 0;

        const prevDepth = roundIdx === 0 ? 0 : depthSnapshots[roundIdx - 1][i];
        const nextDepth = depthSnapshots[roundIdx][i];
        let hgt = lerp(HEIGHT_BY_DEPTH[prevDepth], HEIGHT_BY_DEPTH[nextDepth], roundLocal);
        if (compressP > 0) hgt = lerp(hgt, COMPRESSED_HEIGHT[compressedDepth[i]], compressP);
        hgt += Math.sin(sway * 1.6 + i * 0.9) * 0.035 * forestScale;
        heightNowRef.current[i] = hgt;

        let mix;
        const cr = colorRound[i];
        if (cr === -1) mix = t < T2 ? 0 : t < T3 ? smoothstep(0, 1, (t - T2) / LIFT_DUR) : 1;
        else if (roundIdx < cr) mix = 0;
        else if (roundIdx > cr) mix = 1;
        else mix = roundLocal;
        tmpColor.copy(BEAD_NEUTRAL).lerp(islandColors[islandOf(i)], mix);
        if (bright > 0) tmpColor.lerp(WHITE, bright * mix);

        let x = HOME[i][0];
        let z = HOME[i][1];
        if (compressP > 0 && !isRoot) {
          const [ox, oz] = clusterOffset(i);
          const root = finalRoot[i];
          x = lerp(x, HOME[root][0] + ox, compressP);
          z = lerp(z, HOME[root][1] + oz, compressP);
        }

        const radius = (isRoot ? ROOT_R : MEMBER_R) * forestScale;
        dummy.position.set(x, hgt, z);
        dummy.rotation.set(0.3, i * 0.71, 0.15);
        dummy.scale.setScalar(Math.max(radius, 0.0001));
        dummy.updateMatrix();
        bead.setMatrixAt(i, dummy.matrix);
        bead.setColorAt(i, tmpColor);
      }
      bead.instanceMatrix.needsUpdate = true;
      if (bead.instanceColor) bead.instanceColor.needsUpdate = true;
    }

    // ---- threads and the bead that walks each one to its root --------
    const inUnion = t >= T3 && t < T4;
    const pairs = inUnion ? ROUNDS[roundIdx] : null;
    const travel = travelRef.current;
    for (let s = 0; s < THREAD_SLOTS; s++) {
      const threadMesh = threadRefs.current[s];
      const pair = pairs && s < pairs.length ? pairs[s] : null;
      if (threadMesh) threadMesh.visible = !!pair;
      if (pair) {
        const [a, b] = pair;
        const [ax, az] = HOME[a];
        const [bx, bz] = HOME[b];
        const ay = heightNowRef.current[a];
        const by = heightNowRef.current[b];
        if (threadMesh) {
          setSegment(threadMesh, ax, ay, az, bx, by, bz, THREAD_R);
          const tc = threadMesh.material.color.copy(BEAD_NEUTRAL).lerp(islandColors[islandOf(a)], roundLocal);
          if (bright > 0) tc.lerp(WHITE, bright);
        }
        if (travel) {
          dummy.position.set(lerp(bx, ax, roundLocal), lerp(by, ay, roundLocal), lerp(bz, az, roundLocal));
          dummy.rotation.set(0, 0, 0);
          dummy.scale.setScalar(TRAVEL_R);
          dummy.updateMatrix();
          travel.setMatrixAt(s, dummy.matrix);
          travel.setColorAt(s, tmpColor.copy(WHITE).lerp(islandColors[islandOf(a)], 0.4));
        }
      } else if (travel) {
        dummy.position.set(0, -50, 0);
        dummy.scale.setScalar(0.0001);
        dummy.updateMatrix();
        travel.setMatrixAt(s, dummy.matrix);
      }
    }
    if (travel) {
      travel.instanceMatrix.needsUpdate = true;
      if (travel.instanceColor) travel.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      <instancedMesh ref={floorRef} args={[CELL_GEO, FLOOR_MAT, GRID * GRID]} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh ref={beadRef} args={[BEAD_GEO, BEAD_MAT, N]} castShadow frustumCulled={false} />
      <instancedMesh ref={travelRef} args={[TRAVEL_GEO, TRAVEL_MAT, THREAD_SLOTS]} frustumCulled={false} />
      {Array.from({ length: THREAD_SLOTS }, (_, s) => (
        <mesh key={s} ref={(el) => (threadRefs.current[s] = el)} geometry={THREAD_GEO} visible={false}>
          <meshStandardMaterial color={C.ice} flatShading roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}
