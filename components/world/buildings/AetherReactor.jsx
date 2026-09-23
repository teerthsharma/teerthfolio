"use client";

// Building for PLACE_BY_ID["aether"]: Aether-Lang, a language whose loops
// stop when their shape stops changing. A low generator hall with a roller
// door, a stack at the back-left, and a gold seed in a three-ring cage on
// the roof. The cage beads writhe, converge on a still heptagon (the seed
// flares and the cage stops turning), hold, then writhe again.
//
// Local space: origin at the footprint centre on the snow, +z faces the
// camera and the dock, footprint stays inside place.radius (3.4).

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BoxGeometry, CylinderGeometry, IcosahedronGeometry, Object3D, PlaneGeometry, SphereGeometry, TorusGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useUi } from "../../../lib/world/store";
import { damp, smoothstep, wrapAngle } from "../life/util";
import { C, glow, lamp, mat } from "../palette";

// ---- geometry, built once --------------------------------------------------

function box(w, h, d, x, y, z) {
  const g = new BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

function cyl(rt, rb, h, x, y, z, seg = 8) {
  const g = new CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}

function plane(w, h, x, y, z) {
  const g = new PlaneGeometry(w, h);
  g.translate(x, y, z);
  return g;
}

// A torus already lies flat in the XY plane (its hole axis is Z, which
// contains Y), so with no rotation it is already a vertical meridian ring;
// spinning it about Y only changes which azimuth that meridian sits at.
function meridian(r, tube, yaw, seg = 16) {
  const g = new TorusGeometry(r, tube, 6, seg);
  g.rotateY(yaw);
  return g;
}

// Rotated 90 degrees onto its side, the same ring lies flat like a cap/lid.
function flatRing(r, tube, x, y, z, seg = 16) {
  const g = new TorusGeometry(r, tube, 6, seg);
  g.rotateX(Math.PI / 2);
  g.translate(x, y, z);
  return g;
}

function buildWarmWhite() {
  return mergeGeometries([
    box(5.6, 0.3, 3.4, 0, 0.15, 0), // plinth
    box(4.6, 2.4, 3.0, 0, 1.5, 0), // hall walls
    cyl(0.36, 0.36, 1.4, 2.65, 1.0, -0.6), // day tank
    cyl(0.36, 0.36, 1.4, 2.65, 1.0, 0.4), // day tank
    cyl(0.28, 0.34, 2.9, -1.9, 4.25, -0.9), // stack, tapered
  ], false);
}

function buildCharcoal() {
  return mergeGeometries([
    box(5.7, 0.1, 3.5, 0, 0.3, 0), // plinth edge strip
    box(4.65, 0.5, 3.05, 0, 0.55, 0), // hall base band
    box(0.22, 2.4, 0.12, 2.25, 1.5, 1.56), // pilaster
    box(0.22, 2.4, 0.12, 0.9, 1.5, 1.56), // pilaster
    box(0.22, 2.4, 0.12, -0.9, 1.5, 1.56), // pilaster
    box(0.22, 2.4, 0.12, -2.25, 1.5, 1.56), // pilaster
    box(4.9, 0.22, 3.3, 0, 2.8, 0), // roof slab
    box(2.1, 0.4, 0.4, 0, 2.45, 1.7), // roller drum
    cyl(0.33, 0.33, 0.15, -1.9, 3.77, -0.9), // stack band
    cyl(0.31, 0.31, 0.15, -1.9, 4.73, -0.9), // stack band
    flatRing(0.34, 0.12, -1.9, 5.7, -0.9), // stack cap
    cyl(0.5, 0.5, 0.4, 0.4, 3.2, -0.1), // seed pedestal
  ], false);
}

function buildAccent() {
  return mergeGeometries([
    box(0.16, 1.9, 0.16, -0.92, 1.25, 1.58), // door frame, left
    box(0.16, 1.9, 0.16, 0.92, 1.25, 1.58), // door frame, right
    box(2.0, 0.16, 0.16, 0, 0.38, 1.58), // door frame, bottom
    box(2.0, 0.16, 0.16, 0, 2.12, 1.58), // door frame, top
    cyl(0.38, 0.38, 0.14, 2.65, 1.5, -0.6), // tank ring band
    cyl(0.38, 0.38, 0.14, 2.65, 1.5, 0.4), // tank ring band
  ], false);
}

function buildLampStatic() {
  return mergeGeometries([
    // The hall wall is a solid box to z=1.5: a plane recessed "inside" it
    // would be buried behind its own front face and never draw. Proud of
    // the wall, flush with the resting slats, it shows once they retract.
    plane(1.7, 1.6, 0, 1.25, 1.505),
    cyl(0.32, 0.32, 0.12, -1.9, 5.55, -0.9), // stack exhaust band, proud of the taper
  ], false);
}

const SLAT_Y = [0.57, 0.91, 1.25, 1.59, 1.93];
function buildSlats() {
  return mergeGeometries(SLAT_Y.map((y) => box(1.8, 0.34, 0.1, 0, y, 1.51)), false);
}

function buildCage() {
  return mergeGeometries([meridian(0.95, 0.12, 0), meridian(0.95, 0.12, Math.PI / 3), meridian(0.95, 0.12, (Math.PI / 3) * 2)], false);
}

const WARM_GEO = buildWarmWhite();
const CHARCOAL_GEO = buildCharcoal();
const ACCENT_GEO = buildAccent();
const LAMP_GEO = buildLampStatic();
const SLATS_GEO = buildSlats();
const CAGE_GEO = buildCage();
const SEED_GEO = new IcosahedronGeometry(0.55, 0);
const GLOW_GEO = new IcosahedronGeometry(0.9, 0);
const BEAD_GEO = new SphereGeometry(0.16, 10, 8);

const SEED_POS = [0.4, 4.0, -0.1];
const SLAT_TRAVEL = 1.2; // roller door: slats climb into the drum over ~0.8s at damp(4)
const DECAY_S = 6; // seconds for the writhe to converge, and to regrow after the hold
const CAGE_SPIN = 0.2; // rad/s while the loop hasn't converged

// Per-bead wobble rate and phase: fixed, not random, so the writhe is the
// same shape every cycle. Angles are the 7 heptagon vertices themselves,
// which never move — only each bead's radius and height wobble around it.
const BEAD_OMEGA = [1.7, 2.3, 1.9, 2.6, 2.1, 1.5, 2.4];
const BEAD_PHASE = [0, 0.9, 1.8, 2.7, 3.6, 4.5, 5.4];

const dummy = new Object3D();

export default function AetherReactor({ place }) {
  const A = place.color;
  const near = useUi((s) => s.near === place.id);

  const warmMat = mat(C.warmWhite);
  const charcoalMat = mat(C.charcoal);
  const accentMat = mat(A);
  const metalMat = mat(C.metal);
  const lampMat = lamp(C.lamp, 1);
  const beadMat = lamp(A, 1.2);
  const glowMat = glow(A, 0.25);
  // Cloned because its emissiveIntensity animates; every other material here
  // is a shared cache entry that never changes after creation.
  const seedMat = useMemo(() => lamp(A, 1.6).clone(), [A]);

  const slatsRef = useRef(null);
  const cageRef = useRef(null);
  const glowRef = useRef(null);
  const beadsRef = useRef(null);
  const anim = useRef({ phase: "decay", timer: 0, cageAngle: 0, kFlare: 0, kDoor: 0 }).current;

  useFrame((r3f, delta) => {
    const dt = Math.min(delta, 0.1);
    const t = r3f.clock.elapsedTime;
    const st = anim;

    const holdDur = near ? 5 : 3;
    st.timer += dt;
    if (st.phase === "decay" && st.timer >= DECAY_S) {
      st.phase = "hold";
      st.timer -= DECAY_S;
    } else if (st.phase === "hold" && st.timer >= holdDur) {
      st.phase = "regrow";
      st.timer -= holdDur;
    } else if (st.phase === "regrow" && st.timer >= DECAY_S) {
      st.phase = "decay";
      st.timer -= DECAY_S;
    }

    const isHold = st.phase === "hold";
    const s = st.phase === "decay" ? 1 - smoothstep(0, DECAY_S, st.timer) : st.phase === "regrow" ? smoothstep(0, DECAY_S, st.timer) : 0;

    if (!isHold) st.cageAngle = wrapAngle(st.cageAngle + CAGE_SPIN * dt);
    if (cageRef.current) cageRef.current.rotation.y = st.cageAngle;

    st.kFlare += ((isHold ? 1 : 0) - st.kFlare) * damp(4, dt);
    seedMat.emissiveIntensity = 1.6 + st.kFlare * 1.4;
    if (glowRef.current) glowRef.current.scale.setScalar(1 + st.kFlare * 0.3);

    st.kDoor += ((near ? 1 : 0) - st.kDoor) * damp(4, dt);
    if (slatsRef.current) slatsRef.current.position.y = st.kDoor * SLAT_TRAVEL;

    const beads = beadsRef.current;
    if (beads) {
      for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * Math.PI * 2;
        const wob = BEAD_OMEGA[i] * t + BEAD_PHASE[i];
        const r = 1.25 + 0.35 * s * Math.sin(wob);
        const y = SEED_POS[1] + 0.3 * s * Math.sin(wob + Math.PI / 2);
        dummy.position.set(SEED_POS[0] + Math.cos(angle) * r, y, SEED_POS[2] + Math.sin(angle) * r);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        beads.setMatrixAt(i, dummy.matrix);
      }
      beads.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <mesh geometry={WARM_GEO} material={warmMat} castShadow receiveShadow />
      <mesh geometry={CHARCOAL_GEO} material={charcoalMat} castShadow receiveShadow />
      <mesh geometry={ACCENT_GEO} material={accentMat} castShadow receiveShadow />
      <mesh geometry={LAMP_GEO} material={lampMat} />
      <mesh ref={slatsRef} geometry={SLATS_GEO} material={metalMat} castShadow receiveShadow />
      <group ref={cageRef} position={SEED_POS}>
        <mesh geometry={CAGE_GEO} material={charcoalMat} castShadow receiveShadow />
      </group>
      <mesh position={SEED_POS} geometry={SEED_GEO} material={seedMat} castShadow receiveShadow />
      <mesh ref={glowRef} position={SEED_POS} geometry={GLOW_GEO} material={glowMat} />
      <instancedMesh ref={beadsRef} args={[BEAD_GEO, beadMat, 7]} castShadow receiveShadow frustumCulled={false} />
    </group>
  );
}
