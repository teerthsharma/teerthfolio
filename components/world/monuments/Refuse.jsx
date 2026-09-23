"use client";

// Building for planimeter (place id p-planimeter, figure name "refuse"). One
// of the lab projects Teerth builds: stands straight on the snow, no plinth.
// Local origin: the footprint centre on the snow; +z faces the camera and
// the dock. Props: { place, near } (near is also read straight off the
// store, the way the other lab buildings in this batch do, since Scene.jsx
// does not yet pass it as a prop).
//
// Sources: data/showcase.json's p-planimeter entry (claim, specs, figure)
// and teerthsharma.github.io/fig.js's refuse() design comment. planimeter
// measures the area a closed set of strokes encloses; on 528 constructed
// test files it answers 495 exactly and refuses 33 rather than guess, and is
// never wrong. shapely.polygonize_full answers every one of the same 528 and
// is wrong on 336 of them -- a wrong answer that never announces itself
// (figure.desc, specs, claim).
//
// Physically: a surveyor's checkpoint booth -- an ordinary land-registry
// counter's everyday job (measure a plot, stamp it exact or refuse to stamp
// it) done the way this project does it. Two tally boards are mounted on its
// front, tilted back to face the camera like a drafting table, one above the
// other, exactly as the figure's two sheets sit: the top board is
// planimeter's, the bottom shapely's, and the same one diagonal wave answers
// both in step, a peg at a time (figure.desc: "One wave passes through both
// sheets in step"). A peg pops from the wall and lights mint the moment its
// file is answered. On the top board a refused peg is built from two halves
// that part at the junction where its endpoints nearly meet, held open
// rather than closed on a guess, in this place's own radiation colour, with
// a soft pulsing halo so it is never missed. On the bottom board every peg
// still lights mint first -- shapely never refuses, so at first its board
// looks like a clean sweep -- then a second wave passes and turns a peg
// coral wherever the answer was wrong, scattered through the board, because
// a wrong answer looks exactly like a right one until checked. Both boards
// then hold, drain back to the wall in the same wave, and the cycle repeats.
// A travelling bar rides in front of both boards, physically the one wave;
// its lower half turns coral while the checking wave is out. A boom-barrier
// gate stands at the front, post and blinking beacon fixed, arm dropping to
// block the entrance for as long as any peg is held refused -- "exact, or
// refused" read straight from the building's silhouette. Brighter, faster
// and prouder when the seal is near.
//
// Every area on the island is radioactive (THE STORY): this booth's own
// glow is the radiation colour (place.radiation ?? place.color, "A" below),
// never the figure's own mint/coral tokens, which stay fixed. It shows on
// the snow round the building (a glow disc, motes rising out of the snow)
// as well as on the booth itself (trim, windows, wave, halos, lantern).
//
// Counts are illustrative here (a 9x5 peg grid stands in for the figure's
// 528 files -- see parts/refuse-layout.js), the measured ratios are not:
// ~33/528 of planimeter's pegs are held open and none turn coral; ~336/528
// of shapely's turn coral and none are held open.
//
// No words: every claim is a number or a name, not a shape a 3D letter could
// carry without inventing one, so the story is told in shapes and colour.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { BoxGeometry, CircleGeometry, Color, ConeGeometry, IcosahedronGeometry, Object3D, SphereGeometry } from "three";
import { useUi } from "../../../lib/world/store";
import { clamp, damp, easeOutBack } from "../life/util";
import { C, glow, lamp, mat } from "../palette";
import { BOARD_H, BOARD_W, ORDER_SPAN, PLANIMETER_PEGS, SHAPELY_PEGS } from "./parts/refuse-layout";

// fig.js's own tokens for this figure (site.css --mint-500 / --coral-500):
// the figure's semantic colours, not the org accent -- the accent
// (place.radiation ?? place.color) marks the building itself instead (trim,
// windows, the wave, the refused pegs' own glow, the lantern), same split
// Grant.jsx and Cut.jsx use. There is no hard-coded amber any more: a
// refusal glows in this place's own radiation colour.
const MINT = "#0b93ab"; // exact
const CORAL = "#d9376e"; // wrong

