"use client";

// Building for the "glass" figure: faraday (place id p-faraday), one of the
// lab projects Teerth builds, standing straight on the snow. No plinth:
// local origin sits on the snow at the place centre, +z faces the camera
// and the dock.
//
// Building type: a small electrical substation, at 2x scale so it reads at
// game distance. A transformer's everyday job -- coupling two circuits
// through the field they share, not a wire between them -- IS this
// project's claim, so the substation is what does it "cooler": the
// coupling is computed, not assumed, and you can watch it happen. A
// transformer tank stands on the snow (the recognisable, opaque mass --
// data/showcase.json's p-faraday specs, "computational Faraday tensor" and
// "topology-fixed-point projection"); a clear glass deck is raised on four
// legs above it, snow visible all round and beneath, standing in for
// fig.js's "sheet of glass"; two ceramic-white bushing insulators are its
// two wires, piercing straight up through the deck exactly as
// teerthsharma.github.io/fig.js's glass() figure draws them
// (data/showcase.json's figure.desc: "Two wires pass through a sheet of
// glass"). The blue/violet lines traced on the deck are that figure's
// converged field -- E's circles through both wires, H's Apollonian
// circles round each one, crossing at right angles everywhere, both
// clipped to the deck exactly as fig.js clips every line to its own
// illustration box (parts/glass-field.js) -- and three successively
// tighter "wrong guess" jitters flash through in sequence each cycle,
// fading as the true field settles: "successive states settle onto one
// fixed point". Only once they've settled does the amber coupling glow at
// the deck's centre and climb the two bushings, in the place's own
// radiation colour (every place on the island is radioactive; the amber
// rise IS this place's glow, not decoration): data/showcase.json's
// figure.caption, verbatim -- "Two fields at right angles settle onto one
// fixed point, and only then does their coupling E x H rise where they
// meet."

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BoxGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  MeshBasicMaterial,
  Object3D,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useUi } from "../../../lib/world/store";
import { C, glow, mat } from "../palette";
import {
  BASE_D,
  BASE_H,
  BASE_W,
  BLUE,
  BUSHING_H,
  CAP_Y,
  CONDUCTOR_R,
  DECK_D,
  DECK_T,
  DECK_W,
  DECK_Y,
  E_LINES,
  FIN_COUNT,
  FIN_H,
  FIN_T,
  FIN_W,
  GLASS_TINT,
  H_LINES,
  hash,
  LEG_INSET,
  LEG_SIZE,
  LEG_Y,
  MINT,
  POLE_R,
  POLE_X,
  POLE_Y,
  TREFOIL_R,
  VIOLET,
  WIRE_X,
} from "./parts/glass-field";

const SIDES = [-1, 1];

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

const E_TUBE_R = 0.022, H_TUBE_R = 0.02;
const GHOST_JITTER = [0.45, 0.27, 0.16]; // residual shrinks by about 0.6 a step
const GHOST_WINDOWS = [[0, 0.12], [0.12, 0.24], [0.24, 0.36]];

// --- the field motif, baked once at module load: the settled shape, plus
// three jittered "wrong guess" states beside it, so the settle animation
// only ever has to crossfade opacity and toggle visibility, never rebuild
// geometry. ---
function fieldTube(points, y, seed, jitter, tubeR) {
  const curve = new CatmullRomCurve3(
    points.map(([x, z], i) => {
      const n = seed == null ? 0 : (hash(seed + i * 3.7) - 0.5) * jitter;
      return new Vector3(x + n, y, z + n * 0.8);
    }),
  );
  return new TubeGeometry(curve, Math.max(2, points.length - 1), tubeR, 6, false);
}
const E_GEO = mergeGeometries(E_LINES.map((pts) => fieldTube(pts, DECK_Y + 0.02, null, 0, E_TUBE_R)));
const H_GEO = mergeGeometries(H_LINES.map((pts) => fieldTube(pts, DECK_Y + 0.02, null, 0, H_TUBE_R)));
const E_GHOST_GEOS = GHOST_JITTER.map((j, gi) =>
  mergeGeometries(E_LINES.map((pts, i) => fieldTube(pts, DECK_Y + 0.026 + gi * 0.002, gi * 131 + i * 7 + 1, j, E_TUBE_R))),
);
const H_GHOST_GEOS = GHOST_JITTER.map((j, gi) =>
  mergeGeometries(H_LINES.map((pts, i) => fieldTube(pts, DECK_Y + 0.026 + gi * 0.002, gi * 257 + i * 7 + 51, j, H_TUBE_R))),
);

