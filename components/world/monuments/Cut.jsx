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
// Physically: a SAWMILL -- an ordinary mill's everyday job (cut logs to
// length, keep what's long enough) done the way this project does it. Eight
// logs lie in a deck in the open yard in front of a small back shed: two
// mint logs (the long-lived pieces), two violet logs (the long-lived loops
// -- fig.js's own barcode draws loops as violet bars too), four dim ice logs
// (noise). Act one: a small neutral scan gauge sweeps the yard, and every
// log grows from its own birth point for exactly as long as its piece or
// loop survived -- the SAME growing scale the figure sweeps through. Act
// two, the figure's own payoff: every log slides to start at zero (fig.js:
// "then every bar slides to start at zero, so its length is how long it
// lived"), then one big spinning saw blade -- the radiation-coloured cut --
// sweeps in from the right and stops at the exact span where the two mint
// and two violet logs, and only those four, still reach past it: a bead
// lights on the blade line for each ("what crosses the cut becomes a
// feature"). It holds, then the whole deck shrinks back to nothing and
// sweeps again. Faster and brighter near the seal. The mill's open intake
// faces the deck, logs visibly feeding out of it; a smokestack -- the area's
// radiation hot spot -- is the tallest point.
//
// Colours are the figure's own (site.css --mint-500 / --violet-500) for the
// logs, not the radiation accent, which marks the building itself instead
// (roof, trim, windows, the blade, the smokestack cap) -- same split
// Grant.jsx and Refuse.jsx use.
//
// No words: every claim is a number or a name, not a shape a 3D letter
// could carry without inventing one, so the story is told in shapes only.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { BoxGeometry, Color, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, Object3D, Shape, SphereGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useUi } from "../../../lib/world/store";
import { damp, smoothstep } from "../life/util";
import { C, glow, lamp, mat } from "../palette";
import {
  BEAD_DIAMETER,
  BLADE_RADIUS,
  BLADE_THICK,
  BLADE_X_START,
  BLADE_X_STOP,
  BLADE_Y,
  BLADE_Z,
  coreProgress,
  CUT_DUR,
  EASE_RATE,
  HOLD_DUR,
  LANE_Z0,
  LANE_Z1,
  LOG_Y,
  LOGS,
  SHRINK_DUR,
  SLIDE_DUR,
  SURVIVORS,
  SWEEP_RANGE,
  SWEEP_X0,
  SWEEP_X1,
} from "./parts/cut-cores";

// The whole building is modelled at this scale, then shrunk to fit the lab
// footprint (place.radius 3 m): its widest corner (the roof eave) measures
// well under 3.6 m from the local origin unscaled, so 0.83 keeps every
// dimension inside place.radius with a margin.
const SCALE = 0.83;

// fig.js's own tokens for this figure (site.css --mint-500 / --violet-500):
// the figure's semantic colours, kept exact.
const MINT = "#0b93ab"; // a surviving piece (H0)
const VIOLET = "#a66cf0"; // a surviving loop (H1)
const MINT_C = new Color(MINT);
const VIOLET_C = new Color(VIOLET);
const ICE_C = new Color(C.ice);

// ---- the shed: a small back shed, roofed, and an open yard in front ------
const GABLE_X = 2.4; // the shed's side walls (its own east/west gable ends)
const GABLE_DEPTH = 0.3;
const TRIM_W = 0.16;
const TRIM_X = GABLE_X + GABLE_DEPTH / 2 + TRIM_W / 2;
const WALL_T = 0.25;
const SHED_Z0 = -1.8; // shed back
const SHED_Z1 = 0.2; // shed front (the intake wall) -- the open yard runs on from here
const SHED_ZC = (SHED_Z0 + SHED_Z1) / 2;
const SHED_HALF_DEPTH = (SHED_Z1 - SHED_Z0) / 2;
const EAVE_Y = 2.2;
const RIDGE_Y = 3.6; // round 1 lowered this from 4.6 (the roof only shades the shed, not the story); round 2 review: 3.0 put the whole building at the low end of the 3-8m budget with X/Z unconstrained by height, so raised partway back for more presence -- still well under the old 4.6 and under STACK_H, so the stack stays the tallest point
const RIDGE = [RIDGE_Y, SHED_ZC];
const EAVE_BACK = [EAVE_Y, SHED_Z0];
const EAVE_FRONT = [EAVE_Y, SHED_Z1];