// One cycle: answer both boards in step, hold, check (bottom board only),
// hold on the result, drain back to the wall, a beat of rest.
const ANSWER_DUR = 3.2;
const POP = 0.35; // s one peg takes to pop or retreat
const HOLD1 = 0.8;
const CHECK_DUR = 2.4;
const HOLD2 = 1.6;
const DRAIN_DUR = 1.4;
const PAUSE = 0.6;
const CYCLE = ANSWER_DUR + HOLD1 + CHECK_DUR + HOLD2 + DRAIN_DUR + PAUSE;
const CHECK_START = ANSWER_DUR + HOLD1;
const CHECK_END = CHECK_START + CHECK_DUR;
const DRAIN_START = CHECK_END + HOLD2;

const EASE_RATE = 4; // near/far damping rate, matches Cut.jsx's

// ---- the booth, built once -------------------------------------------------
const WALL_TOP = 4.4; // fix 1: was 3.6 -- the eave used to hide the top board
const WALL_CENTER_Y = 2.35;
const WALL_H = 4.1;
const WALL_THICK = 0.18;
const BODY_W = 3.6; // fix 6: was 3.0 -- wide enough for the taller-pitched board and the gate
const BODY_D = 2.4; // fix 6: was 1.0 -- "a checkpoint that refuses" needs some depth
const WALL_X = BODY_W / 2 - WALL_THICK / 2;
const BACK_Z = -1.1; // fix 6
const TRIM_X = WALL_X;
const TRIM_Z = BODY_D / 2 - 0.07;
const WINDOW_X = WALL_X - 0.1; // fix 2 (review round 1): was WALL_X + 0.16, 0.07 m outside the wall's own outer face -- flush now, between the corner trim and the wall

// The tilted board group's hinge (fix 2): PANEL, DIVIDER, the wave and every
// peg mesh live inside this group, in coordinates local to the hinge, so the
// whole board leans back to face the elevated spawn camera like a drafting
// table. Everything below marked "local to the hinge" is a group-local
// number, not a world one.
const HINGE_Y = 0.7;
const HINGE_Z = 0.4;
const TILT_X = -0.45;

const PANEL_Z = 0; // local to the hinge: the panel's front sits right at it
const PEG_REST = PANEL_Z + 0.05; // almost flush: "blank"
const PEG_OUT = PEG_REST + 0.22; // fix 2: fully popped, deep enough to read face-on once tilted

// The figure stacks planimeter's sheet above shapely's; this booth keeps
// that order too, so the top board is always the one that refuses rather
// than guesses. Y values below are local to the hinge.
const BOARD_B_Y0 = 0.75 - HINGE_Y; // shapely's board, bottom row
const BOARD_A_Y0 = BOARD_B_Y0 + BOARD_H + 0.18; // planimeter's board, above the divider bar
const DIVIDER_Y = BOARD_B_Y0 + BOARD_H + 0.09;
const DIVIDER_Z = PEG_OUT + 0.02; // fix 5: was PANEL_Z + 0.08, hidden behind the pegs
const BOARD_TOP = BOARD_A_Y0 + BOARD_H + 0.11; // top row's peg top edge
const BOARD_BOTTOM = BOARD_B_Y0 - 0.11; // bottom row's peg bottom edge
const BOARD_CENTER_Y = (BOARD_TOP + BOARD_BOTTOM) / 2;
const WAVE_Z = PEG_OUT + 0.06; // fix 5: in front of both boards

// planimeter's 3 refused pegs get their own instances (fix 3/4): the
// figure's hero, never mixed into the plain mint/charcoal board.
const PLANIMETER_REF = PLANIMETER_PEGS.filter((p) => p.ref);
const PLANIMETER_REGULAR = PLANIMETER_PEGS.filter((p) => !p.ref);

