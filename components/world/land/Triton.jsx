"use client";

// TRITON (triton-lang/kernels #22): the ice mountain on the north coast
// (lib/world/terrain.js shapes its foot and its two glaciers; the peak
// itself never enters the frame — seals do not climb mountains). This file
// is everything that stands ON that ice:
//
//   - THE ICE CAVE the central glacier's snout leaves the river by (the
//     river's own source, RIVER.points[0] in lib/world/river.js): two
//     pillars and a lintel bridging them, a shadowed throat recessed behind,
//     and a faint ring of its own Cherenkov-blue light round the opening.
//   - THE SCHEDULE SHELF, at the icefall above the reading point: a low ice
//     dais and a short ridge climbing toward the real cliff a couple of
//     metres north, so triton-lang/kernels #22's story (the draft
//     monuments/Schedule.jsx) reads as grown out of the ice, not parked on
//     snow in front of it.
//   - A few crevasse cracks on the glacier's face.
//   - THE ANOMALY: snow lifts off the glacier at both hot spots and falls
//     upward, Cherenkov blue, fading out a few metres up and starting again.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { IcosahedronGeometry, Object3D } from "three";
import { PLACE_BY_ID } from "../../../lib/world/places";
import { useUi } from "../../../lib/world/store";
import Schedule from "../monuments/Schedule";
import { C, glow, mat } from "../palette";
import {
  buildCaveArch,
  buildCaveThroat,
  buildCrevasses,
  buildScheduleShelf,
  CAVE,
  FLAKES_PER_VENT,
  SHELF,
  SHELF_TOP,
  SNOW_VENTS,
} from "./parts/triton-glacier";

const TRITON = PLACE_BY_ID["pr-triton-kernels-22"];
const RADIATION = TRITON.radiation; // Cherenkov blue, the ice cave's own light

const RISE_T = 4.5; // s for one flake's climb
const RISE_H = 4.5; // m it climbs before it fades and resets
const FLAKE_GEO = new IcosahedronGeometry(0.15, 0);
const dummy = new Object3D();
const frac = (x) => x - Math.floor(x);

// Every flake's own seed: which vent it lifts off from, its phase in the
// loop, and a little sideways drift so a vent reads as a wisp, not a
// straight pillar.
const FLAKES = SNOW_VENTS.flatMap((vent, vi) =>
  Array.from({ length: FLAKES_PER_VENT }, (_, i) => ({
    vent,
    phase: (i + vi * 0.37) / FLAKES_PER_VENT,
    swayAmt: 0.3 + ((i * 0.61) % 1) * 0.5,
    swayFreq: 1.4 + (i % 3) * 0.5,
    driftAngle: (i * 2.4 + vi * 1.7) % (Math.PI * 2),
  })),
);
const FLAKE_COUNT = FLAKES.length;

function SnowUp({ lively }) {
  const ref = useRef();
  const flakeMat = useMemo(() => mat("#eafcff", { flat: false, roughness: 0.15, emissive: RADIATION, emissiveIntensity: 0.7 }), []);
  const clock = useRef(0);

  useFrame((state, dt) => {
    clock.current += Math.min(dt, 0.1) * (lively ? 1.6 : 1);
    const t = clock.current;
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < FLAKE_COUNT; i++) {
      const f = FLAKES[i];
      const p = frac(t / RISE_T + f.phase);
      const spread = (Math.sin(p * Math.PI * 2 * f.swayFreq) * f.swayAmt + p * 0.6) * (0.4 + p);
      const fadeIn = Math.sin(Math.min(1, p / 0.08) * Math.PI * 0.5);
      const fadeOut = p > 0.75 ? Math.sin(((1 - p) / 0.25) * Math.PI * 0.5) : 1;
      dummy.position.set(
        f.vent.x + Math.cos(f.driftAngle) * spread,
        f.vent.y + 0.25 + RISE_H * p * p,
        f.vent.z + Math.sin(f.driftAngle) * spread,
      );
      dummy.rotation.set(t * 0.8 + i, t * 1.1 + i * 0.7, 0);
      dummy.scale.setScalar(0.6 * fadeIn * fadeOut);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[FLAKE_GEO, flakeMat, FLAKE_COUNT]} frustumCulled={false} />;
}

export default function Triton() {
  const near = useUi((s) => s.near === TRITON.id);

  const caveGeo = useMemo(buildCaveArch, []);
  const throatGeo = useMemo(buildCaveThroat, []);
  const shelfGeo = useMemo(buildScheduleShelf, []);
  const crevasseGeo = useMemo(buildCrevasses, []);

  const iceMat = useMemo(() => mat(C.ice, { roughness: 0.3 }), []);
  const throatMat = useMemo(() => mat("#15323d", { roughness: 0.65 }), []);
  const rimMat = useMemo(() => glow(RADIATION, 0.45), []);
  const crevasseMat = useMemo(() => mat("#1f4a5c", { roughness: 0.55 }), []);

  return (
    <group>
      <group position={[CAVE.x, 0, CAVE.z]}>
        <mesh geometry={caveGeo} material={iceMat} castShadow receiveShadow />
        <mesh geometry={throatGeo} material={throatMat} />
        <mesh position={[0, 2.5, 0.1]} material={rimMat}>
          <ringGeometry args={[2.4, 3, 28]} />
        </mesh>
      </group>

      <mesh position={[SHELF.x, 0, SHELF.z]} geometry={shelfGeo} material={iceMat} castShadow receiveShadow />
      <group position={[SHELF.x, SHELF_TOP, SHELF.z]}>
        <Schedule near={near} />
      </group>

      <mesh geometry={crevasseGeo} material={crevasseMat} receiveShadow />

      <SnowUp lively={near} />
    </group>
  );
}