const DOOR_W = 1.4; // the mill's open intake
const DOOR_H = 1.9;
const FRAME_T = 0.18;

const STACK_X = 1.8;
const STACK_Z = -1.3;
const STACK_R = 0.25;
const STACK_H = 5.2; // 4.32 m after SCALE: the building's tallest point, its radiation hot spot -- raised from 4.0 (round 2 review: more world-expo-pavilion presence) while RIDGE_Y still clears the roof-ridge silhouette below it at game zoom, so the cap reads as a hot spot above the roof, not a frame-poking spike
const CAP_Y = STACK_H + 0.22;

const RAIL_X = -0.15;
const RAIL_LEN = 4.6;
const RAIL_Z0 = LANE_Z0 - 0.2;
const RAIL_Z1 = LANE_Z1 + 0.2;

const WINDOW_X = GABLE_X + GABLE_DEPTH / 2 + 0.04;
const WINDOW_Y = 1.1;
const WINDOW_ZS = [-1.3, -0.3]; // two per gable end

const GAUGE_Y = 0.5;

// mergeGeometries needs every input to carry the same attribute set and the
// same indexed/non-indexed state. ExtrudeGeometry (the gable ends) comes out
// differently shaped than BoxGeometry/CylinderGeometry, so every piece that
// will be merged with another kind is normalised to the same (position,
// normal, color) shape first -- island/build.js's own bare() does the uv
// half of this for the same reason.
function prep(geometry) {
  geometry.deleteAttribute("uv");
  return geometry.index ? geometry.toNonIndexed() : geometry;
}

// A box tilted in the Y-Z plane so its local +Z (length) axis runs from
// `from` to `to` ([y, z] pairs); used for the roof pitches and the four
// gable-edge trims. x stays centred at `xOffset`.
function tiltedSlab(width, thickness, from, to, xOffset = 0) {
  const dy = to[0] - from[0];
  const dz = to[1] - from[1];
  const length = Math.hypot(dy, dz);
  const g = new BoxGeometry(width, thickness, length);
  g.rotateX(Math.atan2(-dy, dz));
  g.translate(xOffset, (from[0] + to[0]) / 2, (from[1] + to[1]) / 2);
  return prep(g);
}

// The gable-end silhouette: a rectangle (walls, up to the eave) capped by a
// triangle (roof, up to the ridge) -- five vertices, drawn in its own (z, y)
// plane and depth-extruded, then turned to stand facing +/-x.
function buildGable() {
  const shape = new Shape();
  shape.moveTo(-SHED_HALF_DEPTH, 0);
  shape.lineTo(SHED_HALF_DEPTH, 0);
  shape.lineTo(SHED_HALF_DEPTH, EAVE_Y);
  shape.lineTo(0, RIDGE_Y);
  shape.lineTo(-SHED_HALF_DEPTH, EAVE_Y);
  shape.closePath();
  const g = new ExtrudeGeometry(shape, { depth: GABLE_DEPTH, bevelEnabled: false, curveSegments: 1 });
  g.rotateY(Math.PI / 2);
  g.translate(-GABLE_DEPTH / 2, 0, SHED_ZC);
  return prep(g);
}

// Paints every vertex of `geometry` one flat colour (island/build.js's own
// helper, copied: mergeGeometries needs a matching attribute set on every
// input, and this is how the island paints its own merged rock and trim).
function paint(geometry, hex) {
  const c = hex instanceof Color ? hex : new Color(hex);
  const n = geometry.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geometry.setAttribute("color", new Float32BufferAttribute(arr, 3));
  return geometry;
}

// ---- static geometry, built once (module level: none of this depends on
// the place's radiation colour) ---------------------------------------------

const gableEnd = buildGable();
// The back roof pitch: structural coverage only, painted neutral (ice, like
// the gables) instead of the radiation accent -- round 1 review found the
// accent roof read as "one giant plank" dominating every capture, so only
// the front pitch (buildAccentChunk, below) carries A now.
const ROOF_BACK_GEO = tiltedSlab(5.4, 0.22, RIDGE, EAVE_BACK);
const ICE_CHUNK = paint(
  mergeGeometries([gableEnd.clone().translate(GABLE_X, 0, 0), gableEnd.clone().translate(-GABLE_X, 0, 0), ROOF_BACK_GEO], false),
  C.ice,
);

