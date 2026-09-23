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
// instrument (the chain, looping until it passes over itself once — the
// witness), and its porch carries four rain gauges, one per hypothesis. Rain
// gauges are ALWAYS tested against nothing; these are tested against a
// control that rains into the same tube: three fill high enough to bury
// their marker (withdrawn, ringed hollow coral, exactly as the source figure
// keeps them "on the record"); one gauge's rain falls short and its marker
// still stands clear when the rain stops (survivor). Every value here — the
// one crossing, the four lanes, 3 buried / 1 standing — is shape, not a
// number written out: the words rule saves the figures for data/showcase.json.
//
// Colour: the chain, its control and the verdict keep the source figure's own
// hues (fig.js "witness —": --blue-500/--violet-500 chain, --mint-500
// control, --amber-500 the witness ring, --coral-500 the withdrawn ring) so
// a capture reads as the same experiment as teerthsharma.github.io. The
// district's radiation colour (place.radiation once the world director adds
// it, else place.color) lights the station itself instead: its windows, its
// ambient glow, and a halo behind the witness ring — the one point the whole
// building points at.
//
// Local origin: on the snow at the place centre; +z faces the camera and the
// dock. Body radius stays inside place.radius; overall height ~4.7 m.
// Props: { place, near }.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  MeshBasicMaterial,
  Object3D,
  QuadraticBezierCurve3,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import { useUi } from "../../../lib/world/store";
import { smoothstep } from "../life/util";
import { C, glow, mat } from "../palette";
import { buildLoopBeads, N_BEADS, WITNESS_LOCAL } from "./parts/witness-loop";

// fig.js's own hues for this figure — kept exact, not the org/place accent.
const BLUE = "#2456dc"; // the chain's first bead, and every marker's rest colour
const VIOLET = "#a66cf0"; // the chain's last bead
const MINT = "#0b93ab"; // the control's rain
const AMBER = "#d96a06"; // the witness ring
const CORAL = "#d9376e"; // a withdrawn hypothesis, kept on the record

// --- the station -----------------------------------------------------------
const HUT_R = 0.95;
const HUT_SIDES = 8;
const WALL_H = 1.15;
const ROOF_H = 0.85;
const ROOF_Y = WALL_H + ROOF_H;

const MAST_LEN = 1.55;
const LOOP_Y = ROOF_Y + MAST_LEN;
const LOOP_SCALE = 0.72;
const LOOP_Z = -0.1;

const DECK_W = 2.2;
const DECK_D = 2.1;
const DECK_T = 0.15;
const DECK_Y = DECK_T / 2;
const DECK_CZ = 1.55; // deck centre, in front of the hut (+z, faces the dock)
const BASE_Y = DECK_T; // the gauges' floor: the deck's top face

// --- the four gauges ---------------------------------------------------
const TUBE_X = [-0.72, -0.24, 0.24, 0.72];
const TUBE_Z = 1.85;
const TUBE_R = 0.15;
const TUBE_H = 1.25;
const MARK_Y = TUBE_H * 0.6; // every marker rests at the same height...
const BURY_Y = TUBE_H * 0.88; // ...three lanes' rain rises past it...
const CLEAR_Y = TUBE_H * 0.4; // ...one lane's rain falls short
const SURVIVOR = 2; // which of the four still stands when the rain stops
const FUNNEL_Y = BASE_Y + TUBE_H + 0.3;

// --- the cycle: quiet, then the rain, then the verdict, then reset ---------
const CYCLE = 10;
const RAIN_START = 0.6;
const RAIN_END = 5.6;
const HOLD_END = 8.3;
const DRAIN_END = 9.6;
const NEAR_SPEED = 1.6;
const NEAR_BRIGHT = 1.35;

const bump = (x, c, w) => Math.max(0, 1 - Math.abs(x - c) / w);

// how far the rain has risen (0 -> 1 -> 1 -> 0), the same envelope every
// gauge rises and drains on — only each gauge's target height differs.
function raiseFrac(t) {
  if (t < RAIN_START) return 0;
  if (t < RAIN_END) return smoothstep(RAIN_START, RAIN_END, t);
  if (t < HOLD_END) return 1;
  if (t < DRAIN_END) return 1 - smoothstep(HOLD_END, DRAIN_END, t);
  return 0;
}

// --- static geometry, built once -------------------------------------------
const dummy = new Object3D();

