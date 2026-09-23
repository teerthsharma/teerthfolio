"use client";

// Building for planimeter (place id p-planimeter, figure name "refuse"). One
// of the lab projects Teerth builds: stands straight on the snow, no plinth.
// Local origin: the footprint centre on the snow; +z faces the camera and
// the dock. Props: { place, near } (near is also read straight off the
// store, the way the other lab buildings in this batch do, since Scene.jsx
// does not yet pass it as a prop).
//
// Sources: data/showcase.json's p-planimeter entry (claim, specs, figure).
// planimeter measures the area a closed set of strokes encloses; on 528
// constructed test files it answers 495 exactly and refuses 33 rather than
// guess, and is never wrong.
//
// Physically: a surveyor's checkpoint booth -- an ordinary land-registry
// counter's everyday job (measure a plot, stamp it exact or refuse to stamp
// it), done the way this project does it. Round 2 (judges' fixes) stripped
// the two 45-peg boards that stood in for the figure's 528 files -- a
// literal "grid of cubes standing for data", banned by SHOW, NEVER TELL,
// along with the mint-then-coral "checking" reveal that only made sense
// between two boards -- down to the figure's one hero: a few pegs held open
// rather than closed on a guess, each built from two halves that part at
// the junction where its endpoints nearly meet, in this place's own
// radiation colour, with a pulsing halo so a refusal is never missed. In
// their place the booth reads as architecture doing its job: a counter
// ledge out front, a stamp that punches down on its own beat, and a
// boom-barrier gate whose arm drops for as long as a peg is held refused --
// "exact, or refused" read straight off the silhouette, no board needed.
//
// Every area on the island is radioactive (THE STORY): this booth's own
// glow is the radiation colour (place.radiation ?? place.color, "A" below)
// -- trim, the ticket windows, the refused pegs, the stamp head, the
// lantern. It shows on the snow round the building too: motes rising out of
// it, and one peg (ANOMALY_IDX) that never fully closes and drifts in a
// slow orbit instead of drawing back into the wall with the others --
// radiation keeping a held answer from ever quite settling.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { BoxGeometry, CircleGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Object3D, SphereGeometry } from "three";
import { useUi } from "../../../lib/world/store";
import { clamp, damp, easeOutBack } from "../life/util";
import { C, glow, lamp, mat } from "../palette";
import { ORDER_SPAN, PLANIMETER_REF, PLATE_H, PLATE_W } from "./parts/refuse-layout";

// One cycle: pop the pegs in, hold them open, drain back into the wall, a
// beat of rest. (Round 2: the "checking" phase is gone with the board it
// only made sense on.)
const ANSWER_DUR = 3.2;
const POP = 0.35; // s one peg takes to pop or retreat
const HOLD_DUR = 4.6;
const DRAIN_DUR = 1.4;
const PAUSE = 0.6;
const CYCLE = ANSWER_DUR + HOLD_DUR + DRAIN_DUR + PAUSE;
const DRAIN_START = ANSWER_DUR + HOLD_DUR;

const EASE_RATE = 4; // near/far damping rate, matches Cut.jsx's

// ---- the booth, built once -------------------------------------------------
const WALL_TOP = 4.4;
const WALL_CENTER_Y = 2.35;
const WALL_H = 4.1;
const WALL_THICK = 0.18;
const BODY_W = 3.6;
const BODY_D = 2.4;
const WALL_X = BODY_W / 2 - WALL_THICK / 2;
const BACK_Z = -1.1;
const TRIM_X = WALL_X;
const TRIM_Z = BODY_D / 2 - 0.07;
const WINDOW_X = WALL_X - 0.1; // the two ticket windows, flush with the wall's outer face

// The plaque's hinge: the refused-peg mechanism lives inside this group, in
// coordinates local to the hinge, tilted back to face the elevated spawn
// camera like a small wall-mounted sign.
const HINGE_Y = 2.55;
const HINGE_Z = 0.55;
const TILT_X = -0.35;

const PANEL_Z = 0; // local to the hinge: the plaque's front sits right at it
const PEG_REST = PANEL_Z + 0.05; // almost flush: "blank"
const PEG_OUT = PEG_REST + 0.22; // fully popped, deep enough to read face-on once tilted

