"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BoxGeometry, CylinderGeometry, IcosahedronGeometry, SphereGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useUi } from "../../../lib/world/store";
import { C, glow, lamp, mat } from "../palette";

// Landmark for PLACE_BY_ID["separatrix"] in lib/world/places.js: a balance
// scale that certifies a top-k was decided by the data, not by rounding.
// Local space: origin at the footprint centre on the snow, +z faces the
// camera and the dock. Radius 2.0, top <= 3.6 m.
//
// Static (never moves, merged into 3 draw calls): base + post + flag stub
// (charcoal), base cap (warm white), fulcrum (accent). Everything else -
// beam, pans, bubbles, flag, lamp, post pulse - is an animated part driven
// by one useFrame that eases toward a target per 8 s cycle phase.

const DEG = Math.PI / 180;
const BEAT = 8 / 3; // seconds; certified holds two beats (four when near), refused holds one
const PULSE_PERIOD = 1.4; // seconds per pulse lap down the post
const PAN_SIDE_X = 1.5; // beam-end offset the pans hang from
const PIVOT_Y = 3.05;

// Frame-rate independent ease toward a target (kit: "ease a ref k with 1-exp(-4dt)").
const approach = (current, target, rate, dt) => current + (target - current) * (1 - Math.exp(-rate * dt));

// --- static geometry, built once and shared (memoize geometries) ---------

const staticCharcoalGeometry = mergeGeometries([
  new CylinderGeometry(0.6, 0.6, 0.25, 12).translate(0, 0.475, 0), // base cap
  new BoxGeometry(0.3, 2.3, 0.3).translate(0, 1.75, 0), // post, top at y 2.9
  new BoxGeometry(0.12, 0.45, 0.12).translate(0, 3.125, 0), // stub to the flag
]);
const baseBottomGeometry = new CylinderGeometry(0.9, 0.9, 0.35, 12).translate(0, 0.175, 0);
const fulcrumGeometry = new CylinderGeometry(0.3, 0.3, 0.3, 3).rotateX(-Math.PI / 2); // axis along z, apex up

const beamBarGeometry = new BoxGeometry(3.2, 0.2, 0.24);
const endCapsGeometry = mergeGeometries([
  new BoxGeometry(0.24, 0.24, 0.24).translate(-PAN_SIDE_X, 0, 0),
  new BoxGeometry(0.24, 0.24, 0.24).translate(PAN_SIDE_X, 0, 0),
]);

// One hanger+rim shape reused for both pans (each pan group carries its own
// world position, so the local geometry is identical on both sides).
const hangerRimGeometry = mergeGeometries([
  new BoxGeometry(0.12, 0.9, 0.12).translate(0, -0.45, 0), // hanger
  new CylinderGeometry(0.47, 0.47, 0.14, 10, 1, true).translate(0, -0.96, 0), // rim lip
]);
const panGeometry = new CylinderGeometry(0.45, 0.45, 0.12, 12).translate(0, -0.96, 0);
const cubeGeometry = new BoxGeometry(0.42, 0.42, 0.42);
const bubbleGeometry = new IcosahedronGeometry(1, 1); // scaled 0.4..0.8 as the error bound
const ITEM_Y = -0.69; // cube + bubble centre within a pan group

const flagGeometry = new BoxGeometry(0.5, 0.34, 0.08); // face order: px,nx,py,ny,pz,nz
const lampGeometry = new SphereGeometry(0.12, 10, 8);
const pulseGeometry = new CylinderGeometry(0.22, 0.22, 0.08, 10, 1, true);

