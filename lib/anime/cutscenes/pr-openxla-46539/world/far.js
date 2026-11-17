// The Kamino horizon, printed: three skyline cards of broken towers with lit and dead windows at the end of the avenue, the
// focal ruin (the live pull mhaKaminoRuins, recoloured to the press inks), five flat smoke columns, and the clear-sky deck that
// shows through the hole the punch opens. Every surface is the press's halftone; the storm shell shows above the silhouettes.
// Caller: `await loadInkPacks()` (ink.js) before buildFar, because the pulls are read synchronously here.
import { Group, Mesh, PlaneGeometry, ShaderMaterial } from "three";
import { PRINT, u } from "../live/print.js";
import { OFF } from "../clock.js";
import { tone } from "../tone.js";
import { uniformsFor } from "../../../tools/index.js";
import { inked } from "../../../tools/cuts/pr-openxla-46539/ink.js";

const VERT = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const CARD_BODY = /* glsl */ `
  uniform float uSeed, uHz, uRuin;
  varying vec2 vUv;
  vec4 wallTone(float h) {
    if (h < 0.25) return vec4(0.9, 0.5, 0.0, 0.12);
    if (h < 0.5) return vec4(0.55, 0.9, 0.0, 0.15);
    if (h < 0.75) return vec4(0.85, 0.2, 0.35, 0.18);
    return vec4(0.0, 0.85, 0.8, 0.2);
  }
  void main() {
    float x = vUv.x, y = vUv.y;
    float ruin = uRuin * cFill(mhaRuinD(vec2(x, y)));
    float right = ruin * (1.0 - cFill(mhaRuinD(vec2(x + 0.003, y))));
    float top = 0.35 + 0.5 * h21(vec2(floor(x * 26.0), uSeed)) - 0.07 * fract(x * 26.0 * 0.37);
    float edge = (1.0 - smoothstep(0.0, fwidth(y) * 1.5, top - y)) * step(y, top) * (1.0 - ruin);
    if (ruin < 0.5 && y > top) discard;
    vec4 t = wallTone(h21(vec2(floor(x * 13.0), uSeed + 3.0)));
    t = mix(t, vec4(0.12, 0.6, 0.5, 0.0), uHz * (1.0 - smoothstep(0.0, 0.6, y)));
    vec2 g = vec2(x * 18.0, y * 40.0), d = abs(fract(g) - 0.5);
    if (step(d.x, 0.3) * step(d.y, 0.3) * step(y, top - 0.03) > 0.5) {
      float lit = h21(floor(g) + vec2(uSeed * 7.0, 1.0));
      if (lit < 0.14) t = h21(floor(g) + vec2(3.1, uSeed)) < 0.3 ? vec4(0.0, 0.5, 0.95, 0.0) : vec4(0.0, 0.06, 1.0, 0.0);
      else t = vec4(0.9, 0.75, 0.1, 0.85);
    }
    t = mix(t, vec4(0.0, 0.0, 0.0, 1.0), edge);
    if (ruin > 0.0) {
      t = mix(vec4(0.0, 0.45, 0.0, 0.92), vec4(1.0, 0.0, 0.0, 0.0), right * 0.9);
    }
    gl_FragColor = vec4(pow(max(inkPrint(t), vec3(0.0)), vec3(2.2)), 0.99);
  }`;
const SMOKE_BODY = /* glsl */ `
  uniform float uSeed, uT;
  varying vec2 vUv;
  void main() {
    float v = vUv.y, x = vUv.x - 0.5;
    float cx = 0.12 * sin(v * 3.0 + uSeed * 6.0) * (0.3 + v) + 0.5 * sin(uT * 0.9 + uSeed * 6.0) * v;
    float w = (0.12 + 0.38 * v) * (0.8 + 0.4 * h21(vec2(floor(v * 12.0), uSeed)));
    float d = abs(x - cx) - w * 0.5;
    float ed = 1.0 - smoothstep(0.0, fwidth(d) * 1.5, -d);
    if (d > 0.0) discard;
    vec4 t = v < 0.35 ? vec4(0.3, 0.35, 0.25, 0.7) : (v < 0.7 ? vec4(0.25, 0.3, 0.25, 0.6) : vec4(0.15, 0.15, 0.2, 0.4));
    t = mix(t, vec4(0.0, 0.0, 0.0, 1.0), ed);
    gl_FragColor = vec4(pow(max(inkPrint(t), vec3(0.0)), vec3(2.2)), 0.99);
  }`;
