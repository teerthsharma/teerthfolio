"use client";

// Building for the "smatrix" figure: resolvent (place id p-resolvent), a lab
// project Teerth built -- standing straight on the snow, no plinth.
//
// The project (data/showcase.json): resolvent proves in Lean 4 that softmax
// attention and Markov path composition are settings of one operator, then
// reads that operator through a resolvent, (I - gammaP)^-1 = I + gammaP +
// gamma^2 P^2 + ..., and gets the same closed form Wheeler's S-matrix had in
// 1937: in-states to out-states, "with no account of the path between them".
// The landing site's own figure (teerthsharma.github.io/fig.js, "smatrix --")
// builds that series as a solid, one translucent slice per hop, and once a
// cycle looks straight down the stack so every slice lands on the sum and
// the path disappears.
//
// The everyday job, done the resolvent's way: an ice-core archive station,
// the drill hut a polar station keeps its cores in. A real core is read the
// same way the paper reads attention -- side-on, each layer is one year
// (here, one hop) and the path is visible; look straight down it, and the
// layers collapse onto one cross-section with no history left in it. So the
// story is told SIDE-ON by default (the K = 22 hops as a beaded spiral,
// hop 0 by the window, hop K deep against the sum), and once a cycle the
// whole light-core TURNS to point straight at the seal: the spiral reads as
// a ring landed on its sum, exactly the figure's own "look straight down the
// stack" moment. A giant translucent ice core (the everyday job made
// literal) skewers the whole hut on cradle saddles, its tips poking out
// through both side walls -- what the light-core turns inside. Faster and
// brighter, and the ground glows harder, when `near`.
//
// One reconciliation: the review's fix 11 gives the ice core "length 3.0 m"
// AND "both ends stick out 0.3 m through the side walls" -- those two
// numbers cannot both hold once fix 5 fixes the footprint at HALF_X = 2.2 m
// (a 3 m core, centred, falls 0.4 m short of the walls). The poke-through
// silhouette is the stronger cue for "this hut is built around a drilled
// core" (visible even from outside, not just through the glass), so the
// core's length is set from the footprint instead: 2*(HALF_X + 0.3).
//
// Local origin: on the snow at the place centre; +z faces the camera and the
// dock. Props: { place, near }.

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BoxGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  Object3D,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useUi } from "../../../lib/world/store";
import { smoothstep } from "../life/util";
import { C, glow, lamp, mat } from "../palette";
import { K, SLICES, VIOLET_HEX } from "./parts/smatrix-layout";

// ---- the pavilion: a wide gable-roofed archive hut ------------------------
const HALF_X = 2.2; // footprint half-extent, x -- corner at 2.56 m, inside place.radius (3 m)
const HALF_Z = 1.3;
const WALL_H = 2.6;
const ROOF_H = 1.6;
const RIDGE_Y = WALL_H + ROOF_H;
const EAVE_OVER = 0.3; // roof overhang past the walls
const EAVE_Z = HALF_Z + EAVE_OVER;
const POST = 0.14; // structural member thickness -- the chunky minimum

// the window: fix 2 -- narrowed from 3.4 m (its header+sill bars alone were
// most of the front face's accent coverage); the case's own depth span
// (below) is narrowed to match so the spiral still fits inside the glass.
const WIN_W = 2.6, WIN_H = 1.6, WIN_SILL = 0.5;
const WIN_X0 = -HALF_X + POST, WIN_X1 = WIN_X0 + WIN_W, WIN_CX = (WIN_X0 + WIN_X1) / 2;
const POST_L = -HALF_X + POST / 2, POST_M = WIN_X1 + POST / 2, POST_R = HALF_X - POST / 2;
const DOOR_X0 = WIN_X1 + POST, DOOR_X1 = HALF_X - POST;
const DOOR_W = DOOR_X1 - DOOR_X0, DOOR_CX = (DOOR_X0 + DOOR_X1) / 2, DOOR_H = 1.7;

