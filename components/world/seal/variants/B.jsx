"use client";

// Seal variant B: the harp-seal pup as a vinyl toy, smooth sculpted parts
// that overlap and articulate (geometry in B-parts.js). Every pivot is posed
// from `drive` each frame; see Seal.jsx for the props contract.
//
//   body       lean, squash about the ground, happy wiggle, boost stretch
//    chest     lifts and pitches first in each galumph
//     neck     counter-pitches so the eyes stay steady
//      head    = headRef, origin at the skull centre: face, lids, <Outfit>
//     flippers paddle, push on landing, wave, sweep back for boost
//    hips      follow the chest 0.3 of a stride later
//     tail     lifts with the hips, sways, flicks, wags when happy

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial } from "three";
import Outfit from "../Outfit";
import { buildSealB, FLIPPER_REST, MOUTH, PIVOT } from "./B-parts";

const TAU = Math.PI * 2;
const rel = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Lid angles about each eye's level axis (rad).
const UPPER_OPEN = -1.2;
const UPPER_SHUT = 1.05;
const LOWER_OPEN = 1.15;
const LOWER_HAPPY = -0.6; // rises to leave a ^ of eye showing

function materials() {
  return {
    coat: new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.45, clearcoat: 0.7, clearcoatRoughness: 0.22 }),
    eye: new MeshPhysicalMaterial({ color: "#111318", roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 }),
    catchlight: new MeshBasicMaterial({ color: "#ffffff", toneMapped: false }),
    mouth: new MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }),
  };
}

function poseFlipper(o, side, d, liftC, land) {
  const wave = d.waveSide === side ? d.wave : 0;
  const flap = d.happy * (0.5 + 0.5 * Math.sin(d.t * 14 + side));
  const back = FLIPPER_REST.back + 0.45 * land - 0.15 * liftC + (1.25 - FLIPPER_REST.back) * d.boost - 0.7 * wave + Math.sin(d.t * 16) * 0.35 * wave;
  const down = FLIPPER_REST.down + 0.22 * liftC - (FLIPPER_REST.down - 0.25) * d.boost - 1.9 * wave - 0.35 * flap;
  o.rotation.set(Math.sin(d.t * 16) * 0.3 * wave, back, -down, "YZX");
}