const WALL_CHUNK = paint(
  mergeGeometries(
    [
      prep(new BoxGeometry(5.0, EAVE_Y, WALL_T).translate(0, EAVE_Y / 2, SHED_Z0 + WALL_T / 2)), // back wall
      prep(new BoxGeometry(1.8, EAVE_Y, WALL_T).translate(-(DOOR_W / 2 + 0.9), EAVE_Y / 2, SHED_Z1 - WALL_T / 2)), // front wall, left of the intake
      prep(new BoxGeometry(1.8, EAVE_Y, WALL_T).translate(DOOR_W / 2 + 0.9, EAVE_Y / 2, SHED_Z1 - WALL_T / 2)), // front wall, right of the intake
    ],
    false,
  ),
  C.warmWhite,
);

const SKID_LEN = GABLE_X * 2 + 0.4;
const CHARCOAL_CHUNK = paint(
  mergeGeometries(
    [
      prep(new BoxGeometry(SKID_LEN, 0.22, 0.3).translate(0, 0.11, SHED_Z0 + 0.15)), // skid runner, back
      prep(new BoxGeometry(SKID_LEN, 0.22, 0.3).translate(0, 0.11, SHED_Z1 - 0.15)), // skid runner, front
      // the intake frame: an open doorway, logs visibly feed out of it onto the deck
      prep(new BoxGeometry(DOOR_W + FRAME_T * 2, FRAME_T, WALL_T + 0.03).translate(0, DOOR_H + FRAME_T / 2, SHED_Z1 - WALL_T / 2)),
      prep(new BoxGeometry(FRAME_T, DOOR_H, WALL_T + 0.03).translate(DOOR_W / 2 + FRAME_T / 2, DOOR_H / 2, SHED_Z1 - WALL_T / 2)),
      prep(new BoxGeometry(FRAME_T, DOOR_H, WALL_T + 0.03).translate(-(DOOR_W / 2 + FRAME_T / 2), DOOR_H / 2, SHED_Z1 - WALL_T / 2)),
      prep(new CylinderGeometry(STACK_R, STACK_R, STACK_H, 10).translate(STACK_X, STACK_H / 2, STACK_Z)), // the mill smokestack
      prep(new BoxGeometry(RAIL_LEN, 0.18, 0.18).translate(RAIL_X, 0.09, RAIL_Z0)), // deck rail
      prep(new BoxGeometry(RAIL_LEN, 0.18, 0.18).translate(RAIL_X, 0.09, RAIL_Z1)), // deck rail
    ],
    false,
  ),
  C.charcoal,
);

// The radiation-coloured accent (front roof pitch, trim): built fresh per
// place since it depends on A, then merged with the three A-independent
// chunks above. Front pitch only, hugging the door bay (ROOF_W ~3.0, not
// the old 5.4 that spanned the whole building) -- round 1 review: the
// accent roof was "one giant plank", the single dominant shape in every
// capture; a narrower front-only plank plus the deck logs read first.
const ROOF_W = 2.3; // narrowed from 3.0 (round 2 review: still the single largest saturated shape, spanning ~full building width) to roughly the DOOR_W=1.4 intake bay plus margin, so the log deck and blade compete for first read instead of "pink-roofed shed"
function buildAccentChunk(A) {
  const trimBack = tiltedSlab(TRIM_W, TRIM_W, EAVE_BACK, RIDGE);
  const trimFront = tiltedSlab(TRIM_W, TRIM_W, RIDGE, EAVE_FRONT);
  return paint(
    mergeGeometries(
      [
        trimBack.clone().translate(TRIM_X, 0, 0),
        trimFront.clone().translate(TRIM_X, 0, 0),
        trimBack.clone().translate(-TRIM_X, 0, 0),
        trimFront.clone().translate(-TRIM_X, 0, 0),
        tiltedSlab(ROOF_W, 0.22, RIDGE, EAVE_FRONT), // roof, front pitch only
      ],
      false,
    ),
    A,
  );
}

const WINDOW_GEO = mergeGeometries(
  WINDOW_ZS.flatMap((z) => [
    new BoxGeometry(0.08, 0.5, 0.6).translate(WINDOW_X, WINDOW_Y, z),
    new BoxGeometry(0.08, 0.5, 0.6).translate(-WINDOW_X, WINDOW_Y, z),
  ]),
  false,
);

const CAP_GEO = new CylinderGeometry(0.3, 0.34, 0.4, 10);
const CAP_GLOW_GEO = new SphereGeometry(0.5, 10, 8);

const GAUGE_GEO = new BoxGeometry(0.2, 1.0, 0.5);

