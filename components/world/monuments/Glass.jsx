"use client";

// Building for the "glass" figure: faraday (place id p-faraday), one of the
// lab projects Teerth builds, standing straight on the snow. No plinth:
// local origin sits on the snow at the place centre, +z faces the camera
// and the dock.
//
// Building type: a small electrical substation, at 2x scale so it reads at
// game distance. A transformer's everyday job -- coupling two circuits
// through the field they share, not a wire between them -- is what this
// building does "cooler": a transformer tank stands on the snow (the
// recognisable, opaque mass), a clear glass deck is raised on four legs
// above it with snow visible all round and beneath, and two ceramic-white
// bushing insulators pierce straight up through the deck. Where a coupling
// forms, an amber core rises out of the glass and climbs both bushings --
// the substation's own glow, in the place's radiation colour, not a traced
// diagram of how the coupling is computed. A few sparks hang frozen in the
// air by the bushings, caught mid-crackle and never falling: this place's
// anomaly.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  CylinderGeometry,
  IcosahedronGeometry,
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
  BUSHING_H,
  CAP_Y,
  CONDUCTOR_R,
  DECK_D,
  DECK_T,
  DECK_W,
  DECK_Y,
  FIN_COUNT,
  FIN_H,
  FIN_T,
  FIN_W,
  GLASS_TINT,
  LEG_INSET,
  LEG_SIZE,
  LEG_Y,
  MINT,
  POLE_R,
  POLE_X,
  POLE_Y,
  TREFOIL_R,
  WIRE_X,
} from "./parts/glass-field";

const SIDES = [-1, 1];

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// --- the substation: transformer tank, radiator fins, an accent trim band
// on its front and back (the fins face sideways, away from the dock), the
// glass deck on its legs, mint edge frame, two bushings, the yard's sagging
// conductors -- baked once, since none of it needs to move. ---
const TANK_GEO = new BoxGeometry(BASE_W, BASE_H, BASE_D);
TANK_GEO.translate(0, BASE_H / 2, 0);

const TRIM_H = 0.22, TRIM_PROUD = 0.05, TRIM_Y = BASE_H * 0.55;
const TRIM_GEO = mergeGeometries(
  SIDES.map((s) => {
    const g = new BoxGeometry(BASE_W + TRIM_PROUD * 2, TRIM_H, TRIM_PROUD);
    g.translate(0, TRIM_Y, s * (BASE_D / 2 + TRIM_PROUD / 2));
    return g;
  }),
);

// Mounted on the tank's SIDE (x) faces, not front/back: the dock/camera
// faces +z, so the front and back stay clear for the trim band above.
const FIN_GEO = mergeGeometries(
  SIDES.flatMap((side) =>
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
  ...SIDES.map((s) => {
    const g = new BoxGeometry(DECK_W + FRAME_T, DECK_T + 0.02, FRAME_T);
    g.translate(0, DECK_Y - DECK_T / 2, s * (DECK_D / 2 + FRAME_T / 2));
    return g;
  }),
  ...SIDES.map((s) => {
    const g = new BoxGeometry(FRAME_T, DECK_T + 0.02, DECK_D + FRAME_T);
    g.translate(s * (DECK_W / 2 + FRAME_T / 2), DECK_Y - DECK_T / 2, 0);
    return g;
  }),
]);

