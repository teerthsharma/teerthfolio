"use client";

// Building for the "certify" figure: separatrix (place id p-separatrix).
// figure.desc: a phase portrait with two attractors and a saddle between
// them; every start flows to one side, unless its rounding disc touches the
// separatrix, in which case it is torn toward both sides and nothing is
// returned. figure.claim: certifies a top-k, an argmin or a threshold was
// decided by the data, not by where the kernel rounded.
//
// The everyday building whose job that is: a checkpoint pavilion under a
// hyperbolic-paraboloid roof -- an expo pavilion's roof type (the 1958
// Philips Pavilion), built to the figure's own shape. The roof IS the
// story: its ridge (ROOF_APEX along x=0) is the stable manifold, painted as
// the separatrix; its fall to the eaves is the unstable direction. A hopper
// drops snowball parcels onto the ridge on a fixed sequence; each one rolls
// down the saddle exactly like the figure's own flow. Clear of the ridge,
// it rolls off its side and drops into that side's pool, which rings as it
// settles and lifts the boom gate. Within the rounding band, it stalls on
// the separatrix instead, a disc swelling under it, then tears into two
// half-scale halves that slide toward both eaves at once and fade before
// they arrive -- nothing certified, the gate stays down, the beacon flashes.
//
// Local origin: the snow at the place centre (no plinth); +z faces the
// camera and the dock. Props: { place, near? } -- near falls back to the ui
// store since Scene.jsx's lab path does not pass it as a prop.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BoxGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Object3D, RingGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useUi } from "../../../lib/world/store";
import { damp } from "../life/util";
import { C, glow, lamp, mat } from "../palette";
import {
  CYCLE,
  buildFasciaGeo,
  buildRibbonGeo,
  buildRoofGeo,
  localTimeFor,
  marblePose,
  poolSettle,
  ROOF_HALF_X,
  ROOF_HALF_Z,
  roofY,
  START_X,
  STALL_DUR,
} from "./parts/certify-roof";

const DEG = Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;

// Score fix #1: the palette read two-tone (radiation teal + warm-white/
// charcoal neutrals), no second saturated colour. A boom gate's warning
// beacon is amber/orange in real life anyway, so the arm's light bands and
// the beacon both take this coral-orange -- roughly complementary to A's
// ~189deg teal -- instead of plain warm white.
const ACCENT = "#ff6a4d";

// The booth stands under the roof, its front (dock-facing) wall carrying
// the window and door; corners reach hypot(1.7, 1.3) = 2.14 m, inside the
// 3 m place radius.
const BOOTH_X = 0, BOOTH_Z = -0.2;
const BOOTH_W = 3.4, BOOTH_H = 2.2, BOOTH_D = 2.2;
const BOOTH_FRONT_Z = BOOTH_Z + BOOTH_D / 2;

const DOOR_X = -1.1, DOOR_W = 0.8, DOOR_H = 1.6;
const WIN_Y = 1.3, WIN_W = 2.6, WIN_H = 0.7, WIN_FRAME = 0.14;

// Feeds the ridge at its +z end, above the story's 4.6 m action line but
// clear of the label at y 6.5.
const HOPPER_POS = [BOOTH_X, 4.9, ROOF_HALF_Z];
const HOPPER_SIZE = [0.6, 0.5, 0.6];

// The boom gate, off the booth face: its own lane, marked on the snow.
// GATE_X pulled from -1.9 to -2.6 (review fix #3: post+arm sat only 0.2 m
// clear of the booth's -1.7 m edge and the arm read as plugged into the
// window; -2.6 is the low end of the judged range, chosen over -2.8 to stay
// close to the place's own 3 m collision radius). That alone also answers
// review fix #2: the beacon (GATE_X - 0.3) was 0.05 m from the left pool's
// x, nearly coincident on screen -- at -2.6 the gap is 0.65 m, 13x wider,
// so GATE_Z is left at 1.7 rather than also pushed to 2.4 (the fix's other
// option), which would have put the post 3.5 m out, well past that 3 m
// circle. LANE_X now matches GATE_X (review fix #4: the gate guards the
// lane it's drawn over instead of standing beside a strip a metre off).
const GATE_X = -2.6, GATE_Z = 1.7, GATE_PIVOT_Y = 1.0, GATE_POST_H = 1.7;
const ARM_LEN = 2.4, ARM_BANDS = 6, ARM_BAND_W = ARM_LEN / ARM_BANDS;
// Capped at 80 deg (short of vertical): 108 deg swung the resting-open arm
// past straight up, reading as a diagonal stick disconnected from its post.
const ARM_UP = 80 * DEG;
const LANE_X = -GATE_X, LANE_Z0 = 1.2, LANE_Z1 = 2.8;