// judges' fix 1: the checkpoint gate, front right -- charcoal post, a
// striped boom arm that drops while a refusal is held, a beacon fixed to
// the post.
const GATE_X = 2.2;
const GATE_Z = 1.4;
const GATE_ARM_LEN = 2.4;
const GATE_ARM_SEGS = 4;
const GATE_ARM_SEG_LEN = GATE_ARM_LEN / GATE_ARM_SEGS;

// judges' fix 1/4: the counter ledge and its stamp -- two large, plainly
// readable booth shapes standing in for the removed grid, so the front
// reads as a checkpoint counter before the "planimeter" label is visible.
const COUNTER_Y = 0.95;
const COUNTER_Z = BODY_D / 2 + 0.05; // juts past the front wall line
const COUNTER_W = BODY_W * 0.68;
const COUNTER_D = 0.6;
const COUNTER_H = 0.22;
const COUNTER_TOP = COUNTER_Y + COUNTER_H / 2;

const STAMP_X = 0.85;
const STAMP_ARM_LEN = 0.34;
const STAMP_HEAD_H = 0.16;
const STAMP_POST_H = 0.55;
const STAMP_POST_Y = COUNTER_TOP + STAMP_POST_H / 2;
const STAMP_REST_Y = COUNTER_TOP + STAMP_POST_H + STAMP_ARM_LEN / 2 + 0.12; // hangs clear of the counter
const STAMP_DOWN = 0.4; // travel when it punches down, once a cycle

// The radioactive ground round the booth: nothing else on the island draws
// place.radiation on the snow yet, so the rising motes are the first.
const MOTE_COUNT = 12;
const MOTE_R = 2.6;
const MOTES = Array.from({ length: MOTE_COUNT }, (_, i) => {
  const a = i * 2.399963; // golden angle: an even scatter, no RNG needed
  const r = MOTE_R * Math.sqrt((i + 0.5) / MOTE_COUNT);
  return { x: Math.cos(a) * r, z: Math.sin(a) * r, phase: (i / MOTE_COUNT) * 4 };
});

const FOUND_GEO = new BoxGeometry(BODY_W, 0.3, BODY_D);
const SIDE_WALL_GEO = new BoxGeometry(WALL_THICK, WALL_H, BODY_D);
const BACK_WALL_GEO = new BoxGeometry(BODY_W - 2 * WALL_THICK, WALL_H, 0.15);
const PANEL_GEO = new BoxGeometry(PLATE_W, PLATE_H, 0.1);
const ROOF_GEO = new ConeGeometry(2.1, 0.9, 4).rotateY(Math.PI / 4);
const TRIM_GEO = new BoxGeometry(0.14, WALL_H, 0.14);
const WINDOW_GEO = new BoxGeometry(0.5, 0.9, 0.14);
const LANTERN_GEO = new IcosahedronGeometry(0.3, 0);
const LANTERN_GLOW_GEO = new SphereGeometry(0.75, 10, 8);
const LANTERN_STALK_GEO = new BoxGeometry(0.1, 0.3, 0.1);
const HALF_PEG_GEO = new BoxGeometry(0.24, 0.11, 0.12); // a refused peg's two parting halves
const STUD_GEO = new IcosahedronGeometry(0.06, 0); // the halves' endpoint markers
const HALO_GEO = new CircleGeometry(0.5, 20);
const MOTE_GEO = new IcosahedronGeometry(0.07, 0);
const GATE_POST_GEO = new BoxGeometry(0.3, 1.1, 0.3);
const GATE_ARM_SEG_GEO = new BoxGeometry(GATE_ARM_SEG_LEN, 0.18, 0.18);
const GATE_BEACON_GEO = new IcosahedronGeometry(0.18, 0);
const COUNTER_GEO = new BoxGeometry(COUNTER_W, COUNTER_H, COUNTER_D);
const COUNTER_TRIM_GEO = new BoxGeometry(COUNTER_W + 0.04, 0.05, COUNTER_D + 0.04);
const STAMP_POST_GEO = new BoxGeometry(0.1, STAMP_POST_H, 0.1);
const STAMP_ARM_GEO = new BoxGeometry(0.13, STAMP_ARM_LEN, 0.13);
const STAMP_HEAD_GEO = new CylinderGeometry(0.18, 0.18, STAMP_HEAD_H, 10);

// Scratch reused every frame: never allocate inside useFrame.
const dummy = new Object3D();

