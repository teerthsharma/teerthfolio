"use client";

// Sculpture for the "transport" figure: monodromy (place id p-monodromy).
// Local origin: on the snow at the place centre; +z faces the camera and
// the dock. Props: { place }; near comes from the shared store like every
// other building.
//
// data/showcase.json's p-monodromy: "Can it be undone? Topology answers.",
// figure.title "The loop closes below but not above", figure.desc: a point
// walks a closed loop, and the inverse carried along the surface's edge is
// on the other sheet when the loop below has closed — only a second lap
// brings it home ("5 dependencies", "torch not required", "no Jacobian
// required"). teerthsharma.github.io/fig.js's transport() draws that as a
// flat illustration: a warped disc, mint (positive root) through blue and
// violet to coral (negative), with a floor loop that closes every lap and a
// lifted rim that only closes every second one.
//
// Built here as the ordinary thing whose job is exactly that: a
// helter-skelter. A puck circles the flat track at its foot -- one lap and
// it is home, the loop below closes, every time. A marble climbs the
// two-turn spiral ramp wrapped round the tower in lock step with the
// puck's angle: after that same lap it is directly above the puck again,
// but only halfway up (the OTHER root, sheet B lit instead of sheet A) --
// one trip round the base does not undo the climb. Only the second lap
// carries it to the top, where it drops back into the tower and reappears
// at the ramp's foot: home, but only after two laps. An amber beacon at
// the seam (where every lap begins and ends) flashes at both moments, the
// same comparison the figure's dashed line and amber gap mark.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BufferGeometry,
  CatmullRomCurve3,
  ConeGeometry,
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
import { buildRampSheetData, outerLipPoints, RAMP_SEGMENTS, rampAngle, rampTopY, SHEET_SEGMENTS } from "./parts/transport-ramp";

const BASE_R = 2.0;
const BASE_H = 0.3;

const TRACK_R0 = 1.7;
const TRACK_R1 = 1.95;
const TRACK_THICK = 0.16;
const TRACK_Y = 0.34; // centre height
const PUCK_TRACK_R = 1.82;
const PUCK_R = 0.2;
const PUCK_H = 0.16;
const PUCK_Y = TRACK_Y + TRACK_THICK / 2 + PUCK_H / 2;

const TOWER_R = 0.7;
const TOWER_H = 4.0;
const TOWER_SEG = 10;
const CAP_R = 0.66; // narrower and taller than the tower's own body: a spire, not a hat
const CAP_H = 0.95; // apex at TOWER_H + CAP_H = 4.95
const FINIAL_R = 0.16; // the one bright point at the very top, in the place's accent

const LAMP_MOUNT_R = TOWER_R + 0.07; // proud of the tower's +z face
const LAMP_A_Y = 0.6;
const LAMP_B_Y = 2.35;
const LIP_R = 0.09;

const SEAM_X = 0; // the start-line beacon: flush against the tower's own +z face, not out at the ramp's rail
const SEAM_Z = LAMP_MOUNT_R + 0.03;
const SEAM_Y0 = BASE_H;
const SEAM_Y1 = TOWER_H - 0.05; // stops below the cap, never pokes through the spire
const SEAM_R = 0.05;

const MARBLE_R = 0.28;
const MARBLE_TRACK_R = 1.18;
const CAP_DROP_Y = TOWER_H + CAP_H * 0.35; // roughly the cap's centre -- where the marble vanishes

const LAP = Math.PI * 2; // one puck revolution
const CYCLE = LAP * 2; // both roots: two laps
const BASE_ANGULAR_SPEED = (Math.PI * 2) / 5; // one lap per 5 s, far
const DROP_DUR = 0.6; // the marble's fall from the cap into the ramp's foot
const FLASH_DECAY = 6;
const EASE = 4; // shared rate for the near/far blend: k = 1 - exp(-EASE*dt)

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

