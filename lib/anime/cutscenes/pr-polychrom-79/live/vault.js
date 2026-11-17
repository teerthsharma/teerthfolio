// The Bab-ilu vault gate, Ea with its red runes, and the spiral wind for pr-polychrom-79, ported from components/world/cutscene/moves/pr-polychrom-79/world.js.
// The gate is premultiplied (vec4(col * 0.94, 0.94)); the wind is additive with alpha 0; uniform names are the live's.

import { AdditiveBlending, BoxGeometry, CylinderGeometry, DoubleSide, ShaderMaterial, SphereGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { T } from "../clock.js";
import { PAL } from "../pal.js";
import { paint } from "./set.js";

const clean = (g) => {
  const n = g.index ? g.toNonIndexed() : g;
  if (n.attributes.uv) n.deleteAttribute("uv");
  return n;
};

export function gateMaterial() {
  return new ShaderMaterial({
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
    fog: false,
    uniforms: { uSpread: { value: 0 }, uOpen: { value: 0 }, uTime: { value: 0 }, uCap: { value: T.irisCap } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uSpread;
      uniform float uOpen;
      uniform float uTime;
      uniform float uCap;
      varying vec2 vUv;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float edge(float x, float e) { float w = min(fwidth(x), 0.004); return smoothstep(e - w, e + w, x); }
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 1.0) discard;
        vec2 g = p * 9.0;
        vec2 id = floor(g);
        vec2 f = fract(g) - 0.5;
        float hh = h(id);
        float tr = hh < 0.5 ? step(abs(f.y), 0.05) : step(abs(f.x), 0.05);
        float dg = hh > 0.82 ? step(abs(abs(f.x) - abs(f.y)), 0.05) : 0.0;
        float nd = step(length(f), 0.12) * step(0.7, h(id + 7.0));
        float line = max(max(tr, dg), nd) * step(0.2, h(id + 3.0));
        float reach = step(r, uSpread * 1.15);
        float on = step(0.5, line * reach);
        float rim = edge(r, 0.92) * (1.0 - edge(r, 0.99));
        float ro = uOpen * uCap;
        float iris = 1.0 - step(ro, r);
        float lip = step(abs(r - ro), 0.03) * step(0.01, uOpen);
        if (on < 0.5 && rim < 0.5 && iris < 0.5 && lip < 0.5) discard;
        // iris and lip are linear #f2c94c and #fff2c0, so the output pass shows the hex
        vec3 col = mix(mix(vec3(1.0, 0.10, 0.18), vec3(1.0, 0.8, 0.3), rim), mix(vec3(0.8879, 0.5841, 0.0723), vec3(1.0, 0.8879, 0.5271), lip), max(iris, lip));
        gl_FragColor = vec4(col, 0.99);
      }`,
  });
}

export function eaParts() {
  const rod = new CylinderGeometry(0.045, 0.045, 1.4, 10).translate(0, 0.7, 0);
  const grip = new CylinderGeometry(0.06, 0.07, 0.34, 10).translate(0, 0.05, 0);
  const pommel = new SphereGeometry(0.09, 10, 8).translate(0, -0.14, 0);
  const tip = new CylinderGeometry(0.035, 0.13, 0.24, 12).translate(0, 1.5, 0);
  const guard = mergeGeometries([paint(clean(new BoxGeometry(0.46, 0.05, 0.1).translate(0, 0.25, 0)), PAL.goldLo, PAL.goldHi, 1), paint(clean(new BoxGeometry(0.1, 0.09, 0.1).translate(0, 0.27, 0)), PAL.goldLo, PAL.goldHi, 1)]);
  const seg = new CylinderGeometry(0.14, 0.14, 0.3, 16, 1, false).translate(0, 0.15, 0);
  const glow = new CylinderGeometry(0.19, 0.19, 0.3, 16, 1, true).translate(0, 0.15, 0);
  return { core: mergeGeometries([rod, grip, pommel, tip].map(clean)), guard, seg, glow };
}

export function runeMaterial() {
  return new ShaderMaterial({
    toneMapped: false,
    fog: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float a = vUv.x * 6.0;
        float v = abs(fract(a) - 0.5);
        float l1 = smoothstep(0.07, 0.02, v);
        float d = abs(fract(a * 0.5 + vUv.y * 3.0) - 0.5);
        float l2 = smoothstep(0.06, 0.015, d);
        float ring = smoothstep(0.06, 0.02, min(vUv.y, 1.0 - vUv.y));
        float L = step(0.5, max(max(l1, l2), ring));
        // linear #0b0508 and #ff1f33: the output pass encodes to sRGB, so the runes show the hex
        vec3 c = mix(vec3(0.0033, 0.0015, 0.0024), vec3(1.0, 0.0137, 0.0331), L);
        gl_FragColor = vec4(c, 0.99);
      }`,
  });
}

export function windMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    premultipliedAlpha: true,
    side: DoubleSide,
    toneMapped: false,
    fog: false,
    uniforms: { uTime: { value: 0 }, uK: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uK;
      varying vec2 vUv;
      void main() {
        float a = vUv.x * 6.28318;
        float s = sin(5.0 * (a + vUv.y * 7.0 - uTime * 16.0));
        float band = step(0.5, s);
        float fade = smoothstep(0.0, 0.08, vUv.y) * (1.0 - smoothstep(0.75, 1.0, vUv.y));
        vec3 c = mix(vec3(0.95, 0.06, 0.14), vec3(1.0, 0.75, 0.55), band * band) * (0.35 + band * 1.2);
        gl_FragColor = vec4(c * fade * uK, 0.0);
      }`,
  });
}
export const windGeometry = () => new CylinderGeometry(2.7, 0.14, 15, 40, 20, true).translate(0, 7.5, 0);