// The two attractor pools, edge at 2.25 + 0.7 = 2.95 m, inside radius 3.
const POOL_X = 2.25, POOL_R = 0.7, POOL_H = 0.12;

// A charcoal skirt band around the booth's foot, its own dark base
// separate from the fascia at the roof line -- so the silhouette holds
// even when the warm-white walls wash into a pale sky/ground.
const SKIRT_H = 0.25, SKIRT_PAD = 0.02;

const MARBLE_COUNT = START_X.length; // 6, the fixed drop sequence
const TEAR_SLOTS = 2; // shared halves for whichever marble is tearing
const MOTE_COUNT = 10;
const MOTE_ANGLE = Array.from({ length: MOTE_COUNT }, (_, i) => (i / MOTE_COUNT) * Math.PI * 2);
const PULSE_CONVERGE = 0.8, PULSE_SPLIT = 0.5; // s, once a cycle (item 2)

// --- static geometry, built once and merged into three draw calls per
// material (charcoal / warm white / accent), the way the review asked -----

const boothGeo = new BoxGeometry(BOOTH_W, BOOTH_H, BOOTH_D).translate(BOOTH_X, BOOTH_H / 2, BOOTH_Z);
const roofGeo = buildRoofGeo();
boothGeo.deleteAttribute("uv"); // match the hand-built roof geometry's attributes for the merge
roofGeo.deleteAttribute("uv");
const warmWhiteStaticGeo = mergeGeometries([boothGeo, roofGeo]);

const doorGeo = new BoxGeometry(DOOR_W, DOOR_H, 0.1).translate(DOOR_X, DOOR_H / 2, BOOTH_FRONT_Z + 0.02);
const winFrameGeo = new BoxGeometry(WIN_W + WIN_FRAME * 2, WIN_H + WIN_FRAME * 2, 0.08).translate(
  BOOTH_X, WIN_Y, BOOTH_FRONT_Z + 0.01,
);
const hopperGeo = new BoxGeometry(...HOPPER_SIZE).translate(...HOPPER_POS);
const gatePostGeo = new CylinderGeometry(0.09, 0.11, GATE_POST_H, 8).translate(GATE_X, GATE_POST_H / 2, GATE_Z);
const skirtGeo = new BoxGeometry(BOOTH_W + SKIRT_PAD * 2, SKIRT_H, BOOTH_D + SKIRT_PAD * 2).translate(
  BOOTH_X, SKIRT_H / 2, BOOTH_Z,
);
for (const g of [doorGeo, winFrameGeo, hopperGeo, gatePostGeo, skirtGeo]) g.deleteAttribute("uv");
const charcoalStaticGeo = mergeGeometries([buildFasciaGeo(), doorGeo, winFrameGeo, hopperGeo, gatePostGeo, skirtGeo]);

const winPaneGeo = new BoxGeometry(WIN_W, WIN_H, 0.05).translate(BOOTH_X, WIN_Y, BOOTH_FRONT_Z + 0.05);
// Widened well past the 0.06-0.08 m the first review round asked for --
// that range measurably still didn't clear the fascia's silhouette from the
// dock-facing spawn camera (verification/sep-fix1-roof-zoomed.png) -- and a
// larger additive shell around it, so the ridge still reads when the roof
// is seen edge-on along z (its own faces foreshorten to a line from there).
const ribbonGeo = buildRibbonGeo(0.5, 0.2);
const ribbonGlowGeo = buildRibbonGeo(0.72, 0.3);
// Review fix #1: the booth used to sit on a 2.9 m-radius additive,
// low-opacity CircleGeometry disc -- the exact "soft flat glow blob on the
// snow" pattern the owner named and banned, just teal instead of yellow.
// Dropped entirely; only the two lane strips remain, painted with matDecal,
// now a mat()-based low-emissive, non-additive material instead of glow(),
// so they read as a sharp painted stripe, not a wash.
const decalGeo = mergeGeometries([
  new BoxGeometry(0.2, 0.02, LANE_Z1 - LANE_Z0).translate(-LANE_X, 0.011, (LANE_Z0 + LANE_Z1) / 2),
  new BoxGeometry(0.2, 0.02, LANE_Z1 - LANE_Z0).translate(LANE_X, 0.011, (LANE_Z0 + LANE_Z1) / 2),
]);