// A disc standing in the Y-Z plane (its flat faces perpendicular to x, the
// axis it sweeps along): a cylinder's own axis runs along Y, so rotateZ
// turns that axis to X. Two near-black spokes (round 2 review) are painted
// on while the axis is still Y -- angle = atan2(z, x) over the caps and the
// rim alike -- so the spin (applied to this geometry's own local axis,
// below) has something asymmetric to carry: a rotationally-symmetric disc
// spinning about its own face normal is otherwise a no-op, nothing moves
// relative to the silhouette.
function angleDistance(a, b) {
  const d = Math.abs(a - b) % (Math.PI * 2);
  return d > Math.PI ? Math.PI * 2 - d : d;
}
function buildBladeGeo(radius, thick) {
  const g = new CylinderGeometry(radius, radius, thick, 24);
  const pos = g.attributes.position;
  const n = pos.count;
  const white = new Color("#ffffff");
  const dark = new Color("#171717"); // near-black, not C.charcoal: the blade's own emissive glow (bladeMat) washes out a mid-grey mark, so the spoke needs the darkest contrast available to still read as the disc spins
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const angle = Math.atan2(pos.getZ(i), pos.getX(i));
    const onSpoke = angleDistance(angle, 0) < 0.24 || angleDistance(angle, Math.PI) < 0.24; // two spokes, 180 deg apart
    const c = onSpoke ? dark : white;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new Float32BufferAttribute(colors, 3));
  return g.rotateZ(Math.PI / 2);
}
const BLADE_GEO = buildBladeGeo(BLADE_RADIUS, BLADE_THICK);
const BLADE_GLOW_GEO = new CylinderGeometry(BLADE_RADIUS + 0.12, BLADE_RADIUS + 0.12, BLADE_THICK + 0.18, 24).rotateZ(Math.PI / 2);

// Unit-length cylinder, axis along local +X, running 0..1 -- so scale.x is
// directly a log's current visible length in metres, and position.x is its
// current start point: it grows away from its own start, never its centre.
const PIECE_GEO = new CylinderGeometry(0.13, 0.13, 1, 8).rotateZ(Math.PI / 2).translate(0.5, 0, 0);
const BEAD_GEO = new SphereGeometry(BEAD_DIAMETER / 2, 10, 8);

// Scratch reused every frame: never allocate inside useFrame (Refuse.jsx's
// own pattern for an instanced mesh).
const dummy = new Object3D();

