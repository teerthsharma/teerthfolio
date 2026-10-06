// BULLSEYE SKY (JoJo Part 3, Araki). Local world shader named in NEEDS.md.
// 8 rings × 6 deg, palette-cycled, sheared ink-edged storm, hard diagonal cut.
// This file owns the dome; sky.js re-exports buildSky.
//
// MATHS
//   th = acos(d · bull); rr = th / 6deg; ring i = floor(rr) takes uP[i mod 5]
//   edge AA: mix(col(i-1), col(i), smoothstep(0, fwidth(rr), fract(rr)))
//   storm: q = (az*2.6 + el*3.4, el*8 - az*1.2); n = fbm(q); cloud = step(0.58, n) with fwidth
//   ink #05020a on the 0.58 iso. luma min(c, 0.95) then the engine cap 0.92 on lit surfaces.
import { BackSide, Mesh, ShaderMaterial, SphereGeometry } from "three";
import { DOME_V, NOISE, PAL_UNIFORMS, SKY } from "./glsl.js";

export const meta = {
  name: "bullseye-sky",
  params: {
    rings: { default: 8 },
    ringDeg: { default: 6 },
    ink: { default: "#05020a" },
  },
};

export function create(U) {
  const mat = new ShaderMaterial({
    uniforms: { ...U }, vertexShader: DOME_V, side: BackSide, depthWrite: false,
    fragmentShader: `${PAL_UNIFORMS} ${NOISE} ${SKY} varying vec3 vD;
      void main() { gl_FragColor = vec4(awSky(normalize(vD)), 0.0); }`,
  });
  const m = new Mesh(new SphereGeometry(400, 48, 24), mat);
  m.frustumCulled = false; m.renderOrder = -10; m.name = "bullseye-sky";
  return m;
}

export function buildSky(U) { return create(U); }
