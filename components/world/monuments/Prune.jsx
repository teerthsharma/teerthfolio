"use client";

// Sculpture for the "prune" figure: google/highway #3244 (place id pr-highway-3244).
// Tells the same story as that figure on teerthsharma.github.io, in 3D.
// Local origin: the top of the plinth; +z faces the camera and the dock.
// Props: { place, near }.
//
// The story (see figure.desc and teerthsharma.github.io/fig.js's prune()):
// building a perfect hash, the old check compared every pair of keys to find
// duplicate slots -- a whole dome of arcs, one per pair. But a key can only
// ever land inside its own slice ("window"); two keys whose windows never
// overlap can never collide, so most of that dome was wasted work. The new
// check only looks at the low arcs between overlapping windows: 894,081,141
// comparisons fall to 13,643,737, 65.5x fewer, and both checks still find the
// same duplicates.
//
// Physically: a rail of 18 keys, each an arc's foot; a dome of thin coral
// arcs (every pair) rises off the rail, holds, then sinks and fades away; a
// smaller set of thicker mint arcs -- the ones whose windows overlap, the
// same low arcs the coral dome already contained -- stays and brightens as
// the "new" sweep runs; two of those flash amber where a duplicate is found,
// once in each sweep. Then it loops. Every arc's geometry is baked once at
// module load (mergeGeometries) into three static draw calls; only a few
// material scalars and a handful of instance matrices move per frame.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BoxGeometry, CatmullRomCurve3, Object3D, SphereGeometry, TubeGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useUi } from "../../../lib/world/store";
import { C, glow, mat } from "../palette";
import { archHeight, DOME_PAIRS, DUP_PAIRS, KEPT_PAIRS, KEPT_X_MAX, KEPT_X_MIN, KEY_COUNT, KEY_X } from "./parts/prune-layout";

const TABLE_Y = 0.05; // rail height above the plinth top
const BOW = 0.4; // how far an arc bulges toward +z at its peak, as a fraction of its height
const DOME_RADIUS = 0.07; // the pairs the old check wastes: coral, and the ones that fade
const KEPT_RADIUS = 0.086; // the pairs whose windows overlap: mint, and the ones that stay
const DUP_RADIUS = 0.1; // the duplicate flash, a step in front of its kept arc

// One arc: a semi-ellipse from key i to key j, rising to `height` and
// bulging `bow` toward the camera at its crown -- the same curve the 2D
// figure draws, given real depth. `zOffset` nudges a whole arc toward the
// camera so a highlight (the duplicate flash) can stand clear in front of
// the arc it belongs to, instead of fighting it for the same surface.
function arcCurve(xi, xj, height, bow, zOffset = 0) {
  const cx = (xi + xj) / 2;
  const rx = (xj - xi) / 2;
  const pts = [];
  for (let s = 0; s <= 8; s++) {
    const a = Math.PI * (1 - s / 8);
    pts.push(new Vector3(cx + rx * Math.cos(a), TABLE_Y + height * Math.sin(a), zOffset + bow * Math.sin(a)));
  }
  return new CatmullRomCurve3(pts);
}
function arcTube(pair, radius, zOffset = 0) {
  const h = archHeight(pair.d);
  return new TubeGeometry(arcCurve(KEY_X[pair.i], KEY_X[pair.j], h, h * BOW, zOffset), 12, radius, 6, false);
}

// Baked once, three non-overlapping arc sets so nothing has to fight another
// mesh for the same surface: the pairs the old check wastes (coral, and the
// ones that drain away), the pairs whose windows overlap (mint, and the ones
// that stay), and two of those picked out a step closer to the camera (the
// duplicate both checks find) -- plus the translucent window each key sits
// in, and the rail they stand on.
const DOME_GEO = mergeGeometries(DOME_PAIRS.filter((p) => !p.kept).map((p) => arcTube(p, DOME_RADIUS)));
const KEPT_GEO = mergeGeometries(KEPT_PAIRS.map((p) => arcTube(p, KEPT_RADIUS)));
const DUP_GEO = mergeGeometries(DUP_PAIRS.map((p) => arcTube(p, DUP_RADIUS, 0.06)));
const WINDOW_GEO = mergeGeometries(
  KEY_X.map((x) => {
    const g = new BoxGeometry(0.12, 0.5, 0.07);
    g.translate(x, TABLE_Y + 0.28, 0);
    return g;
  }),
);
const RAIL_GEO = new BoxGeometry(KEY_X[KEY_COUNT - 1] - KEY_X[0] + 0.3, 0.12, 0.16);
RAIL_GEO.translate(0, TABLE_Y - 0.06, 0);
const BEAD_GEO = new SphereGeometry(0.1, 10, 8);

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const flash = (p, center, width) => Math.pow(clamp01(1 - Math.abs(p - center) / width), 2);

const CYCLE_FAR = 8; // seconds per loop, far from the plinth
const CYCLE_NEAR = 5; // faster once the seal is close
const EASE = 4; // shared rate for the near/far blend: k = 1 - exp(-EASE*dt)
const KEPT_BASE = 0.3; // the kept arcs' quiet, always-visible opacity

const dummy = new Object3D();