export default function Cut({ place }) {
  const A = place.radiation ?? place.color;
  const near = useUi((s) => s.near === place.id);

  const bodyGeo = useMemo(() => mergeGeometries([WALL_CHUNK, ICE_CHUNK, CHARCOAL_CHUNK, buildAccentChunk(A)], false), [A]);
  const bodyMat = useMemo(() => mat("#ffffff", { vertexColors: true, roughness: 0.65 }), []);

  // Plain instance-tinted material, no emissive: mint, violet and ice must
  // stay three distinct hues (the review's own complaint was fuchsia,
  // violet and coral blurring into one pink-purple), so the logs carry no
  // radiation glow of their own -- the blade, windows and smokestack cap
  // already put A on 20-35% of the building.
  const logMat = useMemo(() => mat("#ffffff", { roughness: 0.4 }), []);
  const beadMat = useMemo(() => lamp(A, 1.3), [A]);
  // The gauge is the old r-scale slider, kept but now neutral -- the cut is
  // the blade below, not this.
  const gaugeMat = useMemo(() => mat(C.charcoal, { roughness: 0.4 }), []);
  // vertexColors: BLADE_GEO carries the two charcoal spokes baked in
  // (buildBladeGeo, above), so the material multiplies its own A tint by
  // white (full A) or charcoal (the spoke, dented darker) per vertex.
  const bladeMat = useMemo(() => mat(A, { vertexColors: true, emissive: A, emissiveIntensity: 1.0, roughness: 0.5 }), [A]);
  const bladeGlowMat = useMemo(() => glow(A), [A]);
  const capMat = useMemo(() => lamp(A, 1.2), [A]);
  const capGlowMat = useMemo(() => glow(A, 0.3), [A]);
  // Windows brighten near the seal, so they need their own clone to mutate.
  const windowMat = useMemo(() => lamp(A, 1.0).clone(), [A]);

  const logMeshRef = useRef(null);
  const capMeshRef = useRef(null); // round end-cap at each log's growing tip -- a log unmistakably reads as a cut round, not a flat bar
  const beadMeshRef = useRef(null);
  const gaugeRef = useRef(null);
  const bladeRef = useRef(null); // position + the static camera-facing tilt only, never spun
  const bladeSpinRef = useRef(null); // nested inside bladeRef: spins about its OWN local axis (the disc's face normal, pre-tilt), so the spin can never rotate the face out of its tilt
  const kRef = useRef(0); // eased 0..1 toward `near`
  // sweep: the gauge grows every log from its birth point.
  // slide: every log's start slides to zero (fig.js: "bars slide to start at zero").
  // cut: the blade sweeps in from the right.
  // reveal: the blade holds at the threshold, a bead per survivor.
  // shrink: the whole deck shrinks back to nothing, then it sweeps again.
  const phase = useRef({ mode: "sweep", t: 0 });

  useLayoutEffect(() => {
    const logMesh = logMeshRef.current;
    if (logMesh) {
      LOGS.forEach((log, i) => {
        logMesh.setColorAt(i, log.kind === "piece" ? MINT_C : log.kind === "loop" ? VIOLET_C : ICE_C);
      });
      if (logMesh.instanceColor) logMesh.instanceColor.needsUpdate = true;
    }
    const capMesh = capMeshRef.current;
    if (capMesh) {
      LOGS.forEach((log, i) => {
        capMesh.setColorAt(i, log.kind === "piece" ? MINT_C : log.kind === "loop" ? VIOLET_C : ICE_C);
      });
      if (capMesh.instanceColor) capMesh.instanceColor.needsUpdate = true;
    }
    const beadMesh = beadMeshRef.current;
    if (beadMesh) {
      SURVIVORS.forEach((log, i) => beadMesh.setColorAt(i, log.kind === "piece" ? MINT_C : VIOLET_C));
      if (beadMesh.instanceColor) beadMesh.instanceColor.needsUpdate = true;
    }
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    kRef.current += ((near ? 1 : 0) - kRef.current) * damp(EASE_RATE, dt);
    const k = kRef.current;

    const p = phase.current;
    p.t += dt;
    const sweepDur = 7 - 2.5 * k; // 7 s far, 4.5 s near

    let gaugeX = SWEEP_X1;
    let shrinkMul = 1;
    let slideAmt = 1; // 0: logs sit at their own birth points; 1: slid to start at zero
    let bladeVisible = false;
    let bladeX = BLADE_X_START;
    let beadsVisible = false;

    if (p.mode === "sweep") {
      gaugeX = SWEEP_X0 + SWEEP_RANGE * Math.min(1, p.t / sweepDur);
      slideAmt = 0;
      if (p.t >= sweepDur) {
        p.mode = "slide";
        p.t = 0;
      }
    } else if (p.mode === "slide") {
      slideAmt = smoothstep(0, 1, Math.min(1, p.t / SLIDE_DUR));
      if (p.t >= SLIDE_DUR) {
        p.mode = "cut";
        p.t = 0;
      }
    } else if (p.mode === "cut") {
      bladeVisible = true;
      bladeX = BLADE_X_START + (BLADE_X_STOP - BLADE_X_START) * smoothstep(0, 1, Math.min(1, p.t / CUT_DUR));
      if (p.t >= CUT_DUR) {
        p.mode = "reveal";
        p.t = 0;
      }
    } else if (p.mode === "reveal") {
      bladeVisible = true;
      bladeX = BLADE_X_STOP;
      beadsVisible = true;
      if (p.t >= HOLD_DUR) {
        p.mode = "shrink";
        p.t = 0;
      }
    } else {
      // shrink
      shrinkMul = 1 - Math.min(1, p.t / SHRINK_DUR);
      if (p.t >= SHRINK_DUR) {
        p.mode = "sweep";
        p.t = 0;
      }
    }

    if (gaugeRef.current) {
      gaugeRef.current.visible = p.mode === "sweep";
      gaugeRef.current.position.x = gaugeX;
    }
    if (bladeRef.current) {
      bladeRef.current.visible = bladeVisible;
      bladeRef.current.position.x = bladeX;
    }
    // spin lives on the inner group, in its own local frame (before the
    // outer group's static tilt is applied), so it turns the two charcoal
    // spokes round the disc's own face normal without ever moving that
    // normal -- a group-level rotation.x here (the old code) rotates round
    // the WORLD x axis after the y-tilt, which tumbles the face in and out
    // of edge-on over time instead of spinning in place (round 2 review).
    if (bladeSpinRef.current) bladeSpinRef.current.rotation.x += dt * (3 + 9 * k);

    windowMat.emissiveIntensity = 1.0 + 1.2 * k;

    const logMesh = logMeshRef.current;
    const capMesh = capMeshRef.current;
    if (logMesh) {
      for (let i = 0; i < LOGS.length; i++) {
        const log = LOGS[i];
        const growProgress = p.mode === "sweep" ? coreProgress(log, gaugeX) : 1;
        const scaleX = Math.max(0.0001, log.span * growProgress * shrinkMul);
        const x = log.x0 + (SWEEP_X0 - log.x0) * slideAmt;
        dummy.position.set(x, LOG_Y, log.z);
        dummy.scale.set(scaleX, 1, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        logMesh.setMatrixAt(i, dummy.matrix);

        // the round end-cap rides the log's growing tip (local x=1 of the
        // unit cylinder -> world x + scaleX), so a log unmistakably reads
        // as a cut round, not a flat bar.
        if (capMesh) {
          dummy.position.set(x + scaleX, LOG_Y, log.z);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          capMesh.setMatrixAt(i, dummy.matrix);
        }
      }
      logMesh.instanceMatrix.needsUpdate = true;
      if (capMesh) capMesh.instanceMatrix.needsUpdate = true;
    }

    const beadMesh = beadMeshRef.current;
    if (beadMesh) {
      for (let i = 0; i < SURVIVORS.length; i++) {
        dummy.position.set(BLADE_X_STOP, LOG_Y + 0.22, SURVIVORS[i].z);
        dummy.scale.setScalar(beadsVisible ? 1 : 0.0001);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        beadMesh.setMatrixAt(i, dummy.matrix);
      }
      beadMesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group scale={SCALE}>
      <mesh castShadow receiveShadow geometry={bodyGeo} material={bodyMat} />
      <mesh geometry={WINDOW_GEO} material={windowMat} />

      {/* the smokestack's cap: the tallest point, the building's radiation hot spot */}
      <mesh position={[STACK_X, CAP_Y, STACK_Z]} geometry={CAP_GEO} material={capMat} />
      <mesh position={[STACK_X, CAP_Y, STACK_Z]} geometry={CAP_GLOW_GEO} material={capGlowMat} />

      {/* the old r-scale gauge: a neutral marker now, the blade is the cut */}
      <mesh ref={gaugeRef} position={[SWEEP_X0, GAUGE_Y, BLADE_Z]} geometry={GAUGE_GEO} material={gaugeMat} />

      {/* the cut: one big spinning saw blade, act two. A static two-axis
          tilt (rotation=[0.35, 0.55, 0]) tips the disc's face normal up and
          round toward CameraRig's fixed 42-degree-elevation follow camera,
          so it reads as a disc, not its own edge (round 2 review: rotation.y
          alone can't lift a horizontal-axis disc's face into an elevated
          camera). The inner group spins round the disc's own local axis
          only -- see the useFrame comment -- carrying the two baked-in
          charcoal spokes so the spin is visible on an otherwise symmetric
          disc, without ever moving the outer tilt. */}
      <group ref={bladeRef} position={[BLADE_X_START, BLADE_Y, BLADE_Z]} rotation={[0.35, 0.55, 0]}>
        <group ref={bladeSpinRef}>
          <mesh geometry={BLADE_GEO} material={bladeMat} />
          <mesh geometry={BLADE_GLOW_GEO} material={bladeGlowMat} />
        </group>
      </group>

      {/* the log deck: 2 mint pieces, 2 violet loops, 4 ice noise -- one InstancedMesh */}
      <instancedMesh ref={logMeshRef} args={[PIECE_GEO, logMat, LOGS.length]} castShadow receiveShadow frustumCulled={false} />

      {/* round end-cap at each log's growing tip -- reuses BEAD_GEO, tinted
          the same per-log MINT_C/VIOLET_C/ICE_C, so a log reads as a cut
          round rather than a flat bar */}
      <instancedMesh ref={capMeshRef} args={[BEAD_GEO, logMat, LOGS.length]} castShadow frustumCulled={false} />

      {/* "what crosses the cut becomes a feature": a bead per survivor */}
      <instancedMesh ref={beadMeshRef} args={[BEAD_GEO, beadMat, SURVIVORS.length]} frustumCulled={false} />
    </group>
  );
}