// --- the rest of the substation: transformer tank, radiator fins, glass
// deck on its legs, mint edge frame, two bushings, the yard's sagging
// conductors -- baked once, since none of it needs to move. ---
const TANK_GEO = new BoxGeometry(BASE_W, BASE_H, BASE_D);
TANK_GEO.translate(0, BASE_H / 2, 0);

// Mounted on the tank's SIDE (x) faces, not front/back: the dock/camera
// faces +z, so the front and back stay bare charcoal and the tank's own
// silhouette -- not a fin grille -- is what the seal sees on approach.
const FIN_GEO = mergeGeometries(
  [-1, 1].flatMap((side) =>
    Array.from({ length: FIN_COUNT }, (_, i) => {
      const z = -BASE_D / 2 + 0.14 + i * ((BASE_D - 0.28) / (FIN_COUNT - 1));
      const g = new BoxGeometry(FIN_T, FIN_H, FIN_W);
      g.translate(side * (BASE_W / 2 + FIN_T / 2), FIN_H / 2 + 0.05, z);
      return g;
    }),
  ),
);

const DECK_GEO = new BoxGeometry(DECK_W, DECK_T, DECK_D);
DECK_GEO.translate(0, DECK_Y - DECK_T / 2, 0);

const FRAME_T = 0.08;
const EDGE_FRAME_GEO = mergeGeometries([
  ...[-1, 1].map((s) => {
    const g = new BoxGeometry(DECK_W + FRAME_T, DECK_T + 0.02, FRAME_T);
    g.translate(0, DECK_Y - DECK_T / 2, s * (DECK_D / 2 + FRAME_T / 2));
    return g;
  }),
  ...[-1, 1].map((s) => {
    const g = new BoxGeometry(FRAME_T, DECK_T + 0.02, DECK_D + FRAME_T);
    g.translate(s * (DECK_W / 2 + FRAME_T / 2), DECK_Y - DECK_T / 2, 0);
    return g;
  }),
]);

const LEG_GEO = mergeGeometries(
  [-1, 1].flatMap((sx) =>
    [-1, 1].map((sz) => {
      const g = new BoxGeometry(LEG_SIZE, LEG_Y, LEG_SIZE);
      g.translate(sx * (DECK_W / 2 - LEG_INSET), LEG_Y / 2, sz * (DECK_D / 2 - LEG_INSET));
      return g;
    }),
  ),
);

const RIB_Y = [0.3, 0.9, 1.5, 2.1, 2.7]; // insulator-shed heights above the deck
const BUSHING_GEO = mergeGeometries(
  [-WIRE_X, WIRE_X].flatMap((wx) => {
    const stack = new CylinderGeometry(0.16, 0.22, BUSHING_H, 8);
    stack.translate(wx, DECK_Y + BUSHING_H / 2, 0);
    const sheds = RIB_Y.map((dy) => {
      const g = new TorusGeometry(0.34, 0.08, 6, 10);
      g.rotateX(Math.PI / 2);
      g.translate(wx, DECK_Y + dy, 0);
      return g;
    });
    return [stack, ...sheds];
  }),
);
const CAP_GEO = mergeGeometries(
  [-WIRE_X, WIRE_X].map((wx) => {
    const g = new SphereGeometry(0.2, 10, 8);
    g.translate(wx, CAP_Y, 0);
    return g;
  }),
);

