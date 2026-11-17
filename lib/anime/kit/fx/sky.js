// sky: painted skies as GLSL bodies for ctx.bake.sky (dome, `vec3 sky(float az, float el)`) and ctx.bake.plateLayer
// (plate, `vec3 paint(vec2 p)`): a 2-6 stop ramp by height (hard quantise, dab-wobbled band edges, a second ramp blended
// by phase), a horizon glow, a sun or moon disc (halo, crescent, emissive gain), up to two posterised cloud layers
// (cumulus banks, stratus streaks) lit from the sun side, a star field and 3-4 painted light shafts. Every value is a
// uniform, so all skies of one mode share one program. The body needs the noise tool (the bake default without o.tools).
//   const o = { stops: [["#f3e3c8", 0], ["#7fb6f2", 0.2], ["#2f6fd6", 0.8]], clouds: [{ kind: "cumulus" }], stars: {} };
//   ctx.bake.sky(skyRamp(o), { uniforms: skyUniforms(o) });   plate: o.plate = true, and pass id: 0 to plateLayer
//   skyUniforms(next, u) rewrites u in place (a per-shot swap, no new program); u.uSkyPhase and u.uSkyT are live floats.
// Dome: az from -z toward +x, el in radians, heights are sin(el). Plate: az and el are frame heights from the centre and
// above the horizon (times span), heights are frame shares. starField(o) / shafts(o) are the same GLSL for a custom body.
import { Color, Group, Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector4 } from "three";
import { glslFor } from "../../tools/index.js";

const GRID = 60; // star cells per unit of (az, height); count is stars per steradian
const KINDS = { cumulus: 1, stratus: 2 };

export const DEFAULTS = {
  skyRamp: {
    stops: [["#f3e3c8", 0], ["#a9d0f0", 0.1], ["#5b9bd6", 0.4], ["#2a62b8", 0.9]], // [hex, height] or evenly spread hex
    to: null, phase: 0, quantise: 0, dab: 0.012, ground: null,
    glow: { col: "#ffd9a0", k: 0.45, height: 0.1, spread: 0.9, focus: 0.7 },
    sun: { az: -0.4, el: 0.3, r: 0.035, col: "#fff1c8", emit: 1.6, halo: 0.25, haloR: 0.18, crescent: 0, tilt: 0.6 },
    clouds: [], stars: null, shafts: null, plate: false, fn: "sky", time: 0, tier: 3,
  },
  cloud: {
    cumulus: { at: 0.04, thick: 0.14, cover: 0.5, stretch: 1, seed: 1, drift: 0, opacity: 1, rim: 0, lit: "#fbfdff", mid: "#dde7f7", shade: "#9fb3d8" },
    stratus: { at: 0.3, thick: 0.035, cover: 0.5, stretch: 6, seed: 1, drift: 0, opacity: 1, rim: 0, lit: "#fff4ec", mid: "#d8e2f4", shade: "#a8b6dc" },
  },
  plate: { horizon: 0.25, span: 1, az: 0 },
  starField: { count: 120, size: 1.1, twinkle: 0, fps: 12, fade: [0.04, 0.3], gain: 1, col: "#dfe7ff", seed: 1 },
  shafts: { n: 3, col: "#ffc27a", k: 0.45, w: [0.034, 0.012], len: 1.1, soft: 0.5, dir: -2.0, spread: 0.2, rag: 0.35, from: null, seed: 1 },
};

