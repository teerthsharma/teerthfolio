"use client";

// The BUILDING for "witness": nerve (place id p-nerve), one of the eleven lab
// projects Teerth builds, standing straight on the snow.
//
// data/showcase.json's p-nerve: nerve tests four hypotheses about a knotted
// polymer chain, each against its own randomised control built on purpose to
// be able to kill it. 3 of its own 4 hypotheses withdrew when their control
// reproduced them; 1 survived; 224 tests passing.
//
// The everyday building this becomes: a field measuring station — the kind
// that watches an instrument and logs what it reads. Its mast carries the
// instrument (the chain, growing bead by bead until it passes over itself
// once — the witness — the same crossing fig.js's own build animates in),
// and its porch carries four rain gauges, one per hypothesis. Rain gauges are
// ALWAYS tested against nothing; these are tested against a control that
// rains into the same tube, to the SAME height in every lane: three lanes'
// markers sit low enough that rain buries them (withdrawn, ringed hollow
// coral, exactly as the source figure keeps them "on the record"); the
// fourth's marker was sent out higher than the rain ever reaches, and still
// stands clear when the rain stops (survivor). Every value here — the one
// crossing, the four lanes, 3 buried / 1 standing — is shape, not a number
// written out: the words rule saves the figures for data/showcase.json.
//
// Colour: the chain, its control and the verdict keep the source figure's own
// hues (fig.js "witness —": --blue-500/--violet-500 chain, --mint-500
// control, --amber-500 the witness ring, --coral-500 the withdrawn ring) so
// a capture reads as the same experiment as teerthsharma.github.io. The
// district's radiation colour (place.radiation once the world director adds
// it, else place.color) lights the station itself instead: its wall glass,
// its roof ring, the ground it stands on, and a halo behind the witness ring
// — the one point the whole building points at.
//
// Local origin: on the snow at the place centre; +z faces the camera and the
// dock. Body radius stays inside place.radius (3); overall height ~5 m.
// Props: { place, near }.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  MeshBasicMaterial,
  Object3D,
  SphereGeometry,
  TorusGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useUi } from "../../../lib/world/store";
import { smoothstep } from "../life/util";
import { C, glow, lamp, mat } from "../palette";
import { buildControlBeads, CONTROL_N } from "./parts/witness-control";
import { buildLoopBeads, BUILD_DUR, GROW_DUR, N_BEADS, WITNESS_BEAD_INDEX, WITNESS_LOCAL } from "./parts/witness-loop";

// fig.js's own hues for this figure — kept exact, not the org/place accent.
const BLUE = "#2456dc"; // the chain's first bead, and every marker's rest colour
const VIOLET = "#a66cf0"; // the chain's last bead
const MINT = "#0b93ab"; // the control's rain
const AMBER = "#d96a06"; // the witness ring
const CORAL = "#d9376e"; // a withdrawn hypothesis, kept on the record

// --- the station -----------------------------------------------------------
const HUT_R = 1.3;
const HUT_SIDES = 8;
const WALL_H = 1.6;
const ROOF_H = 1.0;
const ROOF_Y = WALL_H + ROOF_H;
const HUT_CZ = -0.7; // hut set back so the gauge porch it feeds has room in front

const MAST_LEN = 1.55;
const LOOP_Y = ROOF_Y + MAST_LEN;
const LOOP_SCALE = 0.72;
const LOOP_Z = HUT_CZ - 0.1;

const DECK_W = 2.4;
const DECK_T = 0.15;
const DECK_Y = DECK_T / 2;
const DECK_STRIP_D = 0.8; // a boardwalk strip under the gauges, not a slab under the whole station
const PLANK_GAP = 0.04;
const PLANK_COUNT = 3;
const PLANK_D = (DECK_STRIP_D - (PLANK_COUNT - 1) * PLANK_GAP) / PLANK_COUNT;
const BASE_Y = DECK_T; // the gauges' floor: the boardwalk's top face