const POLE_GEO = mergeGeometries(
  [-POLE_X, POLE_X].map((x) => {
    const g = new CylinderGeometry(POLE_R, POLE_R, POLE_Y, 8);
    g.translate(x, POLE_Y / 2, 0);
    return g;
  }),
);
function sagCurve(x0, y0, x1, y1) {
  return new CatmullRomCurve3([
    new Vector3(x0, y0, 0),
    new Vector3((x0 + x1) / 2, Math.min(y0, y1) - 0.4, 0),
    new Vector3(x1, y1, 0),
  ]);
}
const CONDUCTOR_GEO = mergeGeometries(
  [-1, 1].map((s) => new TubeGeometry(sagCurve(s * WIRE_X, CAP_Y, s * POLE_X, POLE_Y), 12, CONDUCTOR_R, 6, false)),
);

// A small hazard plate on the tank's corner, tilted for charm.
const PLATE_GEO = new CircleGeometry(TREFOIL_R, 20);
function trefoilBlade(startDeg) {
  return new RingGeometry(TREFOIL_R * 0.22, TREFOIL_R * 0.85, 12, 1, (startDeg * Math.PI) / 180, (70 * Math.PI) / 180);
}
const TREFOIL_GEO = mergeGeometries([0, 120, 240].map((d) => trefoilBlade(d)));

// The coupling's in-sheet glow: two discs over the wires, one at centre.
const SHEET_GLOW_GEO = mergeGeometries(
  [-WIRE_X, 0, WIRE_X].map((wx) => {
    const g = new CircleGeometry(0.9, 24);
    g.rotateX(-Math.PI / 2);
    g.translate(wx, DECK_Y + 0.03, 0);
    return g;
  }),
);

// The coupling climbing each bushing: 4 flat amber rings per side, an
// instancedMesh so all 8 cost one draw call; useFrame moves and hides them.
const RISE_RING_GEO = new RingGeometry(0.3, 0.6, 24);
RISE_RING_GEO.rotateX(-Math.PI / 2);

// Radiation glow on the snow: baked once as per-vertex alpha (no canvas
// texture -- this file still runs its module scope during SSR, where
// `document` does not exist -- so the radial falloff is baked straight
// into the geometry's own colour attribute instead).
function radialDiscGeo(radius, segments) {
  const g = new CircleGeometry(radius, segments);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 4);
  for (let i = 0; i < pos.count; i++) {
    const t = clamp01(Math.hypot(pos.getX(i), pos.getZ(i)) / radius);
    const a = (1 - t) ** 1.6;
    col[i * 4] = 1;
    col[i * 4 + 1] = 1;
    col[i * 4 + 2] = 1;
    col[i * 4 + 3] = a;
  }
  g.setAttribute("color", new Float32BufferAttribute(col, 4));
  g.translate(0, 0.02, 0);
  return g;
}
const SNOW_GLOW_GEO = radialDiscGeo(2.8, 40);

const CYCLE_FAR = 6.5, CYCLE_NEAR = 3.6, EASE = 4; // seconds per settle-then-glow loop
const COUPLE_BOB = 0.4; // metres the coupling core rises as coupleK climbs to 1