// The checkpoint gate, front right: charcoal post, a striped boom arm that
// drops while a refusal is held, a beacon fixed to the post (fix 6).
const GATE_X = 2.2;
const GATE_Z = 1.4;
const GATE_ARM_LEN = 2.4;
const GATE_ARM_SEGS = 4;
const GATE_ARM_SEG_LEN = GATE_ARM_LEN / GATE_ARM_SEGS;

// The radioactive ground round the booth (fix 7): nothing else on the
// island draws place.radiation on the snow yet, so this is the first.
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
const PANEL_GEO = new BoxGeometry(BOARD_W + 0.3, BOARD_TOP - BOARD_BOTTOM + 0.15, 0.1);
const ROOF_GEO = new ConeGeometry(2.1, 0.9, 4).rotateY(Math.PI / 4); // fix 1: was r=2.47 at z=0, eave hid the top board
const TRIM_GEO = new BoxGeometry(0.14, WALL_H, 0.14);
const WINDOW_GEO = new BoxGeometry(0.5, 0.9, 0.14); // fix 3: was 0.35x0.4, too small to glow
const DIVIDER_GEO = new BoxGeometry(BOARD_W + 0.3, 0.14, 0.12);
const LANTERN_GEO = new IcosahedronGeometry(0.3, 0); // fix 7: was 0.16
const LANTERN_GLOW_GEO = new SphereGeometry(0.75, 10, 8); // fix 7: was 0.3
const LANTERN_STALK_GEO = new BoxGeometry(0.1, 0.3, 0.1);
const PEG_GEO = new BoxGeometry(0.22, 0.22, 0.12); // fix 2: was depth 0.16
const HALF_PEG_GEO = new BoxGeometry(0.24, 0.11, 0.12); // fix 4: a refused peg's two parting halves
const STUD_GEO = new IcosahedronGeometry(0.06, 0); // fix 4: the halves' endpoint markers
const HALO_GEO = new CircleGeometry(0.5, 20); // fix 4, widened review round 1 (was 0.34 -- blended into the peg's own glow)
const WAVE_GEO = new BoxGeometry(0.16, 2.9, 0.08); // fix 5: the travelling wave, top+bottom
const WAVE_LOWER_GEO = new BoxGeometry(0.16, 1.45, 0.08); // fix 5: its coral-tintable lower half
const GLOW_DISC_GEO = new CircleGeometry(3.4, 40); // fix 7
const MOTE_GEO = new IcosahedronGeometry(0.07, 0); // fix 7
const GATE_POST_GEO = new BoxGeometry(0.3, 1.1, 0.3); // fix 6
const GATE_ARM_SEG_GEO = new BoxGeometry(GATE_ARM_SEG_LEN, 0.18, 0.18); // fix 6
const GATE_BEACON_GEO = new IcosahedronGeometry(0.18, 0); // fix 6

// Scratch reused every frame: never allocate inside useFrame.
const dummy = new Object3D();
const tmpColor = new Color();
const tmpTarget = new Color();
const waveColorScratch = new Color();
const CHARCOAL_C = new Color(C.charcoal);
const MINT_C = new Color(MINT);
const CORAL_C = new Color(CORAL);

// Shared timing math for one peg's pop-in / hold / drain, by its place in
// the one diagonal wave. Used by every peg on both boards and by the 3
// refused pegs, so the wave reads as one thing, not three.
function pegPhase(peg, tau) {
  const f = peg.order / ORDER_SPAN;
  const answerAt = f * (ANSWER_DUR - POP);
  const onEase = easeOutBack(clamp((tau - answerAt) / POP, 0, 1));
  const drainAt = DRAIN_START + f * (DRAIN_DUR - POP);
  const pDrain = clamp((tau - drainAt) / POP, 0, 1);
  return { f, onEase, pDrain, colorAmt: clamp(onEase, 0, 1) * (1 - pDrain) };
}