// judges' fix 3: one of the three refused pegs is this booth's anomaly --
// radiation keeps it from ever fully closing, and it drifts in a slow orbit
// in place instead of drawing back into the wall with its two siblings. It
// is left out of the gate's own "held" reading so the boom stays legible.
const ANOMALY_IDX = 0;
const ANOMALY_FLOOR = 0.55;
const ANOMALY_ORBIT_R = 0.05;
const ANOMALY_ORBIT_RATE = 1.1; // rad/s, slow

// One peg's pop-in / hold / drain, by its place in the wave. f=0 pops first.
function pegPhase(peg, tau) {
  const f = peg.order / ORDER_SPAN;
  const answerAt = f * (ANSWER_DUR - POP);
  const onEase = easeOutBack(clamp((tau - answerAt) / POP, 0, 1));
  const drainAt = DRAIN_START + f * (DRAIN_DUR - POP);
  const pDrain = clamp((tau - drainAt) / POP, 0, 1);
  return { colorAmt: clamp(onEase, 0, 1) * (1 - pDrain) };
}

// The refused pegs: each one two halves parting at a gap that eases
// 0 -> 0.10 m, two endpoint studs at the gap's edges, and a pulsing halo
// behind it so a refusal is never missed at 35 m. Returns how strongly the
// normal-cycle pegs are held (0..1), which drives the checkpoint gate.
function updateRefPegs(halfMesh, studMesh, haloMesh, pegs, tau, k) {
  let held = 0;
  if (!halfMesh || !studMesh || !haloMesh) return held;
  const outReach = PEG_REST + (PEG_OUT - PEG_REST) * (1 + 0.6 * k);
  for (let i = 0; i < pegs.length; i++) {
    const peg = pegs[i];
    const isAnomaly = i === ANOMALY_IDX;
    let { colorAmt } = pegPhase(peg, tau);
    if (isAnomaly) colorAmt = Math.max(colorAmt, ANOMALY_FLOOR);
    else held = Math.max(held, colorAmt);

    const gap = 0.1 * colorAmt;
    const z = PEG_REST + (outReach - PEG_REST) * 0.5 * colorAmt + 0.015 * Math.sin(tau * 6 + peg.order) * colorAmt;
    const ang = tau * ANOMALY_ORBIT_RATE;
    const x = peg.x + (isAnomaly ? Math.cos(ang) * ANOMALY_ORBIT_R : 0);
    const y = peg.y + (isAnomaly ? Math.sin(ang) * ANOMALY_ORBIT_R : 0);

    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.position.set(x, y + 0.055 + gap / 2, z);
    dummy.updateMatrix();
    halfMesh.setMatrixAt(i * 2, dummy.matrix);
    dummy.position.set(x, y - 0.055 - gap / 2, z);
    dummy.updateMatrix();
    halfMesh.setMatrixAt(i * 2 + 1, dummy.matrix);

    dummy.position.set(x, y + gap / 2, z + 0.02);
    dummy.updateMatrix();
    studMesh.setMatrixAt(i * 2, dummy.matrix);
    dummy.position.set(x, y - gap / 2, z + 0.02);
    dummy.updateMatrix();
    studMesh.setMatrixAt(i * 2 + 1, dummy.matrix);

    const haloR = 0.001 + colorAmt * (1 + 0.6 * k) * (1 + 0.1 * Math.sin(tau * 2.6 + peg.x));
    dummy.position.set(x, y, PEG_REST - 0.12);
    dummy.scale.setScalar(haloR);
    dummy.updateMatrix();
    haloMesh.setMatrixAt(i, dummy.matrix);
  }
  halfMesh.instanceMatrix.needsUpdate = true;
  studMesh.instanceMatrix.needsUpdate = true;
  haloMesh.instanceMatrix.needsUpdate = true;
  return held;
}

