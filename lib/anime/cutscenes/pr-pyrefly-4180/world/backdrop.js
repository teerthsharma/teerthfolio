// Backdrop layers for pr-pyrefly-4180: stars across the sky, a moon halo, cloud banks high over the village and a stepped ember glow along
// the whole reach of the lens. Paper materials and the live palette (live/paper.js, palette.js); descriptors as live/world.js. Rig frame, real seconds.
import { Color, PlaneGeometry, ShaderMaterial } from "three";
import { loadPack } from "../../../tools/packs.js";
import { glslFor, uniformsFor } from "../../../tools/index.js";
import { FLOOR } from "../live/world.js";
import { U, card, circle, hash, merge } from "../live/paper.js";
import { PAL } from "../palette.js";
import { tone } from "../tone.js";

await loadPack("pierrot");
const GLOW_GLSL = glslFor(["pierrotStepGlow"]);

const starField = (n, k, xs, y0, yh, r0, rs) => Array.from({ length: n }, (_, i) => {
  const x = (hash(i, k) - 0.5) * xs;
  const y = y0 + yh * hash(i, k + 1);
  const r = r0 + rs * hash(i, k + 2);
  return card([[x, y - r], [x + 0.3 * r, y], [x, y + r], [x - 0.3 * r, y]], { color: PAL.glow });
});

const ring = (r, w, color) => card(circle(0, 0, r, 44), { holes: [circle(0, 0, r - w, 44)], color, depth: 0.12 }).translate(-2, 25, 0);

function cloudBanks() {
  const parts = [];
  for (let i = 0; i < 4; i++) {
    const x0 = -60 + 40 * i + 8 * hash(i, 90);
    const yb = 9.2 + 1.6 * (i % 2) + 0.6 * hash(i, 91);
    const top = [];
    const low = [];
    for (let s = 0; s <= 14; s++) {
      const x = x0 + s * 3.1;
      const yt = yb + 1.2 * Math.sin(s * 1.3 + i) + 1.2;
      top.push([x, yt]);
      low.push([x, yt - 1.1 - 0.6 * hash(s, 92 + i)]);
    }
    const z = i * 0.4;
    parts.push(card([...top, ...low.slice().reverse()], { color: i % 2 ? "#8f7aa8" : "#a58bb4", depth: 0.08 }).translate(0, 0, z));
    const under = low.map(([x, y]) => [x, y - 0.35]).reverse();
    parts.push(card([...low, ...under], { color: "#ffd9b8", depth: 0.06 }).translate(0, 0, z + 0.05));
  }
  for (let i = 0; i < 3; i++) {
    const yb = [22, 28, 34][i], thick = 2.6 + 1.4 * hash(i, 93), top = [], low = [];
    for (let s = 0; s <= 75; s++) {
      const x = -300 + s * 8;
      const yt = yb + 1.2 * Math.sin(s * 0.9 + i) + 1.2;
      top.push([x, yt]);
      low.push([x, yt - thick - 0.5 * hash(s, 94 + i)]);
    }
    const z = 14 + i * 0.4;
    parts.push(card([...top, ...low.slice().reverse()], { color: i % 2 ? "#8f7aa8" : "#a58bb4", depth: 0.08 }).translate(0, 0, z));
    const under = low.map(([x, y]) => [x, y - 0.35]).reverse();
    parts.push(card([...low, ...under], { color: "#ffd9b8", depth: 0.06 }).translate(0, 0, z + 0.05));
  }
  return merge(parts);
}

function stepMaterial() {
  const pu = uniformsFor(["pierrotStepGlow"]);
  pu.uPrrGlowY.value = 0;
  pu.uPrrGlowK.value = 0.9;
  const m = new ShaderMaterial({
    uniforms: {
      ...pu,
      uTime: U.uTime,
      uFade: U.uFade,
      uC0: { value: new Color("#6c3548") },
      uC1: { value: new Color("#9d463e") },
      uC2: { value: new Color("#ce5834") },
      uC3: { value: new Color("#ff6a2a") },
      uRidge: { value: new Color("#ffb04a") },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      ${GLOW_GLSL}
      uniform float uTime, uFade;
      uniform vec3 uC0, uC1, uC2, uC3, uRidge;
      varying vec2 vUv;
      void main() {
        vec3 g = pierrotStepGlow(vec3(0.0), vUv, uTime);
        if (max(g.r, max(g.g, g.b)) < 0.004) discard;
        vec3 col = g.r < 0.4 ? uC0 : g.r < 0.65 ? uC1 : g.r < 0.85 ? uC2 : uC3;
        float ridge = step(0.7, g.g) * step(g.b, 0.5) * step(0.5, g.r);
        gl_FragColor = vec4(mix(col, uRidge, ridge) * uFade, 0.99);
      }`,
  });
  return tone(m);
}

export function* backdropLayers() {
  const add = (id, g, m, z, o = {}) => ({ id, g, m, z, y: 0, px: 0, sway: 0, fg: false, sink: false, ...o });
  yield add("starsMid", merge(starField(190, 80, 300, 14, 24, 0.14, 0.16)), "glow", -121, { order: 14 });
  yield add("starsMid2", merge(starField(360, 83, 720, 10, 82, 0.42, 0.4)), "glow", -121, { order: 14 });
  yield add("moonHalo", merge([ring(20.5, 0.8, PAL.halo), ring(25, 0.6, "#8f7aa8")]), "moon", -118.6, { order: 13 });
  yield add("cloudBanks", cloudBanks(), "cloud", -94, { order: 13 });
  yield add("stepGlow", new PlaneGeometry(700, 5).translate(0, FLOOR + 7 + 2.5, 0), "step", -64.5, { order: 10 });
}

export function backdropMaterials() {
  return { step: stepMaterial() };
}
