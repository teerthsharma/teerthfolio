"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Shape } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useUi } from "../../../lib/world/store";
import { damp } from "../life/util";
import { C, glow, lamp, mat } from "../palette";

// Building for PLACE_BY_ID["archive"] in lib/world/places.js.
// Local space: origin at the footprint centre on the snow, +z faces the
// camera and the dock, footprint stays inside place.radius (3.4 m).
//
// topological-ml-toolkit turns a point cloud's shape -- clusters, loops,
// merges -- into fixed-size features as it zooms out over scale. The rack
// standing in front of the cold store is that filtration made physical: a
// scan blade sweeps left to right and each ice core grows for exactly as
// long as its feature survives the sweep. Long bars are real structure;
// short ones are noise that is born and dies within a step.

const GABLE_X = 2.4;
const GABLE_DEPTH = 0.3;
const TRIM_W = 0.16;
const TRIM_X = GABLE_X + GABLE_DEPTH / 2 + TRIM_W / 2;
const RIDGE = [4.6, -0.7]; // [y, z], gable's own ridge (roof cap adds ~0.2 more)
const EAVE_BACK = [2.2, -1.8];
const EAVE_FRONT = [2.2, 0.4];

const RACK_Z = 1.1; // centreline of posts, top beam, rails and cores
const RACK_Y_BASE = 0.55;
const RACK_Y_STEP = 0.24;
const SWEEP_X0 = -2.1;
const SWEEP_X1 = 2.1;
const SWEEP_RANGE = SWEEP_X1 - SWEEP_X0;
const HOLD_DUR = 3; // seconds the full barcode holds before it shrinks back
const SHRINK_DUR = 0.6;
const EASE_RATE = 4; // ease k = 1 - exp(-EASE_RATE * dt)

// Birth/death in metres measured from x = -2 (the rack's own frame); world
// x = -2 + value. Long bars (span > 1.5 m) are structure, short ones noise.
const CORES = [
  { birth: 0, death: 3.9 },
  { birth: 0.2, death: 3.4 },
  { birth: 0.5, death: 1.0 },
  { birth: 0.9, death: 1.3 },
  { birth: 1.2, death: 3.0 },
  { birth: 1.8, death: 2.2 },
  { birth: 2.4, death: 2.7 },
  { birth: 3.0, death: 3.3 },
].map((c, row) => ({
  x0: -2 + c.birth,
  x1: -2 + c.death,
  span: c.death - c.birth,
  y: RACK_Y_BASE + row * RACK_Y_STEP,
  long: c.death - c.birth > 1.5,
}));

// A box tilted in the Y-Z plane so its local +Z (length) axis runs from
// `from` to `to` ([y, z] pairs); used for the two roof pitches and the four
// gable-edge trims. x stays centred at `xOffset`.
function tiltedSlab(width, thickness, from, to, xOffset = 0) {
  const dy = to[0] - from[0];
  const dz = to[1] - from[1];
  const length = Math.hypot(dy, dz);
  const g = new BoxGeometry(width, thickness, length);
  g.rotateX(Math.atan2(-dy, dz));
  g.translate(xOffset, (from[0] + to[0]) / 2, (from[1] + to[1]) / 2);
  return g;
}

// The gable-end silhouette: a rectangle (walls, up to the eave) capped by a
// triangle (roof, up to the ridge) -- five vertices, drawn in its own (z, y)
// plane and depth-extruded, then turned to stand facing +/-x.
function buildGable() {
  const shape = new Shape();
  shape.moveTo(-1.1, 0);
  shape.lineTo(1.1, 0);
  shape.lineTo(1.1, 2.2);
  shape.lineTo(0, 4.6);
  shape.lineTo(-1.1, 2.2);
  shape.closePath();
  const g = new ExtrudeGeometry(shape, { depth: GABLE_DEPTH, bevelEnabled: false, curveSegments: 1 });
  g.rotateY(Math.PI / 2);
  g.translate(-GABLE_DEPTH / 2, 0, -0.7);
  return g;
}