const PLATE = "\n#ifndef SKY_PLATE\n#define SKY_PLATE\n#endif\n";
const BASE = /* glsl */ `
#ifndef SKY_BASE
#define SKY_BASE
uniform float uSkyT;
float skyH(float el) {
#ifdef SKY_PLATE
  return el;
#else
  return sin(el);
#endif
}
float skyCl(float el) {
#ifdef SKY_PLATE
  return 1.0;
#else
  return cos(el);
#endif
}
float skyWrap(float a) { return a - 6.2831853 * floor(a / 6.2831853 + 0.5); }
vec2 skyPlane(float az, float el, float az0, float el0) { return vec2(skyWrap(az - az0) * skyCl(el), el - el0); }
vec3 skyCap(vec3 c) { return c * min(1.0, 0.92 / max(dot(c, vec3(0.2126, 0.7152, 0.0722)), 1e-4)); }
float skyStep(float e, float x) { float w = min(fwidth(x), 0.08) + 1e-4; return smoothstep(e - w, e + w, x); }
float skyPx(float el) { return max(fwidth(el), 1e-6); }
#endif
`;

const STARS = /* glsl */ `
#ifndef SKY_STARS
#define SKY_STARS
uniform vec4 uSkyStar; uniform vec4 uSkyStarB; uniform vec3 uSkyStarCol;
vec3 skyStars(vec3 c, float az, float el) {
  float px = skyPx(el), y = skyH(el), s = uSkyStarB.w * 17.31;
  vec2 id = floor(vec2(az, y) * ${GRID.toFixed(1)});
  vec2 sc = (id + 0.25 + 0.5 * h22(id + s)) / ${GRID.toFixed(1)};
#ifdef SKY_PLATE
  float se = sc.y;
#else
  float se = asin(clamp(sc.y, -1.0, 1.0));
#endif
  float r = uSkyStar.y * px * (0.6 + 0.8 * h21(id + s + 4.7));
  float k = 1.0 - smoothstep(r, r + px, length(skyPlane(az, el, sc.x, se)));
  k *= step(1.0 - uSkyStar.x, h21(id + s + 9.3)) * (0.45 + 0.55 * h21(id + s + 2.1));
  k *= 1.0 - uSkyStar.z * h21(id + s + floor(uSkyT * uSkyStar.w + 1e-3) * 1.37);
  k *= smoothstep(uSkyStarB.x, uSkyStarB.y, y);
  return mix(c, skyCap(uSkyStarCol) * uSkyStarB.z, clamp(k, 0.0, 1.0));
}
#endif
`;

const SHAFTS = /* glsl */ `
#ifndef SKY_SHAFTS
#define SKY_SHAFTS
uniform vec4 uSkyShaftA; uniform vec4 uSkyShaftB; uniform vec4 uSkyShaftC; uniform vec3 uSkyShaftCol;
vec3 skyShafts(vec3 c, float az, float el) {
  vec2 r = vec2(skyWrap(az - uSkyShaftB.x), skyH(el) - uSkyShaftB.y);
  float a = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i), hi = h21(vec2(fi * 3.1, uSkyShaftC.z));
    float ang = uSkyShaftB.z + (fi - 0.5 * (uSkyShaftA.y - 1.0) + 0.6 * (hi - 0.5)) * uSkyShaftB.w;
    vec2 dir = vec2(cos(ang), sin(ang));
    float along = dot(r, dir) / uSkyShaftA.z, across = abs(dot(r, vec2(-dir.y, dir.x)));
    float w = mix(uSkyShaftC.x, uSkyShaftC.y, clamp(along, 0.0, 1.0)) * (0.75 + 0.5 * hi);
    float b = (1.0 - smoothstep(w * (1.0 - uSkyShaftA.w), w, across)) * smoothstep(0.0, 0.1, along) * (1.0 - smoothstep(0.5, 1.0, along));
    b *= (1.0 - uSkyShaftC.w * vn(vec2(along * 7.0, fi * 5.3 + uSkyShaftC.z))) * step(fi, uSkyShaftA.y - 0.5);
    a = max(a, b * (0.7 + 0.3 * h21(vec2(fi * 7.7, uSkyShaftC.z + 2.0))));
  }
  return mix(c, skyCap(uSkyShaftCol), clamp(uSkyShaftA.x * a, 0.0, 1.0));
}
#endif
`;

