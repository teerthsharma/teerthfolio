"use client";

// Building for the "certify" figure: separatrix (place id p-separatrix).
// figure.desc: a phase portrait with two attractors and a saddle; every
// start flows to one side or the other unless its rounding disc touches the
// separatrix, in which case it is torn toward both sides and nothing is
// returned. figure.claim: certifies a top-k, an argmin or a threshold was
// decided by the data, not by where the kernel rounded.
//
// The everyday building whose job that is: a checkpoint booth with a boom
// gate, judged by an oversized balance scale on its roof (a courthouse's
// scales of justice, doing a weigh station's job). Each cycle the beam tips
// firmly to one side -- decided, the gate lifts -- or it hangs near level and
// wobbles, the rounding bubble round each pan swells, the gate stays down
// and the roof beacon blinks: refused, nothing gets through. Loop, faster
// and brighter when near.
//
// Local origin: the snow at the place centre (no plinth); +z faces the
// camera and the dock. Props: { place, near? } -- near falls back to the ui
// store since Scene.jsx's lab path does not pass it as a prop.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BoxGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useUi } from "../../../lib/world/store";
import { damp } from "../life/util";
import { C, glow, lamp, mat } from "../palette";

const DEG = Math.PI / 180;

// Booth (charcoal roof + post, warm-white walls), centred slightly behind
// the gate so the lane it guards reads front-to-back.
const BOOTH_X = 0, BOOTH_Z = -0.35;
const BOOTH_W = 1.4, BOOTH_D = 1.05, WALL_H = 1.65;
const ROOF_R = 1.0, ROOF_H = 0.8;
const ROOF_Y = WALL_H + ROOF_H; // apex

// The scale rises straight out of the roof apex to its pivot.
const PIVOT_Y = 5.0;
const POST_LEN = PIVOT_Y - ROOF_Y;
const BEAM_LEN = 2.4;
const PAN_SIDE_X = 1.15;
const ITEM_Y = -0.66; // cargo cube + bubble centre within a pan group

// The boom gate, beside the booth, arm swinging across the lane toward it.
const GATE_X = 1.05, GATE_Z = 0.55;
const GATE_POST_H = 1.3, GATE_POST_R = 0.09;
const ARM_LEN = 1.7;
const ARM_UP = 108 * DEG; // lift from horizontal (blocking) toward vertical

const BEAT = 2.4; // s at rest; near shortens the cycle and sharpens the wobble
const MAX_TIP = 27 * DEG;

// --- static geometry, built once and shared -------------------------------

const wallGeo = new BoxGeometry(BOOTH_W, WALL_H, BOOTH_D).translate(BOOTH_X, WALL_H / 2, BOOTH_Z);

const charcoalStaticGeo = mergeGeometries([
  new ConeGeometry(ROOF_R, ROOF_H, 4).rotateY(Math.PI / 4).translate(BOOTH_X, ROOF_Y - ROOF_H / 2, BOOTH_Z),
  new CylinderGeometry(0.13, 0.16, POST_LEN, 8).translate(BOOTH_X, ROOF_Y + POST_LEN / 2, BOOTH_Z),
  new CylinderGeometry(GATE_POST_R, GATE_POST_R, GATE_POST_H, 8).translate(GATE_X, GATE_POST_H / 2, GATE_Z),
]);

const windowGeo = new CylinderGeometry(0.24, 0.24, 0.06, 12).rotateX(Math.PI / 2);
const fulcrumGeo = new CylinderGeometry(0.26, 0.26, 0.26, 3).rotateX(-Math.PI / 2); // apex up, under the beam

const beamBarGeo = new BoxGeometry(BEAM_LEN, 0.16, 0.2);
const endCapsGeo = mergeGeometries([
  new BoxGeometry(0.22, 0.22, 0.22).translate(-PAN_SIDE_X, 0, 0),
  new BoxGeometry(0.22, 0.22, 0.22).translate(PAN_SIDE_X, 0, 0),
]);
const hangerRimGeo = mergeGeometries([
  new BoxGeometry(0.11, 0.85, 0.11).translate(0, -0.425, 0),
  new CylinderGeometry(0.45, 0.45, 0.13, 10, 1, true).translate(0, -0.9, 0),
]);
const panGeo = new CylinderGeometry(0.43, 0.43, 0.11, 12).translate(0, -0.9, 0);
const cubeGeo = new BoxGeometry(0.4, 0.4, 0.4);
const bubbleGeo = new IcosahedronGeometry(1, 1); // scaled 0.35..0.85 as the rounding margin

// The arm reads as a barrier, not a stick: four flush bands, charcoal
// alternating with warm white, the classic boom-gate candy stripe.
const ARM_BANDS = 4;
const ARM_BAND_W = ARM_LEN / ARM_BANDS;
const armBand = (i) => new BoxGeometry(ARM_BAND_W - 0.02, 0.14, 0.14).translate(-ARM_BAND_W * (i + 0.5), 0, 0);
const armDarkGeo = mergeGeometries([armBand(0), armBand(2)]);
const armLightGeo = mergeGeometries([armBand(1), armBand(3)]);
const armTipGeo = new BoxGeometry(0.18, 0.18, 0.18).translate(-ARM_LEN, 0, 0);
const beaconGeo = new IcosahedronGeometry(0.1, 1);