// ---- the case: hop depth along x (side-on), fix 1 -- each slice's own
// (x, y) lattice plane becomes (z, y), a plane half-width of 0.5 m. Wrapped
// in one rotating group (fix 2): unrotated it is edge-on to the follow
// camera (thin, correct -- the side view is the story), and once a cycle it
// turns -90 deg about y so its depth axis points straight at the camera and
// the spiral reads as a ring on its sum.
const CASE_X = WIN_CX; // always centred in the window opening, whatever WIN_W is
const CASE_Y = 1.3;
// fix 2 companion: span narrowed from 3.0 m (+-1.5) to 2.2 m so it still
// clears the narrower glass (WIN_W - 0.1) with margin on both sides.
const DEPTH_MIN = -1.1, DEPTH_MAX = 1.1, DEPTH_SPAN = DEPTH_MAX - DEPTH_MIN;
const PLANE_HALF = 0.5;
const PANEL_X = DEPTH_MAX + 0.05; // the sum panel's own plane, just past the last hop
const DISC_X = PANEL_X - 0.05; // the summed-order discs sit just in front of the panel
const SUM_TARGET_X = DISC_X + 0.03; // fix 3: beads collapse onto the sum disc's plane + 0.03

// ---- the ice core: the everyday job, made literal (fix 11) ---------------
const CORE_R = 0.55;
const CORE_HALF = HALF_X + EAVE_OVER; // 2.5 m: pokes 0.3 m past each side wall
const CORE_RIM_R = CORE_R + 0.04; // fix 1: a charcoal collar where the core meets each wall
const SADDLE_X = 1.0, SADDLE_THICK = 0.3;

// ---- the mast: the drill rig on the roof ----------------------------------
const MAST_W = 0.2, MAST_H = 1.4;
const MAST_Y = RIDGE_Y + MAST_H / 2;

// ---- timing (seconds, at rest -- `near` speeds the clock up) -------------
// DT and K are fig.js's own numbers for the scan (see parts/smatrix-layout.js
// -- 220 ms a hop, 22 hops): kept exact for how long the case takes to build.
const DT = 0.22;
const BUILD_END = K * DT; // 4.84 -- the spiral finishes arriving
const HOLD_END = BUILD_END + 1.0; // held, full depth, side-on
const COLLAPSE_END = HOLD_END + 1.0; // eases flat and turns end-on
const FLAT_END = COLLAPSE_END + 1.6; // held end-on -- "no account of the path"
const REOPEN_END = FLAT_END + 1.0; // eases back to depth and turns away
const CYCLE = REOPEN_END + 0.5;
const POP = 0.18; // seconds for one bead to pop in once its hop arrives

// ---- ground radiation (fix 8) ----------------------------------------------
const GLOW_R = 4.5;
const POOL_W = 1.6, POOL_H = 1.2;
const MOTE_N = 16, MOTE_R = 3.5;

const dummy = new Object3D();
const tmpColor = new Color();
const violetColor = new Color(VIOLET_HEX);

// a flat isoceles gable end: base at y = WALL_H spanning z, apex at the
// ridge. Built once as a shape (proper normals and uv for free) then rotated
// into the (z, y) wall plane and slid out to x. Rendered double-sided, so
// which way the shape's own winding faces never matters.
function gableGeometry(x) {
  const shape = new Shape();
  shape.moveTo(-HALF_Z, 0);
  shape.lineTo(HALF_Z, 0);
  shape.lineTo(0, ROOF_H);
  shape.closePath();
  return new ShapeGeometry(shape).rotateY(Math.PI / 2).translate(x, WALL_H, 0);
}