// ---- static geometry, built once ------------------------------------------

const CHARCOAL_GEO = mergeGeometries(
  [
    new BoxGeometry(5.6, 0.22, 0.3).translate(0, 0.11, 1.3), // skid runner
    new BoxGeometry(5.6, 0.22, 0.3).translate(0, 0.11, -1.3), // skid runner
    new BoxGeometry(5.0, 2.2, 0.25).translate(0, 1.1, -1.65), // back wall
    new BoxGeometry(5.0, 2.2, 0.25).translate(0, 1.1, 0.3), // front wall
    new BoxGeometry(0.9, 1.7, 0.3).translate(0, 0.85, 0.44), // door
    tiltedSlab(5.4, 0.22, [4.8, -0.7], [2.2, -2.0]), // roof, back pitch
    tiltedSlab(5.4, 0.22, [4.8, -0.7], [2.2, 0.6]), // roof, front pitch
    new BoxGeometry(0.16, 2.3, 0.16).translate(2.25, 1.15, RACK_Z), // rack post
    new BoxGeometry(0.16, 2.3, 0.16).translate(-2.25, 1.15, RACK_Z), // rack post
    new BoxGeometry(4.66, 0.14, 0.16).translate(0, 2.35, RACK_Z), // rack top beam
    ...CORES.map((c) => new BoxGeometry(4.4, 0.12, 0.14).translate(0, c.y, RACK_Z)), // rails
  ],
  false,
);

const gableEnd = buildGable();
const ICE_GEO = mergeGeometries(
  [gableEnd.clone().translate(GABLE_X, 0, 0), gableEnd.clone().translate(-GABLE_X, 0, 0)],
  false,
);

const WINDOW_GEO = mergeGeometries(
  [
    new BoxGeometry(0.4, 0.45, 0.08).translate(-1.4, 1.3, 0.46),
    new BoxGeometry(0.4, 0.45, 0.08).translate(1.4, 1.3, 0.46),
  ],
  false,
);

const trimBack = tiltedSlab(TRIM_W, TRIM_W, EAVE_BACK, RIDGE);
const trimFront = tiltedSlab(TRIM_W, TRIM_W, RIDGE, EAVE_FRONT);
const TRIM_GEO = mergeGeometries(
  [
    trimBack.clone().translate(TRIM_X, 0, 0),
    trimFront.clone().translate(TRIM_X, 0, 0),
    trimBack.clone().translate(-TRIM_X, 0, 0),
    trimFront.clone().translate(-TRIM_X, 0, 0),
  ],
  false,
);

const SLAB_GEO = new BoxGeometry(5.4, 0.3, 3.6).translate(0, 0.15, 0);
const BLADE_GEO = new BoxGeometry(0.12, 2.0, 0.6);
const BLADE_GLOW_GEO = new BoxGeometry(0.16, 2.3, 0.75);

// Unit unit-length cylinder, axis along local +X, running 0..1 -- so scale.x
// is directly the core's current visible length in metres, and position.x is
// its fixed birth point: it grows away from the seal's dock, never from its
// own centre.
const CORE_GEO = new CylinderGeometry(0.13, 0.13, 1, 8).rotateZ(Math.PI / 2).translate(0.5, 0, 0);

