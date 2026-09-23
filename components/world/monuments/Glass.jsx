"use client";

// Sculpture for the "glass" figure: faraday (place id p-faraday), one of
// the lab projects Teerth builds. No plinth: local origin sits on the snow
// at the place centre, +z faces the camera and the dock.
// Props: { place }; near is read from the store directly (Scene.jsx passes
// only { place } today, so this figure subscribes to it itself).
//
// Building type: a small electrical substation. A transformer's everyday
// job -- coupling two circuits through the field they share, not a wire
// between them -- IS this project's claim, so the substation is what does
// it "cooler": the coupling is computed, not assumed, and you can watch it
// happen. A glass deck stands in for fig.js's "sheet of glass"; two
// ceramic-white bushing insulators are its two wires, piercing straight up
// through the deck exactly as teerthsharma.github.io/fig.js's glass()
// figure draws them (data/showcase.json's figure.desc: "Two wires pass
// through a sheet of glass"). The blue/violet lines painted on the deck are
// that figure's converged field -- E's circles through both wires, H's
// circles round each one, crossing at right angles -- and a jittered
// "wrong guess" of the same lines (baked once, see parts/glass-field.js)
// flashes in and fades against them each cycle, "successive states settle
// onto one fixed point". Only once they've settled does the coupling glow
// at the deck's centre and climb the two bushings: data/showcase.json's
// figure.caption, verbatim -- "Two fields at right angles settle onto one
// fixed point, and only then does their coupling E x H rise where they
// meet."

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BoxGeometry, CatmullRomCurve3, CylinderGeometry, SphereGeometry, TorusGeometry, TubeGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useUi } from "../../../lib/world/store";
import { C, glow, mat } from "../palette";
import { BASE_D, BASE_H, BASE_W, BLUE, BUSHING_H, DECK_D, DECK_T, DECK_W, DECK_Y, E_LINES, H_RADII, hash, VIOLET, WIRE_X } from "./parts/glass-field";

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

const GHOST_NOISE = 0.09; // how far a "wrong guess" wanders from the settled line

// --- the field motif, baked once at module load: the settled shape and one
// jittered "wrong guess" beside it, so the settle animation only ever has
// to crossfade opacity, never rebuild geometry. ---
function eTube(points, y, seed) {
  const curve = new CatmullRomCurve3(
    points.map(([x, z], i) => {
      const n = seed == null ? 0 : (hash(seed + i * 3.7) - 0.5) * GHOST_NOISE;
      return new Vector3(x + n, y, z + n * 0.8);
    }),
  );
  return new TubeGeometry(curve, 20, 0.014, 6, false);
}
const E_GEO = mergeGeometries(E_LINES.map((pts) => eTube(pts, DECK_Y + 0.01, null)));
const E_GHOST_GEO = mergeGeometries(E_LINES.map((pts, i) => eTube(pts, DECK_Y + 0.016, i * 11 + 1)));

function ring(radius, wireX, seed) {
  const jr = seed == null ? radius : radius + (hash(seed) - 0.5) * GHOST_NOISE;
  const jx = seed == null ? wireX : wireX + (hash(seed + 5) - 0.5) * GHOST_NOISE;
  const g = new TorusGeometry(jr, 0.013, 6, 24);
  g.rotateX(Math.PI / 2);
  g.translate(jx, seed == null ? DECK_Y + 0.012 : DECK_Y + 0.018, 0);
  return g;
}
const H_GEO = mergeGeometries(H_RADII.flatMap((r) => [-WIRE_X, WIRE_X].map((wx) => ring(r, wx, null))));
const H_GHOST_GEO = mergeGeometries(
  H_RADII.flatMap((r, ri) => [-WIRE_X, WIRE_X].map((wx, wi) => ring(r, wx, ri * 17 + wi * 23 + 3))),
);

// --- the rest of the substation: cabinet, deck, two bushings, a low yard
// fence -- baked once, since none of it needs to move. ---
const BASE_GEO = new BoxGeometry(BASE_W, BASE_H, BASE_D);
BASE_GEO.translate(0, BASE_H / 2, 0);
const DECK_GEO = new BoxGeometry(DECK_W, DECK_T, DECK_D);
DECK_GEO.translate(0, BASE_H + DECK_T / 2, 0);

