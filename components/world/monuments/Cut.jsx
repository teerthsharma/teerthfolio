"use client";

// Building for topological-ml-toolkit (place id p-topological-ml-toolkit,
// figure name "cut"). One of the lab projects Teerth builds: stands straight
// on the snow, no plinth. Local origin: the footprint centre on the snow;
// +z faces the camera and the dock. Props: { place, near }.
//
// Sources: data/showcase.json's p-topological-ml-toolkit entry (claim,
// specs, figure) and teerthsharma.github.io/fig.js's cut() design comment.
// The project turns a noisy point cloud's shape into a fixed-size feature as
// a scale grows: pieces and loops are born and die, and only the long-lived
// ones -- two loops, two pieces -- cross a cut and survive; the rest is
// noise (figure.labels: "grow the scale, and holes are born and die" / "long
// bars are structure, short bars are noise" / "what crosses the cut becomes
// a feature").
//
// Physically: a cold-store shed (Rust core, kept out of the weather) with a
// sample rack standing out front, facing the dock -- an ordinary archive's
// everyday job (catalogue what's on the shelf, tell signal from noise) done
// the way this project does it. A scan gauge sweeps the rack left to right,
// the same growing scale the figure sweeps through: pieces grow as rods
// from their birth point for exactly as long as they survive the sweep, the
// two long ones glowing radiation-colour, the four short ones staying dim
// ice, greyed noise. Above the rack, two portholes in the wall -- the two
// loops -- iris open on the same scale and shut when their bar ends: a hole
// opening, not a rod extending, the way the source figure's own holes glow
// and fill. The gauge then holds, the whole rack and both portholes shrink
// back to nothing, and it sweeps again. Faster and brighter near the seal.
//
// No words: every claim is a number or a name, not a shape a 3D letter
// could carry without inventing one, so the story is told in shapes only.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Shape, TorusGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useUi } from "../../../lib/world/store";
import { damp } from "../life/util";
import { C, glow, lamp, mat } from "../palette";
import {
  CORES,
  coreProgress,
  EASE_RATE,
  HOLD_DUR,
  LOOPS,
  PORTHOLE_RADIUS,
  PORTHOLE_TUBE,
  PORTHOLE_Y,
  PORTHOLE_Z,
  RACK_TOP_BEAM_Y,
  RACK_POST_H,
  RACK_Z,
  SHRINK_DUR,
  SWEEP_RANGE,
  SWEEP_X0,
  SWEEP_X1,
} from "./parts/cut-cores";

// The whole building is modelled at this scale, then shrunk to fit the lab
// footprint (place.radius 3 m): its widest corner (the roof eave) measures
// 3.42 m from the local origin unscaled, so 0.83 brings that under 3 m with
// a margin, while keeping every dimension below tuned proportionally.
const SCALE = 0.83;

const GABLE_X = 2.4;
const GABLE_DEPTH = 0.3;
const TRIM_W = 0.16;
const TRIM_X = GABLE_X + GABLE_DEPTH / 2 + TRIM_W / 2;
const RIDGE = [4.6, -0.7]; // [y, z], gable's own ridge (roof cap adds ~0.2 more)
const EAVE_BACK = [2.2, -1.8];
const EAVE_FRONT = [2.2, 0.4];

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

// The body: painted-plaster walls (palette.js: warmWhite is for "painted
// walls, plaster, ceramic"), near-neutral so the rack and the accent trim
// are what carry colour.
const WALL_GEO = mergeGeometries(
  [
    new BoxGeometry(5.0, 2.2, 0.25).translate(0, 1.1, -1.65), // back wall
    new BoxGeometry(5.0, 2.2, 0.25).translate(0, 1.1, 0.3), // front wall
  ],
  false,
);