const LEG_GEO = mergeGeometries(
  SIDES.flatMap((sx) =>
    SIDES.map((sz) => {
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
  SIDES.map((s) => new TubeGeometry(sagCurve(s * WIRE_X, CAP_Y, s * POLE_X, POLE_Y), 12, CONDUCTOR_R, 6, false)),
);

// A small hazard plate on the tank's corner, tilted for charm.
const PLATE_GEO = new CircleGeometry(TREFOIL_R, 20);
function trefoilBlade(startDeg) {
  return new RingGeometry(TREFOIL_R * 0.22, TREFOIL_R * 0.85, 12, 1, (startDeg * Math.PI) / 180, (70 * Math.PI) / 180);
}
const TREFOIL_GEO = mergeGeometries([0, 120, 240].map((d) => trefoilBlade(d)));

// The coupling's in-sheet glow: two discs over the wires, one at centre --
// rises and fades with the coupling core, not a static decal. Radius kept
// well under half the 1.1 m gap between centres so the three stay distinct
// pools instead of merging into one puddle (round-5 fix).
const SHEET_GLOW_GEO = mergeGeometries(
  [-WIRE_X, 0, WIRE_X].map((wx) => {
    const g = new CircleGeometry(0.45, 24);
    g.rotateX(-Math.PI / 2);
    g.translate(wx, DECK_Y + 0.03, 0);
    return g;
  }),
);

// The coupling climbing each bushing: 4 flat amber rings per side, an
// instancedMesh so all 8 cost one draw call; useFrame moves and hides them.
const RISE_RING_GEO = new RingGeometry(0.3, 0.6, 24);
RISE_RING_GEO.rotateX(-Math.PI / 2);

// The anomaly: a handful of sparks hanging frozen in the air by the
// bushings, caught mid-crackle and never falling -- static, written once.
const SPARK_GEO = new IcosahedronGeometry(0.18, 0);
const SPARK_OFFSETS = [
  [0.24, -0.1, 0.14],
  [-0.16, 0.28, -0.12],
  [0.08, 0.55, 0.18],
];
const SPARK_POS = [-WIRE_X, WIRE_X].flatMap((wx) =>
  SPARK_OFFSETS.map(([dx, dy, dz]) => [wx + dx, CAP_Y - 0.2 + dy, dz]),
);

const CYCLE_FAR = 6.5, CYCLE_NEAR = 3.6, EASE = 4; // seconds per coupling rise-and-fall
const COUPLE_BOB = 0.4; // metres the coupling core rises as coupleK climbs to 1

const dummy = new Object3D();

export default function Glass({ place }) {
  const near = useUi((s) => s.near === place.id);
  const nearRef = useRef(near);
  nearRef.current = near;
  const accent = place.radiation ?? place.color;

  const cabinetMat = useMemo(() => mat(C.charcoal), []);
  const trimMat = useMemo(() => mat(accent, { emissive: accent, emissiveIntensity: 0.75 }), [accent]);
  const finMat = useMemo(() => mat(accent, { emissive: accent, emissiveIntensity: 0.3 }), [accent]);
  const deckMat = useMemo(() => mat(GLASS_TINT, { opacity: 0.32, roughness: 0.05 }), []);
  const frameMat = useMemo(() => mat(MINT, { roughness: 0.35, emissive: MINT, emissiveIntensity: 0.25 }), []);
  const bushingMat = useMemo(() => mat(C.ice, { roughness: 0.2 }), []);
  // Accent-tinted metal, not neutral grey: the caps and conductors carry
  // the place's colour loudly, not a washed-out tan.
  const capMat = useMemo(() => {
    const tinted = new Color(C.metal).lerp(new Color(accent), 0.68).getStyle();
    return mat(tinted, { roughness: 0.3, metalness: 0.6, emissive: accent, emissiveIntensity: 0.35 });
  }, [accent]);
  const trefoilMat = useMemo(() => mat(accent, { emissive: accent, emissiveIntensity: 0.35 }), [accent]);
  const sparkMat = useMemo(() => glow(accent, 1.3), [accent]);

  const coupleMat = useMemo(() => mat(accent, { roughness: 0.25, emissive: accent, emissiveIntensity: 1 }).clone(), [accent]);
  const coupleGlowMat = useMemo(() => glow(accent, 0.4), [accent]);
  const riseMat = useMemo(() => glow(accent, 0.55), [accent]);
  // Own MeshBasicMaterial (not palette's cache), since it is mutated every
  // frame and normal blending -- not glow()'s additive -- is what still
  // reads against snow at about 235 luma.
  const sheetGlowMat = useMemo(
    () => new MeshBasicMaterial({ color: accent, transparent: true, opacity: 0, toneMapped: false, depthWrite: false }),
    [accent],
  );

  const coreRef = useRef(null);
  const glowRef = useRef(null);
  const riseRef = useRef(null);
  const sparkRef = useRef(null);
  const riseDummy = useMemo(() => new Object3D(), []);
  const nearK = useRef(0);
  const phase = useRef(0);

  // Sparks never move -- that stillness IS the anomaly -- so their matrices
  // are written once and never touched again.
  useEffect(() => {
    const mesh = sparkRef.current;
    if (!mesh) return;
    for (let i = 0; i < SPARK_POS.length; i++) {
      const [x, y, z] = SPARK_POS[i];
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame((state, dt) => {
    const k = 1 - Math.exp(-EASE * dt);
    nearK.current += ((nearRef.current ? 1 : 0) - nearK.current) * k;
    const cycle = CYCLE_FAR - (CYCLE_FAR - CYCLE_NEAR) * nearK.current;
    phase.current = (phase.current + dt / cycle) % 1;
    const p = phase.current;
    const boost = 0.5 * nearK.current;

    // the coupling breathes once a cycle -- the substation doing its job,
    // brighter and faster once the seal is close enough to be watching
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
    sheetGlowMat.opacity = 0.4 * coupleK;

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
      <mesh geometry={TRIM_GEO} material={trimMat} receiveShadow />
      <mesh geometry={FIN_GEO} material={finMat} receiveShadow />
      <mesh geometry={LEG_GEO} material={cabinetMat} castShadow receiveShadow />
      <mesh geometry={DECK_GEO} material={deckMat} receiveShadow />
      <mesh geometry={EDGE_FRAME_GEO} material={frameMat} receiveShadow />
      <mesh geometry={BUSHING_GEO} material={bushingMat} castShadow />
      <mesh geometry={CAP_GEO} material={capMat} castShadow />
      <mesh geometry={POLE_GEO} material={cabinetMat} castShadow />
      <mesh geometry={CONDUCTOR_GEO} material={capMat} />

      <group position={[BASE_W / 2 + 0.01, 0.55, BASE_D / 2 + 0.15]} rotation={[0.05, 0.15, 0.08]}>
        <mesh geometry={PLATE_GEO} material={cabinetMat} />
        <mesh geometry={TREFOIL_GEO} material={trefoilMat} position={[0, 0, 0.003]} />
      </group>

      <mesh geometry={SHEET_GLOW_GEO} material={sheetGlowMat} />

      <mesh ref={coreRef} position={[0, DECK_Y + 0.05, 0]} material={coupleMat}>
        <icosahedronGeometry args={[0.3, 0]} />
      </mesh>
      <mesh ref={glowRef} position={[0, DECK_Y + 0.05, 0]} material={coupleGlowMat}>
        <icosahedronGeometry args={[0.42, 0]} />
      </mesh>
      <instancedMesh ref={riseRef} args={[RISE_RING_GEO, riseMat, 8]} frustumCulled={false} />
      <instancedMesh ref={sparkRef} args={[SPARK_GEO, sparkMat, SPARK_POS.length]} frustumCulled={false} />
    </group>
  );
}