export default function TopologyArchive({ place }) {
  const A = place.color;
  const near = useUi((s) => s.near === place.id);

  const warmMat = useMemo(() => mat(C.warmWhite), []);
  const charcoalMat = useMemo(() => mat(C.charcoal), []);
  const iceMat = useMemo(() => mat(C.ice), []);
  const windowMat = useMemo(() => lamp(C.lamp), []);
  const trimMat = useMemo(() => mat(A, { roughness: 0.55 }), [A]);
  const bladeMat = useMemo(() => lamp(A, 1.5), [A]);
  const bladeGlowMat = useMemo(() => glow(A), [A]);
  // The lantern brightens near the seal, so it needs its own clone to mutate.
  const lanternMat = useMemo(() => lamp(A, 0.9).clone(), [A]);
  // Long cores' glow rises as they grow, so each gets its own clone; short
  // cores never change and can share the one cached, unlit-noise material.
  const coreMats = useMemo(
    () => CORES.map((c) => (c.long ? lamp(A, 0.4).clone() : mat(C.ice, { roughness: 0.3 }))),
    [A],
  );

  const bladeRef = useRef(null);
  const coreRefs = useRef([]);
  const kRef = useRef(0); // eased 0..1 toward `near`
  const phase = useRef({ mode: "sweep", t: 0 });

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    kRef.current += ((near ? 1 : 0) - kRef.current) * damp(EASE_RATE, dt);
    const k = kRef.current;

    const p = phase.current;
    p.t += dt;
    const sweepDur = 7 + 3 * k; // 7 s normal, 10 s near

    let bladeX;
    let shrinkMul = 1;
    if (p.mode === "sweep") {
      bladeX = SWEEP_X0 + SWEEP_RANGE * Math.min(1, p.t / sweepDur);
      if (p.t >= sweepDur) {
        p.mode = "hold";
        p.t = 0;
      }
    } else if (p.mode === "hold") {
      bladeX = SWEEP_X1;
      if (p.t >= HOLD_DUR) {
        p.mode = "shrink";
        p.t = 0;
      }
    } else {
      bladeX = SWEEP_X1;
      shrinkMul = 1 - Math.min(1, p.t / SHRINK_DUR);
      if (p.t >= SHRINK_DUR) {
        p.mode = "sweep";
        p.t = 0;
      }
    }

    if (bladeRef.current) bladeRef.current.position.x = bladeX;

    const peakGlow = 1.4 + 0.6 * k; // 1.4 normal, 2.0 near
    lanternMat.emissiveIntensity = 0.9 + 1.3 * k; // 0.9 normal, 2.2 near

    for (let i = 0; i < CORES.length; i++) {
      const c = CORES[i];
      const meshEl = coreRefs.current[i];
      if (!meshEl) continue;
      const progress = Math.min(1, Math.max(0, (bladeX - c.x0) / c.span));
      const visible = progress > 0.001 && shrinkMul > 0.001;
      meshEl.visible = visible;
      if (visible) meshEl.scale.x = c.span * progress * shrinkMul;
      if (c.long) coreMats[i].emissiveIntensity = 0.4 + progress * (peakGlow - 0.4);
    }
  });

  return (
    <group>
      <mesh castShadow receiveShadow geometry={SLAB_GEO} material={warmMat} />
      <mesh castShadow receiveShadow geometry={CHARCOAL_GEO} material={charcoalMat} />
      <mesh castShadow receiveShadow geometry={ICE_GEO} material={iceMat} />
      <mesh geometry={WINDOW_GEO} material={windowMat} />
      <mesh castShadow receiveShadow geometry={TRIM_GEO} material={trimMat} />

      <mesh castShadow position={[0, 5.0, -0.7]} material={lanternMat}>
        <boxGeometry args={[1.4, 0.4, 0.5]} />
      </mesh>

      <group ref={bladeRef} position={[SWEEP_X0, 1.15, 1.45]}>
        <mesh castShadow geometry={BLADE_GEO} material={bladeMat} />
        <mesh geometry={BLADE_GLOW_GEO} material={bladeGlowMat} />
      </group>

      {CORES.map((c, i) => (
        <mesh
          key={i}
          ref={(el) => (coreRefs.current[i] = el)}
          castShadow
          receiveShadow
          position={[c.x0, c.y, RACK_Z]}
          geometry={CORE_GEO}
          material={coreMats[i]}
        />
      ))}
    </group>
  );
}