// One board's plain pegs: pop from the wall in the answer wave, lit mint
// (or checked coral, bottom board only -- SHAPELY_PEGS is the only set with
// any `bad` pegs), drained back to the wall in the same wave. k is the
// near-seal amount (fix 8): the pop reaches further when the seal is close.
function updateBoard(mesh, pegs, boardY, tau, k) {
  if (!mesh) return;
  const outReach = PEG_REST + (PEG_OUT - PEG_REST) * (1 + 0.6 * k);
  for (let i = 0; i < pegs.length; i++) {
    const peg = pegs[i];
    const { f, onEase, pDrain, colorAmt } = pegPhase(peg, tau);
    const outAmt = onEase * (1 - pDrain);
    let z = PEG_REST + (outReach - PEG_REST) * outAmt;

    tmpTarget.copy(MINT_C);
    if (peg.bad) {
      const checkAt = CHECK_START + f * (CHECK_DUR - POP);
      const pCheck = clamp((tau - checkAt) / POP, 0, 1);
      tmpTarget.lerp(CORAL_C, pCheck);
      z += 0.02 * Math.sin(tau * 40) * pCheck * (1 - pCheck) * 4; // a buzz as it's caught
    }
    tmpColor.copy(CHARCOAL_C).lerp(tmpTarget, colorAmt);

    dummy.position.set(peg.x, boardY + peg.y, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, tmpColor);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

// The 3 refused pegs (fix 4): each one two halves parting at a gap that
// eases 0 -> 0.10 m (fig.js kind 1's own gap, scaled to this booth's
// metres), two endpoint studs at the gap's edges, and a pulsing halo behind
// it so a refusal is never missed at 35 m. Returns how strongly any of the
// 3 is currently held (0..1), which drives the checkpoint gate.
function updateRefPegs(halfMesh, studMesh, haloMesh, pegs, boardY, tau, k) {
  let held = 0;
  if (!halfMesh || !studMesh || !haloMesh) return held;
  const outReach = PEG_REST + (PEG_OUT - PEG_REST) * (1 + 0.6 * k);
  for (let i = 0; i < pegs.length; i++) {
    const peg = pegs[i];
    const { colorAmt } = pegPhase(peg, tau);
    held = Math.max(held, colorAmt);

    const gap = 0.1 * colorAmt; // grows open as it's held, closes as it drains
    const z = PEG_REST + (outReach - PEG_REST) * 0.5 * colorAmt + 0.015 * Math.sin(tau * 6 + peg.order) * colorAmt;
    const y = boardY + peg.y;

    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.position.set(peg.x, y + 0.055 + gap / 2, z);
    dummy.updateMatrix();
    halfMesh.setMatrixAt(i * 2, dummy.matrix);
    dummy.position.set(peg.x, y - 0.055 - gap / 2, z);
    dummy.updateMatrix();
    halfMesh.setMatrixAt(i * 2 + 1, dummy.matrix);

    dummy.position.set(peg.x, y + gap / 2, z + 0.02);
    dummy.updateMatrix();
    studMesh.setMatrixAt(i * 2, dummy.matrix);
    dummy.position.set(peg.x, y - gap / 2, z + 0.02);
    dummy.updateMatrix();
    studMesh.setMatrixAt(i * 2 + 1, dummy.matrix);

    const haloR = 0.001 + colorAmt * (1 + 0.6 * k) * (1 + 0.1 * Math.sin(tau * 2.6 + peg.x));
    dummy.position.set(peg.x, y, PEG_REST - 0.12); // review round 1: was -0.05, pulled back so the halo separates from the peg instead of blending into it
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
  const windowMat = useMemo(() => lamp(A, 1.2), [A]); // fix 3: was lamp(C.lamp) -- windows now glow the radiation colour
  const pegMat = useMemo(() => mat("#ffffff", { roughness: 0.45, metalness: 0.05 }), []);
  const halfPegMat = useMemo(() => lamp(A, 1.4).clone(), [A]); // fix 3/4: the refused pegs, in the radiation colour
  const studMat = useMemo(() => lamp(A), [A]);
  const haloMat = useMemo(() => glow(A, 0.35), [A]);
  const glowDiscMat = useMemo(() => glow(A, 0.18).clone(), [A]); // fix 7
  const moteMat = useMemo(() => lamp(A, 2), [A]); // fix 7
  const beaconMat = useMemo(() => lamp(A).clone(), [A]); // fix 6
  const A_C = useMemo(() => new Color(A), [A]);
  // Animated materials brighten near the seal and while the check wave is
  // out, so they need their own clones to mutate (palette.js's rule: never
  // mutate a cached mat()/lamp() result).
  const dividerMat = useMemo(() => lamp(A, 0.9).clone(), [A]);
  const lanternMat = useMemo(() => lamp(A, 0.9).clone(), [A]);
  const lanternGlowMat = useMemo(() => glow(A, 0.3), [A]);
  const waveMainMat = useMemo(() => lamp(A, 1.6).clone(), [A]); // fix 5
  const waveLowerMat = useMemo(() => lamp(A, 1.6).clone(), [A]); // fix 5

  const pegARef = useRef(null);
  const pegBRef = useRef(null);
  const halfPegRef = useRef(null);
  const studRef = useRef(null);
  const haloRef = useRef(null);
  const waveMainRef = useRef(null);
  const waveLowerRef = useRef(null);
  const armARef = useRef(null);
  const armWhiteRef = useRef(null);
  const gatePivotRef = useRef(null);
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

    updateBoard(pegARef.current, PLANIMETER_REGULAR, BOARD_A_Y0, tau, k);
    updateBoard(pegBRef.current, SHAPELY_PEGS, BOARD_B_Y0, tau, k);
    const held = updateRefPegs(halfPegRef.current, studRef.current, haloRef.current, PLANIMETER_REF, BOARD_A_Y0, tau, k);

    const checking = tau > CHECK_START && tau < CHECK_END;
    const draining = tau >= DRAIN_START && tau < DRAIN_START + DRAIN_DUR;
    dividerMat.emissiveIntensity = (checking ? 1.7 : 0.7) * bright;
    lanternMat.emissiveIntensity = (0.9 + 0.3 * Math.sin(t * 1.4)) * bright;

    // fix 5: the one wave, physically -- answers, checks (coral on its
    // lower half), then drains, the same sweep each time; gone the rest.
    let waveT = null;
    if (tau < ANSWER_DUR) waveT = tau / ANSWER_DUR;
    else if (checking) waveT = (tau - CHECK_START) / CHECK_DUR;
    else if (draining) waveT = (tau - DRAIN_START) / DRAIN_DUR;
    if (waveMainRef.current && waveLowerRef.current) {
      if (waveT !== null) {
        const wx = -BOARD_W / 2 + BOARD_W * clamp(waveT, 0, 1);
        waveMainRef.current.position.x = wx;
        waveMainRef.current.scale.y = 1;
        waveLowerRef.current.position.x = wx;
        waveLowerRef.current.scale.y = checking || draining ? 1 : 0;
      } else {
        waveMainRef.current.scale.y = 0;
        waveLowerRef.current.scale.y = 0;
      }
    }
    waveMainMat.emissiveIntensity = 1.6 + 1.0 * k; // fix 8: 1.6 -> 2.6 near the seal
    waveColorScratch.copy(A_C).lerp(CORAL_C, checking || draining ? 1 : 0);
    waveLowerMat.color.copy(waveColorScratch);
    waveLowerMat.emissive.copy(waveColorScratch);

    // fix 6/8: the boom drops while any peg is held refused, with a small
    // wobble when the seal is close; its beacon blinks the same span.
    const wobble = 0.05 * k * Math.sin(t * 9);
    if (gatePivotRef.current) gatePivotRef.current.rotation.z = 1.35 * (1 - held) + wobble;
    const blink = held > 0.05 ? 0.5 + 0.5 * Math.sin(t * 3 * Math.PI * 2) : 0;
    beaconMat.emissiveIntensity = 0.3 + 1.4 * blink * held;

    // fix 7/8: the radioactive ground -- a glow disc and motes rising out
    // of the snow, brighter and (very slightly) faster when the seal is near.
    glowDiscMat.opacity = 0.14 + 0.12 * k + 0.04 * Math.sin(t * 1.3);
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

      {/* the two tally boards, tilted back to face the camera (fix 2) */}
      <group position={[0, HINGE_Y, HINGE_Z]} rotation={[TILT_X, 0, 0]}>
        <mesh receiveShadow position={[0, BOARD_CENTER_Y, PANEL_Z]} geometry={PANEL_GEO} material={panelMat} />
        <mesh position={[0, DIVIDER_Y, DIVIDER_Z]} geometry={DIVIDER_GEO} material={dividerMat} />

        <instancedMesh ref={pegARef} args={[PEG_GEO, pegMat, PLANIMETER_REGULAR.length]} castShadow frustumCulled={false} />
        <instancedMesh ref={pegBRef} args={[PEG_GEO, pegMat, SHAPELY_PEGS.length]} castShadow frustumCulled={false} />

        {/* the figure's hero: 3 refused pegs, held open rather than closed on a guess */}
        <instancedMesh ref={halfPegRef} args={[HALF_PEG_GEO, halfPegMat, PLANIMETER_REF.length * 2]} castShadow frustumCulled={false} />
        <instancedMesh ref={studRef} args={[STUD_GEO, studMat, PLANIMETER_REF.length * 2]} frustumCulled={false} />
        <instancedMesh ref={haloRef} args={[HALO_GEO, haloMat, PLANIMETER_REF.length]} frustumCulled={false} />

        {/* the one wave that answers, checks and drains both boards in step */}
        <mesh ref={waveMainRef} position={[0, BOARD_CENTER_Y, WAVE_Z]} geometry={WAVE_GEO} material={waveMainMat} />
        <mesh ref={waveLowerRef} position={[0, BOARD_CENTER_Y - 0.725, WAVE_Z + 0.005]} geometry={WAVE_LOWER_GEO} material={waveLowerMat} />
      </group>

      {/* the lantern: this place's one accent, its science-district glow */}
      <group position={[0, WALL_TOP + 0.9 + 0.15, 0]}>
        <mesh castShadow position={[0, 0.15, 0]} geometry={LANTERN_STALK_GEO} material={foundMat} />
        <mesh castShadow position={[0, 0.46, 0]} geometry={LANTERN_GEO} material={lanternMat} />
        <mesh position={[0, 0.46, 0]} geometry={LANTERN_GLOW_GEO} material={lanternGlowMat} />
      </group>

      {/* a checkpoint that refuses (fix 6): the boom drops while a refusal is held */}
      <mesh castShadow position={[GATE_X, 0.55, GATE_Z]} geometry={GATE_POST_GEO} material={foundMat} />
      <group ref={gatePivotRef} position={[GATE_X, 1.1, GATE_Z]} rotation={[0, 0, 1.35]}>
        <instancedMesh ref={armARef} args={[GATE_ARM_SEG_GEO, trimMat, 2]} castShadow frustumCulled={false} />
        <instancedMesh ref={armWhiteRef} args={[GATE_ARM_SEG_GEO, wallMat, 2]} castShadow frustumCulled={false} />
      </group>
      <mesh position={[GATE_X, 1.3, GATE_Z]} geometry={GATE_BEACON_GEO} material={beaconMat} />

      {/* the radioactive area, visible on the ground (fix 7) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} geometry={GLOW_DISC_GEO} material={glowDiscMat} />
      <instancedMesh ref={moteRef} args={[MOTE_GEO, moteMat, MOTES.length]} frustumCulled={false} />
    </group>
  );
}