const ramp = (X) => `
vec3 skyRamp${X}(float h) {
  h = skyQ(h, uSkyH${X}[0], uSkyH${X}[5]);
  vec3 c = uSkyC${X}[0];
  for (int i = 1; i < 6; i++) c = mix(c, uSkyC${X}[i], smoothstep(uSkyH${X}[i - 1], uSkyH${X}[i], h));
  return c;
}`;

const CORE = /* glsl */ `
#ifndef SKY_CORE
#define SKY_CORE
uniform vec3 uSkyCA[6]; uniform float uSkyHA[6]; uniform vec3 uSkyCB[6]; uniform float uSkyHB[6];
uniform float uSkyPhase; uniform vec4 uSkyRamp; uniform vec3 uSkyGround;
uniform vec4 uSkyGlow; uniform vec3 uSkyGlowCol; uniform vec4 uSkySun; uniform vec3 uSkySunCol; uniform vec4 uSkyHalo;
uniform vec4 uSkyClA[2]; uniform vec4 uSkyClB[2]; uniform vec4 uSkyClC[2]; uniform vec3 uSkyClLit[2]; uniform vec3 uSkyClMid[2]; uniform vec3 uSkyClSh[2];
float skyQ(float h, float h0, float h1) {
  float n = uSkyRamp.x;
  if (n < 1.5) return h;
  float t = clamp((h - h0) / max(h1 - h0, 1e-4), 0.0, 1.0);
  return h0 + (h1 - h0) * min(floor(t * n), n - 1.0) / (n - 1.0);
}
${ramp("A")}
${ramp("B")}
// cumulus: a row of round lobes on a ragged flat base (A kind at thick cover, B stretch seed drift opacity, C rim)
vec4 skyCumulus(vec4 A, vec4 B, vec4 C, vec3 cl, vec3 cm, vec3 cs, float az, float h) {
  float th = max(A.z, 1e-3);
  vec2 u = vec2(skyWrap(az - B.z * uSkyT) / (th * B.x), (h - A.y) / th);
  float k0 = floor(u.x / 0.7), d = 1.0;
  vec2 nr = vec2(0.0, 1.0);
  for (int j = -1; j <= 1; j++) {
    float k = k0 + float(j);
    float m = smoothstep(0.35, 0.65, vn(vec2(k * 0.31, B.y * 7.3)) + A.w - 0.5);
    float r = m * (0.4 + 0.37 * h21(vec2(k, B.y + 1.7)));
    vec2 c = vec2((k + 0.5 + 0.3 * (h21(vec2(k, B.y + 4.3)) - 0.5)) * 0.7, 0.3 * r);
    float dk = length(u - c) - r;
    if (r > 0.03 && dk < d) { d = dk; nr = u - c; }
  }
  d = max(d, 0.05 * (fbm(vec2(u.x * 2.0, B.y)) - 0.5) - u.y) + 0.05 * (fbm(u * 5.0 + B.y * 3.1) - 0.5);
  float w = min(fwidth(d), 0.1) + 1e-4;
  vec2 L = normalize(normalize(vec2(skyWrap(uSkySun.x - az) / B.x, skyH(uSkySun.y) - h) + vec2(0.0, 1e-5)) + vec2(0.0, 0.35));
  float l = dot(normalize(nr + vec2(0.0, 1e-5)), L) + 0.3 * (fbm(u * 3.0 + B.y * 5.7) - 0.5) - 0.8 * (1.0 - smoothstep(0.0, 0.25, u.y));
  float lit = mix(skyStep(0.45, l), skyStep(0.0, l) * (1.0 - skyStep(C.x, -d)), step(1e-4, C.x));
  return vec4(mix(mix(cs, cm, skyStep(-0.2, l)), cl, lit), (1.0 - smoothstep(-w, w, d)) * B.w);
}
vec4 skyStratus(vec4 A, vec4 B, vec4 C, vec3 cl, vec3 cm, vec3 cs, float az, float h) {
  float th = max(A.z, 1e-3);
  vec2 u = vec2(skyWrap(az - B.z * uSkyT) / (th * B.x), (h - A.y) / th);
  u.y -= 0.8 * (fbm(vec2(u.x * 0.2, B.y * 3.7)) - 0.5);
  vec2 L = normalize(vec2(skyWrap(uSkySun.x - az) / B.x, skyH(uSkySun.y) - h) + vec2(0.0, 1e-5));
  vec2 q = vec2(u.x * 0.5, u.y * 2.5) + B.y * 3.1;
  float v = fbm(q) * (1.0 - smoothstep(0.3, 1.0, abs(u.y)));
  float vs = fbm(q + vec2(0.15, 0.6) * L) * (1.0 - smoothstep(0.3, 1.0, abs(u.y + 0.24 * L.y)));
  float t = 0.5 + 4.0 * (v - vs) + 0.15 * (fbm(q * 3.0) - 0.5);
  return vec4(mix(mix(cs, cm, skyStep(0.4, t)), cl, skyStep(0.62, t)), skyStep(mix(0.62, 0.3, A.w), v) * B.w);
}
vec3 skyCloud(vec3 c, vec4 A, vec4 B, vec4 C, vec3 cl, vec3 cm, vec3 cs, float az, float h) {
  vec4 k = A.x < 1.5 ? skyCumulus(A, B, C, cl, cm, cs, az, h) : skyStratus(A, B, C, cl, cm, cs, az, h);
  return mix(c, skyCap(k.rgb), clamp(k.a, 0.0, 1.0));
}
vec3 skyDisc(vec3 c, vec2 q, float el) {
  float px = skyPx(el), R = uSkySun.z;
  float k = 1.0 - smoothstep(R - px, R + px, length(q));
  vec2 o = vec2(cos(uSkyHalo.w), sin(uSkyHalo.w)) * (2.0 * R * uSkyHalo.z);
  k *= 1.0 - step(1e-4, uSkyHalo.z) * (1.0 - smoothstep(R - px, R + px, length(q + o)));
  return mix(c, skyCap(uSkySunCol) * uSkySun.w, k * step(1e-5, R));
}
#endif
`;

