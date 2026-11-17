// Madhouse set shaders: tenebrist spot pool, rain in the cone, watercolour sky, army dusk strata, painted flagstone.
import { defineModule as M, SUITS } from "./define.js";

export const PLATE = [
  M({
    name: "mhSpotPool", suits: ["p-nerve"], use: "plate",
    doc: "Tenebrist cone spot on wet concrete: one cold cream pool in three hard steps over an ambient floor, puddles as flat dark patches.",
    draws: "A near-black rooftop with one cold cream elliptical pool of light in three flat steps and a few hard-edged darker puddles inside it.",
    params: "uMhSpotC: pool centre; uMhSpotR: pool radii (x, y); uMhSpotAmb: ambient floor 0..0.2; uMhSpotCol: key colour.",
    uniforms: () => ({ uMhSpotC: { value: [0.8, 0.3] }, uMhSpotR: { value: [0.34, 0.12] }, uMhSpotAmb: { value: 0.08 }, uMhSpotCol: { value: [0.949, 0.902, 0.847] } }),
    glsl: /* glsl */ `
uniform vec2 uMhSpotC;
uniform vec2 uMhSpotR;
uniform float uMhSpotAmb;
uniform vec3 uMhSpotCol;
float mhSpotE(vec2 p) {
  float r = length((p - uMhSpotC) / uMhSpotR);
  float e = (1.0 - smoothstep(0.62, 1.0, r)) * pow(max(1.0 - r * 0.35, 0.0), 3.0);
  return max(uMhSpotAmb, floor(e * 3.0 + 0.5) / 3.0);
}
vec3 mhSpotPool(vec2 p, float t) {
  float puddle = mhAA(mhFbm(p * vec2(9.0, 22.0) + 3.0), 0.62);
  vec3 slab = mix(vec3(0.13, 0.157, 0.172), vec3(0.102, 0.047, 0.055), puddle);
  float floorM = mhAA(0.46 - p.y, 0.0);
  float e = mhSpotE(p);
  vec3 lit = slab * uMhSpotCol * e * 2.6 + uMhSpotCol * puddle * mhAA(e, 0.5) * 0.12;
  return mhOut(mix(MH_INK, lit, floorM));
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mhSpotPool(p, t); }`,
  }),

  M({
    name: "mhRainCone", suits: ["p-nerve"], use: "mask",
    doc: "Rain that exists only inside the light: three depth layers of thin streaks and splash rings, stepped on twos, dark outside the cone.",
    draws: "Pale thin diagonal streaks falling through one lit oval and flat splash rings on its floor, with no rain at all in the surrounding dark.",
    params: "uMhRainC/uMhRainR: cone centre and radii; uMhRainFall: fall speed of the middle layer; uMhRainCol: streak colour.",
    uniforms: () => ({ uMhRainC: { value: [0.8, 0.4] }, uMhRainR: { value: [0.34, 0.5] }, uMhRainFall: { value: 9.0 }, uMhRainCol: { value: [0.812, 0.91, 0.918] } }),
    glsl: /* glsl */ `
uniform vec2 uMhRainC;
uniform vec2 uMhRainR;
uniform float uMhRainFall;
uniform vec3 uMhRainCol;
float mhRainLayer(vec2 p, float t, float cols, float speed, float k) {
  vec2 q = vec2(p.x + p.y * 0.06, p.y);
  float cell = floor(q.x * cols);
  float h = mhH21(vec2(cell, k));
  float y = fract(q.y * 2.0 + mhHold(t, 12.0) * speed / 12.0 * (0.8 + 0.4 * h) + h);
  float x = smoothstep(0.08, 0.0, abs(fract(q.x * cols) - 0.5) - 0.38);
  return x * step(y, 0.32) * step(0.45, mhH21(vec2(cell, k + 5.0)));
}
float mhRainSplash(vec2 p, float t) {
  float m = 0.0;
  for (int i = 0; i < 14; i++) {
    float fi = float(i);
    vec2 c = uMhRainC + (vec2(mhH21(vec2(fi, 1.0)), mhH21(vec2(fi, 2.0))) - 0.5) * vec2(1.4, 0.34) * uMhRainR.x - vec2(0.0, 0.22);
    float ph = floor(fract(mhHold(t, 12.0) * 0.25 + mhH21(vec2(fi, 3.0))) * 3.0) / 3.0;
    m = max(m, mhLine(length((p - c) * vec2(1.0, 2.8)) - (0.012 + ph * 0.05), 1.4) * (1.0 - ph * 0.5));
  }
  return m;
}
vec3 mhRainCone(vec2 p, float t) {
  float cone = 1.0 - smoothstep(0.7, 1.0, length((p - uMhRainC) / uMhRainR));
  float r = max(mhRainLayer(p, t, 60.0, uMhRainFall - 2.0, 1.0), max(mhRainLayer(p, t, 44.0, uMhRainFall, 2.0), mhRainLayer(p, t, 30.0, uMhRainFall + 2.0, 3.0)));
  r = max(r, mhRainSplash(p, t) * mhAA(0.26 - p.y, 0.0));
  return mhOut(mix(MH_INK * 1.2, uMhRainCol, clamp(r * cone, 0.0, 1.0) * 0.85));
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mhRainCone(p, t); }`,
  }),

  M({
    name: "mhWashSky", suits: ["p-resolvent"], use: "plate",
    doc: "Frieren watercolour sky: five stepped washes whose edges bleed with a darker wet rim, pigment blooms and paper granulation.",
    draws: "A pale blue-to-cream sky in five stepped washes, each seam wobbling with a thin darker wet edge, with a few pale pigment blooms.",
    params: "uMhWashTop/uMhWashLow: colour at the zenith and the horizon; uMhWashBleed: how far each wash edge wanders; uMhWashGrain: granulation strength.",
    uniforms: () => ({ uMhWashTop: { value: [0.275, 0.443, 0.725] }, uMhWashLow: { value: [0.84, 0.82, 0.78] }, uMhWashBleed: { value: 0.035 }, uMhWashGrain: { value: 0.05 } }),
    glsl: /* glsl */ `
uniform vec3 uMhWashTop;
uniform vec3 uMhWashLow;
uniform float uMhWashBleed;
uniform float uMhWashGrain;
vec3 mhWashSky(vec2 p, float t) {
  float n = mhFbm(p * vec2(2.2, 3.5) + 4.0);
  float v = clamp(1.0 - p.y + (n - 0.5) * uMhWashBleed * 4.0, 0.0, 0.999) * 5.0;
  float band = floor(v), f = fract(v);
  vec3 col = mix(uMhWashTop, uMhWashLow, band / 4.0);
  col *= 1.0 - 0.09 * (1.0 - smoothstep(0.0, 0.1, f)) * step(0.5, band);
  float b = mhFbm(p * vec2(3.0, 5.5) + 11.0);
  col = mix(col, uMhWashLow * 1.06, mhAA(b, 0.6) * 0.7);
  col *= 1.0 - (mhAA(b, 0.6) - mhAA(b, 0.64)) * 0.14;
  col *= 1.0 + (mhH21(floor(p * 700.0)) - 0.5) * uMhWashGrain;
  return mhOut(col);
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mhWashSky(p, t); }`,
  }),

  M({
    name: "mhArmySky", suits: ["p-resolvent"], use: "plate",
    doc: "Army-red dusk strata: six hard steps from rose to oxblood-brown with horizontal cloud bars cut as value drops, no gradient.",
    draws: "A sky of six flat horizontal bands from dusty rose at the top to dark brown-red at the horizon, broken by long thin darker cloud bars.",
    params: "uMhArmyLift: brightens every band; uMhArmyBars: how many cloud bars cut the bands (0 clear, 1 heavy).",
    uniforms: () => ({ uMhArmyLift: { value: 1.0 }, uMhArmyBars: { value: 0.55 } }),
    glsl: /* glsl */ `
uniform float uMhArmyLift;
uniform float uMhArmyBars;
vec3 mhArmyStop(float i) {
  if (i < 0.5) return vec3(0.839, 0.506, 0.490);
  if (i < 1.5) return vec3(0.565, 0.278, 0.251);
  if (i < 2.5) return vec3(0.392, 0.216, 0.176);
  if (i < 3.5) return vec3(0.298, 0.169, 0.133);
  if (i < 4.5) return vec3(0.267, 0.173, 0.161);
  return vec3(0.239, 0.153, 0.161);
}
vec3 mhArmySky(vec2 p, float t) {
  float s = clamp((1.0 - p.y) / 0.55, 0.0, 0.999) * 6.0;
  float bar = mhAA(mhFbm(vec2(p.x * 0.9, p.y * 16.0) + 2.0), 1.0 - 0.45 * uMhArmyBars) * mhAA(p.y, 0.3);
  float i = clamp(floor(s) + bar, 0.0, 5.0);
  return mhOut(mhArmyStop(i) * uMhArmyLift);
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mhArmySky(p, t); }`,
  }),

  M({
    name: "mhFlagstone", suits: ["p-resolvent", "pr-topograph-432"], use: "plate",
    doc: "Unlined painted flagstone: running-bond courses in perspective, each stone one flat tone, seams only as value drops.",
    draws: "A receding floor of running-bond stone slabs, every slab one flat blue-violet or grey-violet tone, joined by darker seams instead of drawn lines, fading to dark at the horizon.",
    params: "uMhStoneHorizon: screen height of the horizon; uMhStoneSeam: seam width in stone fractions; uMhStoneLit/uMhStoneShade: the two stone tones.",
    uniforms: () => ({ uMhStoneHorizon: { value: 0.46 }, uMhStoneSeam: { value: 0.035 }, uMhStoneLit: { value: [0.318, 0.325, 0.494] }, uMhStoneShade: { value: [0.169, 0.196, 0.282] } }),
    glsl: /* glsl */ `
uniform float uMhStoneHorizon;
uniform float uMhStoneSeam;
uniform vec3 uMhStoneLit;
uniform vec3 uMhStoneShade;
vec3 mhFlagstone(vec2 p, float t) {
  float dy = max(uMhStoneHorizon - p.y, 1e-3);
  float z = 0.16 / dy;
  vec2 w = vec2((p.x - 0.8) * z * 2.0, z * 3.0);
  float row = floor(w.y / 0.36);
  vec2 g = vec2((w.x + mod(row, 2.0) * 0.425) / 0.85, w.y / 0.36);
  vec2 id = floor(g), f = fract(g);
  float e = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y) * 0.42);
  float seam = (1.0 - mhAA(e, uMhStoneSeam)) * (1.0 - smoothstep(5.0, 12.0, z));
  float tone = floor(mhH21(id) * 3.0) / 3.0;
  vec3 st = mix(uMhStoneShade, uMhStoneLit, tone * 0.5 + 0.35 * mhAA(0.8 - p.x, 0.0));
  st = mix(st, uMhStoneShade * 0.55, seam);
  st = mix(st, MH_DEEPV * 1.3, smoothstep(4.0, 14.0, z));
  return mhOut(mix(MH_INK, st, mhAA(uMhStoneHorizon - p.y, 0.0)));
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mhFlagstone(p, t); }`,
  }),
];
