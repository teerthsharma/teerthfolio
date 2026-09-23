"use client";

// Sculpture for the "closure" figure: tensorflow/tensorflow #124410 (place id
// pr-tensorflow-124410). Tells the same story as that figure on
// teerthsharma.github.io, in 3D. Local origin: the top of the plinth; +z
// faces the camera and the dock. Props: { place, near }.
//
// The fix: CreateControlDependencies serializes four CollectiveReduce ops
// (c4 first, c1 last) with control edges, and never re-checked what an op
// believed it could already reach once a later edge extended that reach --
// so a redundant bypass edge (c4 -> c1, alongside the real chain
// c4->c3->c2->c1) survived pruning. Four control edges where the unique
// transitive reduction is three (the card's own headline: "4 edges to 3").
//
// The sculpture is the tower those four ops run on: four glass-ring
// collectives stacked on a vertical axis of control edges, c4 at the top
// (runs first) down to c1 at the bottom -- no ring lights until the edge
// above it delivers. The chain (3 edges, the real dependency) lights top to
// bottom; a coral bypass arc grows alongside it, bowed out past the tower,
// straight from c4's ring to c1's -- the extra edge. It holds (4 edges,
// digit above the tower), then a fix wave climbs the chain from c1 back up
// (the fact the old pass never back-propagated), the bypass snaps away, the
// digit flips to 3, and one clean confirmation pulse runs the tower top to
// bottom on the surviving chain alone. Loop, faster and brighter when near.