// --- the four gauges ---------------------------------------------------
const TUBE_X = [-0.72, -0.24, 0.24, 0.72];
const TUBE_Z = 1.85;
const TUBE_R = 0.15;
const TUBE_H = 1.25;
const SURVIVOR = 2; // which of the four still stands when the rain stops
const RAIN_H = TUBE_H * 0.72; // every lane rains to the SAME height — only the marker differs
// withdrawn markers rest low enough the rain buries them; the survivor's sits
// clear above it. Story fidelity: never a "lighter rain" for the survivor.
const WITHDRAWN_FRAC = [0.42, 0.55, 0.62];
let wFracI = 0;
const MARK_FRAC = TUBE_X.map((_, i) => (i === SURVIVOR ? 1.05 : WITHDRAWN_FRAC[wFracI++]));
const MARK_Y = MARK_FRAC.map((f) => f * TUBE_H);
const FUNNEL_Y = BASE_Y + TUBE_H + 0.13; // the funnel's narrow spout meets the tube's rim
const DROPS_PER_LANE = 6;

const RISER_Z0 = HUT_CZ + HUT_R * 0.6;

// --- the cycle: chain builds, then quiet, then the rain, then the verdict --
const CYCLE = 10;
const FLY_DUR = 1.25; // fig.js FLY 1250: each marker flies from the witness into its lane
const RAIN_START = 0.6;
const RAIN_END = 5.6;
const HOLD_END = 8.3;
const DRAIN_END = 9.6;
const NEAR_SPEED = 1.6;
const NEAR_BRIGHT = 1.35;

// where the witness ring sits, in the outer (unscaled) group's space — the
// loop group carries its own position and LOOP_SCALE, so a point inside it
// has to be carried through both to land where the flying markers start.
const FLY_FROM = {
  x: WITNESS_LOCAL.x * LOOP_SCALE,
  y: LOOP_Y + WITNESS_LOCAL.y * LOOP_SCALE,
  z: LOOP_Z + WITNESS_LOCAL.z * LOOP_SCALE,
};

const bump = (x, c, w) => Math.max(0, 1 - Math.abs(x - c) / w);

// how far the rain has risen (0 -> 1 -> 1 -> 0), the same envelope every
// gauge rises and drains on — every lane now shares the same target height.
function raiseFrac(t) {
  if (t < RAIN_START) return 0;
  if (t < RAIN_END) return smoothstep(RAIN_START, RAIN_END, t);
  if (t < HOLD_END) return 1;
  if (t < DRAIN_END) return 1 - smoothstep(HOLD_END, DRAIN_END, t);
  return 0;
}

// the witness ring is never placed by hand: it blooms once the bead nearest
// the true crossing has finished growing, 0 -> 1.3 -> 1 over 0.4 s.
function ringBloom(cycleT, readyAt) {
  const dt = cycleT - readyAt;
  if (dt <= 0) return 0;
  if (dt < 0.2) return smoothstep(0, 0.2, dt) * 1.3;
  if (dt < 0.4) return 1.3 - smoothstep(0.2, 0.4, dt) * 0.3;
  return 1;
}

// --- static geometry, built once -------------------------------------------
const dummy = new Object3D();

const wallGeo = new CylinderGeometry(HUT_R * 0.94, HUT_R, WALL_H, HUT_SIDES, 1, true).translate(0, WALL_H / 2, HUT_CZ);
const ringTopGeo = new TorusGeometry(HUT_R, 0.045, 6, HUT_SIDES).rotateX(Math.PI / 2).translate(0, WALL_H, HUT_CZ);

function postAt(i) {
  const a = (i / HUT_SIDES) * Math.PI * 2 + Math.PI / HUT_SIDES; // offset so no post sits at front centre
  return new BoxGeometry(0.13, WALL_H, 0.13)
    .translate(0, WALL_H / 2, 0)
    .translate(Math.cos(a) * HUT_R, 0, HUT_CZ + Math.sin(a) * HUT_R);
}
function plankAt(i) {
  const z0 = TUBE_Z - DECK_STRIP_D / 2 + PLANK_D / 2 + i * (PLANK_D + PLANK_GAP);
  return new BoxGeometry(DECK_W, DECK_T, PLANK_D).translate(0, DECK_Y, z0);
}