const FN = /* glsl */ `
vec3 SKY_FN(float az, float el) {
  float h = skyH(el);
  float hd = h + uSkyRamp.y * (fbm(vec2(az * 22.0, h * 60.0)) - 0.5);
  vec3 c = mix(skyRampA(hd), skyRampB(hd), uSkyPhase);
  float da = skyWrap(az - uSkySun.x);
  float g = exp(-abs(h) / max(uSkyGlow.y, 1e-3)) * mix(1.0, exp(-da * da / max(uSkyGlow.z * uSkyGlow.z, 1e-4)), uSkyGlow.w);
  c = mix(c, uSkyGlowCol, clamp(uSkyGlow.x * g, 0.0, 1.0));
  vec2 q = skyPlane(az, el, uSkySun.x, uSkySun.y);
  c = mix(c, uSkySunCol, clamp(uSkyHalo.x * exp(-dot(q, q) / max(uSkyHalo.y * uSkyHalo.y, 1e-6)), 0.0, 1.0));
  c = skyCap(c);
  if (uSkyStar.x > 0.0) c = skyStars(c, az, el);
  c = skyDisc(c, q, el);
  c = mix(c, skyCap(uSkyGround), uSkyRamp.z * skyStep(0.0, -h));
  if (uSkyClA[0].x > 0.5) c = skyCloud(c, uSkyClA[0], uSkyClB[0], uSkyClC[0], uSkyClLit[0], uSkyClMid[0], uSkyClSh[0], az, h);
  if (uSkyClA[1].x > 0.5) c = skyCloud(c, uSkyClA[1], uSkyClB[1], uSkyClC[1], uSkyClLit[1], uSkyClMid[1], uSkyClSh[1], az, h);
  if (uSkyShaftA.x > 0.0) c = skyShafts(c, az, el);
  return c;
}
`;

