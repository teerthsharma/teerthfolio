"use client";

// Building for the "link" figure: tangle (place id p-tangle), a lab project
// Teerth builds. Local origin: the snow at the place centre; +z faces the
// camera and the dock. Props: { place } (near is read from the store, the
// same way Prune.jsx and every other absorbed figure does it).
//
// The normal thing, done cooler: a proof-testing gantry, the rig a chain
// foundry uses to certify a link by pulling it as hard as the spec demands
// and watching whether it lets go. tangle does the same job for a linking
// number -- pull, and either hand back a certificate or refuse -- except it
// never guesses and it is instant: 0 wrong certificates in 2,000 diagrams
// and 80 scenes (data/showcase.json, p-tangle.specs).
//
// The story (figure.desc, teerthsharma.github.io/fig.js's link()): two solid
// rings, one ink and one grey, genuinely linked in three dimensions (a Hopf
// link -- every point of each ring lies in a plane that contains the shared
// pull axis, so they can only cross it once each and linking number stays
// at 1). They roll, scissor open and closed, and swing side to side; once a
// cycle they are pulled taut, catch, and are held -- they never separate.
// The two places one ring crosses the other are lit blue in the figure; here
// they glow in the place's radiation colour, the certificate light and the
// story's key element.
//
// Physically: the top ring hangs fixed from the gantry's hook; the bottom
// ring is the one under test, travelling up to be pulled taut and back down
// to rest. Both keep rolling and scissoring the whole time. Two markers sit
// at each ring's point of closest reach to the other -- always exactly on
// the ring, whatever its rotation, since a point lying on the rotation axis
// itself does not move when the ring turns about it -- and swell with the
// gauge panel while the rings are held taut.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BoxGeometry, CylinderGeometry, SphereGeometry, TorusGeometry } from "three";
import { useUi } from "../../../lib/world/store";
import { C, glow, mat } from "../palette";

const INK = "#1c1b19"; // the landing site's own --ink: the lacquered ring

// --- frame -------------------------------------------------------------
const POST_X = 1.4, POST_W = 0.28, POST_D = 0.24, POST_H = 5.0;
const BEAM_Y = POST_H + 0.16, BEAM_LEN = POST_X * 2 + POST_W + 0.16, BEAM_H = 0.3, BEAM_D = 0.28;
const SKID_Y = 0.09, SKID_LEN = POST_X * 2 + 0.6, SKID_W = 0.42, SKID_H = 0.18;
const HOOK_Y = POST_H - 0.28, ROD_Y0 = HOOK_Y - 0.1;

// --- the rings -----------------------------------------------------------
const R = 0.74, RT = 0.15; // ring radius, tube radius
const ANCHOR_Y = 3.65; // ring A (ink): fixed, hangs from the hook
const ROD_LEN = ROD_Y0 - (ANCHOR_Y + R);
const SEP_REST = 1.02, SEP_TIGHT = 0.38; // ring B centre distance below ring A (< 2R: always overlapping, always linked)
const ROLL_SPEED = 0.5, SCIS_AMP = 0.32, SCIS_FREQ = 0.85, SWING_AMP = 0.14, SWING_FREQ = 0.5;

const CYCLE_FAR = 7.5, CYCLE_NEAR = 4.2, EASE = 4;

const POST_GEO = new BoxGeometry(POST_W, POST_H, POST_D);
const BEAM_GEO = new BoxGeometry(BEAM_LEN, BEAM_H, BEAM_D);
const SKID_GEO = new BoxGeometry(SKID_LEN, SKID_H, SKID_W);
const HOOK_GEO = new TorusGeometry(0.11, 0.032, 8, 16);
const ROD_GEO = new CylinderGeometry(0.024, 0.024, Math.max(0.08, ROD_LEN), 6);
const RING_GEO = new TorusGeometry(R, RT, 9, 30); // shared: ring A and ring B
const MARK_GEO = new SphereGeometry(0.11, 10, 8);
const GAUGE_GEO = new BoxGeometry(0.06, 0.46, 0.3);

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (x) => { const c = clamp01(x); return c * c * (3 - 2 * c); };