// Fixed charcoal parts, none of which move: one merged mesh, one draw call,
// instead of a mesh (or instance) per part.
const staticCharcoalGeo = mergeGeometries(
  [
    new ConeGeometry(HUT_R * 1.1, ROOF_H, HUT_SIDES).translate(0, ROOF_Y - ROOF_H / 2, HUT_CZ), // roof
    new SphereGeometry(0.08, 8, 6).translate(0, ROOF_Y, HUT_CZ), // cap
    new TorusGeometry(HUT_R * 1.02, 0.05, 6, HUT_SIDES).rotateX(Math.PI / 2).translate(0, 0.03, HUT_CZ), // ring, base
    new CylinderGeometry(0.1, 0.13, MAST_LEN, 6).translate(0, ROOF_Y + MAST_LEN / 2, HUT_CZ), // mast, thickened
    new BoxGeometry(TUBE_X[3] - TUBE_X[0] + 0.3, 0.07, 0.07).translate(0, FUNNEL_Y + 0.18, TUBE_Z), // header
    new BoxGeometry(0.07, 0.07, TUBE_Z - RISER_Z0).translate(0, FUNNEL_Y + 0.18, RISER_Z0 + (TUBE_Z - RISER_Z0) / 2), // riser
    ...Array.from({ length: HUT_SIDES }, (_, i) => postAt(i)),
    ...Array.from({ length: PLANK_COUNT }, (_, i) => plankAt(i)),
  ],
  false,
);

const beadGeo = new SphereGeometry(0.19, 8, 6); // 0.14 m in world space at LOOP_SCALE 0.72
const controlBeadGeo = new SphereGeometry(0.1 / LOOP_SCALE, 6, 6); // 0.10 m in world space, big enough to read as its own strand
const witnessRingGeo = new TorusGeometry(0.3, 0.07, 8, 24);

const tubeGeo = new CylinderGeometry(TUBE_R, TUBE_R, TUBE_H, 12, 1, true).translate(0, TUBE_H / 2, 0);
const grainGeo = new CylinderGeometry(TUBE_R * 0.9, TUBE_R * 0.9, 1, 10).translate(0, 0.5, 0); // unit height: scale.y = fill
const markerGeo = new SphereGeometry(0.085, 8, 6);
const verdictGeo = new TorusGeometry(TUBE_R + 0.06, 0.05, 6, 16).rotateX(Math.PI / 2);
const dropGeo = new SphereGeometry(0.07, 6, 6);
const funnelGeo = new ConeGeometry(0.22, 0.26, 10).rotateX(Math.PI); // apex down: a funnel, not a spike
const groundGlowGeo = new CircleGeometry(2.6, 24).rotateX(-Math.PI / 2).translate(0, 0.02, 0);

// the anemometer: 3 cups on 0.6 m arms, spinning as a whole around the mast.
// ANEM_Y sits above the roof's own apex (a cone, so nothing but the thin
// mast is behind it up here) and below the loop's lowest reach, so the
// bigger cups silhouette against open sky instead of the roof or the chain.
const ANEM_ARM = 0.6;
const ANEM_Y = ROOF_Y + 0.6;
function anemArmGeo(angle) {
  return new BoxGeometry(ANEM_ARM, 0.035, 0.035).translate(ANEM_ARM / 2, 0, 0).rotateY(angle);
}
const anemHubGeo = mergeGeometries(
  [new SphereGeometry(0.07, 8, 6), anemArmGeo(0), anemArmGeo((2 * Math.PI) / 3), anemArmGeo((4 * Math.PI) / 3)],
  false,
);
const anemCupGeo = new SphereGeometry(0.19, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
const ANEM_CUP_ANGLES = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];