// GLSL body: `vec3 <fn>(float az, float el)` and, with o.plate, `vec3 paint(vec2 p)` over the frame (reads uRes)
export function skyRamp(o = {}) {
  const fn = o.fn ?? DEFAULTS.skyRamp.fn;
  if (!/^[A-Za-z_]\w*$/.test(fn)) throw new Error(`sky: fn must be a GLSL name, got ${fn}`);
  const body = (o.plate ? PLATE : "\n") + BASE + STARS + SHAFTS + CORE + FN.replaceAll("SKY_FN", fn);
  if (!o.plate) return body;
  return `${body}uniform vec4 uSkyPlate;
vec3 paint(vec2 p) { return ${fn}(uSkyPlate.z + (p.x - 0.5 * uRes.x / uRes.y) * uSkyPlate.y, (p.y - uSkyPlate.x) * uSkyPlate.y); }
`;
}
// alone: `vec3 skyStars(vec3 c, float az, float el)` and `vec3 skyShafts(vec3 c, float az, float el)`; values from skyUniforms(o)
export const starField = (o = {}) => (o.plate ? PLATE : "\n") + BASE + STARS;
export const shafts = (o = {}) => (o.plate ? PLATE : "\n") + BASE + SHAFTS;

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
function blank() {
  const v4 = () => new Vector4(), col = () => new Color(), six = (f) => Array.from({ length: 6 }, f);
  const u = { uSkyCA: { value: six(col) }, uSkyHA: { value: six(() => 0) }, uSkyCB: { value: six(col) }, uSkyHB: { value: six(() => 0) },
    uSkyPhase: { value: 0 }, uSkyT: { value: 0 } };
  for (const k of ["uSkyRamp", "uSkyGlow", "uSkySun", "uSkyHalo", "uSkyStar", "uSkyStarB", "uSkyShaftA", "uSkyShaftB", "uSkyShaftC", "uSkyPlate"]) u[k] = { value: v4() };
  for (const k of ["uSkyGround", "uSkyGlowCol", "uSkySunCol", "uSkyStarCol", "uSkyShaftCol"]) u[k] = { value: col() };
  for (const k of ["uSkyClA", "uSkyClB", "uSkyClC"]) u[k] = { value: [v4(), v4()] };
  for (const k of ["uSkyClLit", "uSkyClMid", "uSkyClSh"]) u[k] = { value: [col(), col()] };
  return u;
}
function rampInto(C, H, stops) {
  const n = stops?.length ?? 0;
  if (n < 2 || n > 6) throw new Error(`sky: a ramp takes 2 to 6 stops, got ${n}`);
  for (let i = 0; i < 6; i++) {
    const j = Math.min(i, n - 1), s = stops[j], [hex, at] = Array.isArray(s) ? s : [s, j / (n - 1)];
    C[i].set(hex);
    H[i] = i === 0 ? at : Math.max(i < n ? at : -Infinity, H[i - 1] + 1e-3); // strictly rising, padded past the last stop
  }
}

