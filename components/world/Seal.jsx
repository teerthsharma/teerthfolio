"use client";

// The player. This file is the plumbing every seal body shares: it puts the
// seal where live.seal says, steps the drive (seal/drive.js) that every body
// animates from, and lays the contact shadow that keeps it on the snow. The
// body is variant D (seal/variants/D.jsx), the cutest of four candidates
// judged in verification/J-seal-sheet.jpg; A/B/C stay in seal/variants/ for
// the record but are no longer imported anywhere.
//
// Variant contract (seal/variants/*.jsx) - props:
//   pose     object whose .current is live.seal {x, z, vx, vz, heading, speed, impact}
//   near     id of the place the seal is at, or null
//   drive    every animation signal, stepped before the variant's useFrame
//            runs; read it there, never write it
//   headRef  put it on the group that holds the head, and render
//            <Outfit placeId={near} /> inside that group (frame: seal/Outfit.jsx)
// Local frame: origin on the snow under the middle of the body, +z the nose,
// +y up. The belly rests at y = 0, sunk a centimetre or two, never above it.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CustomBlending, ShaderMaterial, SrcColorFactor, ZeroFactor } from "three";
import { live, useUi } from "../../lib/world/store";
import { createDrive, stepDrive } from "./seal/drive";
// The judge picked D (verification/J-seal-sheet.jpg): cutest of the four
// candidates. The others' files stay in seal/variants/ but are unimported.
import Variant from "./seal/variants/D";

// Soft occlusion under the body. It multiplies the snow toward the lavender
// of snow in shade (never black): a tight core where the belly touches and a
// wider skirt, so it reads as contact, not as a painted oval.
function contactShadow() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: CustomBlending,
    blendSrc: ZeroFactor,
    blendDst: SrcColorFactor,
    uniforms: { strength: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float strength;
      varying vec2 vUv;
      void main() {
        float r = length(vUv * 2.0 - 1.0);
        float core = 1.0 - smoothstep(0.0, 0.55, r);
        float skirt = 1.0 - smoothstep(0.2, 1.0, r);
        float occlusion = clamp(core * 0.55 + skirt * 0.35, 0.0, 1.0) * strength;
        gl_FragColor = vec4(mix(vec3(1.0), vec3(0.62, 0.66, 0.84), occlusion), 1.0);
      }`,
  });
}

export default function Seal() {
  const root = useRef();
  const headRef = useRef(null);
  const near = useUi((s) => s.near);
  // A getter, so a variant never holds a stale seal if live.seal is replaced.
  const pose = useMemo(() => ({ get current() { return live.seal; } }), []);
  const drive = useMemo(createDrive, []);
  const shadow = useMemo(contactShadow, []);
  useEffect(() => () => shadow.dispose(), [shadow]);

  // Priority -1: runs before every default (0) useFrame, so the variant reads
  // this frame's drive, and a negative priority keeps R3F's own render loop.
  useFrame((state, delta) => {
    const s = live.seal;
    stepDrive(drive, s, near, state.clock.elapsedTime, delta);
    root.current.position.set(s.x, (s.air || 0) * 3.2, s.z); // air: the whirlpool's throw (motion.js)
    root.current.rotation.y = s.heading + drive.bodyYaw;
    // The chest lifting off the snow thins the contact under it.
    shadow.uniforms.strength.value = 1 - drive.hump * 0.35;
  }, -1);

  return (
    <group ref={root}>
      <mesh material={shadow} position={[0, 0.012, -0.1]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <planeGeometry args={[1.9, 2.7]} />
      </mesh>
      <Variant pose={pose} near={near} drive={drive} headRef={headRef} />
    </group>
  );
}