export default function Witness({ place, near: nearProp }) {
  const nearAuto = useUi((s) => s.near === place.id);
  const near = nearProp ?? nearAuto;
  const RAD = place.radiation ?? place.color;

  const wallMat = useMemo(() => mat(RAD, { roughness: 0.2, metalness: 0.05, emissive: RAD, emissiveIntensity: 1.2, opacity: 0.8 }).clone(), [RAD]);
  const ringTopMat = useMemo(() => lamp(RAD), [RAD]);
  const charcoalMat = useMemo(() => mat(C.charcoal, { roughness: 0.55 }), []);
  const beadMat = useMemo(() => mat("#ffffff", { roughness: 0.5, emissive: "#ffffff", emissiveIntensity: 0.06 }), []);
  const witnessRingMat = useMemo(() => mat(AMBER, { roughness: 0.3, emissive: AMBER, emissiveIntensity: 0.6 }).clone(), []);
  const tubeMat = useMemo(() => mat(C.ice, { roughness: 0.12, metalness: 0.05, opacity: 0.35, side: DoubleSide }), []);
  // Roughness/emissive tuned high: unlike the rest of the palette, the rain
  // sits low in the hut's own shadow and needs to glow, not just be lit, to
  // read as its own colour from 35 m — mat()'s usual 0.1-0.2 emissive goes
  // near-black back there.
  const grainMat = useMemo(() => mat(MINT, { roughness: 0.45, emissive: MINT, emissiveIntensity: 0.9 }), []);
  // Fixed brightness: which marker gets to glow brighter is carried by its
  // own instance colour (set per frame below), never by mutating this
  // shared material — palette.js's cache is read-only past construction.
  const markerMat = useMemo(() => mat(BLUE, { roughness: 0.3, emissive: BLUE, emissiveIntensity: 0.45 }), []);
  const verdictMat = useMemo(
    () => new MeshBasicMaterial({ color: CORAL, transparent: true, opacity: 0.95, toneMapped: false }),
    [],
  );
  const dropMat = useMemo(() => mat(MINT, { roughness: 0.4, emissive: MINT, emissiveIntensity: 0.7 }), []);
  const funnelMat = useMemo(() => mat(C.ice, { roughness: 0.2, metalness: 0.3 }), []);
  const controlMat = useMemo(
    () => new MeshBasicMaterial({ color: MINT, transparent: true, opacity: 0.65, toneMapped: false }),
    [],
  );
  const haloMat = useMemo(() => glow(RAD, 0.22), [RAD]);
  const groundGlowMat = useMemo(() => glow(RAD, 0.18).clone(), [RAD]);

  const beadsData = useMemo(() => buildLoopBeads(), []);
  const controlData = useMemo(() => buildControlBeads(), []);

  const verdictColor = useMemo(() => new Color(), []);
  const markColor = useMemo(() => new Color(), []);
  const coralColor = useMemo(() => new Color(CORAL), []);
  const blueColor = useMemo(() => new Color(BLUE), []);
  const whiteColor = useMemo(() => new Color("#ffffff"), []);

  const beadsRef = useRef();
  const controlRef = useRef();
  const witnessRingRef = useRef();
  const witnessHaloRef = useRef();
  const loopGroupRef = useRef();
  const tubesRef = useRef();
  const grainRef = useRef();
  const markerRef = useRef();
  const verdictRef = useRef();
  const dropRef = useRef();
  const funnelRef = useRef();
  const anemRef = useRef();
  const anemCupsRef = useRef();

  // Static placements, set once. The chain's own beads grow every cycle (in
  // useFrame below), but their COLOUR — the blue-to-violet gradient along the
  // chain's length — never changes, so it is set here a single time.
  useLayoutEffect(() => {
    const beads = beadsRef.current;
    if (beads) {
      for (let i = 0; i < N_BEADS; i++) beads.setColorAt(i, verdictColor.set(beadsData[i].color));
      if (beads.instanceColor) beads.instanceColor.needsUpdate = true;
    }

    const tubes = tubesRef.current;
    const funnels = funnelRef.current;
    if (tubes) {
      for (let i = 0; i < TUBE_X.length; i++) {
        const x = TUBE_X[i];
        dummy.position.set(x, BASE_Y, TUBE_Z);
        dummy.scale.setScalar(1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        tubes.setMatrixAt(i, dummy.matrix);
        if (funnels) {
          dummy.position.set(x, FUNNEL_Y, TUBE_Z);
          dummy.updateMatrix();
          funnels.setMatrixAt(i, dummy.matrix);
        }
      }
      tubes.instanceMatrix.needsUpdate = true;
      if (funnels) funnels.instanceMatrix.needsUpdate = true;
    }

    const anem = anemCupsRef.current;
    if (anem) {
      for (let i = 0; i < ANEM_CUP_ANGLES.length; i++) {
        const a = ANEM_CUP_ANGLES[i];
        dummy.position.set(Math.cos(a) * ANEM_ARM, 0, Math.sin(a) * ANEM_ARM);
        dummy.rotation.set(0, a, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        anem.setMatrixAt(i, dummy.matrix);
      }
      anem.instanceMatrix.needsUpdate = true;
    }
  }, [verdictColor, beadsData]);

  useFrame((state) => {
    const speed = near ? NEAR_SPEED : 1;
    const bright = near ? NEAR_BRIGHT : 1;
    const t = state.clock.elapsedTime * speed;
    const cycleT = t % CYCLE;
    const raise = raiseFrac(cycleT);
    const heroFlash = bump(cycleT, RAIN_END, 0.9); // the witness ring and the survivor light together

    // the loop sways gently — always present, always legible, the instrument
    // the station reads — and drops brighter right as the rain gives way to
    // the verdict.
    if (loopGroupRef.current) loopGroupRef.current.rotation.y = Math.sin(t * 0.15) * 0.12;
    const wPulse = 0.5 + 0.5 * Math.sin(t * 2.1);
    wallMat.emissiveIntensity = (1.2 + wPulse * 0.3) * bright;
    groundGlowMat.opacity = 0.12 + (0.5 + 0.5 * Math.sin((cycleT / CYCLE) * Math.PI * 2)) * 0.12;

    if (anemRef.current) anemRef.current.rotation.y = state.clock.elapsedTime * (near ? 4 : 2);

    // the chain: laid down bead by bead every cycle, fig.js's own BUILD/GROW,
    // through instance scale rather than being simply present.
    const beads = beadsRef.current;
    if (beads) {
      for (let i = 0; i < N_BEADS; i++) {
        const startI = (i / N_BEADS) * BUILD_DUR;
        const growF = Math.max(0, Math.min(1, (cycleT - startI) / GROW_DUR));
        const d = beadsData[i];
        dummy.position.set(d.x, d.y, d.z);
        dummy.scale.setScalar(growF);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        beads.setMatrixAt(i, dummy.matrix);
      }
      beads.instanceMatrix.needsUpdate = true;
    }

    // the control, writhing behind the chain — random chains cross
    // themselves too, which is why a crossing alone proves nothing.
    const control = controlRef.current;
    if (control) {
      for (let i = 0; i < CONTROL_N; i++) {
        const d = controlData[i];
        const wob = 0.06 * Math.sin(t * 0.4 + d.phase);
        dummy.position.set(d.x + wob, d.y + wob * 0.7, d.z - 0.5 / LOOP_SCALE + wob * 0.5);
        dummy.scale.setScalar(1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        control.setMatrixAt(i, dummy.matrix);
      }
      control.instanceMatrix.needsUpdate = true;
    }

    // nothing places the witness ring by hand: it blooms once the bead at
    // the true crossing has finished growing in.
    const readyAt = (WITNESS_BEAD_INDEX / N_BEADS) * BUILD_DUR + GROW_DUR;
    const bloom = ringBloom(cycleT, readyAt);
    const wPulseGlow = 0.5 + wPulse * 0.35 + heroFlash * 1.6;
    witnessRingMat.emissiveIntensity = wPulseGlow * bright;
    if (witnessRingRef.current) witnessRingRef.current.scale.setScalar(bloom * (1 + heroFlash * 0.3));
    if (witnessHaloRef.current) witnessHaloRef.current.scale.setScalar(bloom * (1 + heroFlash * 0.6));

    const grain = grainRef.current;
    const marker = markerRef.current;
    const verdict = verdictRef.current;
    const drops = dropRef.current;
    if (grain && marker && verdict) {
      const flying = cycleT < FLY_DUR;
      const flyF = flying ? smoothstep(0, FLY_DUR, cycleT) : 1;
      for (let i = 0; i < TUBE_X.length; i++) {
        const x = TUBE_X[i];
        const survivor = i === SURVIVOR;
        const mH = MARK_Y[i];
        const h = Math.max(0.002, raise * RAIN_H);

        // grain fill: the SAME target height in every lane — the survivor's
        // bead simply stands higher than the rain reaches, never a lighter
        // rain aimed just at its lane.
        dummy.position.set(x, BASE_Y, TUBE_Z);
        dummy.scale.set(1, h, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        grain.setMatrixAt(i, dummy.matrix);

        const buriedFrac = smoothstep(mH - 0.05, mH + 0.03, h);
        const markScale = survivor ? 1 + heroFlash * 0.35 : 1 - buriedFrac;

        // fig.js FLY 1250: each cycle, the witness sends a bead down from
        // itself into its lane; only once landed does it sit still.
        const landY = BASE_Y + mH;
        const mx = flying ? FLY_FROM.x + (x - FLY_FROM.x) * flyF : x;
        const my = flying ? FLY_FROM.y + (landY - FLY_FROM.y) * flyF : landY;
        const mz = flying ? FLY_FROM.z + (TUBE_Z - FLY_FROM.z) * flyF : TUBE_Z;
        dummy.position.set(mx, my, mz);
        dummy.scale.setScalar(Math.max(0.001, markScale));
        dummy.updateMatrix();
        marker.setMatrixAt(i, dummy.matrix);
        markColor.copy(blueColor).lerp(whiteColor, survivor ? heroFlash * 0.8 : 0);
        marker.setColorAt(i, markColor);

        // withdrawn: a hollow ring stays on the record, exactly where the
        // rain buried the marker; the survivor's own ring is the hero flash.
        const ringScale = survivor ? heroFlash : buriedFrac;
        verdictColor.copy(survivor ? blueColor : coralColor);
        dummy.position.set(x, landY, TUBE_Z);
        dummy.scale.setScalar(Math.max(0.001, ringScale));
        dummy.updateMatrix();
        verdict.setMatrixAt(i, dummy.matrix);
        verdict.setColorAt(i, verdictColor);

        // a stream of grains, falling, while this lane's rain is still rising.
        if (drops) {
          for (let k = 0; k < DROPS_PER_LANE; k++) {
            const idx = i * DROPS_PER_LANE + k;
            const raining = cycleT > RAIN_START && cycleT < RAIN_END;
            const dropPhase = raining ? ((cycleT - RAIN_START) * 1.7 + i * 0.31 + k / DROPS_PER_LANE) % 1 : -1;
            if (dropPhase < 0) {
              dummy.scale.setScalar(0);
            } else {
              dummy.position.set(x, FUNNEL_Y - dropPhase * (FUNNEL_Y - (BASE_Y + h)), TUBE_Z);
              dummy.scale.setScalar(1);
            }
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            drops.setMatrixAt(idx, dummy.matrix);
          }
        }
      }
      grain.instanceMatrix.needsUpdate = true;
      marker.instanceMatrix.needsUpdate = true;
      if (marker.instanceColor) marker.instanceColor.needsUpdate = true;
      verdict.instanceMatrix.needsUpdate = true;
      if (verdict.instanceColor) verdict.instanceColor.needsUpdate = true;
      if (drops) drops.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* the station: an octagonal glass-and-timber field hut */}
      <mesh geometry={wallGeo} material={wallMat} castShadow receiveShadow />
      <mesh geometry={ringTopGeo} material={ringTopMat} />
      <mesh geometry={staticCharcoalGeo} material={charcoalMat} castShadow receiveShadow />
      <mesh geometry={groundGlowGeo} material={groundGlowMat} />

      {/* the instrument: one chain, growing until it crosses itself once */}
      <group ref={loopGroupRef} position={[0, LOOP_Y, LOOP_Z]} scale={LOOP_SCALE}>
        <instancedMesh ref={controlRef} args={[controlBeadGeo, controlMat, CONTROL_N]} frustumCulled={false} />
        <instancedMesh ref={beadsRef} args={[beadGeo, beadMat, N_BEADS]} castShadow frustumCulled={false} />
        <mesh
          ref={witnessRingRef}
          geometry={witnessRingGeo}
          material={witnessRingMat}
          position={[WITNESS_LOCAL.x, WITNESS_LOCAL.y, WITNESS_LOCAL.z]}
        />
        <mesh ref={witnessHaloRef} material={haloMat} position={[WITNESS_LOCAL.x, WITNESS_LOCAL.y, WITNESS_LOCAL.z]}>
          <sphereGeometry args={[0.8, 12, 10]} />
        </mesh>
      </group>

      {/* the anemometer: 3 cups on the mast, spinning */}
      <group ref={anemRef} position={[0, ANEM_Y, HUT_CZ]}>
        <mesh geometry={anemHubGeo} material={charcoalMat} />
        <instancedMesh ref={anemCupsRef} args={[anemCupGeo, charcoalMat, ANEM_CUP_ANGLES.length]} />
      </group>

      {/* the four gauges: rain tested against a control that rains too */}
      <instancedMesh ref={funnelRef} args={[funnelGeo, funnelMat, TUBE_X.length]} />
      <instancedMesh ref={tubesRef} args={[tubeGeo, tubeMat, TUBE_X.length]} />
      <instancedMesh ref={grainRef} args={[grainGeo, grainMat, TUBE_X.length]} frustumCulled={false} />
      <instancedMesh ref={markerRef} args={[markerGeo, markerMat, TUBE_X.length]} frustumCulled={false} />
      <instancedMesh ref={verdictRef} args={[verdictGeo, verdictMat, TUBE_X.length]} frustumCulled={false} />
      <instancedMesh ref={dropRef} args={[dropGeo, dropMat, TUBE_X.length * DROPS_PER_LANE]} frustumCulled={false} />
    </group>
  );
}
