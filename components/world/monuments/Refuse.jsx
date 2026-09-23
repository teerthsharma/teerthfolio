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
// front, one above the other, exactly as the figure's two sheets sit: the
// top board is planimeter's, the bottom shapely's, and the same one
// diagonal wave answers both in step, a peg at a time (figure.desc: "One
// wave passes through both sheets in step"). A peg pops from the wall and
// lights mint the moment its file is answered. On the top board a refused
// peg only half-rises and stays amber, held open rather than closed on a
// guess. On the bottom board every peg still lights mint first -- shapely
// never refuses, so at first its board looks like a clean sweep -- then a
// second wave passes and turns a peg coral wherever the answer was wrong,
// scattered through the board, because a wrong answer looks exactly like a
// right one until checked. Both boards then hold, drain back to the wall in
// the same wave, and the cycle repeats. The accent-lit bar between the two
// boards is that one wave, physically; it glows brighter while the checking
// wave is out. Brighter and faster when the seal is near.
//
// Counts are illustrative here (a 9x5 peg grid stands in for the figure's
// 528 files -- see parts/refuse-layout.js), the measured ratios are not:
// ~33/528 of planimeter's pegs are held open amber and none turn coral;
// ~336/528 of shapely's turn coral and none are held open.
//
// No words: every claim is a number or a name, not a shape a 3D letter could
// carry without inventing one, so the story is told in shapes and colour.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BoxGeometry, Color, ConeGeometry, IcosahedronGeometry, Object3D, SphereGeometry } from "three";
import { useUi } from "../../../lib/world/store";
import { clamp, damp, easeOutBack } from "../life/util";
import { C, glow, lamp, mat } from "../palette";
import { BOARD_H, ORDER_SPAN, PLANIMETER_PEGS, SHAPELY_PEGS } from "./parts/refuse-layout";

// fig.js's own tokens for this figure (site.css --mint-500 / --amber-500/
// --coral-500): the figure's semantic colours, not the org accent -- the
// accent (place.radiation ?? place.color) marks the building itself instead
// (trim, the wave bar, the lantern), same split Grant.jsx and Cut.jsx use.
const MINT = "#0b93ab"; // exact
const AMBER = "#d96a06"; // refused, held open
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
const WALL_TOP = 3.6;
const PANEL_Z = 0.4; // backing board, recessed a little behind the wall front (z=0.5)
const PEG_REST = PANEL_Z + 0.05; // almost flush: "blank"
const PEG_OUT = PEG_REST + 0.16; // fully popped

// The figure stacks planimeter's sheet above shapely's; this booth keeps
// that order too, so the top board is always the one that refuses rather
// than guesses.
const BOARD_B_Y0 = 0.75; // shapely's board, bottom row
const BOARD_A_Y0 = BOARD_B_Y0 + BOARD_H + 0.18; // planimeter's board, above the divider bar
const DIVIDER_Y = BOARD_B_Y0 + BOARD_H + 0.09;

const FOUND_GEO = new BoxGeometry(3.0, 0.3, 1.0);
const SIDE_WALL_GEO = new BoxGeometry(0.18, 3.3, 1.0);
const BACK_WALL_GEO = new BoxGeometry(2.64, 3.3, 0.15);
const PANEL_GEO = new BoxGeometry(2.6, 2.7, 0.1);
const ROOF_GEO = new ConeGeometry(2.47, 0.9, 4).rotateY(Math.PI / 4);
const TRIM_GEO = new BoxGeometry(0.14, 3.3, 0.14);
const WINDOW_GEO = new BoxGeometry(0.35, 0.4, 0.14);
const DIVIDER_GEO = new BoxGeometry(2.6, 0.14, 0.12);
const LANTERN_GEO = new IcosahedronGeometry(0.16, 0);
const LANTERN_GLOW_GEO = new SphereGeometry(0.3, 10, 8);
const LANTERN_STALK_GEO = new BoxGeometry(0.1, 0.3, 0.1);
const PEG_GEO = new BoxGeometry(0.22, 0.22, 0.16);

// Scratch reused every frame: never allocate inside useFrame.
const dummy = new Object3D();
const tmpColor = new Color();
const tmpTarget = new Color();
const CHARCOAL_C = new Color(C.charcoal);
const MINT_C = new Color(MINT);
const AMBER_C = new Color(AMBER);
const CORAL_C = new Color(CORAL);

