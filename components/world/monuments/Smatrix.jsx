"use client";

// Building for the "smatrix" figure: resolvent (place id p-resolvent), a lab
// project Teerth built -- standing straight on the snow, no plinth.
//
// The project (data/showcase.json): resolvent proves in Lean 4 that softmax
// attention and Markov path composition are settings of one operator, then
// reads that operator through a resolvent, (I - gammaP)^-1 = I + gammaP +
// gamma^2 P^2 + ..., and gets the same closed form Wheeler's S-matrix had in
// 1937: in-states to out-states, with no account of the path between them.
//
// The everyday job, done the resolvent's way: an ice-core archive station,
// the drill hut a polar station keeps its cores in.
//
// Round 3 fix: the earlier build put the landing site's own figure (fig.js's
// "smatrix --" bead spiral in its blue -> violet -> coral ramp, turning once
// a cycle to land on a sum panel) behind the window, just re-skinned as a
// glass case -- at game distance it read as a scatter/spiral chart, exactly
// what a lab building must no longer draw. That whole bead/thread/sum-panel/
// scan-plane system (and the sliceLayout it was built from) is gone. What is
// visible through the window now is the hut's own ice core: a single
// translucent cylinder, banded light/dark like a real drilled specimen, that
// pokes out through both side walls and turns slowly on its own axis -- the
// everyday job (reading a core), never a diagram of the paper. The banding
// is a fixed count of stripes with no tie to K or gamma.
//
// One reconciliation kept from round 2: the ice core's "both ends stick out
// 0.3 m through the side walls" and its footprint at HALF_X = 2.2 m cannot
// both hold with a fixed literal length, so the core's length is set from
// the footprint instead: 2*(HALF_X + 0.3).
//
// Local origin: on the snow at the place centre; +z faces the camera and the
// dock. Props: { place, near }.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  MeshBasicMaterial,
  Object3D,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useUi } from "../../../lib/world/store";
import { C, lamp, mat } from "../palette";

// ---- the pavilion: a wide gable-roofed archive hut ------------------------
const HALF_X = 2.2; // footprint half-extent, x -- corner at 2.56 m, inside place.radius (3 m)
const HALF_Z = 1.3;
const WALL_H = 2.6;
const ROOF_H = 1.6;
const RIDGE_Y = WALL_H + ROOF_H;
const EAVE_OVER = 0.3; // roof overhang past the walls
const EAVE_Z = HALF_Z + EAVE_OVER;
const POST = 0.14; // structural member thickness -- the chunky minimum

// the window
const WIN_W = 2.6, WIN_H = 1.6, WIN_SILL = 0.5;
const WIN_X0 = -HALF_X + POST, WIN_X1 = WIN_X0 + WIN_W, WIN_CX = (WIN_X0 + WIN_X1) / 2;
const POST_L = -HALF_X + POST / 2, POST_M = WIN_X1 + POST / 2, POST_R = HALF_X - POST / 2;
const DOOR_X0 = WIN_X1 + POST, DOOR_X1 = HALF_X - POST;
const DOOR_W = DOOR_X1 - DOOR_X0, DOOR_CX = (DOOR_X0 + DOOR_X1) / 2, DOOR_H = 1.7;

// ---- the ice core: the everyday job, made literal, and (round 3) the only
// thing visible through the window -- a translucent cylinder banded light/
// dark like a real drilled specimen, resting on two cradle saddles, poking
// through both side walls, turning slowly on its own axis.
const CORE_Y = 1.3; // the core's height within the hut
const CORE_R = 0.55;
const CORE_HALF = HALF_X + EAVE_OVER; // 2.5 m: pokes 0.3 m past each side wall
const CORE_RIM_R = CORE_R + 0.04; // a charcoal collar where the core meets each wall
const CORE_BANDS = 10; // alternating light/dark ice bands -- a fixed count, no tie to K or gamma
const SADDLE_X = 1.0, SADDLE_THICK = 0.3;

// ---- the mast: the drill rig on the roof ----------------------------------
const MAST_W = 0.2, MAST_H = 1.4;
const MAST_Y = RIDGE_Y + MAST_H / 2;

// ---- ground radiation ------------------------------------------------------
const MOTE_N = 16, MOTE_R = 3.5;

// ---- the anomaly: a drilled core sample, hovering with no support, slowly
// turning -- the flat ground-glow pools it replaces read as "yellow pee
// stains"; a crisp floating object is the area's radiation shown, not stated.
const ANOM_POS = [1.6, 0.85, HALF_Z + 1.4];
const ANOM_R = 0.22, ANOM_LEN = 0.5;
const AMBER_HEX = "#f0b23c"; // the accent's warm complement

const dummy = new Object3D();

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

