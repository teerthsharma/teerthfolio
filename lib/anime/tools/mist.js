// mist: drifting haze (fbm alpha, soft on every edge) as GLSL mist(uv, aspect, seed) and as a 3D card mistCard(w, h, col, alpha, seed) that keeps the set id in alpha.
import { Color, Mesh, PlaneGeometry, ShaderMaterial } from "three";
import noise from "./noise.js";

const GLSL = /* glsl */ `
  float mist(vec2 uv, float aspect, float seed) { vec2 q = uv * vec2(aspect, 1.0) * 3.0 + seed * 7.0;
    float n = fbm(warp(q, 0.8));
    float edge = smoothstep(0.0, 0.25, uv.x) * smoothstep(1.0, 0.75, uv.x) * smoothstep(0.0, 0.15, uv.y) * pow(max(1.0 - uv.y, 0.0), 1.5);
    return smoothstep(0.35, 0.75, n) * edge; }`;

export function mistCard(w, h, col, alpha = 0.5, seed = 1) {
  const m = new ShaderMaterial({
    transparent: true, depthWrite: false,
    blending: 5, blendSrc: 204, blendDst: 205, blendSrcAlpha: 200, blendDstAlpha: 201, // over, keeping the target alpha (set id)
    uniforms: { uCol: { value: new Color(col) }, uA: { value: alpha }, uSeed: { value: seed } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform vec3 uCol; uniform float uA; uniform float uSeed; varying vec2 vUv; ${noise.glsl} ${GLSL}
      void main() { gl_FragColor = vec4(uCol, uA * mist(vUv, ${(w / h).toFixed(3)}, uSeed)); }`,
  });
  return new Mesh(new PlaneGeometry(w, h).translate(0, h / 2, 0), m);
}

export default {
  name: "mist", doc: "drifting haze with soft edges: a GLSL mist() mask and a 3D mistCard() that keeps the set id",
  deps: ["noise"],
  glsl: GLSL,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(vec3(0.02, 0.03, 0.04), vec3(0.35, 0.65, 0.62), mist(vec2(p.x / 1.44, p.y), 3.0, 1.0)); }`,
};