export default function Refuse({ place }) {
  const A = place.radiation ?? place.color;
  const near = useUi((s) => s.near === place.id);

  const foundMat = useMemo(() => mat(C.charcoal), []);
  const wallMat = useMemo(() => mat(C.warmWhite), []);
  const panelMat = useMemo(() => mat(C.charcoal, { roughness: 0.6 }), []);
  const trimMat = useMemo(() => mat(A, { roughness: 0.5 }), [A]);
  const windowMat = useMemo(() => lamp(A, 1.2), [A]);
  const halfPegMat = useMemo(() => lamp(A, 1.4).clone(), [A]); // the refused pegs, in the radiation colour
  const studMat = useMemo(() => lamp(A), [A]);
  const haloMat = useMemo(() => glow(A, 0.35), [A]);
  const moteMat = useMemo(() => lamp(A, 2), [A]);
  const beaconMat = useMemo(() => lamp(A).clone(), [A]);
  // Animated materials brighten near the seal, so they need their own
  // clones to mutate (palette.js's rule: never mutate a cached mat()/lamp()
  // result).
  const lanternMat = useMemo(() => lamp(A, 0.9).clone(), [A]);
  const lanternGlowMat = useMemo(() => glow(A, 0.3), [A]);

  const halfPegRef = useRef(null);
  const studRef = useRef(null);
  const haloRef = useRef(null);
  const armARef = useRef(null);
  const armWhiteRef = useRef(null);
  const gatePivotRef = useRef(null);
  const stampRef = useRef(null);
  const moteRef = useRef(null);
  const kRef = useRef(0); // eased 0..1 toward `near`
  const vt = useRef(0);

  // The gate arm's two segment colours are static (only the pivot group
  // rotates), so their instance matrices are set once, not every frame.
  useLayoutEffect(() => {
    const setAt = (mesh, idx, x) => {
      if (!mesh) return;
      dummy.position.set(x, 0, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
    };
    for (let i = 0; i < GATE_ARM_SEGS; i++) {
      const x = -(i * GATE_ARM_SEG_LEN + GATE_ARM_SEG_LEN / 2);
      setAt(i % 2 === 0 ? armARef.current : armWhiteRef.current, Math.floor(i / 2), x);
    }
    if (armARef.current) armARef.current.instanceMatrix.needsUpdate = true;
    if (armWhiteRef.current) armWhiteRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    kRef.current += ((near ? 1 : 0) - kRef.current) * damp(EASE_RATE, dt);
    const k = kRef.current;
    const speed = 1 + 0.5 * k;
    const bright = 1 + 0.4 * k;
    vt.current += dt * speed;
    const tau = vt.current % CYCLE;
    const t = vt.current;

    const held = updateRefPegs(halfPegRef.current, studRef.current, haloRef.current, PLANIMETER_REF, tau, k);

    lanternMat.emissiveIntensity = (0.9 + 0.3 * Math.sin(t * 1.4)) * bright;

    // judges' fix 4: the stamp punches down once a cycle, near where the
    // pegs finish popping in -- booth life on its own beat, not a chart.
    const stampPhase = (tau - (ANSWER_DUR - 0.15)) / 0.5;
    const stampPulse = stampPhase >= 0 && stampPhase <= 1 ? Math.sin(stampPhase * Math.PI) : 0;
    if (stampRef.current) stampRef.current.position.y = STAMP_REST_Y - STAMP_DOWN * stampPulse;

    // the boom drops while any peg is held refused, with a small wobble
    // when the seal is close; its beacon blinks the same span.
    const wobble = 0.05 * k * Math.sin(t * 9);
    if (gatePivotRef.current) gatePivotRef.current.rotation.z = 1.35 * (1 - held) + wobble;
    const blink = held > 0.05 ? 0.5 + 0.5 * Math.sin(t * 3 * Math.PI * 2) : 0;
    beaconMat.emissiveIntensity = 0.3 + 1.4 * blink * held;

    // the radioactive ground: motes rising out of the snow, brighter and
    // (very slightly) faster when the seal is near.
    if (moteRef.current) {
      for (let i = 0; i < MOTES.length; i++) {
        const m = MOTES[i];
        const loopT = ((t + m.phase) % 4) / 4;
        dummy.position.set(m.x, loopT * 5, m.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        moteRef.current.setMatrixAt(i, dummy.matrix);
      }
      moteRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.15, 0]} geometry={FOUND_GEO} material={foundMat} />
      <mesh castShadow receiveShadow position={[-WALL_X, WALL_CENTER_Y, 0]} geometry={SIDE_WALL_GEO} material={wallMat} />
      <mesh castShadow receiveShadow position={[WALL_X, WALL_CENTER_Y, 0]} geometry={SIDE_WALL_GEO} material={wallMat} />
      <mesh castShadow receiveShadow position={[0, WALL_CENTER_Y, BACK_Z]} geometry={BACK_WALL_GEO} material={wallMat} />
      <mesh castShadow receiveShadow position={[0, WALL_TOP + 0.45, -0.35]} geometry={ROOF_GEO} material={foundMat} />

      <mesh castShadow position={[-TRIM_X, WALL_CENTER_Y, TRIM_Z]} geometry={TRIM_GEO} material={trimMat} />
      <mesh castShadow position={[TRIM_X, WALL_CENTER_Y, TRIM_Z]} geometry={TRIM_GEO} material={trimMat} />
      <mesh position={[-WINDOW_X, WALL_CENTER_Y, 0.24]} geometry={WINDOW_GEO} material={windowMat} />
      <mesh position={[WINDOW_X, WALL_CENTER_Y, 0.24]} geometry={WINDOW_GEO} material={windowMat} />

      {/* judges' fix 1/4: the counter and its stamp -- large, plainly
          readable booth shapes in place of the removed grid */}
      <mesh castShadow receiveShadow position={[0, COUNTER_Y, COUNTER_Z]} geometry={COUNTER_GEO} material={wallMat} />
      <mesh position={[0, COUNTER_TOP + 0.03, COUNTER_Z]} geometry={COUNTER_TRIM_GEO} material={trimMat} />
      <mesh castShadow position={[STAMP_X, STAMP_POST_Y, COUNTER_Z - 0.2]} geometry={STAMP_POST_GEO} material={foundMat} />
      <group ref={stampRef} position={[STAMP_X, STAMP_REST_Y, COUNTER_Z - 0.05]}>
        <mesh castShadow geometry={STAMP_ARM_GEO} material={foundMat} position={[0, -STAMP_ARM_LEN / 2, 0]} />
        <mesh castShadow geometry={STAMP_HEAD_GEO} material={trimMat} position={[0, -STAMP_ARM_LEN - STAMP_HEAD_H / 2, 0]} />
      </group>

      {/* the refused-peg plaque: the figure's one hero, held open rather
          than closed on a guess (fix 1) */}
      <group position={[0, HINGE_Y, HINGE_Z]} rotation={[TILT_X, 0, 0]}>
        <mesh receiveShadow position={[0, 0, PANEL_Z]} geometry={PANEL_GEO} material={panelMat} />
        <instancedMesh ref={halfPegRef} args={[HALF_PEG_GEO, halfPegMat, PLANIMETER_REF.length * 2]} castShadow frustumCulled={false} />
        <instancedMesh ref={studRef} args={[STUD_GEO, studMat, PLANIMETER_REF.length * 2]} frustumCulled={false} />
        <instancedMesh ref={haloRef} args={[HALO_GEO, haloMat, PLANIMETER_REF.length]} frustumCulled={false} />
      </group>

      {/* the lantern: this place's one accent, its science-district glow */}
      <group position={[0, WALL_TOP + 0.9 + 0.15, 0]}>
        <mesh castShadow position={[0, 0.15, 0]} geometry={LANTERN_STALK_GEO} material={foundMat} />
        <mesh castShadow position={[0, 0.46, 0]} geometry={LANTERN_GEO} material={lanternMat} />
        <mesh position={[0, 0.46, 0]} geometry={LANTERN_GLOW_GEO} material={lanternGlowMat} />
      </group>

      {/* a checkpoint that refuses: the boom drops while a refusal is held */}
      <mesh castShadow position={[GATE_X, 0.55, GATE_Z]} geometry={GATE_POST_GEO} material={foundMat} />
      <group ref={gatePivotRef} position={[GATE_X, 1.1, GATE_Z]} rotation={[0, 0, 1.35]}>
        <instancedMesh ref={armARef} args={[GATE_ARM_SEG_GEO, trimMat, 2]} castShadow frustumCulled={false} />
        <instancedMesh ref={armWhiteRef} args={[GATE_ARM_SEG_GEO, wallMat, 2]} castShadow frustumCulled={false} />
      </group>
      <mesh position={[GATE_X, 1.3, GATE_Z]} geometry={GATE_BEACON_GEO} material={beaconMat} />

      {/* the radioactive area, visible on the ground: rising motes only --
          judges' fix 2 removed the flat glow disc ("yellow pee stains") */}
      <instancedMesh ref={moteRef} args={[MOTE_GEO, moteMat, MOTES.length]} frustumCulled={false} />
    </group>
  );
}
