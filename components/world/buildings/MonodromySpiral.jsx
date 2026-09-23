"use client";

// Landmark for PLACE_BY_ID["monodromy"] in lib/world/places.js.
// Local space: origin at the footprint centre on the snow, +z faces the
// camera and the dock, footprint stays inside place.radius (1.9 m).
//
// monodromy asks whether a transformation can be undone by walking a loop
// and watching where you land. The landmark plays that out literally: a
// stubby helter-skelter tower wrapped in a two-turn spiral ramp. A puck
// circles a flat track at the tower's foot -- one lap and it is back where
// it started, the loop below closes. A cyan marble climbs the ramp in lock
// step with the puck's angle: after that same lap it is directly above the
// puck, but on the SECOND turn (the other root), not the first -- one trip
// around the base does not undo the climb. Only a second lap brings the
// marble to the top, where it drops into the tower's cap and reappears at
// the bottom of turn one: back to the start, but only after two laps.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BufferGeometry,
  ConeGeometry,
  Curve,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Path,
  Shape,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useUi } from "../../../lib/world/store";
import { damp, smoothstep } from "../life/util";
import { C, glow, lamp, mat } from "../palette";

const EASE = 4; // shared rate for every ref-eased value: k = 1 - exp(-EASE*dt)

const BASE_R = 1.6;
const BASE_H = 0.25;

const TRACK_R0 = 1.35;
const TRACK_R1 = 1.55;
const TRACK_THICK = 0.12;
const TRACK_Y = 0.26; // centre height
const PUCK_TRACK_R = 1.45;
const PUCK_R = 0.16;
const PUCK_H = 0.12;
const PUCK_Y = TRACK_Y + TRACK_THICK / 2 + PUCK_H / 2;

const TOWER_R = 0.55;
const TOWER_H = 3.2;
const TOWER_SEG = 10;
const CAP_R = 0.7;
const CAP_H = 0.6; // apex at TOWER_H + CAP_H = 3.8

const RAMP_INNER = TOWER_R; // flush against the tower
const RAMP_OUTER = 1.3;
const RAMP_THICK = 0.14;
const RAMP_Y0 = 0.35; // top-surface height at the start
const RAMP_Y1 = 2.95; // top-surface height at the top
const RAMP_TURNS = 2;
const RAMP_ANGLE_TOTAL = RAMP_TURNS * Math.PI * 2;
const RAMP_SEGMENTS = 96;
const SHEET_SEGMENTS = RAMP_SEGMENTS / 2;
const LIP_R = 0.07;

const LAMP_MOUNT_R = TOWER_R + 0.05; // proud of the tower's +z face
const LAMP_A_Y = 0.45;
const LAMP_B_Y = 1.75;

const MARBLE_R = 0.22;
const MARBLE_TRACK_R = 0.95;

const LAP = Math.PI * 2; // one puck revolution
const CYCLE = LAP * 2; // both roots: two laps
const BASE_ANGULAR_SPEED = (Math.PI * 2) / 5; // one lap per 5 s, far
const DROP_DUR = 0.6; // the marble's fall from the cap into sheet A
const FLASH_DECAY = 6;
const CAP_DROP_Y = 3.5; // roughly the cap's centre -- where the marble vanishes

// ---- shared helicoid parametrisation ---------------------------------

function rampAngle(t) {
  return t * RAMP_ANGLE_TOTAL;
}
function rampTopY(t) {
  return RAMP_Y0 + t * (RAMP_Y1 - RAMP_Y0);
}

// A flat ring with real thickness: an annulus shape extruded, then turned
// to lie flat (extrude axis z -> up, y).
function buildAnnulusSlab(rInner, rOuter, thickness, segments = 40) {
  const shape = new Shape();
  shape.absarc(0, 0, rOuter, 0, Math.PI * 2, false);
  const hole = new Path();
  hole.absarc(0, 0, rInner, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const g = new ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: segments });
  g.translate(0, 0, -thickness / 2);
  g.rotateX(-Math.PI / 2);
  return g;
}

// The outer rail, traced once along the whole two-turn helix.
class OuterLipCurve extends Curve {
  getPoint(t, target = new Vector3()) {
    const angle = rampAngle(t);
    const y = rampTopY(t);
    return target.set(Math.sin(angle) * RAMP_OUTER, y, Math.cos(angle) * RAMP_OUTER);
  }
}