export default function Link({ place }) {
  const near = useUi((s) => s.near === place.id);
  const nearRef = useRef(near);
  nearRef.current = near;
  const nearK = useRef(0);

  const accent = place.radiation ?? place.color;

  const frameMat = useMemo(() => mat(C.charcoal, { roughness: 0.55, metalness: 0.35 }), []);
  const skidMat = useMemo(() => mat(C.metal, { roughness: 0.6, metalness: 0.3 }), []);
  const inkMat = useMemo(() => mat(INK, { flat: false, roughness: 0.2, metalness: 0.55 }), []);
  const greyMat = useMemo(() => mat(C.metal, { flat: false, roughness: 0.3, metalness: 0.6 }), []);
  const markMat = useMemo(() => mat("#ffffff", { emissive: accent, emissiveIntensity: 0.6, roughness: 0.25 }).clone(), [accent]);
  const gaugeMat = useMemo(() => mat(accent, { emissive: accent, emissiveIntensity: 0.6, roughness: 0.35 }).clone(), [accent]);
  const markGlowMat = useMemo(() => glow(accent, 0.3), [accent]);
  const gaugeGlowMat = useMemo(() => glow(accent, 0.28), [accent]);

  const ringAYawRef = useRef(null);
  const ringBRef = useRef(null);
  const markARef = useRef(null);
  const markBRef = useRef(null);
  const markAGlowRef = useRef(null);
  const markBGlowRef = useRef(null);
  const gaugeGlowRef = useRef(null);

  useFrame((state, dt) => {
    const k = 1 - Math.exp(-EASE * dt);
    nearK.current += ((nearRef.current ? 1 : 0) - nearK.current) * k;
    const boost = nearK.current;

    const raw = state.clock.elapsedTime;
    const t = raw * (1 + 0.6 * boost);
    const roll = t * ROLL_SPEED;
    const scis = SCIS_AMP * Math.sin(t * SCIS_FREQ);
    // both rings turn about the shared pull axis (world Y). Ring A's plane
    // offset (perpendicular to ring B's) is a fixed rotation baked into its
    // own mesh, so this outer group's rotation.y is a pure pull-axis roll,
    // never composed with that fixed offset -- composing them on one Euler
    // would spin ring A about the wrong axis once it is tilted.
    if (ringAYawRef.current) ringAYawRef.current.rotation.y = roll + scis;
    if (ringBRef.current) ringBRef.current.rotation.y = roll - scis;

    const swing = SWING_AMP * Math.sin(t * SWING_FREQ);

    // the pull cycle: rest -> pulled taut -> held (a small caught jitter) -> released -> rest
    const cycle = CYCLE_FAR - (CYCLE_FAR - CYCLE_NEAR) * boost;
    const p = ((raw % cycle) / cycle + 1) % 1;
    let sep, glowK;
    if (p < 0.3) {
      const e = smooth(p / 0.3);
      sep = SEP_REST + (SEP_TIGHT - SEP_REST) * e;
      glowK = e;
    } else if (p < 0.55) {
      const u = (p - 0.3) / 0.25;
      sep = SEP_TIGHT + 0.025 * Math.sin(u * Math.PI * 3) * Math.exp(-u * 2.5);
      glowK = 1;
    } else if (p < 0.85) {
      const e = smooth((p - 0.55) / 0.3);
      sep = SEP_TIGHT + (SEP_REST - SEP_TIGHT) * e;
      glowK = 1 - e;
    } else {
      sep = SEP_REST;
      glowK = 0;
    }
    const byY = ANCHOR_Y - sep;
    if (ringBRef.current) ringBRef.current.position.y = byY;

    // at rest the crossing is a faint pinprick, the way the landing figure's
    // stills show no lit dot at all; it only swells into a real mark while
    // the rings are held taut (glowK -> 1), same as the figure's own comment
    // ("the light swells while the rings are held taut").
    const glowMul = 1 + 0.4 * boost;
    const intensity = (0.12 + 2.6 * glowK) * glowMul;
    markMat.emissiveIntensity = intensity;
    gaugeMat.emissiveIntensity = intensity;
    const s = 0.8 + 0.9 * glowK;
    if (markARef.current) markARef.current.scale.setScalar(s);
    if (markBRef.current) { markBRef.current.scale.setScalar(s); markBRef.current.position.y = byY + R; }
    // the halo hugs the crossing itself (fig.js: "lit ... in the gap under
    // its over strand") -- it must never grow past the tube it sits on, or
    // it reads as the whole ring glowing instead of one certified crossing.
    if (markAGlowRef.current) markAGlowRef.current.scale.setScalar(s * (1.1 + 0.5 * glowK));
    if (markBGlowRef.current) { const gs = s * (1.1 + 0.5 * glowK); markBGlowRef.current.scale.setScalar(gs); markBGlowRef.current.position.y = byY + R; }
    if (gaugeGlowRef.current) gaugeGlowRef.current.scale.set(1, 1 + 0.6 * glowK, 1 + 0.6 * glowK);

    // the whole rig sways gently, like something genuinely hanging
    const sx = Math.sin(swing) * 0.05;
    if (ringAYawRef.current) ringAYawRef.current.position.x = sx;
    if (markARef.current) markARef.current.position.x = sx;
    if (markAGlowRef.current) markAGlowRef.current.position.x = sx;
    if (ringBRef.current) ringBRef.current.position.x = sx;
    if (markBRef.current) markBRef.current.position.x = sx;
    if (markBGlowRef.current) markBGlowRef.current.position.x = sx;
  });

  return (
    <group>
      {/* the gantry */}
      <mesh geometry={SKID_GEO} material={skidMat} position={[0, SKID_Y, 0]} castShadow receiveShadow />
      <mesh geometry={POST_GEO} material={frameMat} position={[-POST_X, POST_H / 2, 0]} castShadow receiveShadow />
      <mesh geometry={POST_GEO} material={frameMat} position={[POST_X, POST_H / 2, 0]} castShadow receiveShadow />
      <mesh geometry={BEAM_GEO} material={frameMat} position={[0, BEAM_Y, 0]} castShadow />
      <mesh geometry={HOOK_GEO} material={frameMat} position={[0, HOOK_Y, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow />
      <mesh geometry={ROD_GEO} material={frameMat} position={[0, (ROD_Y0 + ANCHOR_Y + R) / 2, 0]} />

      {/* the certificate gauge, mounted on the near post */}
      <mesh geometry={GAUGE_GEO} material={gaugeMat} position={[-POST_X, 2.3, POST_D / 2 + 0.03]} castShadow />
      <mesh ref={gaugeGlowRef} geometry={GAUGE_GEO} material={gaugeGlowMat} position={[-POST_X, 2.3, POST_D / 2 + 0.11]} scale={[1, 1.3, 1.3]} />

      {/* the two rings, genuinely linked: ring A fixed under the hook, ring B pulled and released.
          Ring A's plane is perpendicular to ring B's (a fixed tilt on the mesh itself); the
          yaw group around it carries only the shared pull-axis roll, so the two never compose
          onto one Euler and fight each other. */}
      <group ref={ringAYawRef} position={[0, ANCHOR_Y, 0]}>
        <mesh geometry={RING_GEO} material={inkMat} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow />
      </group>
      <mesh ref={ringBRef} geometry={RING_GEO} material={greyMat} position={[0, ANCHOR_Y - SEP_REST, 0]} castShadow receiveShadow />

      {/* the two crossings: always exactly on their ring, wherever it has turned */}
      <mesh ref={markARef} geometry={MARK_GEO} material={markMat} position={[0, ANCHOR_Y - R, RT * 2.1]} />
      <mesh ref={markAGlowRef} geometry={MARK_GEO} material={markGlowMat} position={[0, ANCHOR_Y - R, RT * 2.1]} />
      <mesh ref={markBRef} geometry={MARK_GEO} material={markMat} position={[0, ANCHOR_Y - SEP_REST + R, RT * 2.1]} />
      <mesh ref={markBGlowRef} geometry={MARK_GEO} material={markGlowMat} position={[0, ANCHOR_Y - SEP_REST + R, RT * 2.1]} />
    </group>
  );
}