export default function Glass({ place }) {
  const near = useUi((s) => s.near === place.id);
  const nearRef = useRef(near);
  nearRef.current = near;
  const accent = place.radiation ?? place.color;

  const cabinetMat = useMemo(() => mat(C.charcoal), []);
  const finMat = useMemo(() => mat(accent, { emissive: accent, emissiveIntensity: 0.3 }), [accent]);
  const deckMat = useMemo(() => mat(GLASS_TINT, { opacity: 0.32, roughness: 0.05 }), []);
  const frameMat = useMemo(() => mat(MINT, { roughness: 0.35, emissive: MINT, emissiveIntensity: 0.25 }), []);
  const bushingMat = useMemo(() => mat(C.ice, { roughness: 0.2 }), []);
  const capMat = useMemo(() => mat(C.metal, { roughness: 0.3, metalness: 0.6 }), []);
  const trefoilMat = useMemo(() => mat(accent, { emissive: accent, emissiveIntensity: 0.35 }), [accent]);

  // Cloned so each can carry its own animated opacity/emissive (palette.js:
  // "never mutate the result" of mat() itself -- clone once, mutate the clone).
  const fieldMat = (color) => {
    const m = mat(color, { flat: false, roughness: 0.3, emissive: color, emissiveIntensity: 0.5, opacity: 0.9 }).clone();
    m.toneMapped = false; // so the lines still read at 35 m under tone mapping
    return m;
  };
  const eMat = useMemo(() => fieldMat(BLUE), []);
  const hMat = useMemo(() => fieldMat(VIOLET), []);
  const eGhostMats = useMemo(() => GHOST_JITTER.map(() => fieldMat(BLUE)), []);
  const hGhostMats = useMemo(() => GHOST_JITTER.map(() => fieldMat(VIOLET)), []);

  const coupleMat = useMemo(() => mat(accent, { roughness: 0.25, emissive: accent, emissiveIntensity: 1 }).clone(), [accent]);
  const coupleGlowMat = useMemo(() => glow(accent, 0.4), [accent]);
  const riseMat = useMemo(() => glow(accent, 0.55), [accent]);
  // Own MeshBasicMaterials (not palette's cache), since both get mutated
  // every frame and normal blending -- not glow()'s additive -- is what
  // still reads against snow at about 235 luma.
  const sheetGlowMat = useMemo(
    () => new MeshBasicMaterial({ color: accent, transparent: true, opacity: 0, toneMapped: false, depthWrite: false }),
    [accent],
  );
  const snowGlowMat = useMemo(
    () => new MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.14, vertexColors: true, toneMapped: false, depthWrite: false }),
    [accent],
  );

  const coreRef = useRef(null);
  const glowRef = useRef(null);
  const riseRef = useRef(null);
  const riseDummy = useMemo(() => new Object3D(), []);
  const eGhostRefs = useRef([]);
  const hGhostRefs = useRef([]);
  const nearK = useRef(0);
  const phase = useRef(0);

  useFrame((state, dt) => {
    const k = 1 - Math.exp(-EASE * dt);
    nearK.current += ((nearRef.current ? 1 : 0) - nearK.current) * k;
    const cycle = CYCLE_FAR - (CYCLE_FAR - CYCLE_NEAR) * nearK.current;
    phase.current = (phase.current + dt / cycle) % 1;
    const p = phase.current;
    const boost = 0.5 * nearK.current;

    // three successively tighter "wrong guesses" flash in sequence, each
    // fading as the next appears -- "successive states settle onto one
    // fixed point"
    for (let gi = 0; gi < GHOST_WINDOWS.length; gi++) {
      const [a, b] = GHOST_WINDOWS[gi];
      const op = 0.55 * (smoothstep(a, a + 0.03, p) - smoothstep(b - 0.03, b, p));
      const eR = eGhostRefs.current[gi], hR = hGhostRefs.current[gi];
      const visible = op > 0.02; // zero-opacity ghosts cost no draw calls
      if (eR) eR.visible = visible;
      if (hR) hR.visible = visible;
      eGhostMats[gi].opacity = op;
      eGhostMats[gi].emissiveIntensity = 0.4 + boost;
      hGhostMats[gi].opacity = op;
      hGhostMats[gi].emissiveIntensity = 0.4 + boost;
    }

    const settleK = 0.3 + 0.7 * (smoothstep(0.28, 0.45, p) - smoothstep(0.88, 1, p));
    eMat.opacity = 0.35 + 0.6 * settleK;
    eMat.emissiveIntensity = 0.4 + 0.6 * settleK + boost;
    hMat.opacity = 0.35 + 0.6 * settleK;
    hMat.emissiveIntensity = 0.4 + 0.6 * settleK + boost;

    // only once the field has settled does the coupling appear, and it
    // rises where the two fields meet -- climbing the two bushings
    const coupleK = Math.sin(Math.PI * clamp01((p - 0.5) / 0.42)) * smoothstep(0.45, 0.58, p);
    coupleMat.emissiveIntensity = 0.6 + 3 * coupleK + boost * 2;
    const riseY = DECK_Y + 0.05 + COUPLE_BOB * coupleK;
    if (coreRef.current) {
      coreRef.current.scale.setScalar(0.3 + 1.3 * coupleK);
      coreRef.current.position.y = riseY;
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(0.6 + 2.2 * coupleK);
      glowRef.current.position.y = riseY;
    }
    sheetGlowMat.opacity = 0.75 * coupleK;

    // the radiation glow on the snow: brighter as the coupling rises, and
    // full strength once the seal is close enough to be watching
    const snowBase = 0.14 + 0.22 * coupleK;
    snowGlowMat.opacity = snowBase + (1 - snowBase) * nearK.current;

    const rise = riseRef.current;
    if (rise) {
      const active = coupleK > 0.01;
      rise.visible = active;
      if (active) {
        const t = state.clock.elapsedTime;
        const scale = 1 + 0.25 * nearK.current; // 1.25x, up close
        let idx = 0;
        for (const side of SIDES) {
          for (let j = 0; j < 4; j++) {
            const ringY = DECK_Y + ((t * 0.5 + j / 4) % 1) * BUSHING_H;
            riseDummy.position.set(side * WIRE_X, ringY, 0);
            riseDummy.rotation.set(0, 0, 0);
            riseDummy.scale.setScalar(scale);
            riseDummy.updateMatrix();
            rise.setMatrixAt(idx++, riseDummy.matrix);
          }
        }
        rise.instanceMatrix.needsUpdate = true;
      }
    }
  });

  return (
    <group>
      <mesh geometry={TANK_GEO} material={cabinetMat} castShadow receiveShadow />
      <mesh geometry={FIN_GEO} material={finMat} receiveShadow />
      <mesh geometry={LEG_GEO} material={cabinetMat} castShadow receiveShadow />
      <mesh geometry={DECK_GEO} material={deckMat} receiveShadow />
      <mesh geometry={EDGE_FRAME_GEO} material={frameMat} receiveShadow />
      <mesh geometry={BUSHING_GEO} material={bushingMat} castShadow />
      <mesh geometry={CAP_GEO} material={capMat} castShadow />
      <mesh geometry={POLE_GEO} material={cabinetMat} castShadow />
      <mesh geometry={CONDUCTOR_GEO} material={capMat} />

      <group position={[BASE_W / 2 + 0.01, 0.55, BASE_D / 2 - 0.15]} rotation={[0.05, Math.PI / 2 + 0.12, 0.08]}>
        <mesh geometry={PLATE_GEO} material={cabinetMat} />
        <mesh geometry={TREFOIL_GEO} material={trefoilMat} position={[0, 0, 0.003]} />
      </group>

      {H_GHOST_GEOS.map((geo, gi) => (
        <mesh key={`hg${gi}`} ref={(el) => (hGhostRefs.current[gi] = el)} geometry={geo} material={hGhostMats[gi]} />
      ))}
      {E_GHOST_GEOS.map((geo, gi) => (
        <mesh key={`eg${gi}`} ref={(el) => (eGhostRefs.current[gi] = el)} geometry={geo} material={eGhostMats[gi]} />
      ))}
      <mesh geometry={H_GEO} material={hMat} />
      <mesh geometry={E_GEO} material={eMat} />

      <mesh geometry={SHEET_GLOW_GEO} material={sheetGlowMat} />
      <mesh geometry={SNOW_GLOW_GEO} material={snowGlowMat} />

      <mesh ref={coreRef} position={[0, DECK_Y + 0.05, 0]} material={coupleMat}>
        <icosahedronGeometry args={[0.3, 0]} />
      </mesh>
      <mesh ref={glowRef} position={[0, DECK_Y + 0.05, 0]} material={coupleGlowMat}>
        <icosahedronGeometry args={[0.42, 0]} />
      </mesh>
      <instancedMesh ref={riseRef} args={[RISE_RING_GEO, riseMat, 8]} frustumCulled={false} />
    </group>
  );
}