function sheetGeometry(t0, t1, capStart, capEnd) {
  const { positions, indices } = buildRampSheetData(t0, t1, SHEET_SEGMENTS, capStart, capEnd);
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ---- static geometry, built once --------------------------------------

const BASE_GEO = new CylinderGeometry(BASE_R, BASE_R, BASE_H, 16);
const TOWER_GEO = new CylinderGeometry(TOWER_R, TOWER_R, TOWER_H, TOWER_SEG);

const lipCurve = new CatmullRomCurve3(outerLipPoints(RAMP_SEGMENTS).map(([x, y, z]) => new Vector3(x, y, z)));

// mergeGeometries needs every input either indexed or not, together --
// ExtrudeGeometry (the track annulus) never indexes, so the whole group
// drops its index rather than special-case one part.
const CHARCOAL_GEO = mergeGeometries(
  [
    new ConeGeometry(CAP_R, CAP_H, TOWER_SEG).translate(0, TOWER_H + CAP_H / 2, 0).toNonIndexed(),
    buildAnnulusSlab(TRACK_R0, TRACK_R1, TRACK_THICK, 32).translate(0, TRACK_Y, 0),
    new TubeGeometry(lipCurve, RAMP_SEGMENTS, LIP_R, 6, false).toNonIndexed(),
    new TorusGeometry(0.24, 0.04, 6, 16).rotateX(Math.PI / 2).translate(0, LAMP_A_Y, LAMP_MOUNT_R).toNonIndexed(),
    new TorusGeometry(0.24, 0.04, 6, 16).rotateX(Math.PI / 2).translate(0, LAMP_B_Y, LAMP_MOUNT_R).toNonIndexed(),
  ],
  false,
);

const SHEET_A_GEO = sheetGeometry(0, 0.5, true, false);
const SHEET_B_GEO = sheetGeometry(0.5, 1, false, true);

export default function Transport({ place }) {
  const A = place.radiation ?? place.color;
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
  const lampAMat = useMemo(() => lamp(C.ice).clone(), []);
  const lampBMat = useMemo(() => lamp(A).clone(), [A]);
  const marbleMat = useMemo(() => lamp(A, 1.4).clone(), [A]);
  const marbleGlowMat = useMemo(() => glow(A), [A]);
  const finialGlowMat = useMemo(() => glow(A, 0.3), [A]);
  const seamMat = useMemo(() => lamp(C.lamp).clone(), []);

  const puckRef = useRef(null);
  const marbleRef = useRef(null);
  const seamRef = useRef(null);

  const nearK = useRef(0);
  const phase = useRef(0); // 0..CYCLE, the shared angle the puck and marble share
  const dropTimer = useRef(0); // >0 while the marble falls from the cap into the ramp's foot
  const lampAOn = useRef(true); // the marble starts at the foot: sheet A
  const lampBOn = useRef(false);
  const puckFlash = useRef(0);
  const lampAFlash = useRef(0);
  const lampBFlash = useRef(0);
  const seamFlash = useRef(0);

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
      // the other root, the ramp's second sheet.
      lampAOn.current = false;
      lampBOn.current = true;
      puckFlash.current = 1;
      lampBFlash.current = 1;
      seamFlash.current = 1;
    }
    if (crossedCycle) {
      // Back to the start, only after two laps.
      lampAOn.current = true;
      lampBOn.current = false;
      lampAFlash.current = 1;
      seamFlash.current = 1;
      dropTimer.current = DROP_DUR;
    }

    const decay = Math.exp(-FLASH_DECAY * dt);
    puckFlash.current *= decay;
    lampAFlash.current *= decay;
    lampBFlash.current *= decay;
    seamFlash.current *= decay;
    dropTimer.current = Math.max(0, dropTimer.current - dt);

    // Puck: circles the flat track at the tower's foot -- always closes.
    const puckAngle = phase.current < LAP ? phase.current : phase.current - LAP;
    if (puckRef.current) {
      puckRef.current.position.set(Math.sin(puckAngle) * PUCK_TRACK_R, PUCK_Y, Math.cos(puckAngle) * PUCK_TRACK_R);
    }
    puckMat.emissiveIntensity = 1 + puckFlash.current * 2.5;

    // Marble: climbs the ramp in step with the puck's angle, except right
    // after arrival (dropTimer) when it falls from the cap into the foot
    // instead.
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
    seamMat.emissiveIntensity = 0.7 + seamFlash.current * 2.6;
    if (seamRef.current) seamRef.current.scale.y = 1 + seamFlash.current * 0.06;
  });

  return (
    <group>
      <mesh castShadow receiveShadow geometry={BASE_GEO} material={snowMat} position={[0, BASE_H / 2, 0]} />
      <mesh castShadow receiveShadow geometry={TOWER_GEO} material={warmMat} position={[0, TOWER_H / 2, 0]} />
      <mesh castShadow receiveShadow geometry={CHARCOAL_GEO} material={charcoalMat} />
      <mesh castShadow receiveShadow geometry={SHEET_A_GEO} material={iceMat} />
      <mesh castShadow receiveShadow geometry={SHEET_B_GEO} material={accentMat} />

      {/* the one bright point at the top of the spire, in the place's own accent */}
      <mesh castShadow material={accentMat} position={[0, TOWER_H + CAP_H + FINIAL_R * 0.6, 0]}>
        <sphereGeometry args={[FINIAL_R, 12, 10]} />
      </mesh>
      <mesh material={finialGlowMat} position={[0, TOWER_H + CAP_H + FINIAL_R * 0.6, 0]}>
        <sphereGeometry args={[FINIAL_R * 1.8, 10, 8]} />
      </mesh>

      <mesh material={lampAMat} position={[0, LAMP_A_Y, LAMP_MOUNT_R]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.1, 12]} />
      </mesh>
      <mesh material={lampBMat} position={[0, LAMP_B_Y, LAMP_MOUNT_R]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.1, 12]} />
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

      {/* the start line: where every lap begins and ends, flashing at the
          comparison, the same amber gap the figure marks with a dashed line */}
      <mesh ref={seamRef} castShadow material={seamMat} position={[SEAM_X, (SEAM_Y0 + SEAM_Y1) / 2, SEAM_Z]}>
        <cylinderGeometry args={[SEAM_R, SEAM_R, SEAM_Y1 - SEAM_Y0, 8]} />
      </mesh>
    </group>
  );
}