export default function Prune({ place }) {
  const near = useUi((s) => s.near === place.id);
  const nearRef = useRef(near);
  nearRef.current = near;

  const domeMat = useMemo(() => mat(place.color, { roughness: 0.4, emissive: place.color, emissiveIntensity: 0.15, opacity: 0.999 }).clone(), [place.color]);
  const keptMat = useMemo(() => mat(C.shallows, { roughness: 0.35, emissive: C.shallows, emissiveIntensity: 0.25, opacity: 0.999 }).clone(), []);
  const dupMat = useMemo(() => mat(C.lamp, { roughness: 0.3, emissive: C.lampGlow, emissiveIntensity: 1.6, opacity: 0.999 }).clone(), []);
  const windowMat = useMemo(() => mat(C.ice, { roughness: 0.25, opacity: 0.22 }), []);
  const railMat = useMemo(() => mat(C.charcoal), []);
  const beadMat = useMemo(() => mat(C.warmWhite, { roughness: 0.4, emissive: C.lampGlow, emissiveIntensity: 0.8 }).clone(), []);
  const markerMat = useMemo(() => mat(C.warmWhite, { roughness: 0.3, emissive: place.color, emissiveIntensity: 2.2 }).clone(), [place.color]);
  const markerGlowMat = useMemo(() => glow(place.color, 0.35), [place.color]);

  const domeRef = useRef(null);
  const beadsRef = useRef(null);
  const markerRef = useRef(null);
  const markerGlowRef = useRef(null);
  const nearK = useRef(0);
  const phase = useRef(0);

  useFrame((state, dt) => {
    const k = 1 - Math.exp(-EASE * dt);
    nearK.current += ((nearRef.current ? 1 : 0) - nearK.current) * k;
    const cycle = CYCLE_FAR - (CYCLE_FAR - CYCLE_NEAR) * nearK.current;
    phase.current = (phase.current + dt / cycle) % 1;
    const p = phase.current;
    const t = state.clock.elapsedTime;

    // the old check: the whole dome rises, holds, then drains away
    const domeRise = smoothstep(0, 0.2, p) - smoothstep(0.3, 0.46, p);
    // the new check: the pruned arcs sit quiet, then brighten for their sweep
    const keptRise = KEPT_BASE + (1 - KEPT_BASE) * (smoothstep(0.46, 0.54, p) - smoothstep(0.74, 0.92, p));
    const activity = Math.max(domeRise, (keptRise - KEPT_BASE) / (1 - KEPT_BASE));
    const boost = 0.4 * nearK.current;

    domeMat.opacity = domeRise;
    domeMat.emissiveIntensity = 0.15 + 0.35 * domeRise + boost;
    if (domeRef.current) {
      const sink = 1 - domeRise;
      domeRef.current.position.y = -0.16 * sink;
      domeRef.current.scale.y = 1 - 0.1 * sink;
    }

    keptMat.opacity = keptRise;
    keptMat.emissiveIntensity = 0.2 + 0.9 * (keptRise - KEPT_BASE) / (1 - KEPT_BASE) + boost;

    const dupFlash = Math.max(flash(p, 0.27, 0.035), flash(p, 0.6, 0.035));
    dupMat.opacity = 0.15 + 0.85 * dupFlash;
    dupMat.emissiveIntensity = 1.2 + 2.2 * dupFlash + boost * 2;

    beadMat.emissiveIntensity = 0.6 + 0.7 * activity + boost;

    // the sweep light: once across the whole rail for the old check, once
    // across only the pruned span for the new check
    const oldT = p < 0.22 ? clamp01(p / 0.2) : null;
    const newT = p >= 0.46 && p < 0.68 ? clamp01((p - 0.46) / 0.2) : null;
    const marker = markerRef.current;
    const markerGlow = markerGlowRef.current;
    if (marker && markerGlow) {
      const on = oldT != null || newT != null;
      const x = oldT != null ? KEY_X[0] + (KEY_X[KEY_COUNT - 1] - KEY_X[0]) * oldT : newT != null ? KEPT_X_MIN + (KEPT_X_MAX - KEPT_X_MIN) * newT : 0;
      marker.position.set(x, TABLE_Y + 0.06, 0.1);
      markerGlow.position.copy(marker.position);
      markerMat.emissive.set(oldT != null ? place.color : C.shallows);
      const s = on ? 1 : 0;
      marker.scale.setScalar(s);
      markerGlow.scale.setScalar(s * 3.2);
    }

    // beads settle on the rail with a slow, gentle bob -- alive, not busy
    const beads = beadsRef.current;
    if (beads) {
      for (let i = 0; i < KEY_COUNT; i++) {
        dummy.position.set(KEY_X[i], TABLE_Y + 0.02 + Math.sin(t * 0.9 + i * 1.7) * 0.015, 0);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        beads.setMatrixAt(i, dummy.matrix);
      }
      beads.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <mesh geometry={RAIL_GEO} material={railMat} castShadow receiveShadow />
      <mesh geometry={WINDOW_GEO} material={windowMat} />
      <instancedMesh ref={beadsRef} args={[BEAD_GEO, beadMat, KEY_COUNT]} castShadow />

      <mesh ref={domeRef} geometry={DOME_GEO} material={domeMat} />
      <mesh geometry={KEPT_GEO} material={keptMat} />
      <mesh geometry={DUP_GEO} material={dupMat} />

      <mesh ref={markerRef} geometry={BEAD_GEO} material={markerMat} scale={0} />
      <mesh ref={markerGlowRef} geometry={BEAD_GEO} material={markerGlowMat} scale={0} />
    </group>
  );
}