const RIB_Y = [0.5, 1.4, 2.3, 3.1]; // insulator-disc heights above the deck
const BUSHING_GEO = mergeGeometries(
  [-WIRE_X, WIRE_X].flatMap((wx) => {
    const stack = new CylinderGeometry(0.075, 0.12, BUSHING_H, 8);
    stack.translate(wx, DECK_Y + BUSHING_H / 2, 0);
    const ribs = RIB_Y.map((dy) => {
      const g = new TorusGeometry(0.13, 0.055, 6, 10);
      g.rotateX(Math.PI / 2);
      g.translate(wx, DECK_Y + dy, 0);
      return g;
    });
    return [stack, ...ribs];
  }),
);
const CAP_GEO = mergeGeometries(
  [-WIRE_X, WIRE_X].map((wx) => {
    const g = new SphereGeometry(0.095, 10, 8);
    g.translate(wx, DECK_Y + BUSHING_H, 0);
    return g;
  }),
);

const POST_H = 0.85, YARD_X = BASE_W / 2 + 0.35, YARD_Z = BASE_D / 2 + 0.35;
const POSTS = [
  [-YARD_X, -YARD_Z],
  [YARD_X, -YARD_Z],
  [-YARD_X, YARD_Z],
  [YARD_X, YARD_Z],
];
const FENCE_GEO = mergeGeometries([
  ...POSTS.map(([x, z]) => {
    const g = new CylinderGeometry(0.035, 0.035, POST_H, 6);
    g.translate(x, POST_H / 2, z);
    return g;
  }),
  ...[
    [0, -YARD_Z],
    [0, YARD_Z],
  ].map(([x, z]) => {
    const g = new BoxGeometry(YARD_X * 2, 0.05, 0.05);
    g.translate(x, POST_H - 0.1, z);
    return g;
  }),
  ...[
    [-YARD_X, 0],
    [YARD_X, 0],
  ].map(([x, z]) => {
    const g = new BoxGeometry(0.05, 0.05, YARD_Z * 2);
    g.translate(x, POST_H - 0.1, z);
    return g;
  }),
]);

// A glow shell (base pinned at y = 0) for the coupling climbing each
// bushing: scale.y from 0 to 1 grows it from the deck up.
const RISE_GEO = new CylinderGeometry(0.095, 0.14, BUSHING_H * 0.5, 6, 1, true);
RISE_GEO.translate(0, BUSHING_H * 0.25, 0);

const CYCLE_FAR = 6.5, CYCLE_NEAR = 3.6, EASE = 4; // seconds per settle-then-glow loop