const wallGeo = new CylinderGeometry(HUT_R * 0.94, HUT_R, WALL_H, HUT_SIDES, 1, true).translate(0, WALL_H / 2, 0);
const roofGeo = new ConeGeometry(HUT_R * 1.1, ROOF_H, HUT_SIDES).translate(0, ROOF_Y - ROOF_H / 2, 0);
const capGeo = new SphereGeometry(0.08, 8, 6).translate(0, ROOF_Y, 0);
const postGeo = new BoxGeometry(0.09, WALL_H, 0.09).translate(0, WALL_H / 2, 0);
const ringTopGeo = new TorusGeometry(HUT_R, 0.045, 6, HUT_SIDES).rotateX(Math.PI / 2).translate(0, WALL_H, 0);
const ringBotGeo = new TorusGeometry(HUT_R * 1.02, 0.05, 6, HUT_SIDES).rotateX(Math.PI / 2).translate(0, 0.03, 0);
const deckGeo = new BoxGeometry(DECK_W, DECK_T, DECK_D).translate(0, DECK_Y, DECK_CZ);
const mastGeo = new CylinderGeometry(0.045, 0.065, MAST_LEN, 6).translate(0, ROOF_Y + MAST_LEN / 2, 0);

const beadGeo = new SphereGeometry(0.075, 8, 6);
const witnessRingGeo = new TorusGeometry(0.17, 0.03, 8, 20);

const tubeGeo = new CylinderGeometry(TUBE_R, TUBE_R, TUBE_H, 12, 1, true).translate(0, TUBE_H / 2, 0);
const grainGeo = new CylinderGeometry(TUBE_R * 0.9, TUBE_R * 0.9, 1, 10).translate(0, 0.5, 0); // unit height: scale.y = fill
const markerGeo = new SphereGeometry(0.085, 8, 6);
const verdictGeo = new TorusGeometry(TUBE_R + 0.025, 0.02, 6, 16).rotateX(Math.PI / 2);
const dropGeo = new SphereGeometry(0.045, 6, 6);
const funnelGeo = new ConeGeometry(0.13, 0.22, 8);
const headerGeo = new BoxGeometry(TUBE_X[3] - TUBE_X[0] + 0.3, 0.07, 0.07).translate(0, 0, TUBE_Z);
const riserGeo = new BoxGeometry(0.07, 0.07, TUBE_Z - HUT_R * 0.6).translate(0, 0, HUT_R * 0.6 + (TUBE_Z - HUT_R * 0.6) / 2);

// the control: two faint, static arcs writhing behind the loop — "random
// chains cross themselves as well, which is exactly why a crossing alone
// proves nothing" (fig.js). Built once; no per-frame cost.
function controlArc(seed) {
  const pts = [
    new Vector3(-0.9 + seed, 0.7 * seed, -0.25),
    new Vector3(0.15 - seed * 0.4, 1.5, 0.15),
    new Vector3(0.85 - seed, 0.5 - seed * 0.3, -0.15),
  ];
  return new TubeGeometry(new QuadraticBezierCurve3(...pts), 20, 0.014, 5, false);
}
const controlGeoA = controlArc(0.18);
const controlGeoB = controlArc(-0.22);