export default function SealB({ near, drive, headRef }) {
  const parts = useMemo(buildSealB, []);
  const mats = useMemo(materials, []);
  useEffect(() => () => {
    for (const g of Object.values(parts)) g.dispose?.();
    for (const m of Object.values(mats)) m.dispose();
  }, [parts, mats]);

  const body = useRef();
  const chest = useRef();
  const neck = useRef();
  const hips = useRef();
  const tail = useRef();
  const flipL = useRef();
  const flipR = useRef();
  const catchlights = useRef();
  const mouth = useRef();
  const lids = useRef([]);

  useFrame(() => {
    const d = drive;
    const { happy, blink } = d;
    const phase = TAU * d.stride;
    const amp = d.stepping * (1 - 0.5 * d.boost);
    const s = Math.sin(phase);
    const liftC = Math.max(0, s) * amp; // chest off the snow
    const liftH = Math.max(0, Math.sin(phase - TAU * 0.3)) * amp; // hips, 0.3 stride later
    const land = Math.max(0, -s) * amp;
    const sq = d.squash;

    const b = body.current;
    b.rotation.z = d.lean + Math.sin(d.t * 18) * 0.14 * happy;
    b.scale.set(
      1 + 0.15 * sq,
      (1 - 0.3 * sq) * (1 - 0.06 * land) * (1 - 0.06 * d.boost),
      (1 + 0.15 * sq) * (1 + 0.06 * liftC + 0.08 * d.boost),
    );

    const c = chest.current;
    c.position.y = PIVOT.chest[1] + 0.12 * liftC;
    c.rotation.set(-0.14 * s * amp, d.turn * 0.08, 0);
    c.scale.y = 1 + 0.015 * Math.sin(d.t * 2.4);
    neck.current.rotation.x = 0.11 * s * amp + 0.3 * Math.max(0, sq) + 0.12 * d.boost;
    headRef.current.rotation.set(-d.lookPitch, d.lookYaw, 0, "YXZ");

    const h = hips.current;
    h.position.y = PIVOT.hips[1] + 0.06 * liftH;
    h.rotation.set(0.14 * liftH - 0.05 * liftC, -d.turn * 0.08, 0);
    const flick = Math.max(0, Math.sin(d.t * 0.83)) ** 60;
    tail.current.rotation.set(
      0.25 * liftH + 0.5 * flick + 0.1 * d.boost,
      Math.sin(d.t * 7.54) * (0.05 + 0.16 * d.gait) + Math.sin(d.t * 18) * 0.45 * happy,
      0,
    );

    poseFlipper(flipL.current, 1, d, liftC, land);
    poseFlipper(flipR.current, -1, d, liftC, land);

    const shut = Math.max(blink, smooth(0.3, 0.45, sq));
    const squint = smooth(0.3, 0.5, happy) * (1 - shut);
    const l = lids.current;
    // A lid at rest would show as a pale rim round the eye: hide it.
    for (let i = 0; i < 2; i++) {
      l[i * 2].visible = shut > 0.02;
      l[i * 2].rotation.x = UPPER_OPEN + (UPPER_SHUT - UPPER_OPEN) * shut;
      l[i * 2 + 1].visible = squint > 0.02;
      l[i * 2 + 1].rotation.x = LOWER_OPEN + (LOWER_HAPPY - LOWER_OPEN) * squint;
    }
    catchlights.current.visible = shut < 0.3 && squint < 0.3;
    const open = smooth(0.3, 0.55, happy);
    mouth.current.visible = open > 0.01;
    mouth.current.scale.setScalar(Math.max(open, 0.01));
  });

  const { coat } = mats;
  const shoulder = rel(PIVOT.shoulder, PIVOT.chest);
  return (
    <group ref={body}>
      <group ref={chest} position={PIVOT.chest}>
        <mesh geometry={parts.chest} material={coat} castShadow receiveShadow />
        <group ref={flipL} position={shoulder}>
          <mesh geometry={parts.flipper} material={coat} castShadow receiveShadow />
        </group>
        <group scale={[-1, 1, 1]}>
          <group ref={flipR} position={shoulder}>
            <mesh geometry={parts.flipper} material={coat} castShadow receiveShadow />
          </group>
        </group>
        <group ref={neck} position={rel(PIVOT.neck, PIVOT.chest)}>
          <group ref={headRef} position={rel(PIVOT.head, PIVOT.neck)}>
            <mesh geometry={parts.head} material={coat} castShadow receiveShadow />
            <mesh geometry={parts.eyes} material={mats.eye} />
            <mesh ref={catchlights} geometry={parts.catchlights} material={mats.catchlight} />
            {parts.eyeFrames.map((e, i) => (
              <group key={e.side} position={e.position} quaternion={e.quaternion}>
                <mesh ref={(m) => (lids.current[i * 2] = m)} geometry={parts.lidUp} material={coat} />
                <mesh ref={(m) => (lids.current[i * 2 + 1] = m)} geometry={parts.lidLow} material={coat} />
              </group>
            ))}
            <mesh ref={mouth} geometry={parts.mouth} material={mats.mouth} position={MOUTH} visible={false} />
            <Outfit placeId={near} />
          </group>
        </group>
      </group>
      <group ref={hips} position={PIVOT.hips}>
        <mesh geometry={parts.hips} material={coat} castShadow receiveShadow />
        <group ref={tail} position={rel(PIVOT.tail, PIVOT.hips)}>
          <mesh geometry={parts.tail} material={coat} castShadow receiveShadow />
        </group>
      </group>
    </group>
  );
}