// The frame: charcoal is palette.js's own "frames, roofs, rails, hatches" --
// skids, roof, door and the whole rack, kept shorter than the front eave so
// the two portholes have their own band of wall to sit in, not the rack's
// shadow.
const CHARCOAL_GEO = mergeGeometries(
  [
    new BoxGeometry(5.6, 0.22, 0.3).translate(0, 0.11, 1.3), // skid runner
    new BoxGeometry(5.6, 0.22, 0.3).translate(0, 0.11, -1.3), // skid runner
    new BoxGeometry(0.9, 1.7, 0.3).translate(0, 0.85, 0.44), // door
    tiltedSlab(5.4, 0.22, [4.8, -0.7], [2.2, -2.0]), // roof, back pitch
    tiltedSlab(5.4, 0.22, [4.8, -0.7], [2.2, 0.6]), // roof, front pitch
    new BoxGeometry(0.16, RACK_POST_H, 0.16).translate(2.25, RACK_POST_H / 2, RACK_Z), // rack post
    new BoxGeometry(0.16, RACK_POST_H, 0.16).translate(-2.25, RACK_POST_H / 2, RACK_Z), // rack post
    new BoxGeometry(4.66, 0.14, 0.16).translate(0, RACK_TOP_BEAM_Y, RACK_Z), // rack top beam
    ...CORES.map((c) => new BoxGeometry(4.4, 0.12, 0.14).translate(0, c.y, RACK_Z)), // rails
  ],
  false,
);