// uniforms for skyRamp / starField / shafts; pass `into` (a live material's uniforms) to rewrite it in place
export function skyUniforms(opts = {}, into = null) {
  const D = DEFAULTS.skyRamp, o = { ...D, ...opts }, u = into ?? blank();
  rampInto(u.uSkyCA.value, u.uSkyHA.value, o.stops);
  rampInto(u.uSkyCB.value, u.uSkyHB.value, o.to ?? o.stops);
  u.uSkyPhase.value = o.phase; u.uSkyT.value = o.time;
  const q = Math.round(o.quantise);
  u.uSkyRamp.value.set(q >= 2 ? Math.min(q, 16) : 0, o.dab, o.ground ? 1 : 0, 0);
  u.uSkyGround.value.set(o.ground ?? "#101014");
  const g = o.glow === null ? { ...D.glow, k: 0 } : { ...D.glow, ...o.glow };
  u.uSkyGlow.value.set(g.k, g.height, g.spread, clamp(g.focus, 0, 1)); u.uSkyGlowCol.value.set(g.col);
  const sun = o.sun === null ? { ...D.sun, r: 0, halo: 0 } : { ...D.sun, ...o.sun };
  u.uSkySun.value.set(sun.az, sun.el, Math.max(sun.r, 0), sun.emit); u.uSkySunCol.value.set(sun.col);
  u.uSkyHalo.value.set(sun.halo, sun.haloR, clamp(sun.crescent, 0, 1), sun.tilt);
  const layers = o.clouds ?? [];
  if (layers.length > 2) throw new Error(`sky: up to 2 cloud layers, got ${layers.length}`);
  for (let i = 0; i < 2; i++) {
    const l = layers[i], kind = l?.kind ?? "cumulus";
    if (!KINDS[kind]) throw new Error(`sky: cloud kind is cumulus or stratus, got ${kind}`);
    const c = { ...DEFAULTS.cloud[kind], ...l };
    u.uSkyClA.value[i].set(l ? KINDS[kind] : 0, c.at, Math.max(c.thick, 1e-3), clamp(c.cover, 0, 1));
    u.uSkyClB.value[i].set(Math.max(c.stretch, 0.05), c.seed, c.drift, c.opacity);
    u.uSkyClC.value[i].set(Math.max(c.rim, 0), 0, 0, 0);
    u.uSkyClLit.value[i].set(c.lit); u.uSkyClMid.value[i].set(c.mid); u.uSkyClSh.value[i].set(c.shade);
  }
  const s = { ...DEFAULTS.starField, ...o.stars }, count = o.stars ? s.count * (o.tier <= 1 ? 0.5 : 1) : 0;
  u.uSkyStar.value.set(clamp(count / (GRID * GRID), 0, 0.6), s.size, clamp(s.twinkle, 0, 1), s.fps);
  u.uSkyStarB.value.set(s.fade[0], Math.max(s.fade[1], s.fade[0] + 1e-3), s.gain, s.seed); u.uSkyStarCol.value.set(s.col);
  const sh = { ...DEFAULTS.shafts, ...o.shafts }, from = sh.from ?? [sun.az, o.plate ? sun.el : Math.sin(sun.el)];
  u.uSkyShaftA.value.set(o.shafts ? sh.k : 0, clamp(Math.round(sh.n), 1, 4), Math.max(sh.len, 1e-3), clamp(sh.soft, 0.05, 0.95));
  u.uSkyShaftB.value.set(from[0], from[1], sh.dir, sh.spread);
  u.uSkyShaftC.value.set(Math.max(sh.w[0], 1e-4), Math.max(sh.w[1], 1e-4), sh.seed, clamp(sh.rag, 0, 1)); u.uSkyShaftCol.value.set(sh.col);
  const pl = { ...DEFAULTS.plate, ...(typeof o.plate === "object" ? o.plate : {}) };
  u.uSkyPlate.value.set(pl.horizon, pl.span, pl.az, 0);
  return u;
}