export default function Certify({ place, near: nearProp }) {
  const A = place.radiation ?? place.color;
  const nearStore = useUi((s) => s.near === place.id);
  const near = nearProp ?? nearStore;

  const matCharcoal = useMemo(() => mat(C.charcoal), []);
  const matWarmWhite = useMemo(() => mat(C.warmWhite), []);
  const matAccent = useMemo(() => mat(A), [A]);
  const matIce = useMemo(() => mat(C.ice, { roughness: 0.35, emissive: A, emissiveIntensity: 0 }).clone(), [A]);
  const matBubble = useMemo(() => glow(A, 0.32), [A]);
  const matWindow = useMemo(() => lamp(A, 0.6).clone(), [A]);
  const matBeacon = useMemo(() => lamp(A, 2.2), [A]);

  const beamRef = useRef(null);
  const leftPanRef = useRef(null);
  const rightPanRef = useRef(null);
  const leftBubbleRef = useRef(null);
  const rightBubbleRef = useRef(null);
  const gateRef = useRef(null);
  const beaconRef = useRef(null);
  const anim = useRef({ angle: 0, bubble: 0.55, gate: 0, windowGlow: 0.3, ice: 0 });

  useFrame((state, dt) => {
    const boost = near ? 1.35 : 1;
    const t = state.clock.elapsedTime * (near ? 1.45 : 1);
    const certDur = (near ? 3 : 2) * BEAT;
    const cycle = certDur + BEAT;
    const tt = t % cycle;
    const refused = tt >= certDur;
    const side = Math.floor(t / cycle) % 2 === 0 ? 1 : -1;
    const a = anim.current;

    const targetAngle = refused ? Math.sin(tt * 6) * 2 * DEG : side * MAX_TIP;
    const targetBubble = refused ? 0.85 : 0.28;
    const targetGate = refused ? 0 : 1;
    const targetIce = refused ? 0.5 : 0.14; // a resting glimmer so the cargo reads against the pan even while settled
    const targetWindow = refused ? 0.35 : Math.max(0, 1 - tt / 0.4); // a bright flash as it settles, an ember while refused

    a.angle += (targetAngle - a.angle) * damp(near ? 7 : 4.5, dt);
    a.bubble += (targetBubble - a.bubble) * damp(4, dt);
    a.gate += (targetGate - a.gate) * damp(3.2, dt);
    a.ice += (targetIce - a.ice) * damp(4, dt);
    a.windowGlow += (targetWindow - a.windowGlow) * damp(6, dt);

    if (beamRef.current) beamRef.current.rotation.z = a.angle;
    if (gateRef.current) gateRef.current.rotation.z = -a.gate * ARM_UP;
    matIce.emissiveIntensity = a.ice * boost;
    matWindow.emissiveIntensity = (0.4 + a.windowGlow * 2.4) * boost;
    if (beaconRef.current) beaconRef.current.visible = refused && Math.sin(t * 11) > 0;

    const cosA = Math.cos(a.angle), sinA = Math.sin(a.angle);
    if (leftPanRef.current) {
      leftPanRef.current.position.x = -PAN_SIDE_X * cosA;
      leftPanRef.current.position.y = PIVOT_Y - PAN_SIDE_X * sinA;
    }
    if (rightPanRef.current) {
      rightPanRef.current.position.x = PAN_SIDE_X * cosA;
      rightPanRef.current.position.y = PIVOT_Y + PAN_SIDE_X * sinA;
    }
    if (leftBubbleRef.current) leftBubbleRef.current.scale.setScalar(a.bubble);
    if (rightBubbleRef.current) rightBubbleRef.current.scale.setScalar(a.bubble);
  });

  return (
    <group>
      <mesh geometry={charcoalStaticGeo} material={matCharcoal} castShadow receiveShadow />
      <mesh geometry={wallGeo} material={matWarmWhite} castShadow receiveShadow />
      <mesh geometry={windowGeo} material={matWindow} position={[BOOTH_X, 1.05, BOOTH_Z + BOOTH_D / 2 + 0.03]} />

      <group ref={gateRef} position={[GATE_X, GATE_POST_H, GATE_Z]}>
        <mesh geometry={armDarkGeo} material={matCharcoal} castShadow />
        <mesh geometry={armLightGeo} material={matWarmWhite} castShadow />
        <mesh geometry={armTipGeo} material={matAccent} castShadow />
      </group>
      <mesh ref={beaconRef} geometry={beaconGeo} material={matBeacon} position={[GATE_X, GATE_POST_H + 0.24, GATE_Z]} />

      <mesh geometry={fulcrumGeo} material={matAccent} position={[BOOTH_X, PIVOT_Y - 0.06, BOOTH_Z]} castShadow />
      <group ref={beamRef} position={[BOOTH_X, PIVOT_Y, BOOTH_Z]}>
        <mesh geometry={beamBarGeo} material={matCharcoal} castShadow />
        <mesh geometry={endCapsGeo} material={matAccent} castShadow />
      </group>

      <group ref={leftPanRef} position={[-PAN_SIDE_X, PIVOT_Y, BOOTH_Z]}>
        <mesh geometry={hangerRimGeo} material={matCharcoal} castShadow />
        <mesh geometry={panGeo} material={matWarmWhite} castShadow receiveShadow />
        <mesh geometry={cubeGeo} material={matIce} position={[0, ITEM_Y, 0]} castShadow />
        <mesh ref={leftBubbleRef} geometry={bubbleGeo} material={matBubble} position={[0, ITEM_Y, 0]} />
      </group>
      <group ref={rightPanRef} position={[PAN_SIDE_X, PIVOT_Y, BOOTH_Z]}>
        <mesh geometry={hangerRimGeo} material={matCharcoal} castShadow />
        <mesh geometry={panGeo} material={matWarmWhite} castShadow receiveShadow />
        <mesh geometry={cubeGeo} material={matIce} position={[0, ITEM_Y, 0]} castShadow />
        <mesh ref={rightBubbleRef} geometry={bubbleGeo} material={matBubble} position={[0, ITEM_Y, 0]} />
      </group>
    </group>
  );
}