// The boom arm: six flush candy-stripe bands, extending +x from the post
// so it guards its own lane instead of crossing the booth's window.
const armBand = (i) => new BoxGeometry(ARM_BAND_W - 0.02, 0.14, 0.14).translate(ARM_BAND_W * (i + 0.5), 0, 0);
const armDarkGeo = mergeGeometries([armBand(0), armBand(2), armBand(4)]);
const armLightGeo = mergeGeometries([armBand(1), armBand(3), armBand(5)]);

// A cone, not a ball: the arm's own bands and the marbles are both round,
// so a matching icosahedron beacon fused into "one more ball" at whichever
// silhouette it sat closest to. Sized up from an initial 0.16/0.34 pass,
// which a scale debug capture showed rendering fine but reading as a thin,
// near-illegible sliver next to the 3.4 m booth at normal camera distance.
const beaconGeo = new ConeGeometry(0.24, 0.46, 8);
const poolGeo = new CylinderGeometry(POOL_R, POOL_R, POOL_H, 20);
const ringGeo = new RingGeometry(0.3, 0.46, 24).rotateX(-Math.PI / 2);
const marbleGeo = new IcosahedronGeometry(0.26, 1);
const moteGeo = new IcosahedronGeometry(0.12, 0);
const pulseGeo = new BoxGeometry(0.5, 0.1, 0.3);