const VARIANTS = [
  { yaw: 0.1, o: { // Shinkai summer: five-stop blue, sunlit cumulus bank, stratus streaks, blooming sun
    stops: [["#f6e7cf", 0], ["#bfe0f5", 0.05], ["#86bdee", 0.18], ["#4a8fdc", 0.45], ["#2559b4", 0.92]],
    glow: { col: "#ffe6bf", k: 0.5, height: 0.07, focus: 0.5 },
    sun: { az: 0.18, el: 0.75, r: 0.028, col: "#fff6dc", emit: 1.8, halo: 0.3, haloR: 0.16 },
    clouds: [{ kind: "cumulus", at: 0.0, thick: 0.16, cover: 0.62, seed: 3 }, { kind: "stratus", at: 0.5, thick: 0.03, cover: 0.45, seed: 5 }],
  } },
  { yaw: -0.05, o: { // kataware-doki blending to night by phase: crescent moon, twinkling stars, pink fleck streaks
    stops: [["#f0d1c5", 0.007], ["#cda8bd", 0.065], ["#9074b2", 0.162], ["#545fab", 0.256], ["#2e5890", 0.346], ["#264670", 0.43]],
    to: [["#46528c", 0.007], ["#3a4478", 0.065], ["#2b3a6a", 0.162], ["#22335a", 0.256], ["#1d3050", 0.346], ["#192b3e", 0.43]],
    glow: { col: "#ffc6a0", k: 0.55, height: 0.05, spread: 0.6, focus: 0.8 },
    sun: { az: -0.08, el: 0.55, r: 0.02, col: "#f6f2ea", emit: 1.3, halo: 0.12, haloR: 0.07, crescent: 0.3, tilt: -2.4 },
    stars: { count: 320, twinkle: 0.7, fade: [0.1, 0.4] },
    clouds: [{ kind: "stratus", at: 0.14, thick: 0.03, cover: 0.55, seed: 2, lit: "#f2bccb", mid: "#bb92ba", shade: "#6f619c" }],
  } },
  { yaw: 0, o: { // cursed red: four hard bands, rim-lit dark cumulus, four shafts from the upper right
    stops: [["#5c1a1c", 0], ["#3b0b11", 0.1], ["#24090d", 0.3], ["#160a0c", 0.75]], quantise: 4, dab: 0.02, ground: "#1a0b0e",
    glow: { col: "#930f20", k: 0.55, height: 0.08, focus: 0.3 }, sun: { az: 0.5, el: 0.9, r: 0, halo: 0 },
    clouds: [{ kind: "cumulus", at: 0.06, thick: 0.2, cover: 0.7, seed: 9, rim: 0.08, lit: "#d3565a", mid: "#3b0b11", shade: "#2d0e0d" }],
    shafts: { n: 4, col: "#d3565a", k: 0.3, dir: -2.1, spread: 0.18, len: 1.3 },
  } },
];

// three 0.62 x 1.8 m sky cards (an 80 degree tall view pitched up 0.5 rad), solid: depth + alpha 0.6; loops every 4 s
export function demo(engine) {
  const group = new Group(), geo = new PlaneGeometry(0.62, 1.8), mats = [];
  group.userData.layer = 1;
  const vertexShader = "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
  const fragmentShader = `uniform vec2 uView; varying vec2 vUv;
${glslFor(["noise"])}${skyRamp()}
void main() {
  vec3 v = vec3((vUv.x - 0.5) * 0.58, (vUv.y - 0.5) * 1.68, -1.0);
  vec3 d = normalize(vec3(v.x, v.y * cos(uView.y) + sin(uView.y), v.y * sin(uView.y) - cos(uView.y)));
  gl_FragColor = vec4(sky(atan(d.x, -d.z) + uView.x, asin(clamp(d.y, -1.0, 1.0))), 0.6);
}`;
  VARIANTS.forEach((v, i) => {
    const uniforms = { ...skyUniforms({ ...v.o, tier: engine?.tier ?? 3 }), uView: { value: new Vector2(v.yaw, 0.5) } };
    const m = new ShaderMaterial({ uniforms, vertexShader, fragmentShader });
    const card = new Mesh(geo, m);
    card.position.set((i - 1) * 0.69, 1, 0);
    group.add(card); mats.push(m);
  });
  const dusk = mats[1].uniforms, glowK = VARIANTS[1].o.glow.k;
  return {
    group,
    update(ts) {
      const t = ((ts % 4) + 4) % 4, p = 0.5 - 0.5 * Math.cos(t * Math.PI / 2);
      for (const m of mats) m.uniforms.uSkyT.value = t;
      dusk.uSkyPhase.value = p; dusk.uSkyGlow.value.x = glowK * (1 - p);
    },
    dispose() { geo.dispose(); for (const m of mats) m.dispose(); },
  };
}