export default function SeparatrixScales({ place }) {
  const A = place.color;
  const near = useUi((s) => s.near === place.id);

  const matCharcoal = useMemo(() => mat(C.charcoal), []);
  const matWarmWhite = useMemo(() => mat(C.warmWhite), []);
  const matAccent = useMemo(() => mat(A), [A]);
  // Cloned so this one instance's emissiveIntensity can be mutated per frame
  // without touching every other user of mat(C.ice, ...).
  const matIce = useMemo(() => mat(C.ice, { roughness: 0.35, emissive: A, emissiveIntensity: 0 }).clone(), [A]);
  const matBubble = useMemo(() => glow(A, 0.18), [A]); // only scaled, never mutated: safe to share
  const matPulse = useMemo(() => glow(A, 0.35).clone(), [A]); // opacity mutated per frame
  const matLamp = useMemo(() => lamp(C.lamp, 2), []);
  const flagMaterials = useMemo(
    () => [matCharcoal, matCharcoal, matCharcoal, matCharcoal, matAccent, matCharcoal],
    [matCharcoal, matAccent],
  );

  const beamRef = useRef(null);
  const leftPanRef = useRef(null);
  const rightPanRef = useRef(null);
  const leftBubbleRef = useRef(null);
  const rightBubbleRef = useRef(null);
  const flagRef = useRef(null);
  const lampRef = useRef(null);
  const pulseRef = useRef(null);
  const anim = useRef({ angle: 0, bubble: 0.55, flag: 0, glow: 0 });

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const certDur = (near ? 4 : 2) * BEAT;
    const cycle = certDur + BEAT;
    const tt = t % cycle;
    const refused = tt >= certDur;
    const a = anim.current;

    const targetAngle = refused ? Math.sin((tt - certDur) * 5) * (2 * DEG) : 12 * DEG;
    const targetBubble = refused ? 0.8 : 0.4;
    const targetFlag = refused ? Math.PI : 0;
    const targetGlow = refused ? 0.55 : 0;
    const bubbleRate = refused ? 4 : near ? 9 : 4.5; // NEAR: bubbles shrink faster

    a.angle = approach(a.angle, targetAngle, 4, dt);
    a.bubble = approach(a.bubble, targetBubble, bubbleRate, dt);
    a.flag = approach(a.flag, targetFlag, 4, dt);
    a.glow = approach(a.glow, targetGlow, 4, dt);
    matIce.emissiveIntensity = a.glow;

    if (beamRef.current) beamRef.current.rotation.z = a.angle;
    if (flagRef.current) flagRef.current.rotation.y = a.flag;

    const cosA = Math.cos(a.angle);
    const sinA = Math.sin(a.angle);
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

    if (lampRef.current) lampRef.current.visible = refused && Math.sin(t * 10) > 0;

    if (pulseRef.current) {
      if (refused) {
        pulseRef.current.visible = false;
      } else {
        const p = (tt % PULSE_PERIOD) / PULSE_PERIOD;
        pulseRef.current.visible = true;
        pulseRef.current.position.y = 2.85 - p * (2.85 - 0.65);
        matPulse.opacity = Math.sin(p * Math.PI) * 0.35;
      }
    }
  });

  return (
    <group>
      <mesh geometry={baseBottomGeometry} material={matWarmWhite} castShadow receiveShadow />
      <mesh geometry={staticCharcoalGeometry} material={matCharcoal} castShadow receiveShadow />
      {/* CylinderGeometry's 3-segment cross-section is not y-symmetric: the
          apex sits a full radius above this origin, the two base corners
          only half a radius below it. 2.65 puts the apex at the beam's
          underside (2.95) so the beam visually rests on the wedge. */}
      <mesh geometry={fulcrumGeometry} material={matAccent} position={[0, 2.65, 0]} castShadow />

      <group ref={beamRef} position={[0, PIVOT_Y, 0]}>
        <mesh geometry={beamBarGeometry} material={matCharcoal} castShadow />
        <mesh geometry={endCapsGeometry} material={matAccent} castShadow />
      </group>

      <group ref={leftPanRef}>
        <mesh geometry={hangerRimGeometry} material={matCharcoal} castShadow />
        <mesh geometry={panGeometry} material={matWarmWhite} castShadow receiveShadow />
        <mesh geometry={cubeGeometry} material={matIce} position={[0, ITEM_Y, 0]} castShadow />
        <mesh ref={leftBubbleRef} geometry={bubbleGeometry} material={matBubble} position={[0, ITEM_Y, 0]} />
      </group>
      <group ref={rightPanRef}>
        <mesh geometry={hangerRimGeometry} material={matCharcoal} castShadow />
        <mesh geometry={panGeometry} material={matWarmWhite} castShadow receiveShadow />
        <mesh geometry={cubeGeometry} material={matIce} position={[0, ITEM_Y, 0]} castShadow />
        <mesh ref={rightBubbleRef} geometry={bubbleGeometry} material={matBubble} position={[0, ITEM_Y, 0]} />
      </group>

      <mesh ref={lampRef} geometry={lampGeometry} material={matLamp} position={[0, 2.2, 0]} visible={false} />

      <group ref={flagRef} position={[0, 3.35, 0]}>
        <mesh geometry={flagGeometry} material={flagMaterials} castShadow />
      </group>

      <mesh ref={pulseRef} geometry={pulseGeometry} material={matPulse} position={[0, 2.85, 0]} />
    </group>
  );
}