// the ice core's banding: alternating a pale and a deep ice colour, wound in
// a slight helix (a fixed number of turns along the length) so consecutive
// bands interpolate into soft stripes the length of the core -- real
// ice-core layering, not a chart. The helix also reads as the drill's own
// flute, and is what makes the slow constant spin (see useFrame) actually
// visible: a purely axisymmetric ring pattern would look identical at every
// angle of rotation.
function bandedCoreGeometry() {
  const length = CORE_HALF * 2;
  const turns = 0.6; // how far the banding winds round the core over its full length
  const geo = new CylinderGeometry(CORE_R, CORE_R, length, 16, CORE_BANDS, true).toNonIndexed();
  const pos = geo.attributes.position;
  const light = new Color(C.ice);
  const dark = new Color(C.deepIce);
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const angle = Math.atan2(pos.getZ(i), pos.getX(i));
    const phase = (pos.getY(i) / length + 0.5) * CORE_BANDS + (angle / (Math.PI * 2)) * turns;
    const ring = Math.round(phase);
    const c = ring % 2 === 0 ? light : dark;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new Float32BufferAttribute(colors, 3));
  return geo;
}

export default function Smatrix({ place, near: nearProp }) {
  // Scene.jsx mounts lab buildings without a `near` prop (only Monument.jsx,
  // no longer rendered for these, used to supply it) -- fall back to the
  // store so this still lights up correctly on its own.
  const nearStore = useUi((s) => s.near === place.id);
  const near = nearProp ?? nearStore;
  const accent = place.radiation ?? place.color;

  const coreSpinRef = useRef();
  const moteRef = useRef();
  const anomalyRef = useRef();
  const clock = useRef(0);

  const moteLayout = useMemo(
    () => Array.from({ length: MOTE_N }, (_, i) => ({ a: (i / MOTE_N) * Math.PI * 2, delay: (i / MOTE_N) * 3 })),
    [],
  );

  const coreGeo = useMemo(() => bandedCoreGeometry(), []);
  const moteGeo = useMemo(() => new SphereGeometry(1, 6, 5), []);
  // a charcoal collar at each side wall, where the ice core pokes through --
  // pre-rotated to match the core cylinder's own orientation.
  const coreRimGeo = useMemo(
    () =>
      mergeGeometries(
        [-HALF_X, HALF_X].map((x) =>
          new TorusGeometry(CORE_RIM_R, 0.07, 8, 16).rotateY(Math.PI / 2).translate(x, CORE_Y, 0),
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
  // ground slab, eave trim, drill mast and core saddles all share the
  // charcoal `frame` material -- one merged geometry, one draw call.
  const frameGeo = useMemo(() => {
    const w = 2 * (HALF_X + EAVE_OVER);
    return mergeGeometries(
      [
        new BoxGeometry(2 * HALF_X + 0.2, 0.14, 2 * HALF_Z + 0.2).translate(0, -0.07, 0), // ground slab
        new BoxGeometry(w, 0.18, 0.18).translate(0, WALL_H, EAVE_Z), // front eave trim
        new BoxGeometry(w, 0.18, 0.18).translate(0, WALL_H, -EAVE_Z), // back eave trim
        new BoxGeometry(MAST_W, MAST_H, MAST_W).translate(0, MAST_Y, 0), // drill mast
        ...[-SADDLE_X, SADDLE_X].map((x) =>
          new BoxGeometry(SADDLE_THICK, SADDLE_THICK, 1.0).translate(x, CORE_Y - CORE_R - SADDLE_THICK / 2, 0),
        ),
      ],
      false,
    );
  }, []);

  const ventMat = useMemo(() => lamp(accent, 0.8).clone(), [accent]);

  const wall = mat(C.warmWhite, { roughness: 0.75 });
  const frame = mat(C.charcoal, { roughness: 0.6 });
  const gableMat = mat(C.warmWhite, { roughness: 0.75, side: DoubleSide });
  const roofBodyMat = mat("#d9d6d2", { roughness: 0.7, emissive: "#d9d6d2", emissiveIntensity: 0.12 });
  const winFrameMat = useMemo(() => mat(accent, { roughness: 0.5, emissive: accent, emissiveIntensity: 0.4 }), [accent]);
  const roofMat = useMemo(() => mat(accent, { roughness: 0.5, flatShading: true }), [accent]); // the ridge cap
  const doorKnobMat = useMemo(() => mat(AMBER_HEX, { roughness: 0.4, emissive: AMBER_HEX, emissiveIntensity: 0.6 }), []);
  // vertex-coloured banding drives the look; the material's own colour stays
  // white so it doesn't tint the stripes.
  const coreMat = useMemo(
    () => new MeshBasicMaterial({ color: "#ffffff", vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false }),
    [],
  );
  const moteMat = useMemo(() => lamp(accent, 1), [accent]);
  const anomalyMat = useMemo(() => mat(accent, { roughness: 0.35, emissive: accent, emissiveIntensity: 0.5 }), [accent]);

  // unlit, not a real dielectric: a low-roughness standard material here
  // catches the sun disc as a hard streak and washes the window out behind it.
  const glass = useMemo(
    () => new MeshBasicMaterial({ color: C.ice, transparent: true, opacity: 0.1, depthWrite: false, toneMapped: false }),
    [],
  );

  useEffect(() => () => ventMat.dispose(), [ventMat]);

  useFrame((_, dt) => {
    const speed = near ? 1.5 : 1;
    const boost = near ? 1.35 : 1;
    clock.current += dt * speed;
    const t = clock.current;

    // the core: a slow constant turn, like a specimen being logged --
    // no cycle, no "align into a ring".
    if (coreSpinRef.current) coreSpinRef.current.rotation.y += dt * 0.25 * speed;

    ventMat.emissiveIntensity = (0.7 + 0.25 * Math.sin(t * 1.3)) * boost;

    // the hovering core sample turns steadily and bobs gently in place --
    // no support, no explanation, just the anomaly.
    if (anomalyRef.current) {
      anomalyRef.current.rotation.z = t * 0.9;
      anomalyRef.current.position.y = ANOM_POS[1] + Math.sin(t * 1.6) * 0.08;
    }

    // the radioactive ground: motes rising round the hut and resetting.
    const motes = moteRef.current;
    if (motes) {
      for (let i = 0; i < MOTE_N; i++) {
        const m = moteLayout[i];
        const rise = ((t + m.delay) % 3) / 3;
        dummy.position.set(Math.cos(m.a) * MOTE_R, 0.3 + rise * 2.2, Math.sin(m.a) * MOTE_R);
        dummy.scale.setScalar(0.07);
        dummy.updateMatrix();
        motes.setMatrixAt(i, dummy.matrix);
      }
      motes.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* ground slab, eave trim, drill mast and core saddles, merged into
          one draw call -- all charcoal `frame`. */}
      <mesh geometry={frameGeo} castShadow receiveShadow material={frame} />

      {/* walls: both side walls, the back wall, and the door */}
      <mesh geometry={wallGeo} castShadow receiveShadow material={wall} />
      <mesh position={[DOOR_CX - DOOR_W / 2 + 0.08, 0.775, HALF_Z + 0.06]} material={doorKnobMat}>
        <sphereGeometry args={[0.07, 8, 8]} />
      </mesh>

      {/* gable ends */}
      <mesh geometry={gableGeo} castShadow receiveShadow material={gableMat} />

      {/* the window frame: 3 posts, header and sill, one accent piece */}
      <mesh geometry={winFrameGeo} castShadow receiveShadow material={winFrameMat} />
      <mesh position={[WIN_CX, WIN_SILL + WIN_H / 2, HALF_Z - 0.02]} material={glass}>
        <planeGeometry args={[WIN_W - 0.1, WIN_H - 0.06]} />
      </mesh>

      {/* the gable roof: ridge along x, so the eave never overhangs the
          window. Near-neutral slopes, accent ridge cap as the pitch cue,
          charcoal eave trim (in frameGeo) as the other half. */}
      <mesh geometry={roofAccentGeo} castShadow material={roofBodyMat} />
      <mesh geometry={ridgeCapGeo} castShadow material={roofMat} />

      {/* the vent lamp atop the drill mast */}
      <mesh position={[0, RIDGE_Y + MAST_H + 0.12, 0]} material={ventMat}>
        <sphereGeometry args={[0.12, 10, 8]} />
      </mesh>

      {/* the ice core: a single translucent cylinder banded light/dark like
          a real drilled specimen, resting on two cradle saddles (in
          frameGeo), poking through both side walls, a charcoal collar at
          each wall marking the poke-through, turning slowly on its own
          axis -- the everyday job made literal, and (round 3) the only
          thing visible through the window (see file header) */}
      <group position={[0, CORE_Y, 0]} rotation={[0, 0, Math.PI / 2]}>
        <mesh ref={coreSpinRef} geometry={coreGeo} material={coreMat} visible={false} />
      </group>
      <mesh geometry={coreRimGeo} material={frame} />

      {/* the anomaly -- a drilled core sample hovering with no support,
          slowly turning, in the building's own radiation colour */}
      <mesh ref={anomalyRef} position={ANOM_POS} rotation={[Math.PI / 2, 0, 0]} material={anomalyMat}>
        <cylinderGeometry args={[ANOM_R, ANOM_R, ANOM_LEN, 12]} />
      </mesh>
      <instancedMesh ref={moteRef} args={[moteGeo, moteMat, MOTE_N]} />
    </group>
  );
}
