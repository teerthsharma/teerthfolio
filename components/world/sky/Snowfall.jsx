"use client";

// Gentle snowfall: small crisp flakes drifting down through the view. All the
// motion is in the vertex shader (one draw call, no work per flake on the
// CPU): each flake has a fixed place in a box that wraps round wherever the
// camera looks, so flakes stay put in the world as the view slides and the
// box only ever recycles the ones that leave it. The box scales with the
// camera's distance, so the fall looks the same at every zoom.

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { BufferGeometry, Float32BufferAttribute, ShaderMaterial } from "three";
import { mulberry32 } from "../life/spawn";
import { groundFocus } from "./focus";

const COUNT = 1400;
const FLAKE = 0.13; // m across
const FALL = 0.85; // m/s, the slowest flakes
const WIND = 0.45; // m/s drift toward +x, the sea breeze

const vertexShader = /* glsl */ `
  attribute vec4 seed;
  uniform float uTime;
  uniform vec3 uCentre;
  uniform vec3 uBox;
  uniform float uPx;
  void main() {
    vec3 p = seed.xyz * uBox;
    p.y -= uTime * (${FALL.toFixed(2)} + 0.55 * seed.w);
    p.x += uTime * ${WIND.toFixed(2)} + sin(uTime * 0.9 + seed.w * 40.0) * 0.45;
    p.z += cos(uTime * 0.7 + seed.w * 23.0) * 0.45;
    vec3 lo = uCentre - vec3(0.5 * uBox.x, 1.0, 0.5 * uBox.z);
    p = lo + mod(p - lo, uBox);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(${FLAKE.toFixed(2)} * uPx / -mv.z, 1.5, 9.0);
  }
`;

const fragmentShader = /* glsl */ `
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    if (dot(c, c) > 0.25) discard;
    gl_FragColor = vec4(1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const focus = { x: 0, z: 0 };

export default function Snowfall() {
  const geometry = useMemo(() => {
    const rand = mulberry32(20260923);
    const seed = new Float32Array(COUNT * 4);
    for (let i = 0; i < seed.length; i++) seed[i] = rand();
    const g = new BufferGeometry();
    g.setAttribute("seed", new Float32BufferAttribute(seed, 4));
    // positions are made in the shader; three only needs the vertex count
    g.setAttribute("position", new Float32BufferAttribute(new Float32Array(COUNT * 3), 3));
    return g;
  }, []);
  const material = useMemo(() => new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uCentre: { value: [0, 0, 0] },
      uBox: { value: [60, 24, 60] },
      uPx: { value: 1000 },
    },
  }), []);

  useFrame(({ camera, clock, size, viewport }) => {
    const u = material.uniforms;
    const d = groundFocus(camera, focus);
    u.uTime.value = clock.elapsedTime;
    u.uCentre.value[0] = focus.x;
    u.uCentre.value[2] = focus.z;
    u.uBox.value[0] = u.uBox.value[2] = 1.7 * d;
    // Capped, not scaled to full camera altitude: at a pulled-back zoom the
    // box used to reach 57-114 m tall while the visible band is only ~17.5
    // degrees, so almost every flake spent its cycle above frame. 28 m is
    // roughly the zoom=1 camera height -- density near the ground stays
    // constant instead of thinning as the camera pulls back.
    u.uBox.value[1] = Math.min(camera.position.y + 1, 28);
    u.uPx.value = (size.height * viewport.dpr) / (2 * Math.tan((camera.fov * Math.PI) / 360));
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