// One slab of the helicoid ramp between t0 and t1: a ruled surface with
// inner/outer rails, a real thickness, and end caps only where the ramp
// truly ends (the seam between the two sheets needs none -- they meet
// flush, each covering the other's open end).
function buildRampSheet(t0, t1, segments, capStart, capEnd) {
  const positions = [];
  const indices = [];
  const pushV = (x, y, z) => {
    positions.push(x, y, z);
    return positions.length / 3 - 1;
  };
  const quad = (a, b, c, d) => indices.push(a, b, c, a, c, d);

  let prev = null;
  for (let i = 0; i <= segments; i++) {
    const t = t0 + (t1 - t0) * (i / segments);
    const angle = rampAngle(t);
    const y = rampTopY(t);
    const s = Math.sin(angle);
    const c = Math.cos(angle);
    const cur = {
      iT: pushV(s * RAMP_INNER, y, c * RAMP_INNER),
      oT: pushV(s * RAMP_OUTER, y, c * RAMP_OUTER),
      iB: pushV(s * RAMP_INNER, y - RAMP_THICK, c * RAMP_INNER),
      oB: pushV(s * RAMP_OUTER, y - RAMP_THICK, c * RAMP_OUTER),
    };
    if (prev) {
      quad(prev.iT, prev.oT, cur.oT, cur.iT); // top (upward normal)
      quad(prev.iB, cur.iB, cur.oB, prev.oB); // bottom
      quad(prev.oB, cur.oB, cur.oT, prev.oT); // outer rail (outward normal)
      quad(prev.iB, prev.iT, cur.iT, cur.iB); // inner rail (inward normal)
    } else if (capStart) {
      quad(cur.iB, cur.oB, cur.oT, cur.iT);
    }
    prev = cur;
  }
  if (capEnd) quad(prev.iB, prev.iT, prev.oT, prev.oB);

  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ---- static geometry, built once --------------------------------------

const BASE_GEO = new CylinderGeometry(BASE_R, BASE_R, BASE_H, 16);
const TOWER_GEO = new CylinderGeometry(TOWER_R, TOWER_R, TOWER_H, TOWER_SEG);

// mergeGeometries needs every input either indexed or not, together --
// ExtrudeGeometry (the track annulus) never indexes, so the whole group
// drops its index rather than special-case one part.
const CHARCOAL_GEO = mergeGeometries(
  [
    new ConeGeometry(CAP_R, CAP_H, TOWER_SEG).translate(0, TOWER_H + CAP_H / 2, 0).toNonIndexed(),
    buildAnnulusSlab(TRACK_R0, TRACK_R1, TRACK_THICK, 32).translate(0, TRACK_Y, 0),
    new TubeGeometry(new OuterLipCurve(), 128, LIP_R, 6, false).toNonIndexed(),
    new TorusGeometry(0.22, 0.035, 6, 16).rotateX(Math.PI / 2).translate(0, LAMP_A_Y, LAMP_MOUNT_R).toNonIndexed(),
    new TorusGeometry(0.22, 0.035, 6, 16).rotateX(Math.PI / 2).translate(0, LAMP_B_Y, LAMP_MOUNT_R).toNonIndexed(),
  ],
  false,
);

const SHEET_A_GEO = buildRampSheet(0, 0.5, SHEET_SEGMENTS, true, false);
const SHEET_B_GEO = buildRampSheet(0.5, 1, SHEET_SEGMENTS, false, true);

export default function MonodromySpiral({ place }) {
  const A = place.color;
  const near = useUi((s) => s.near === place.id);
  const nearRef = useRef(near);
  nearRef.current = near;

  const snowMat = useMemo(() => mat(C.snow), []);
  const warmMat = useMemo(() => mat(C.warmWhite), []);
  const charcoalMat = useMemo(() => mat(C.charcoal), []);
  const iceMat = useMemo(() => mat(C.ice), []);
  const accentMat = useMemo(() => mat(A), [A]);

  // These pulse or breathe on their own, so each gets its own clone of the
  // shared cached material to mutate (palette.js: never mutate mat()'s
  // cached result).
  const puckMat = useMemo(() => lamp(C.lamp).clone(), []);
  const lampAMat = useMemo(() => lamp("#e8f6ff").clone(), []);
  const lampBMat = useMemo(() => lamp(A).clone(), [A]);
  const marbleMat = useMemo(() => lamp(A, 1.4).clone(), [A]);
  const marbleGlowMat = useMemo(() => glow(A), [A]);

  const puckRef = useRef(null);
  const marbleRef = useRef(null);

  const nearK = useRef(0);
  const phase = useRef(0); // 0..CYCLE, the shared angle the puck and marble share
  const dropTimer = useRef(0); // >0 while the marble falls from the cap into sheet A
  const lampAOn = useRef(true); // the marble starts at sheet A's foot
  const lampBOn = useRef(false);
  const puckFlash = useRef(0);
  const lampAFlash = useRef(0);
  const lampBFlash = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const k = damp(EASE, dt);
    nearK.current += ((nearRef.current ? 1 : 0) - nearK.current) * k;

    const angularSpeed = BASE_ANGULAR_SPEED * (1 + 0.5 * nearK.current); // x1.5 near
    const prevPhase = phase.current;
    let next = prevPhase + angularSpeed * dt;
    let crossedLap = false;
    let crossedCycle = false;
    if (next >= CYCLE) {
      next -= CYCLE;
      crossedCycle = true;
    } else if (prevPhase < LAP && next >= LAP) {
      crossedLap = true;
    }
    phase.current = next;

    if (crossedLap) {
      // The loop below closes: the puck is home, but the marble lands on
      // the other root, sheet B.
      lampAOn.current = false;
      lampBOn.current = true;
      puckFlash.current = 1;
      lampBFlash.current = 1;
      if (nearRef.current) lampAFlash.current = 1;
    }
    if (crossedCycle) {
      // Back to the start, only after two laps.
      lampAOn.current = true;
      lampBOn.current = false;
      lampAFlash.current = 1;
      dropTimer.current = DROP_DUR;
      if (nearRef.current) lampBFlash.current = 1;
    }

    const decay = Math.exp(-FLASH_DECAY * dt);
    puckFlash.current *= decay;
    lampAFlash.current *= decay;
    lampBFlash.current *= decay;
    dropTimer.current = Math.max(0, dropTimer.current - dt);

    // Puck: circles the flat track at the tower's foot.
    const puckAngle = phase.current < LAP ? phase.current : phase.current - LAP;
    if (puckRef.current) {
      puckRef.current.position.set(Math.sin(puckAngle) * PUCK_TRACK_R, PUCK_Y, Math.cos(puckAngle) * PUCK_TRACK_R);
    }
    puckMat.emissiveIntensity = 1 + puckFlash.current * 2.5;

    // Marble: climbs the ramp in step with the puck's angle, except on its
    // arrival (dropTimer) when it falls from the cap into sheet A instead.
    const t = phase.current / CYCLE;
    const angle = rampAngle(t);
    const normalY = rampTopY(t) + MARBLE_R;
    const normalX = Math.sin(angle) * MARBLE_TRACK_R;
    const normalZ = Math.cos(angle) * MARBLE_TRACK_R;
    if (marbleRef.current) {
      if (dropTimer.current > 0) {
        const u = smoothstep(0, 1, 1 - dropTimer.current / DROP_DUR);
        marbleRef.current.position.set(normalX * u, CAP_DROP_Y + (normalY - CAP_DROP_Y) * u, normalZ * u);
      } else {
        marbleRef.current.position.set(normalX, normalY, normalZ);
      }
    }
    marbleMat.emissiveIntensity = 1.4 + nearK.current * 0.6;

    lampAMat.emissiveIntensity = (lampAOn.current ? 1.1 : 0.5) + lampAFlash.current * 2.2;
    lampBMat.emissiveIntensity = (lampBOn.current ? 1.1 : 0.5) + lampBFlash.current * 2.2;
  });

  return (
    <group>
      <mesh castShadow receiveShadow geometry={BASE_GEO} material={snowMat} position={[0, BASE_H / 2, 0]} />
      <mesh castShadow receiveShadow geometry={TOWER_GEO} material={warmMat} position={[0, TOWER_H / 2, 0]} />
      <mesh castShadow receiveShadow geometry={CHARCOAL_GEO} material={charcoalMat} />
      <mesh castShadow receiveShadow geometry={SHEET_A_GEO} material={iceMat} />
      <mesh castShadow receiveShadow geometry={SHEET_B_GEO} material={accentMat} />

      <mesh material={lampAMat} position={[0, LAMP_A_Y, LAMP_MOUNT_R]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.1, 12]} />
      </mesh>
      <mesh material={lampBMat} position={[0, LAMP_B_Y, LAMP_MOUNT_R]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.1, 12]} />
      </mesh>

      <mesh ref={puckRef} castShadow material={puckMat}>
        <cylinderGeometry args={[PUCK_R, PUCK_R, PUCK_H, 12]} />
      </mesh>

      <group ref={marbleRef}>
        <mesh castShadow material={marbleMat}>
          <sphereGeometry args={[MARBLE_R, 14, 10]} />
        </mesh>
        <mesh material={marbleGlowMat}>
          <sphereGeometry args={[MARBLE_R * 1.7, 12, 8]} />
        </mesh>
      </group>
    </group>
  );
}