export default function Glass({ place }) {
  const near = useUi((s) => s.near === place.id);
  const nearRef = useRef(near);
  nearRef.current = near;
  const accent = place.radiation ?? place.color;

  const cabinetMat = useMemo(() => mat(C.charcoal), []);
  const deckMat = useMemo(
    () => mat(accent, { opacity: 0.55, roughness: 0.08, metalness: 0.05, emissive: accent, emissiveIntensity: 0.18 }),
    [accent],
  );
  const bushingMat = useMemo(() => mat(C.ice, { roughness: 0.2 }), []);
  const capMat = useMemo(() => mat(C.metal, { roughness: 0.3, metalness: 0.6 }), []);

  // Cloned so each can carry its own animated opacity/emissive (palette.js:
  // "never mutate the result" of mat() itself -- clone once, mutate the clone).
  const eMat = useMemo(() => mat(BLUE, { flat: false, roughness: 0.3, emissive: BLUE, emissiveIntensity: 0.7, opacity: 0.95 }).clone(), []);
  const eGhostMat = useMemo(() => mat(BLUE, { flat: false, roughness: 0.3, emissive: BLUE, emissiveIntensity: 0.5, opacity: 0.5 }).clone(), []);
  const hMat = useMemo(() => mat(VIOLET, { flat: false, roughness: 0.3, emissive: VIOLET, emissiveIntensity: 0.7, opacity: 0.95 }).clone(), []);
  const hGhostMat = useMemo(() => mat(VIOLET, { flat: false, roughness: 0.3, emissive: VIOLET, emissiveIntensity: 0.5, opacity: 0.5 }).clone(), []);
  const coupleMat = useMemo(() => mat(accent, { roughness: 0.25, emissive: accent, emissiveIntensity: 1 }).clone(), [accent]);
  const coupleGlowMat = useMemo(() => glow(accent, 0.4), [accent]);
  const riseMat = useMemo(() => glow(accent, 0.55), [accent]);

  const coreRef = useRef(null);
  const glowRef = useRef(null);
  const riseARef = useRef(null);
  const riseBRef = useRef(null);
  const nearK = useRef(0);
  const phase = useRef(0);

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-EASE * dt);
    nearK.current += ((nearRef.current ? 1 : 0) - nearK.current) * k;
    const cycle = CYCLE_FAR - (CYCLE_FAR - CYCLE_NEAR) * nearK.current;
    phase.current = (phase.current + dt / cycle) % 1;
    const p = phase.current;
    const boost = 0.5 * nearK.current;

    // several wrong guesses flash in, jittery, then fade as the true field
    // beneath them brightens and holds -- "successive states settle onto
    // one fixed point"
    const ghostK = smoothstep(0, 0.08, p) - smoothstep(0.22, 0.4, p);
    const settleK = 0.3 + 0.7 * (smoothstep(0.28, 0.45, p) - smoothstep(0.88, 1, p));

    eGhostMat.opacity = 0.55 * ghostK;
    eGhostMat.emissiveIntensity = 0.4 + boost;
    hGhostMat.opacity = 0.55 * ghostK;
    hGhostMat.emissiveIntensity = 0.4 + boost;
    eMat.opacity = 0.35 + 0.6 * settleK;
    eMat.emissiveIntensity = 0.4 + 0.6 * settleK + boost;
    hMat.opacity = 0.35 + 0.6 * settleK;
    hMat.emissiveIntensity = 0.4 + 0.6 * settleK + boost;

    // only once the field has settled does the coupling appear, and it
    // rises where the two fields meet -- climbing the two bushings
    const coupleK = Math.sin(Math.PI * clamp01((p - 0.5) / 0.42)) * smoothstep(0.45, 0.58, p);
    coupleMat.emissiveIntensity = 0.6 + 3 * coupleK + boost * 2;
    if (coreRef.current) coreRef.current.scale.setScalar(0.5 + 0.6 * coupleK);
    if (glowRef.current) glowRef.current.scale.setScalar(0.6 + 2.2 * coupleK);
    if (riseARef.current) riseARef.current.scale.y = coupleK;
    if (riseBRef.current) riseBRef.current.scale.y = coupleK;
  });

  return (
    <group>
      <mesh geometry={BASE_GEO} material={cabinetMat} castShadow receiveShadow />
      <mesh geometry={FENCE_GEO} material={cabinetMat} castShadow />
      <mesh geometry={DECK_GEO} material={deckMat} receiveShadow />
      <mesh geometry={BUSHING_GEO} material={bushingMat} castShadow />
      <mesh geometry={CAP_GEO} material={capMat} castShadow />

      <mesh geometry={H_GHOST_GEO} material={hGhostMat} />
      <mesh geometry={E_GHOST_GEO} material={eGhostMat} />
      <mesh geometry={H_GEO} material={hMat} />
      <mesh geometry={E_GEO} material={eMat} />

      <mesh ref={coreRef} position={[0, DECK_Y + 0.05, 0]} material={coupleMat}>
        <icosahedronGeometry args={[0.11, 0]} />
      </mesh>
      <mesh ref={glowRef} position={[0, DECK_Y + 0.05, 0]} material={coupleGlowMat}>
        <icosahedronGeometry args={[0.16, 0]} />
      </mesh>
      <mesh ref={riseARef} geometry={RISE_GEO} material={riseMat} position={[-WIRE_X, DECK_Y, 0]} scale={[1, 0, 1]} />
      <mesh ref={riseBRef} geometry={RISE_GEO} material={riseMat} position={[WIRE_X, DECK_Y, 0]} scale={[1, 0, 1]} />
    </group>
  );
}