const DECK_BODY = /* glsl */ `
  uniform float uR;
  varying vec2 vUv;
  void main() {
    vec2 q = (vUv - 0.5) * 320.0;
    if (length(q) > uR) discard;
    vec3 c = shoSkyBands(q / max(uR, 1.0), uTime);
    gl_FragColor = vec4(pow(max(c, vec3(0.0)), vec3(2.2)), 0.99);
  }`;

const CARDS = [
  { z: -105, w: 210, h: 34, seed: 1.7, haze: 0.35, ruin: 0 },
  { z: -122, w: 260, h: 46, seed: 4.3, haze: 0.58, ruin: 1 },
  { z: -136, w: 330, h: 60, seed: 8.9, haze: 0.78, ruin: 0 },
];
const SMOKE = [
  { x: -46, z: -100, h: 40, w: 26, seed: 2.1 },
  { x: -18, z: -112, h: 56, w: 30, seed: 3.7 },
  { x: 12, z: -104, h: 46, w: 24, seed: 5.3 },
  { x: 40, z: -126, h: 70, w: 34, seed: 6.9 },
  { x: 62, z: -134, h: 62, w: 30, seed: 9.2 },
];
const DECK = { z: -138, y: 58.4, size: 320, reach: 149.5 }; // the punch's hole centre sits on this card (the shell's vortex axis)

export function buildFar(SH, KN = 1) {
  const group = new Group(), made = [], mats = [], smokeMats = [];
  group.userData.tier = 2;
  const pull = { ...uniformsFor(["mhaKaminoRuins"]), uMhaAsp: u(1) };
  const cardGlsl = `${PRINT}\n${inked(["mhaKaminoRuins"])}\n${CARD_BODY}`;
  const add = (geo, m, order = -2) => { const x = new Mesh(geo, m); x.frustumCulled = false; x.renderOrder = order; group.add(x); made.push(geo); mats.push(m); return x; };
  const frag = (src, uniforms) => tone(new ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: src }));

  for (const c of CARDS) {
    const m = frag(cardGlsl, { ...SH, ...pull, uSeed: u(c.seed), uHz: u(c.haze), uRuin: u(c.ruin) });
    add(new PlaneGeometry(c.w, c.h).translate(0, -1 + c.h / 2, c.z), m);
  }

  const smokeGlsl = `${PRINT}\n${SMOKE_BODY}`;
  for (const s of SMOKE) {
    const m = frag(smokeGlsl, { ...SH, uSeed: u(s.seed), uT: u(0) });
    smokeMats.push(m);
    add(new PlaneGeometry(s.w, s.h).translate(s.x, -1 + s.h / 2, s.z), m, -1.5);
  }

  const maxR = KN < 1 ? 0.24 : 0.36;
  const deckGlsl = `${PRINT}\n${inked(["shoKit", "shoSkyBands"])}\n${DECK_BODY}`;
  const deckMat = frag(deckGlsl, { ...SH, ...uniformsFor(["shoKit", "shoSkyBands"]), uR: u(0) });
  const deck = add(new PlaneGeometry(DECK.size, DECK.size).translate(0, DECK.y, DECK.z), deckMat);
  deck.visible = false;

  return {
    group,
    update(tt, ph) {
      if (OFF.has("far")) group.visible = false;
      const T = Math.floor(tt * 12 + 1e-6) / 12;
      for (const m of smokeMats) m.uniforms.uT.value = T;
      const open = ph.open ?? 0;
      deck.visible = !OFF.has("far") && open > 0.02;
      deckMat.uniforms.uR.value = open * maxR * DECK.reach;
    },
    dispose() {
      for (const g of made) g.dispose();
      for (const m of mats) m.dispose();
    },
  };
}