const gableEnd = buildGable();
const ICE_GEO = mergeGeometries(
  [gableEnd.clone().translate(GABLE_X, 0, 0), gableEnd.clone().translate(-GABLE_X, 0, 0)],
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
const GAUGE_GEO = new BoxGeometry(0.12, 2.0, 0.6);
const GAUGE_GLOW_GEO = new BoxGeometry(0.16, 2.3, 0.75);

// Unit-length cylinder, axis along local +X, running 0..1 -- so scale.x is
// directly a piece's current visible length in metres, and position.x is
// its fixed birth point: it grows away from its own start, never its
// centre.
const PIECE_GEO = new CylinderGeometry(0.13, 0.13, 1, 8).rotateZ(Math.PI / 2).translate(0.5, 0, 0);
// A fixed-size ring, lying in the local X-Y plane so it faces +z, the dock.
// Its size never animates (a ring that shrinks toward a point would thin
// out below the island's chunky minimum); it lights up and dims instead,
// the way a loop in the source figure glows from the moment it is born.
const PORTHOLE_GEO = new TorusGeometry(PORTHOLE_RADIUS, PORTHOLE_TUBE, 6, 14);

export default function Cut({ place }) {
  const A = place.radiation ?? place.color;
  const near = useUi((s) => s.near === place.id);

  const warmMat = useMemo(() => mat(C.warmWhite), []);
  const charcoalMat = useMemo(() => mat(C.charcoal), []);
  const iceMat = useMemo(() => mat(C.ice), []);
  const trimMat = useMemo(() => mat(A, { roughness: 0.55 }), [A]);
  const gaugeMat = useMemo(() => lamp(A, 1.5), [A]);
  const gaugeGlowMat = useMemo(() => glow(A), [A]);
  // The lantern brightens near the seal, so it needs its own clone to mutate.
  const lanternMat = useMemo(() => lamp(A, 0.9).clone(), [A]);
  // Pieces that cross the cut glow and need their own material to brighten
  // as they grow; noise never changes and shares one cached, unlit material.
  const coreMats = useMemo(
    () => CORES.map((c) => (c.kind === "noise" ? mat(C.ice, { roughness: 0.3 }) : lamp(A, 0.4).clone())),
    [A],
  );
  const loopMats = useMemo(() => LOOPS.map(() => lamp(A, 0.8).clone()), [A]);

  const gaugeRef = useRef(null);
  const coreRefs = useRef([]);
  const loopRefs = useRef([]);
  const kRef = useRef(0); // eased 0..1 toward `near`
  const phase = useRef({ mode: "sweep", t: 0 });

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    kRef.current += ((near ? 1 : 0) - kRef.current) * damp(EASE_RATE, dt);
    const k = kRef.current;

    const p = phase.current;
    p.t += dt;
    const sweepDur = 7 + 3 * k; // 7 s normal, 10 s near

    let gaugeX;
    let shrinkMul = 1;
    if (p.mode === "sweep") {
      gaugeX = SWEEP_X0 + SWEEP_RANGE * Math.min(1, p.t / sweepDur);
      if (p.t >= sweepDur) {
        p.mode = "hold";
        p.t = 0;
      }
    } else if (p.mode === "hold") {
      gaugeX = SWEEP_X1;
      if (p.t >= HOLD_DUR) {
        p.mode = "shrink";
        p.t = 0;
      }
    } else {
      gaugeX = SWEEP_X1;
      shrinkMul = 1 - Math.min(1, p.t / SHRINK_DUR);
      if (p.t >= SHRINK_DUR) {
        p.mode = "sweep";
        p.t = 0;
      }
    }

    if (gaugeRef.current) gaugeRef.current.position.x = gaugeX;

    const peakGlow = 1.4 + 0.6 * k; // 1.4 normal, 2.0 near
    lanternMat.emissiveIntensity = 0.9 + 1.3 * k; // 0.9 normal, 2.2 near

    for (let i = 0; i < CORES.length; i++) {
      const c = CORES[i];
      const meshEl = coreRefs.current[i];
      if (!meshEl) continue;
      const progress = coreProgress(c, gaugeX);
      const visible = progress > 0.001 && shrinkMul > 0.001;
      meshEl.visible = visible;
      if (visible) meshEl.scale.x = c.span * progress * shrinkMul;
      if (c.kind !== "noise") coreMats[i].emissiveIntensity = 0.4 + progress * (peakGlow - 0.4);
    }

    for (let i = 0; i < LOOPS.length; i++) {
      const l = LOOPS[i];
      const meshEl = loopRefs.current[i];
      if (!meshEl) continue;
      const progress = coreProgress(l, gaugeX);
      const visible = progress > 0.001 && shrinkMul > 0.001;
      meshEl.visible = visible;
      // fixed size (see PORTHOLE_GEO); a small pop-in scale on birth only,
      // then it just lights up -- never thins toward a point.
      if (visible) meshEl.scale.setScalar(Math.min(1, 0.6 + 0.4 * shrinkMul) * Math.min(1, progress * 6));
      loopMats[i].emissiveIntensity = (0.8 + progress * (peakGlow - 0.4)) * (visible ? 1 : 0);
    }
  });

  return (
    <group scale={SCALE}>
      <mesh castShadow receiveShadow geometry={SLAB_GEO} material={warmMat} />
      <mesh castShadow receiveShadow geometry={WALL_GEO} material={warmMat} />
      <mesh castShadow receiveShadow geometry={CHARCOAL_GEO} material={charcoalMat} />
      <mesh castShadow receiveShadow geometry={ICE_GEO} material={iceMat} />
      <mesh castShadow receiveShadow geometry={TRIM_GEO} material={trimMat} />

      <mesh castShadow position={[0, 5.0, -0.7]} material={lanternMat}>
        <boxGeometry args={[1.4, 0.4, 0.5]} />
      </mesh>

      <group ref={gaugeRef} position={[SWEEP_X0, 1.15, 1.45]}>
        <mesh castShadow geometry={GAUGE_GEO} material={gaugeMat} />
        <mesh geometry={GAUGE_GLOW_GEO} material={gaugeGlowMat} />
      </group>

      {CORES.map((c, i) => (
        <mesh
          key={i}
          ref={(el) => (coreRefs.current[i] = el)}
          castShadow
          receiveShadow
          position={[c.x0, c.y, RACK_Z]}
          geometry={PIECE_GEO}
          material={coreMats[i]}
        />
      ))}

      {LOOPS.map((l, i) => (
        <mesh
          key={i}
          ref={(el) => (loopRefs.current[i] = el)}
          castShadow
          position={[l.x, PORTHOLE_Y, PORTHOLE_Z]}
          geometry={PORTHOLE_GEO}
          material={loopMats[i]}
        />
      ))}
    </group>
  );
}
