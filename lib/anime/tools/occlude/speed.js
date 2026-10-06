// Family 8 — speedlines / focus / chromatic split (15).
import { defineModule } from "./define.js";

const D = (name, doc, glsl, demo, extra) => defineModule({ name, doc, glsl, demo, ...extra });

export const SPEED = [
  D("radialSpeedlines", "radial speedlines: hashed polar bins, taper with radius, fwidth width",
    /* glsl */ `
  vec3 radialSpeedlines(vec2 p, vec3 plate, vec3 ink, vec2 c, float seed) {
    vec2 q = (p - c) * vec2(uRes.x / max(uRes.y, 1.0), 1.0);
    float a = atan(q.y, q.x) / 6.2831853 + 0.5;
    float r = length(q);
    float bin = floor(a * 160.0);
    float rnd = ocHash(vec2(bin, seed));
    float w = 0.35 * rnd;
    float line = ocAA(fract(a * 160.0) - (1.0 - w));
    float vis = smoothstep(0.22 + 0.25 * ocHash(vec2(bin, seed + 3.0)), 0.78, r);
    return mix(plate, ink, line * vis * step(0.4, rnd));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(radialSpeedlines(p, ocPlate(p, t), vec3(0.12, 0.08, 0.14), vec2(0.72, 0.45), 4.0)); }`),

  D("chromaSplit", "chromatic impact split: R/B offset along a direction, samples a source",
    /* glsl */ `
  vec3 chromaSplit(sampler2D src, vec2 uv, vec2 dir, float px) {
    vec2 o = dir * px / max(uRes, vec2(1.0));
    float r = texture2D(src, uv + o).r;
    float g = texture2D(src, uv).g;
    float b = texture2D(src, uv - o).b;
    return ocCap(vec3(r, g, b));
  }`,
    /* glsl */ `uniform sampler2D tSrc; vec3 demo(vec2 p, float t) { vec2 uv = vec2(p.x / 1.44, p.y); return chromaSplit(tSrc, uv, normalize(vec2(0.7, 0.4)), 3.0 + 2.0 * sin(t * 8.0)); }`,
    { demoTex: true }),

  D("focusLines", "focus lines: same polar bins as speedlines but they stop short of a hole at the seat",
    /* glsl */ `
  vec3 focusLines(vec2 p, vec3 plate, vec3 ink, vec2 c, float hole, float seed) {
    vec2 q = p - c;
    float a = atan(q.y, q.x) / 6.2831853 + 0.5, r = length(q);
    float bin = floor(a * 140.0);
    float rnd = ocHash(vec2(bin, seed));
    float line = ocAA(fract(a * 140.0) - 0.78);
    float vis = smoothstep(hole, hole + 0.18, r) * (1.0 - smoothstep(0.72, 0.95, r));
    return mix(plate, ink, line * vis * step(0.35, rnd));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(focusLines(p, ocPlate(p, t), vec3(0.10, 0.07, 0.12), vec2(0.72, 0.45), 0.16, 2.0)); }`),

  D("horizSpeedlines", "horizontal speedlines: hashed rows, travelling dashes, not radial",
    /* glsl */ `
  vec3 horizSpeedlines(vec2 p, vec3 plate, vec3 ink, float seed, float t) {
    float bin = floor(ocUV().y * 140.0);
    float rnd = ocHash(vec2(bin, seed));
    float len = 0.22 + 0.55 * ocHash(vec2(bin, seed + 1.0));
    float st = fract(ocHash(vec2(bin, seed + 2.0)) - t * 2.5);
    float x = fract(ocUV().x - st);
    float line = ocAA(fract(ocUV().y * 140.0) - 0.62) * step(x, len) * step(0.72, rnd);
    return mix(plate, ink, line);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(horizSpeedlines(p, ocPlate(p, t), vec3(0.12, 0.08, 0.14), 6.0, t)); }`),

  D("chromaRadial", "radial chromatic split: offset along (uv-c), stronger with radius",
    /* glsl */ `
  vec3 chromaRadial(sampler2D src, vec2 uv, vec2 c, float px) {
    vec2 dir = normalize(uv - c + 1e-6);
    float r = length(uv - c);
    vec2 o = dir * px * r / max(uRes, vec2(1.0));
    return ocCap(vec3(texture2D(src, uv + o).r, texture2D(src, uv).g, texture2D(src, uv - o).b));
  }`,
    /* glsl */ `uniform sampler2D tSrc; vec3 demo(vec2 p, float t) { return chromaRadial(tSrc, vec2(p.x / 1.44, p.y), vec2(0.5, 0.45), 8.0); }`,
    { demoTex: true }),

  D("speedlineTaper", "tapered speedlines: each hashed row has a (1-u/len)^2 envelope",
    /* glsl */ `
  vec3 speedlineTaper(vec2 p, vec3 plate, vec3 ink, float seed) {
    float row = floor(p.y * 64.0);
    float rnd = ocHash(vec2(row, seed));
    float thick = 0.08 + 0.22 * ocHash(vec2(row, seed + 2.0));
    float ln = ocAA(abs(fract(p.y * 64.0) - 0.5) - thick * 0.5);
    float len = 0.25 + 0.9 * rnd;
    float u = fract(p.x * 0.45 + rnd * 3.0);
    float tp = u < len ? pow(1.0 - u / len, 2.0) : 0.0;
    return mix(plate, ink, ln * tp * step(0.42, rnd));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(speedlineTaper(p, ocPlate(p, t), vec3(0.14, 0.09, 0.16), 3.0)); }`),

  D("focusHole", "focus hole: radial lines that leave a clean disc at the seat (no ink inside)",
    /* glsl */ `
  vec3 focusHole(vec2 p, vec3 plate, vec3 ink, vec2 c, float hole) {
    vec2 q = p - c;
    float a = atan(q.y, q.x) / 6.2831853 + 0.5, r = length(q);
    float line = ocAA(fract(a * 90.0) - 0.82);
    float mask = ocAA(hole - r);
    return mix(plate, ink, line * (1.0 - mask) * smoothstep(hole, hole + 0.08, r));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(focusHole(p, ocPlate(p, t), vec3(0.10, 0.07, 0.12), vec2(0.72, 0.45), 0.14)); }`),

  D("chromaImpact", "chromatic split along impact: offset toward a hit point, luma-gated",
    /* glsl */ `
  vec3 chromaImpact(sampler2D src, vec2 uv, vec2 hit, float px) {
    vec2 dir = normalize(hit - uv + 1e-6);
    vec2 o = dir * px / max(uRes, vec2(1.0));
    vec3 c = vec3(texture2D(src, uv + o).r, texture2D(src, uv).g, texture2D(src, uv - o).b);
    float L = ocLuma(texture2D(src, uv).rgb);
    return ocCap(mix(texture2D(src, uv).rgb, c, smoothstep(0.15, 0.55, L)));
  }`,
    /* glsl */ `uniform sampler2D tSrc; vec3 demo(vec2 p, float t) { return chromaImpact(tSrc, vec2(p.x / 1.44, p.y), vec2(0.55, 0.45), 6.0); }`,
    { demoTex: true }),

  D("speedlineHash", "hashed speedline field: voronoi-ish cells stretched in X, inked long slashes",
    /* glsl */ `
  vec3 speedlineHash(vec2 p, vec3 plate, vec3 ink, float seed) {
    vec2 q = vec2(p.x * 2.2, p.y * 18.0);
    vec2 id = floor(q), f = fract(q) - 0.5;
    float h = ocHash(id + seed);
    float d = abs(f.y) - (0.08 + 0.18 * h);
    float vis = step(0.5, h) * (1.0 - abs(f.x));
    return mix(plate, ink, ocAA(d) * vis);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(speedlineHash(p, ocPlate(p, t), vec3(0.12, 0.08, 0.14), 2.0)); }`),

  D("diagonalSpeed", "diagonal speedlines: hashed bins along x+y, travelling dashes",
    /* glsl */ `
  vec3 diagonalSpeed(vec2 p, vec3 plate, vec3 ink, float seed, float t) {
    float u = (p.x + p.y) * 0.7071;
    float v = (p.y - p.x) * 0.7071;
    float bin = floor(v * 90.0);
    float rnd = ocHash(vec2(bin, seed));
    float x = fract(u * 0.8 - t * 1.8 + rnd);
    float line = ocAA(fract(v * 90.0) - 0.7) * step(x, 0.35 + 0.4 * rnd) * step(0.55, rnd);
    return mix(plate, ink, line);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(diagonalSpeed(p, ocPlate(p, t), vec3(0.14, 0.09, 0.12), 8.0, t)); }`),

  D("chromaRG", "RG split only: red/green offset, blue stays — a cheaper impact CA",
    /* glsl */ `
  vec3 chromaRG(sampler2D src, vec2 uv, float px) {
    vec2 o = vec2(px, 0.0) / max(uRes, vec2(1.0));
    vec4 c = texture2D(src, uv);
    return ocCap(vec3(texture2D(src, uv + o).r, texture2D(src, uv - o).g, c.b));
  }`,
    /* glsl */ `uniform sampler2D tSrc; vec3 demo(vec2 p, float t) { return chromaRG(tSrc, vec2(p.x / 1.44, p.y), 4.0); }`,
    { demoTex: true }),

  D("focusConverge", "converging focus: line density increases toward the seat (1/r bins)",
    /* glsl */ `
  vec3 focusConverge(vec2 p, vec3 plate, vec3 ink, vec2 c) {
    vec2 q = p - c;
    float a = atan(q.y, q.x), r = max(length(q), 1e-3);
    float dens = 18.0 + 40.0 / r;
    float line = ocStroke(sin(a * dens), 1.1) * smoothstep(0.08, 0.2, r);
    return mix(plate, ink, line * 0.75);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(focusConverge(p, ocPlate(p, t), vec3(0.12, 0.08, 0.14), vec2(0.72, 0.45))); }`),

  D("speedlineBurst", "speedline burst: radial hashed rays that only live near the frame edge",
    /* glsl */ `
  vec3 speedlineBurst(vec2 p, vec3 plate, vec3 ink, vec2 c, float seed) {
    vec2 q = p - c;
    float a = atan(q.y, q.x) / 6.2831853 + 0.5, r = length(q);
    float bin = floor(a * 80.0);
    float rnd = ocHash(vec2(bin, seed));
    float line = ocAA(fract(a * 80.0) - 0.75);
    float edge = smoothstep(0.35, 0.85, r);
    return mix(plate, ink, line * edge * step(0.4, rnd));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(speedlineBurst(p, ocPlate(p, t), vec3(0.12, 0.08, 0.14), vec2(0.72, 0.45), 1.0)); }`),

  D("chromaEdge", "edge-only CA: split only where fwidth(luma) is high",
    /* glsl */ `
  vec3 chromaEdge(sampler2D src, vec2 uv, float px) {
    vec3 c = texture2D(src, uv).rgb;
    float e = smoothstep(0.02, 0.10, fwidth(ocLuma(c)) * 16.0);
    vec2 o = vec2(px, 0.0) / max(uRes, vec2(1.0));
    vec3 spl = vec3(texture2D(src, uv + o).r, c.g, texture2D(src, uv - o).b);
    return ocCap(mix(c, spl, e));
  }`,
    /* glsl */ `uniform sampler2D tSrc; vec3 demo(vec2 p, float t) { return chromaEdge(tSrc, vec2(p.x / 1.44, p.y), 5.0); }`,
    { demoTex: true }),

  D("motionStreak", "motion streak: 5-tap gather along a direction, a cheap smear (not a blur kernel)",
    /* glsl */ `
  vec3 motionStreak(sampler2D src, vec2 uv, vec2 dir, float px) {
    vec2 o = dir * px / max(uRes, vec2(1.0));
    vec3 acc = vec3(0.0);
    acc += texture2D(src, uv - o * 2.0).rgb * 0.10;
    acc += texture2D(src, uv - o).rgb * 0.20;
    acc += texture2D(src, uv).rgb * 0.40;
    acc += texture2D(src, uv + o).rgb * 0.20;
    acc += texture2D(src, uv + o * 2.0).rgb * 0.10;
    return ocCap(acc);
  }`,
    /* glsl */ `uniform sampler2D tSrc; vec3 demo(vec2 p, float t) { return motionStreak(tSrc, vec2(p.x / 1.44, p.y), vec2(1.0, 0.15), 4.0); }`,
    { demoTex: true }),
];