export default function Certify({ place, near: nearProp }) {
  const A = place.radiation ?? place.color;
  const nearStore = useUi((s) => s.near === place.id);
  const near = nearProp ?? nearStore;

  const matCharcoal = useMemo(() => mat(C.charcoal), []);
  const matWarmWhite = useMemo(() => mat(C.warmWhite), []);
  const matAccent = useMemo(() => mat(ACCENT, { emissive: ACCENT, emissiveIntensity: 1.5 }), []);
  const matWindow = useMemo(() => lamp(A, 0.9), [A]);
  const matRibbon = useMemo(() => lamp(A, 1.2), [A]);
  const matRibbonGlow = useMemo(() => glow(A, 0.3), [A]);
  // Saturated accent body, not near-white snow: a near-white marble on a
  // near-white roof has almost no value contrast and reads as invisible.
  // Intensity raised from 1.5: once the frustum-culling bug (round-1 fix #1) no
  // longer hid the instances outright, 1.5 still read as a faint dot next
  // to the roof's warm-white at normal camera distance.
  const matMarble = useMemo(() => mat(A, { emissive: A, emissiveIntensity: 2.5 }), [A]);
  const matMote = useMemo(() => lamp(A, 2), [A]);
  const matPulse = useMemo(() => lamp(A, 3), [A]);
  const matDecal = useMemo(() => mat(A, { emissive: A, emissiveIntensity: 0.5, roughness: 0.6 }), [A]);
  const matRing = useMemo(() => glow(A, 0.5), [A]);

  // The only three materials that mutate per frame; cloned so the mutation
  // never touches another building sharing the cached A-coloured lamp.
  const matBeacon = useMemo(() => lamp(ACCENT, 1).clone(), []);
  const matPoolL = useMemo(() => lamp(A, 1).clone(), [A]);
  const matPoolR = useMemo(() => lamp(A, 1).clone(), [A]);
  useEffect(() => () => {
    matBeacon.dispose();
    matPoolL.dispose();
    matPoolR.dispose();
  }, [matBeacon, matPoolL, matPoolR]);

  const gateRef = useRef(null);
  const ringRef = useRef(null);
  const marbleMesh = useRef(null);
  const moteMesh = useRef(null);
  const pulseMesh = useRef(null);
  const dummy = useMemo(() => new Object3D(), []);
  const anim = useRef({ phase: 0, gate: 1 });
  // One mutable pose object per marble (marblePose writes into it instead
  // of returning a literal), plus one shared settle scratch object -- read
  // immediately after each call, never held past it -- so the per-frame
  // loop below allocates nothing.
  const poses = useMemo(() => Array.from({ length: MARBLE_COUNT }, () => ({})), []);
  const settleTmp = useMemo(() => ({}), []);

  useFrame((state, dt) => {
    const boost = near ? 1.35 : 1;
    const a = anim.current;
    // Accumulated, not derived from elapsedTime * rate: `near` can toggle
    // mid-cycle without the whole story jumping to a different phase.
    a.phase += dt * (near ? 1.45 : 1);
    const phase = a.phase;

    let refusedActive = false;
    let stallPose = null;
    let tearPose = null;
    let poolL = 0.4, poolR = 0.4;

    for (let i = 0; i < MARBLE_COUNT; i++) {
      const x0 = START_X[i];
      const localT = localTimeFor(i, phase);
      const pose = marblePose(x0, localT, poses[i]);

      if (pose.stage === "roll") {
        dummy.position.set(pose.x, roofY(pose.x, pose.z) + 0.22, pose.z);
        dummy.scale.setScalar(1);
      } else if (pose.stage === "drop") {
        dummy.position.set(pose.x, pose.y, pose.z);
        dummy.scale.setScalar(pose.scale);
      } else if (pose.stage === "stall") {
        dummy.position.set(pose.x, roofY(pose.x, pose.z) + 0.22, pose.z);
        dummy.scale.setScalar(1);
        refusedActive = true;
        stallPose = pose;
      } else {
        dummy.position.set(0, -4, 0); // 'tear' (drawn via the spare slots below) or 'gone'
        dummy.scale.setScalar(0.0001);
        if (pose.stage === "tear") { refusedActive = true; tearPose = pose; }
      }
      dummy.updateMatrix();
      if (marbleMesh.current) marbleMesh.current.setMatrixAt(i, dummy.matrix);

      const settle = poolSettle(x0, localT, settleTmp);
      if (settle) { if (settle.side < 0) poolL = settle.intensity; else poolR = settle.intensity; }
    }

    // The torn halves: two shared instance slots, reused by whichever
    // marble is tearing (never more than one at once -- the refused starts
    // are 4.8 s apart and a tear is done in well under 2 s).
    for (let s = 0; s < TEAR_SLOTS; s++) {
      if (tearPose) {
        const target = s === 0 ? -ROOF_HALF_X : ROOF_HALF_X;
        const tx = lerp(tearPose.x, target, tearPose.k);
        dummy.position.set(tx, roofY(tx, tearPose.z) + 0.22, tearPose.z);
        dummy.scale.setScalar(0.5 * Math.max(0, 1 - tearPose.k / 0.8)); // scale hits 0 before k=1, so it fades before it arrives
      } else {
        dummy.position.set(0, -4, 0);
        dummy.scale.setScalar(0.0001);
      }
      dummy.updateMatrix();
      if (marbleMesh.current) marbleMesh.current.setMatrixAt(MARBLE_COUNT + s, dummy.matrix);
    }
    if (marbleMesh.current) marbleMesh.current.instanceMatrix.needsUpdate = true;

    matPoolL.emissiveIntensity = poolL * boost;
    matPoolR.emissiveIntensity = poolR * boost;

    if (ringRef.current) {
      if (stallPose) {
        ringRef.current.visible = true;
        ringRef.current.position.set(stallPose.x, roofY(stallPose.x, stallPose.z) + 0.03, stallPose.z);
        ringRef.current.scale.setScalar(1 + 0.4 * Math.sin((Math.PI * stallPose.t) / STALL_DUR));
      } else {
        ringRef.current.visible = false;
      }
    }

    // The gate lifts for through traffic and only drops for an active
    // refusal -- the payoff, so it reads, not a rarity near the seal.
    a.gate += ((refusedActive ? 0 : 1) - a.gate) * damp(3, dt);
    if (gateRef.current) gateRef.current.rotation.z = a.gate * ARM_UP;

    const flash = refusedActive && Math.sin(phase * 6 * Math.PI * 2) > 0;
    matBeacon.emissiveIntensity = (refusedActive ? (flash ? 3.0 : 0.2) : 0.2) * boost;

    // The separatrix pulse: converges from both ridge ends into the
    // saddle, then splits and runs to both eaves -- once a cycle.
    if (pulseMesh.current) {
      const pp = phase % CYCLE;
      const setAt = (idx, x, z) => {
        dummy.position.set(x, roofY(x, z) + 0.07, z);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        pulseMesh.current.setMatrixAt(idx, dummy.matrix);
      };
      const hideAt = (idx) => {
        dummy.position.set(0, -4, 0);
        dummy.scale.setScalar(0.0001);
        dummy.updateMatrix();
        pulseMesh.current.setMatrixAt(idx, dummy.matrix);
      };
      if (pp < PULSE_CONVERGE) {
        const k = pp / PULSE_CONVERGE;
        setAt(0, 0, lerp(ROOF_HALF_Z, 0, k));
        setAt(1, 0, lerp(-ROOF_HALF_Z, 0, k));
        hideAt(2); hideAt(3);
      } else if (pp < PULSE_CONVERGE + PULSE_SPLIT) {
        const k = (pp - PULSE_CONVERGE) / PULSE_SPLIT;
        setAt(2, lerp(0, -ROOF_HALF_X, k), 0);
        setAt(3, lerp(0, ROOF_HALF_X, k), 0);
        hideAt(0); hideAt(1);
      } else {
        hideAt(0); hideAt(1); hideAt(2); hideAt(3);
      }
      pulseMesh.current.instanceMatrix.needsUpdate = true;
    }

    // Radiation motes, rising from the saddle hot spot.
    if (moteMesh.current) {
      for (let i = 0; i < MOTE_COUNT; i++) {
        const t = (phase + i * (3 / MOTE_COUNT)) % 3;
        const k = t / 3;
        const r = 0.3 + 0.12 * Math.sin(phase * 0.6 + i);
        dummy.position.set(Math.cos(MOTE_ANGLE[i]) * r, 3.6 + 1.4 * k, Math.sin(MOTE_ANGLE[i]) * r);
        dummy.scale.setScalar(0.5 + 0.5 * Math.sin(Math.PI * k));
        dummy.updateMatrix();
        moteMesh.current.setMatrixAt(i, dummy.matrix);
      }
      moteMesh.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <mesh geometry={warmWhiteStaticGeo} material={matWarmWhite} castShadow receiveShadow />
      <mesh geometry={charcoalStaticGeo} material={matCharcoal} receiveShadow />
      <mesh geometry={winPaneGeo} material={matWindow} />
      <mesh geometry={ribbonGeo} material={matRibbon} />
      <mesh geometry={ribbonGlowGeo} material={matRibbonGlow} />
      <mesh geometry={decalGeo} material={matDecal} receiveShadow />
      <mesh ref={ringRef} geometry={ringGeo} material={matRing} visible={false} />

      <group ref={gateRef} position={[GATE_X, GATE_PIVOT_Y, GATE_Z]}>
        <mesh geometry={armDarkGeo} material={matCharcoal} castShadow />
        <mesh geometry={armLightGeo} material={matAccent} castShadow />
      </group>
      {/* Off the post's +x side by 0.3 m: the arm's bands only ever
          translate to x >= 0 in the gate's local frame (see armBand above)
          and the gate group only rotates about Z, so the arm's swept
          silhouette never crosses x < GATE_X at any angle -- the beacon
          can no longer fuse into "one more ball" on its tip (round-1 fix #4). */}
      <mesh geometry={beaconGeo} material={matBeacon} position={[GATE_X - 0.3, GATE_POST_H + 0.22, GATE_Z]} />

      <mesh geometry={poolGeo} material={matPoolL} position={[-POOL_X, POOL_H / 2, 0]} receiveShadow />
      <mesh geometry={poolGeo} material={matPoolR} position={[POOL_X, POOL_H / 2, 0]} receiveShadow />

      {/* frustumCulled=false on marbleMesh/pulseMesh: three's InstancedMesh
          only computes its bounding sphere once, lazily, from whatever
          instance matrices exist the first time culling runs; both meshes
          park hidden instances at (0,-4,0) most of the time (round-1 fix #1
          root cause -- confirmed live: mesh/material were correct, only
          frustumCulled stuck true against a sphere frozen on a parked
          frame), so a frozen sphere anchored there can cull the whole mesh
          forever even while its live instances sit up on the roof. */}
      <instancedMesh ref={marbleMesh} args={[marbleGeo, matMarble, MARBLE_COUNT + TEAR_SLOTS]} frustumCulled={false} />
      <instancedMesh ref={moteMesh} args={[moteGeo, matMote, MOTE_COUNT]} />
      <instancedMesh ref={pulseMesh} args={[pulseGeo, matPulse, 4]} frustumCulled={false} />
    </group>
  );
}