export default function Witness({ place, near: nearProp }) {
  const nearAuto = useUi((s) => s.near === place.id);
  const near = nearProp ?? nearAuto;
  const RAD = place.radiation ?? place.color;

  const wallMat = useMemo(() => mat(C.ice, { roughness: 0.2, metalness: 0.05, emissive: RAD, emissiveIntensity: 0.95, opacity: 0.55 }).clone(), [RAD]);
  const roofMat = useMemo(() => mat(C.charcoal, { roughness: 0.6 }), []);
  const postMat = useMemo(() => mat(C.charcoal, { roughness: 0.55 }), []);
  const deckMat = useMemo(() => mat(C.wood, { roughness: 0.8 }), []);
  const mastMat = useMemo(() => mat(C.charcoal, { roughness: 0.5 }), []);
  const beadMat = useMemo(() => mat("#ffffff", { roughness: 0.5, emissive: "#ffffff", emissiveIntensity: 0.06 }), []);
  const witnessRingMat = useMemo(() => mat(AMBER, { roughness: 0.3, emissive: AMBER, emissiveIntensity: 0.6 }).clone(), []);
  const tubeMat = useMemo(() => mat(C.ice, { roughness: 0.12, metalness: 0.05, opacity: 0.35, side: DoubleSide }), []);
  // Roughness/emissive tuned high: unlike the rest of the palette, the rain
  // sits low in the hut's own shadow and needs to glow, not just be lit, to
  // read as its own colour from 35 m — mat()'s usual 0.1-0.2 emissive goes
  // near-black back there.
  const grainMat = useMemo(() => mat(MINT, { roughness: 0.45, emissive: MINT, emissiveIntensity: 0.9 }).clone(), []);
  // Fixed brightness: which marker gets to glow brighter is carried by its
  // own instance colour (set per frame below), never by mutating this
  // shared material — palette.js's cache is read-only past construction.
  const markerMat = useMemo(() => mat(BLUE, { roughness: 0.3, emissive: BLUE, emissiveIntensity: 0.45 }), []);
  const verdictMat = useMemo(
    () => new MeshBasicMaterial({ color: CORAL, transparent: true, opacity: 0.95, toneMapped: false }),
    [],
  );
  const dropMat = useMemo(() => mat(MINT, { roughness: 0.4, emissive: MINT, emissiveIntensity: 0.7 }), []);
  const funnelMat = useMemo(() => mat(C.charcoal, { roughness: 0.55 }), []);
  const controlMat = useMemo(
    () => new MeshBasicMaterial({ color: MINT, transparent: true, opacity: 0.22, toneMapped: false }),
    [],
  );
  const haloMat = useMemo(() => glow(RAD, 0.22), [RAD]);

  const verdictColor = useMemo(() => new Color(), []);
  const markColor = useMemo(() => new Color(), []);
  const coralColor = useMemo(() => new Color(CORAL), []);
  const blueColor = useMemo(() => new Color(BLUE), []);
  const whiteColor = useMemo(() => new Color("#ffffff"), []);

  const postsRef = useRef();
  const beadsRef = useRef();
  const witnessRingRef = useRef();
  const witnessHaloRef = useRef();
  const loopGroupRef = useRef();
  const tubesRef = useRef();
  const grainRef = useRef();
  const markerRef = useRef();
  const verdictRef = useRef();
  const dropRef = useRef();
  const funnelRef = useRef();

  // Static placements — every corner post, every gauge, every funnel — set
  // once. Only what has to move (grain height, markers, verdict rings, the
  // witness ring's glow) is touched per frame.
  useLayoutEffect(() => {
    const posts = postsRef.current;
    if (posts) {
      for (let i = 0; i < HUT_SIDES; i++) {
        const a = (i / HUT_SIDES) * Math.PI * 2;
        dummy.position.set(Math.cos(a) * HUT_R, 0, Math.sin(a) * HUT_R);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        posts.setMatrixAt(i, dummy.matrix);
      }
      posts.instanceMatrix.needsUpdate = true;
    }

    const beads = beadsRef.current;
    if (beads) {
      buildLoopBeads().forEach((b, i) => {
        dummy.position.set(b.x, b.y, b.z);
        dummy.scale.setScalar(1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        beads.setMatrixAt(i, dummy.matrix);
        beads.setColorAt(i, verdictColor.set(b.color));
      });
      beads.instanceMatrix.needsUpdate = true;
      if (beads.instanceColor) beads.instanceColor.needsUpdate = true;
    }

    const tubes = tubesRef.current;
    const funnels = funnelRef.current;
    if (tubes) {
      TUBE_X.forEach((x, i) => {
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
      });
      tubes.instanceMatrix.needsUpdate = true;
      if (funnels) funnels.instanceMatrix.needsUpdate = true;
    }
  }, [verdictColor]);

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
    witnessRingMat.emissiveIntensity = (0.5 + wPulse * 0.35 + heroFlash * 1.6) * bright;
    if (witnessRingRef.current) witnessRingRef.current.scale.setScalar(1 + heroFlash * 0.3);
    if (witnessHaloRef.current) witnessHaloRef.current.scale.setScalar(1 + heroFlash * 0.6);
    wallMat.emissiveIntensity = (0.85 + wPulse * 0.3) * bright;

    const grain = grainRef.current;
    const marker = markerRef.current;
    const verdict = verdictRef.current;
    const drops = dropRef.current;
    if (grain && marker && verdict) {
      TUBE_X.forEach((x, i) => {
        const survivor = i === SURVIVOR;
        const targetH = survivor ? CLEAR_Y : BURY_Y;
        const h = Math.max(0.002, raise * targetH);

        dummy.position.set(x, BASE_Y, TUBE_Z);
        dummy.scale.set(1, h, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        grain.setMatrixAt(i, dummy.matrix);

        // buried once the rain passes the marker's height; the survivor's
        // never does, and gets the hero glow when the rain stops.
        const buriedFrac = smoothstep(MARK_Y - 0.05, MARK_Y + 0.03, h);
        const markScale = survivor ? 1 + heroFlash * 0.35 : 1 - buriedFrac;
        dummy.position.set(x, BASE_Y + MARK_Y, TUBE_Z);
        dummy.scale.setScalar(Math.max(0.001, markScale));
        dummy.updateMatrix();
        marker.setMatrixAt(i, dummy.matrix);
        markColor.copy(blueColor).lerp(whiteColor, survivor ? heroFlash * 0.8 : 0);
        marker.setColorAt(i, markColor);

        // withdrawn: a hollow ring stays on the record, exactly where the
        // rain buried the marker; the survivor's own ring is the hero flash.
        const ringScale = survivor ? heroFlash : buriedFrac;
        verdictColor.copy(survivor ? blueColor : coralColor);
        dummy.position.set(x, BASE_Y + MARK_Y, TUBE_Z);
        dummy.scale.setScalar(Math.max(0.001, ringScale));
        dummy.updateMatrix();
        verdict.setMatrixAt(i, dummy.matrix);
        verdict.setColorAt(i, verdictColor);

        // one grain, falling, while this lane's rain is still rising.
        if (drops) {
          const raining = cycleT > RAIN_START && cycleT < RAIN_END;
          const dropPhase = raining ? ((cycleT - RAIN_START) * 1.7 + i * 0.31) % 1 : -1;
          if (dropPhase < 0) {
            dummy.scale.setScalar(0);
          } else {
            dummy.position.set(x, FUNNEL_Y - dropPhase * (FUNNEL_Y - (BASE_Y + h)), TUBE_Z);
            dummy.scale.setScalar(1);
          }
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          drops.setMatrixAt(i, dummy.matrix);
        }
      });
      grain.instanceMatrix.needsUpdate = true;
      marker.instanceMatrix.needsUpdate = true;
      if (marker.instanceColor) marker.instanceColor.needsUpdate = true;
      verdict.instanceMatrix.needsUpdate = true;
      if (verdict.instanceColor) verdict.instanceColor.needsUpdate = true;
      if (drops) drops.instanceMatrix.needsUpdate = true;
    }
    if (typeof window !== "undefined") window.__witnessDebug = { elapsed: state.clock.elapsedTime, near, speed, cycleT, raise, heroFlash };
  });

  return (
    <group>
      {/* the station: an octagonal glass-and-timber field hut */}
      <mesh geometry={wallGeo} material={wallMat} castShadow receiveShadow />
      <mesh geometry={roofGeo} material={roofMat} castShadow receiveShadow />
      <mesh geometry={capGeo} material={postMat} />
      <mesh geometry={ringTopGeo} material={postMat} />
      <mesh geometry={ringBotGeo} material={postMat} />
      <instancedMesh ref={postsRef} args={[postGeo, postMat, HUT_SIDES]} castShadow />
      <mesh geometry={deckGeo} material={deckMat} castShadow receiveShadow />
      <mesh geometry={mastGeo} material={mastMat} castShadow />

      {/* the instrument: one chain, looping until it crosses itself once */}
      <group ref={loopGroupRef} position={[0, LOOP_Y, LOOP_Z]} scale={LOOP_SCALE}>
        <mesh geometry={controlGeoA} material={controlMat} />
        <mesh geometry={controlGeoB} material={controlMat} />
        <instancedMesh ref={beadsRef} args={[beadGeo, beadMat, N_BEADS]} castShadow frustumCulled={false} />
        <mesh
          ref={witnessRingRef}
          geometry={witnessRingGeo}
          material={witnessRingMat}
          position={[WITNESS_LOCAL.x, WITNESS_LOCAL.y, WITNESS_LOCAL.z]}
        />
        <mesh ref={witnessHaloRef} material={haloMat} position={[WITNESS_LOCAL.x, WITNESS_LOCAL.y, WITNESS_LOCAL.z]}>
          <sphereGeometry args={[0.34, 12, 10]} />
        </mesh>
      </group>

      {/* the four gauges: rain tested against a control that rains too */}
      <mesh geometry={headerGeo} material={funnelMat} />
      <mesh geometry={riserGeo} material={funnelMat} />
      <instancedMesh ref={funnelRef} args={[funnelGeo, funnelMat, TUBE_X.length]} />
      <instancedMesh ref={tubesRef} args={[tubeGeo, tubeMat, TUBE_X.length]} />
      <instancedMesh ref={grainRef} args={[grainGeo, grainMat, TUBE_X.length]} frustumCulled={false} />
      <instancedMesh ref={markerRef} args={[markerGeo, markerMat, TUBE_X.length]} frustumCulled={false} />
      <instancedMesh ref={verdictRef} args={[verdictGeo, verdictMat, TUBE_X.length]} frustumCulled={false} />
      <instancedMesh ref={dropRef} args={[dropGeo, dropMat, TUBE_X.length]} frustumCulled={false} />
    </group>
  );
}