import { Center, Text3D } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { CatmullRomCurve3, Color, CylinderGeometry, IcosahedronGeometry, Object3D, TorusGeometry, TubeGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { smoothstep } from "../life/util";
import { C, glow, lamp, mat } from "../palette";

const CORAL = "#e2523f"; // the extra, wrong edge -- one narrative accent beyond place.color

const RING_R = 0.95; // collective ring radius
const RING_TUBE = 0.17;
const SPACING = 1.32; // metres between ring centres
const Y = [null, 0.95, 0.95 + SPACING, 0.95 + SPACING * 2, 0.95 + SPACING * 3]; // Y[k]: c_k's height, k=1..4 (c4 top)
const NW = 6; // workers per ring, drawn around its rim
const WORKER_R = 0.09;
const WORKER_COUNT = NW * 4;

const LOOP = 11; // s, one full before/after cycle
const GROW_END = 0.14; // chain + bypass finish growing in
const CLIMB_START = 0.42; // the fix wave starts climbing c1 -> c3
const CLIMB_END = 0.5;
const SNAP_END = 0.56; // bypass snaps away, digit flips 4 -> 3
const CONFIRM_START = 0.62; // one clean pulse runs the surviving chain top to bottom
const CONFIRM_END = 0.85;
const RESET_START = 0.93; // fade toward the loop seam

const RING_GEO = new TorusGeometry(RING_R, RING_TUBE, 6, 14);
const WORKER_GEO = new IcosahedronGeometry(WORKER_R, 0);
const PULSE_GEO = new IcosahedronGeometry(0.1, 0);
const PULSE_GLOW_GEO = new IcosahedronGeometry(0.22, 0);

// The three real control edges, c4->c3, c3->c2, c2->c1: short pillars on the
// central axis between adjacent rings, merged once since they never move.
const EDGE_RADIUS = 0.06;
const EDGES_GEO = mergeGeometries(
  [4, 3, 2].map((k) => {
    const y0 = Y[k] - RING_TUBE; // underside of the ring above
    const y1 = Y[k - 1] + RING_TUBE; // top of the ring below
    const g = new CylinderGeometry(EDGE_RADIUS, EDGE_RADIUS, y0 - y1, 8);
    g.translate(0, (y0 + y1) / 2, 0);
    return g;
  }),
  false,
);

// The bypass: c4's ring straight to c1's, bowed out past the tower so it
// reads as a distinct extra path, not part of the axis.
const BYPASS_RADIAL = 6;
const BYPASS_SEGMENTS = 28;
const BYPASS_CURVE = new CatmullRomCurve3([
  new Vector3(RING_R, Y[4] - 0.1, 0),
  new Vector3(1.95, Y[4] - 0.85, 0),
  new Vector3(1.95, Y[1] + 0.85, 0),
  new Vector3(RING_R, Y[1] + 0.1, 0),
]);
const BYPASS_GEO = new TubeGeometry(BYPASS_CURVE, BYPASS_SEGMENTS, 0.06, BYPASS_RADIAL, false);
const BYPASS_INDEX_COUNT = BYPASS_GEO.index.count;
const BYPASS_SEG_STEP = BYPASS_RADIAL * 6; // indices per tubular ring (2 tris * 3 indices * radial segments)

const dummy = new Object3D();
const tmpColor = new Color();

export default function Closure({ place, near }) {
  const A = place.color;

  // Cloned so each ring's colour/glow can be mutated per frame; palette.js's
  // cached mat() must never be mutated directly.
  const ringMats = useMemo(() => [0, 1, 2, 3].map(() => mat(C.ice, { roughness: 0.35 }).clone()), []);
  const edgeMat = useMemo(() => {
    const m = mat(C.charcoal).clone();
    m.emissive = new Color(A);
    return m;
  }, [A]);
  const bypassMat = useMemo(() => lamp(CORAL, 0.35).clone(), []);
  const bypassGlowMat = useMemo(() => glow(CORAL, 0.35), []);
  const pulseMat = useMemo(() => lamp(A, 1.6).clone(), [A]);
  const pulseGlowMat = useMemo(() => glow(A, 0.4), [A]);
  const workerMat = useMemo(() => mat("#ffffff", { roughness: 0.5 }), []);
  const iceColor = useMemo(() => new Color(C.ice), []);
  const accentColor = useMemo(() => new Color(A), [A]);

  const workersRef = useRef(null);
  const bypassRef = useRef(null);
  const bypassGlowRef = useRef(null);
  const climbRef = useRef(null);
  const confirmRef = useRef(null);
  const digitRef = useRef("4");
  const [digit, setDigit] = useState("4");

  useFrame(({ clock }) => {
    const speed = near ? 1.55 : 1;
    const boost = near ? 1.3 : 1;
    const t = (clock.elapsedTime * speed) % LOOP;
    const p = t / LOOP;
    const alpha = 1 - smoothstep(RESET_START, 1, p);
    const breathe = 0.5 + 0.5 * Math.sin(p * Math.PI * 6);

    const growP = smoothstep(0, GROW_END, p);
    const snapP = smoothstep(CLIMB_END, SNAP_END, p);
    const bypassLevel = growP * (1 - snapP);

    // rings + workers: light top-down as each control edge delivers, then
    // hold; alpha fades everyone back to neutral right before the loop wraps
    const workers = workersRef.current;
    let wi = 0;
    for (let k = 4; k >= 1; k--) {
      const delay = (4 - k) * 0.018;
      const lit = smoothstep(delay, delay + 0.08, p) * alpha;
      tmpColor.copy(iceColor).lerp(accentColor, lit);
      const rm = ringMats[k - 1];
      rm.color.copy(tmpColor);
      rm.emissive.copy(accentColor);
      rm.emissiveIntensity = lit * (0.35 + 0.25 * breathe) * boost;
      for (let j = 0; j < NW; j++, wi++) {
        const th = (j / NW) * Math.PI * 2 + k * 0.3;
        dummy.position.set(Math.cos(th) * (RING_R + 0.02), Y[k], Math.sin(th) * (RING_R + 0.02));
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        if (workers) {
          workers.setMatrixAt(wi, dummy.matrix);
          workers.setColorAt(wi, tmpColor);
        }
      }
    }
    if (workers) {
      workers.instanceMatrix.needsUpdate = true;
      workers.instanceColor.needsUpdate = true;
    }

    edgeMat.emissiveIntensity = growP * alpha * (0.3 + 0.2 * breathe) * boost;

    // the bypass: grows in with the chain, holds, then its draw range
    // recedes to snap it away -- the same fraction drives grow and collapse
    if (bypassRef.current) {
      const segs = Math.round(bypassLevel * BYPASS_SEGMENTS);
      bypassRef.current.geometry.setDrawRange(0, segs * BYPASS_SEG_STEP);
      const visible = segs > 0;
      bypassRef.current.visible = visible;
      if (bypassGlowRef.current) bypassGlowRef.current.visible = visible;
      const flash = snapP > 0.02 && snapP < 0.5 ? 1 - snapP * 2 : 0;
      bypassMat.emissiveIntensity = 0.5 + flash * 2.2;
      if (bypassGlowRef.current) bypassGlowRef.current.scale.setScalar(1.6 + flash * 0.8);
    }

    const nextDigit = bypassLevel > 0.5 ? "4" : "3";
    if (nextDigit !== digitRef.current) {
      digitRef.current = nextDigit;
      setDigit(nextDigit);
    }

    // the fix wave: a small light climbs c1's edge then c3's, just before
    // the bypass snaps -- the fact the old pass never back-propagated
    const climbing = p > CLIMB_START && p < CLIMB_END;
    if (climbRef.current) {
      climbRef.current.visible = climbing;
      if (climbing) {
        const u = smoothstep(CLIMB_START, CLIMB_END, p);
        const leg = u < 0.5 ? u * 2 : (u - 0.5) * 2;
        const y0 = u < 0.5 ? Y[1] : Y[2];
        const y1 = u < 0.5 ? Y[2] : Y[3];
        climbRef.current.position.y = y0 + (y1 - y0) * leg;
      }
    }

    // after the snap: one clean confirmation pulse runs the surviving chain
    // top to bottom, so the tower stays alive through the "after" hold
    const confirming = p > CONFIRM_START && p < CONFIRM_END;
    if (confirmRef.current) {
      confirmRef.current.visible = confirming;
      if (confirming) {
        const u = smoothstep(CONFIRM_START, CONFIRM_END, p);
        confirmRef.current.position.y = Y[4] + (Y[1] - Y[4]) * u;
      }
    }
  });

  return (
    <group>
      {[1, 2, 3, 4].map((k) => (
        <mesh key={k} position={[0, Y[k], 0]} rotation={[Math.PI / 2, 0, 0]} geometry={RING_GEO} material={ringMats[k - 1]} castShadow receiveShadow />
      ))}

      <instancedMesh ref={workersRef} args={[WORKER_GEO, workerMat, WORKER_COUNT]} castShadow frustumCulled={false} />

      <mesh geometry={EDGES_GEO} material={edgeMat} castShadow receiveShadow />

      {/* the same shared geometry backs both the core tube and its glow
          shell, so one draw-range write each frame grows or snaps both */}
      <mesh ref={bypassRef} geometry={BYPASS_GEO} material={bypassMat} castShadow />
      <mesh ref={bypassGlowRef} geometry={BYPASS_GEO} material={bypassGlowMat} scale={1.6} />

      <group ref={climbRef}>
        <mesh geometry={PULSE_GEO} material={pulseMat} />
        <mesh geometry={PULSE_GLOW_GEO} material={pulseGlowMat} />
      </group>
      <group ref={confirmRef}>
        <mesh geometry={PULSE_GEO} material={pulseMat} />
        <mesh geometry={PULSE_GLOW_GEO} material={pulseGlowMat} />
      </group>

      <group position={[0, Y[4] + 0.85, 0]}>
        <Center disableZ>
          <Text3D font="/fonts/helvetiker_bold.typeface.json" size={0.42} height={0.14} bevelEnabled bevelSize={0.012} bevelThickness={0.018} curveSegments={5} castShadow>
            {digit}
            <meshStandardMaterial color={A} roughness={0.45} />
          </Text3D>
        </Center>
      </group>
    </group>
  );
}