export default function Smatrix({ place, near: nearProp }) {
  // Scene.jsx mounts lab buildings without a `near` prop (only Monument.jsx,
  // no longer rendered for these, used to supply it) -- fall back to the
  // store so this still lights up correctly on its own.
  const nearStore = useUi((s) => s.near === place.id);
  const near = nearProp ?? nearStore;
  const accent = place.radiation ?? place.color;
  // fix 6: the shell's own accent (window frame, ridge, vent, doorknob) is
  // place.radiation tinted halfway toward the case's hardcoded VIOLET_HEX,
  // so the building reads as one colour instead of two adjacent violets.
  const shellAccent = useMemo(() => `#${new Color(accent).lerp(violetColor, 0.5).getHexString()}`, [accent]);

  const beadRef = useRef();
  const discRef = useRef();
  const scanRef = useRef();
  const turnRef = useRef();
  const moteRef = useRef();
  const phase = useRef(0);

  const sliceLayout = useMemo(
    () =>
      SLICES.map((s) => ({
        color: s.color,
        radius: s.beadRadius,
        arrival: (s.k / K) * BUILD_END,
        depthX: DEPTH_MIN + s.zFrac * DEPTH_SPAN,
        y: CASE_Y + s.y * PLANE_HALF,
        z: s.x * PLANE_HALF,
      })),
    [],
  );
  const moteLayout = useMemo(
    () => Array.from({ length: MOTE_N }, (_, i) => ({ a: (i / MOTE_N) * Math.PI * 2, delay: (i / MOTE_N) * 3 })),
    [],
  );

  const beadGeo = useMemo(() => new SphereGeometry(1, 8, 6), []);
  // fix 4: 23 CircleGeometry discs on the sum panel -- pre-rotated here
  // (once, at build time) to face local +x, matching the panel and scan
  // plane below, so each instance only ever needs position and scale.
  const discGeo = useMemo(() => new CircleGeometry(1, 12).rotateY(Math.PI / 2), []);
  const moteGeo = useMemo(() => new SphereGeometry(1, 6, 5), []);
  const threadGeo = useMemo(() => {
    const pts = sliceLayout.map((s) => new Vector3(s.depthX, s.y, s.z));
    return new TubeGeometry(new CatmullRomCurve3(pts), 48, 0.07, 6, false); // fix 5: 0.04 -> 0.07 (>= 0.12 m dia. floor)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // fix 1: a charcoal collar at each side wall, where the ice core pokes
  // through -- pre-rotated to match the core cylinder's own orientation.
  const coreRimGeo = useMemo(
    () =>
      mergeGeometries(
        [-HALF_X, HALF_X].map((x) =>
          new TorusGeometry(CORE_RIM_R, 0.07, 8, 16).rotateY(Math.PI / 2).translate(x, CASE_Y, 0),
        ),
        false,
      ),
    [],
  );

  // ---- the pavilion's own geometry, merged into as few draws as it can be
  const winFrameGeo = useMemo(
    () =>
      mergeGeometries(
        [
          new BoxGeometry(POST, WALL_H, POST).translate(POST_L, WALL_H / 2, HALF_Z),
          new BoxGeometry(POST, WALL_H, POST).translate(POST_M, WALL_H / 2, HALF_Z),
          new BoxGeometry(POST, WALL_H, POST).translate(POST_R, WALL_H / 2, HALF_Z),
          new BoxGeometry(WIN_W, WALL_H - (WIN_SILL + WIN_H), POST).translate(WIN_CX, (WIN_SILL + WIN_H + WALL_H) / 2, HALF_Z), // header
          new BoxGeometry(WIN_W, WIN_SILL, POST).translate(WIN_CX, WIN_SILL / 2, HALF_Z), // sill
        ],
        false,
      ),
    [],
  );
  const wallGeo = useMemo(
    () =>
      mergeGeometries(
        [
          new BoxGeometry(POST, WALL_H, 2 * HALF_Z).translate(-HALF_X, WALL_H / 2, 0),
          new BoxGeometry(POST, WALL_H, 2 * HALF_Z).translate(HALF_X, WALL_H / 2, 0),
          new BoxGeometry(2 * HALF_X, WALL_H, POST).translate(0, WALL_H / 2, -HALF_Z),
          new BoxGeometry(DOOR_W, WALL_H - DOOR_H, POST).translate(DOOR_CX, (DOOR_H + WALL_H) / 2, HALF_Z), // wall above the door
          new BoxGeometry(DOOR_W - 0.06, DOOR_H, 0.1).translate(DOOR_CX, DOOR_H / 2, HALF_Z - 0.02), // the door leaf
        ],
        false,
      ),
    [],
  );
  const gableGeo = useMemo(() => mergeGeometries([gableGeometry(-HALF_X), gableGeometry(HALF_X)], false), []);
  // fix 2/3: the big slopes are now near-neutral (roofBodyMat, C.snow below)
  // instead of the full accent colour -- that alone was most of the old
  // 85-90% accent coverage. The ridge cap (still accent) is the one line
  // that carries the pitch cue head-on.
  const roofAccentGeo = useMemo(() => {
    const len = Math.hypot(EAVE_Z, ROOF_H);
    const angle = Math.atan2(ROOF_H, EAVE_Z);
    const w = 2 * (HALF_X + EAVE_OVER);
    return mergeGeometries(
      [
        new BoxGeometry(w, 0.12, len).rotateX(angle).translate(0, (RIDGE_Y + WALL_H) / 2, EAVE_Z / 2),
        new BoxGeometry(w, 0.12, len).rotateX(-angle).translate(0, (RIDGE_Y + WALL_H) / 2, -EAVE_Z / 2),
      ],
      false,
    );
  }, []);
  const ridgeCapGeo = useMemo(() => new BoxGeometry(2 * (HALF_X + EAVE_OVER) + 0.1, 0.16, 0.2).translate(0, RIDGE_Y + 0.08, 0), []);
  // fix 7: ground slab, eave trim, drill mast and core saddles all share the
  // charcoal `frame` material -- one merged geometry, one draw call instead
  // of four. Fix 3: eave trim thickened 0.14 -> 0.18 so it reads as a clear
  // shadow line under the roof (the pitch cue's other half, with the ridge
  // cap above).
  const frameGeo = useMemo(() => {
    const w = 2 * (HALF_X + EAVE_OVER);
    return mergeGeometries(
      [
        new BoxGeometry(2 * HALF_X + 0.2, 0.14, 2 * HALF_Z + 0.2).translate(0, -0.07, 0), // ground slab
        new BoxGeometry(w, 0.18, 0.18).translate(0, WALL_H, EAVE_Z), // front eave trim
        new BoxGeometry(w, 0.18, 0.18).translate(0, WALL_H, -EAVE_Z), // back eave trim
        new BoxGeometry(MAST_W, MAST_H, MAST_W).translate(0, MAST_Y, 0), // drill mast
        ...[-SADDLE_X, SADDLE_X].map((x) =>
          new BoxGeometry(SADDLE_THICK, SADDLE_THICK, 1.0).translate(x, CASE_Y - CORE_R - SADDLE_THICK / 2, 0),
        ),
      ],
      false,
    );
  }, []);

  // Unlit swarm, each keeping its own hop colour from the ramp fig.js itself
  // paints (kept exact: parts/smatrix-layout.js). Normal blending, tone
  // mapped: additive here just clips a dense, near-axial spiral to white.
  const beadMat = useMemo(() => new MeshBasicMaterial({ transparent: true, opacity: 1 }), []); // fix 4: 0.92 -> 1
  // fig.js paints every partial and running sum in this one violet -- the
  // thread joining the hops, and the panel and discs they all resolve onto,
  // share it.
  const threadMat = useMemo(() => new MeshBasicMaterial({ color: VIOLET_HEX, transparent: true, opacity: 0.5, toneMapped: false }), []); // fix 4: 0.35 -> 0.5
  const discMat = useMemo(() => new MeshBasicMaterial({ color: VIOLET_HEX, transparent: true, opacity: 0.85, toneMapped: false, depthWrite: false }), []);
  // Dark base colour, bright emissive only, capped at 1.2 (fix 4): a lit
  // albedo this size would pick up the polar daylight and read as a pale
  // wall, and an uncapped peak washes to lavender-white, not "one colour".
  const sumMat = useMemo(() => mat("#241636", { emissive: VIOLET_HEX, emissiveIntensity: 0.6, roughness: 0.5 }).clone(), []);
  const scanMat = useMemo(() => glow(VIOLET_HEX, 0.5).clone(), []);
  const ventMat = useMemo(() => lamp(shellAccent, 0.8).clone(), [shellAccent]);
  const groundGlowMat = useMemo(
    () => new MeshBasicMaterial({ color: accent, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0.14 }),
    [accent],
  );

  const wall = mat(C.warmWhite, { roughness: 0.75 });
  const frame = mat(C.charcoal, { roughness: 0.6 });
  const gableMat = mat(C.warmWhite, { roughness: 0.75, side: DoubleSide });
  // fix 2/3: near-neutral, a step brighter than the warmWhite walls. A faint
  // self emissive floor (like every other accent material in this file)
  // keeps the slope legible even at a grazing sun angle on a 45 deg pitch.
  // fix 2/3: near-neutral, a step brighter than the warmWhite walls. This
  // slope's own diffuse response reads very dark at this sun angle (flat
  // shading on a merged, rotated box -- every other accent material in this
  // file carries the same emissiveIntensity ~0.4-0.5 for exactly this
  // reason), so a matching emissive floor keeps it legible as snow, not
  // charcoal.
  const roofBodyMat = mat(C.snow, { roughness: 0.7, emissive: C.snow, emissiveIntensity: 0.4 });
  const winFrameMat = useMemo(() => mat(shellAccent, { roughness: 0.5, emissive: shellAccent, emissiveIntensity: 0.4 }), [shellAccent]);
  const roofMat = useMemo(() => mat(shellAccent, { roughness: 0.5, flatShading: true }), [shellAccent]); // now just the ridge cap
  const doorKnobMat = useMemo(() => mat(shellAccent, { roughness: 0.4, emissive: shellAccent, emissiveIntensity: 0.5 }), [shellAccent]);
  const coreMat = useMemo(() => new MeshBasicMaterial({ color: C.ice, transparent: true, opacity: 0.45, depthWrite: false, toneMapped: false }), []); // fix 1: 0.18 -> 0.45
  const lightPool = useMemo(() => glow(accent, 0.3), [accent]);
  const moteMat = useMemo(() => lamp(accent, 1), [accent]);

  // unlit, not a real dielectric: a low-roughness standard material here
  // catches the sun disc as a hard streak and washes the case out behind it.
  const glass = useMemo(
    () => new MeshBasicMaterial({ color: C.ice, transparent: true, opacity: 0.1, depthWrite: false, toneMapped: false }),
    [],
  );

  useLayoutEffect(() => {
    const beads = beadRef.current;
    if (beads) {
      for (let i = 0; i < sliceLayout.length; i++) {
        const s = sliceLayout[i];
        dummy.position.set(s.depthX, s.y, s.z);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        beads.setMatrixAt(i, dummy.matrix);
        beads.setColorAt(i, tmpColor.set(s.color));
      }
      beads.instanceMatrix.needsUpdate = true;
      beads.instanceColor.needsUpdate = true;
    }
    const discs = discRef.current;
    if (discs) {
      for (let i = 0; i < sliceLayout.length; i++) {
        dummy.position.set(DISC_X, sliceLayout[i].y, sliceLayout[i].z);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        discs.setMatrixAt(i, dummy.matrix);
      }
      discs.instanceMatrix.needsUpdate = true;
    }
  }, [sliceLayout]);

  useEffect(
    () => () => {
      sumMat.dispose();
      scanMat.dispose();
      ventMat.dispose();
    },
    [sumMat, scanMat, ventMat],
  );

  useFrame((_, dt) => {
    const speed = near ? 1.5 : 1;
    const boost = near ? 1.35 : 1;
    // fix 9: advance a phase by delta instead of reading clock.elapsedTime
    // directly -- that jumped speed's whole history in on every `near` flip.
    phase.current = (phase.current + dt * speed) % CYCLE;
    const t = phase.current;

    // 0 while the spiral has depth, 1 once it has turned end-on onto the sum.
    const collapseK =
      t < HOLD_END ? 0 : t < COLLAPSE_END ? smoothstep(HOLD_END, COLLAPSE_END, t) : t < FLAT_END ? 1 : t < REOPEN_END ? 1 - smoothstep(FLAT_END, REOPEN_END, t) : 0;
    // a quick, quiet reset just before the loop wraps, so the next scan
    // starts from nothing instead of jump-cutting a full spiral away.
    const fadeAll = 1 - smoothstep(CYCLE - 0.4, CYCLE, t);

    // fix 2: the whole light-core turns to point its depth axis at the
    // camera as it collapses, so the "look straight down the stack" moment
    // is an actual turn, not the spiral simply flattening in place.
    if (turnRef.current) turnRef.current.rotation.y = -(Math.PI / 2) * collapseK;

    const beads = beadRef.current;
    if (beads) {
      for (let i = 0; i < sliceLayout.length; i++) {
        const s = sliceLayout[i];
        const pop = smoothstep(0, POP, t - s.arrival);
        const x = s.depthX + (SUM_TARGET_X - s.depthX) * collapseK;
        dummy.position.set(x, s.y, s.z);
        dummy.scale.setScalar(s.radius * pop * fadeAll);
        dummy.updateMatrix();
        beads.setMatrixAt(i, dummy.matrix);
        // fix 3: the colour of the individual orders drains into the sum's
        // violet as the stack collapses onto it.
        tmpColor.set(s.color).lerp(violetColor, collapseK);
        beads.setColorAt(i, tmpColor);
      }
      beads.instanceMatrix.needsUpdate = true;
      beads.instanceColor.needsUpdate = true;
    }

    // fix 4: the sum panel's own discs -- the summed orders, all one colour,
    // popping in with their own hop exactly as the beads do.
    const discs = discRef.current;
    if (discs) {
      for (let i = 0; i < sliceLayout.length; i++) {
        const s = sliceLayout[i];
        const pop = smoothstep(0, POP, t - s.arrival);
        dummy.position.set(DISC_X, s.y, s.z);
        dummy.scale.setScalar(s.radius * 1.2 * pop * fadeAll);
        dummy.updateMatrix();
        discs.setMatrixAt(i, dummy.matrix);
      }
      discs.instanceMatrix.needsUpdate = true;
    }

    // the thread through the hops fades as the path it traces disappears
    threadMat.opacity = 0.5 * (1 - collapseK) * fadeAll * boost; // fix 4: 0.35 -> 0.5

    // the sum panel: grows through the scan, then flares as the stack lands
    // on it -- the punchline, "no account of the path between them". Capped
    // at 1.2 (fix 4): the old peak of 5.4 rendered as washed lavender-white.
    const build = smoothstep(0, BUILD_END, t);
    sumMat.emissiveIntensity = Math.min(1.2, (0.5 + 0.4 * build + collapseK * 0.5) * boost);

    // the scan plane: one pass through the hops while the case builds.
    if (scanRef.current) scanRef.current.position.x = DEPTH_MIN + Math.min(1, t / BUILD_END) * DEPTH_SPAN;
    scanMat.opacity = t < BUILD_END + 0.15 ? 0.5 * smoothstep(0, 0.12, t) * (1 - smoothstep(BUILD_END - 0.15, BUILD_END + 0.15, t)) : 0;

    ventMat.emissiveIntensity = (0.7 + 0.6 * collapseK) * boost;

    // fix 8: the ground glows harder as the stack lands on its sum.
    groundGlowMat.opacity = 0.14 + 0.1 * collapseK;

    // fix 8: motes rise round the hut and, during the end-on hold, stream in
    // toward the window -- the area's radiation being drawn into the story.
    const motes = moteRef.current;
    if (motes) {
      for (let i = 0; i < MOTE_N; i++) {
        const m = moteLayout[i];
        const rise = ((t + m.delay) % 3) / 3;
        const ringX = Math.cos(m.a) * MOTE_R;
        const ringZ = Math.sin(m.a) * MOTE_R;
        const ringY = 0.3 + rise * 2.2;
        // during the flat hold collapseK is already 1: pulled fully to the window
        const pull = collapseK;
        dummy.position.set(ringX + (WIN_CX - ringX) * pull, ringY + (CASE_Y - ringY) * pull, ringZ + (HALF_Z + 0.6 - ringZ) * pull);
        dummy.scale.setScalar(0.07 * (1 - pull * 0.3));
        dummy.updateMatrix();
        motes.setMatrixAt(i, dummy.matrix);
      }
      motes.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* fix 7: ground slab, eave trim, drill mast and core saddles, merged
          into one draw call -- all charcoal `frame`. */}
      <mesh geometry={frameGeo} castShadow receiveShadow material={frame} />

      {/* walls: both side walls, the back wall, and the door */}
      <mesh geometry={wallGeo} castShadow receiveShadow material={wall} />
      <mesh position={[DOOR_CX - DOOR_W / 2 + 0.08, 0.775, HALF_Z + 0.06]} material={doorKnobMat}>
        <sphereGeometry args={[0.07, 8, 8]} />
      </mesh>

      {/* gable ends */}
      <mesh geometry={gableGeo} castShadow receiveShadow material={gableMat} />

      {/* the window frame: 3 posts, header and sill, one accent piece,
          narrowed (fix 2) so it stops being most of the front face. */}
      <mesh geometry={winFrameGeo} castShadow receiveShadow material={winFrameMat} />
      <mesh position={[WIN_CX, WIN_SILL + WIN_H / 2, HALF_Z - 0.02]} material={glass}>
        <planeGeometry args={[WIN_W - 0.1, WIN_H - 0.06]} />
      </mesh>

      {/* the gable roof: ridge along x, so the eave never overhangs the
          window. Near-neutral slopes (fix 2), accent ridge cap as the pitch
          cue (fix 3), charcoal eave trim (in frameGeo) as the other half. */}
      <mesh geometry={roofAccentGeo} castShadow material={roofBodyMat} />
      <mesh geometry={ridgeCapGeo} castShadow material={roofMat} />

      {/* the vent lamp atop the drill mast (fix 11) */}
      <mesh position={[0, RIDGE_Y + MAST_H + 0.12, 0]} material={ventMat}>
        <sphereGeometry args={[0.12, 10, 8]} />
      </mesh>

      {/* the ice core: a translucent cylinder holding the light-core,
          resting on two cradle saddles (in frameGeo), poking through both
          side walls, a charcoal collar at each wall marking the poke-through
          (fix 1 -- see the file header for the length reconciliation) */}
      <mesh position={[0, CASE_Y, 0]} rotation={[0, 0, Math.PI / 2]} material={coreMat}>
        <cylinderGeometry args={[CORE_R, CORE_R, CORE_HALF * 2, 16, 1, true]} />
      </mesh>
      <mesh geometry={coreRimGeo} material={frame} />

      {/* the light-core itself: the resolvent's own K = 22 hops, side-on by
          default, turning end-on onto its sum once a cycle (fix 1, fix 2) */}
      <group ref={turnRef} position={[CASE_X, 0, 0]}>
        <mesh geometry={threadGeo} material={threadMat} />
        <instancedMesh ref={beadRef} args={[beadGeo, beadMat, sliceLayout.length]} />
        <mesh position={[PANEL_X, CASE_Y, 0]} rotation={[0, Math.PI / 2, 0]} material={sumMat}>
          <planeGeometry args={[PLANE_HALF * 2.2, PLANE_HALF * 2.2]} />
        </mesh>
        <instancedMesh ref={discRef} args={[discGeo, discMat, sliceLayout.length]} />
        <mesh ref={scanRef} position={[DEPTH_MIN, CASE_Y, 0]} rotation={[0, Math.PI / 2, 0]} material={scanMat}>
          <planeGeometry args={[PLANE_HALF * 2.4, PLANE_HALF * 2.4]} />
        </mesh>
      </group>

      {/* fix 8: the ground itself glows with this area's radiation */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} material={groundGlowMat}>
        <circleGeometry args={[GLOW_R, 24]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[WIN_CX, 0.03, HALF_Z + 0.9]} material={lightPool}>
        <planeGeometry args={[POOL_W, POOL_H]} />
      </mesh>
      <instancedMesh ref={moteRef} args={[moteGeo, moteMat, MOTE_N]} />
    </group>
  );
}