// One board's worth of pegs: pop from the wall in the answer wave, held
// half-open and amber if refused, checked coral if wrong (bottom board
// only -- SHAPELY_PEGS is the only set with any `bad` pegs), drained back to
// the wall in the same wave.
function updateBoard(mesh, pegs, boardY, tau) {
  if (!mesh) return;
  for (let i = 0; i < pegs.length; i++) {
    const peg = pegs[i];
    const f = peg.order / ORDER_SPAN;

    const answerAt = f * (ANSWER_DUR - POP);
    const pOn = clamp((tau - answerAt) / POP, 0, 1);
    const onEase = easeOutBack(pOn); // snappy pop, slight overshoot past 1

    const drainAt = DRAIN_START + f * (DRAIN_DUR - POP);
    const pDrain = clamp((tau - drainAt) / POP, 0, 1);

    const outAmt = onEase * (1 - pDrain); // may slightly exceed 1 mid-pop
    const colorAmt = clamp(onEase, 0, 1) * (1 - pDrain);

    let z;
    if (peg.ref) {
      z = PEG_REST + (PEG_OUT - PEG_REST) * outAmt * 0.55;
      z += 0.015 * Math.sin(tau * 6 + peg.order) * colorAmt; // a held-open flicker, never missed
      tmpColor.copy(CHARCOAL_C).lerp(AMBER_C, colorAmt);
    } else {
      z = PEG_REST + (PEG_OUT - PEG_REST) * outAmt;
      tmpTarget.copy(MINT_C);
      if (peg.bad) {
        const checkAt = CHECK_START + f * (CHECK_DUR - POP);
        const pCheck = clamp((tau - checkAt) / POP, 0, 1);
        tmpTarget.lerp(CORAL_C, pCheck);
        z += 0.02 * Math.sin(tau * 40) * pCheck * (1 - pCheck) * 4; // a buzz as it's caught
      }
      tmpColor.copy(CHARCOAL_C).lerp(tmpTarget, colorAmt);
    }

    dummy.position.set(peg.x, boardY + peg.y, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, tmpColor);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

export default function Refuse({ place }) {
  const A = place.radiation ?? place.color;
  const near = useUi((s) => s.near === place.id);

  const foundMat = useMemo(() => mat(C.charcoal), []);
  const wallMat = useMemo(() => mat(C.warmWhite), []);
  const panelMat = useMemo(() => mat(C.charcoal, { roughness: 0.6 }), []);
  const trimMat = useMemo(() => mat(A, { roughness: 0.5 }), [A]);
  const windowMat = useMemo(() => lamp(C.lamp), []);
  const pegMat = useMemo(() => mat("#ffffff", { roughness: 0.45, metalness: 0.05 }), []);
  // Animated materials brighten near the seal and while the check wave is
  // out, so they need their own clones to mutate (palette.js's rule: never
  // mutate a cached mat()/lamp() result).
  const dividerMat = useMemo(() => lamp(A, 0.9).clone(), [A]);
  const lanternMat = useMemo(() => lamp(A, 0.9).clone(), [A]);
  const lanternGlowMat = useMemo(() => glow(A, 0.3), [A]);

  const pegARef = useRef(null);
  const pegBRef = useRef(null);
  const kRef = useRef(0); // eased 0..1 toward `near`
  const vt = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    kRef.current += ((near ? 1 : 0) - kRef.current) * damp(EASE_RATE, dt);
    const k = kRef.current;
    const speed = 1 + 0.5 * k;
    const bright = 1 + 0.4 * k;
    vt.current += dt * speed;
    const tau = vt.current % CYCLE;

    updateBoard(pegARef.current, PLANIMETER_PEGS, BOARD_A_Y0, tau);
    updateBoard(pegBRef.current, SHAPELY_PEGS, BOARD_B_Y0, tau);

    const checking = tau > CHECK_START && tau < CHECK_END;
    dividerMat.emissiveIntensity = (checking ? 1.7 : 0.7) * bright;
    lanternMat.emissiveIntensity = (0.9 + 0.3 * Math.sin(vt.current * 1.4)) * bright;
  });

  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.15, 0]} geometry={FOUND_GEO} material={foundMat} />
      <mesh castShadow receiveShadow position={[-1.41, 1.95, 0]} geometry={SIDE_WALL_GEO} material={wallMat} />
      <mesh castShadow receiveShadow position={[1.41, 1.95, 0]} geometry={SIDE_WALL_GEO} material={wallMat} />
      <mesh castShadow receiveShadow position={[0, 1.95, -0.425]} geometry={BACK_WALL_GEO} material={wallMat} />
      <mesh receiveShadow position={[0, 2.05, PANEL_Z]} geometry={PANEL_GEO} material={panelMat} />
      <mesh castShadow receiveShadow position={[0, WALL_TOP + 0.45, 0]} geometry={ROOF_GEO} material={foundMat} />

      <mesh castShadow position={[-1.41, 1.95, 0.43]} geometry={TRIM_GEO} material={trimMat} />
      <mesh castShadow position={[1.41, 1.95, 0.43]} geometry={TRIM_GEO} material={trimMat} />
      <mesh position={[-1.57, 1.95, 0.1]} geometry={WINDOW_GEO} material={windowMat} />
      <mesh position={[1.57, 1.95, 0.1]} geometry={WINDOW_GEO} material={windowMat} />

      {/* the wave that answers both boards in step, physically */}
      <mesh position={[0, DIVIDER_Y, PANEL_Z + 0.08]} geometry={DIVIDER_GEO} material={dividerMat} />

      {/* the two tally boards: top planimeter's, bottom shapely's */}
      <instancedMesh ref={pegARef} args={[PEG_GEO, pegMat, PLANIMETER_PEGS.length]} castShadow frustumCulled={false} />
      <instancedMesh ref={pegBRef} args={[PEG_GEO, pegMat, SHAPELY_PEGS.length]} castShadow frustumCulled={false} />

      {/* the lantern: this place's one accent, its science-district glow */}
      <group position={[0, WALL_TOP + 0.9 + 0.15, 0]}>
        <mesh castShadow position={[0, 0.15, 0]} geometry={LANTERN_STALK_GEO} material={foundMat} />
        <mesh castShadow position={[0, 0.46, 0]} geometry={LANTERN_GEO} material={lanternMat} />
        <mesh position={[0, 0.46, 0]} geometry={LANTERN_GLOW_GEO} material={lanternGlowMat} />
      </group>
    </group>
  );
}
