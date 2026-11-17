// pr-openxla-46539 packet shaders: My Hero Academia United States of Smash, Bones TV cel (storm, ruins, rain, ribbons, fist glow, dust, impact map, cel, grade).
import { defineCut } from "../kit.glsl.js";

const F = "pr-openxla-46539";
const H = (x) => { const n = parseInt(x.slice(1), 16); return `vec3(${[n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => (v / 255).toFixed(4)).join(", ")})`; };
const C = { skyD: H("#121632"), skyL: H("#222952"), cloud: H("#4a4f68"), rubble: H("#0e0a10"), ink: H("#12070a"), rib: H("#c8d4ec"), rain: H("#8f9ab8"),
  glow: H("#d5c795"), core: H("#edf2e3"), orange: H("#ff8a20"), redk: H("#3a0a10"), white: H("#e8ebdc"),
  dust1: H("#575b72"), dust2: H("#84889d"), dust3: H("#9ea2b4"), shLo: H("#0c0a14"), shHi: H("#a1a4b6"),
  body: H("#86aad6"), blue: H("#162a6a"), blueS: H("#0c173b"), red: H("#c02a30"), redS: H("#6b171b"), hair: H("#e6c84a"), hairS: H("#817029"),
  lens: H("#20232c"), iris: H("#2f7fd0"), cyan: H("#7fe8ff"), brow: H("#817029") };

const DB = `mix(${C.skyL}, ${C.skyD}, cAA(p.y, 0.5))`;
const U = (o) => () => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));
const NUM = (o) => Object.keys(o).map((k) => `uniform float ${k};`).join("\n");

function T(name, { doc, draws, use, params, uni = {}, deps = [], body, demo }) {
  const m = defineCut(name, F, doc, `${NUM(uni)}\n${body}`, demo);
  return { ...m, deps: ["cutKit", "mhaKit", ...deps], draws, use, suits: F, params, uniforms: U(uni) };
}

export const mhaKit = {
  name: "mhaKit",
  family: F,
  doc: "pr-openxla-46539 helpers: frame-height uv with aspect, 12 fps drawing clock, 24 fps hit index k, seeded hash",
  deps: ["cutKit"],
  glsl: `uniform float uMhaSeed;
uniform float uMhaAsp;
vec2 mhaA(vec2 p) { return vec2(p.x * uMhaAsp, p.y); }
float mhaDraw(float t) { return floor(t * 12.0 + 1e-3); }
float mhaK(float t) { return floor((t - 8.0) * 24.0 + 1e-3); }
float mhaH(vec2 p) { return cH21(p + uMhaSeed * 0.137); }`,
  uniforms: U({ uMhaSeed: 7, uMhaAsp: 1.6 }),
  demo: `vec3 demo(vec2 p, float t) { return cCap(mix(CUT_INK, vec3(0.6), cAA(mhaH(floor(mhaA(p) * 12.0)), 0.5))); }`,
};

export const mhaStormSky = T("mhaStormSky", {
  doc: "W1 storm sky: navy two-band sky with cloud banks cut to hard 3-value shapes, shifting 6 px per drawing on twos",
  draws: "A navy night sky in two hard bands with flat blue-grey cloud banks that have crisp edges and jump sideways a little on every other frame.",
  use: "plate",
  params: "uMhaCloudBias: shifts cloud cover up or down (more banks above 0); uMhaSeed: moves the cloud pattern.",
  uni: { uMhaCloudBias: 0.0 },
  body: `vec3 mhaStormSky(vec2 p, float t) {
  vec2 q = mhaA(vec2(p.x + mhaDraw(t) * 0.0047, p.y));
  float edge = 0.50 + (cVn(q * 1.6 + 3.0) - 0.5) * 0.10;
  vec3 c = mix(${C.skyL}, ${C.skyD}, cAA(p.y, edge));
  float f = cFbm(q * vec2(1.7, 3.0) + vec2(uMhaSeed * 0.71, uMhaSeed * 0.29)) + (p.y - 0.5) * 0.35 + uMhaCloudBias;
  c = mix(c, mix(${C.skyL}, ${C.cloud}, 0.55), cAA(f, 0.60));
  return mix(c, ${C.cloud}, cAA(f, 0.70));
}`,
  demo: "mhaStormSky(p, t)",
});

export const mhaKaminoRuins = T("mhaKaminoRuins", {
  deps: ["mhaStormSky"],
  doc: "W2 Kamino ruins: one broken tower and a leaning slab as a dark silhouette on the storm sky, moon-rim on the upper right edge",
  draws: "A dark violet broken tower with a slanted top and a leaning slab beside it, standing in the storm sky with a thin navy moon edge on its right side.",
  use: "plate",
  params: "uMhaSeed: moves the clouds behind; the tower stands at 0.78 of the width and 0.55 of the image height, fixed.",
  body: `float mhaRuinD(vec2 p) {
  vec2 q = mhaA(p);
  float cx = 0.78 * uMhaAsp, base = 0.2325, h = 0.368;
  vec2 m = q - vec2(cx, base + (0.92 * h - 0.04) * 0.5);
  float tower = max(abs(m.x) - 0.055, abs(m.y) - (0.92 * h + 0.04) * 0.5);
  tower = max(tower, dot(q - vec2(cx, base + 0.92 * h), normalize(vec2(0.55, 1.0))));
  vec2 s = q - vec2(cx - 0.14, base + h * 0.33);
  float cs = cos(0.14), sn = sin(0.14);
  s = vec2(cs * s.x - sn * s.y, sn * s.x + cs * s.y);
  float slab = max(abs(s.x) - 0.016, abs(s.y) - h * 0.36);
  vec2 b = q - vec2(cx + 0.11, base + 0.04);
  float stub = max(abs(b.x) - 0.032, abs(b.y) - 0.07 + (b.x + 0.032) * 0.5);
  return min(tower, min(slab, stub));
}
vec3 mhaKaminoRuins(vec2 p, float t) {
  vec3 c = mhaStormSky(p, t);
  float d = mhaRuinD(p);
  c = mix(c, ${C.rubble}, cFill(d));
  float rim = cFill(d) * (1.0 - cFill(mhaRuinD(p + vec2(0.0025, 0.004))));
  return mix(c, ${C.skyL}, rim);
}`,
  demo: "mhaKaminoRuins(p, t)",
});

export const mhaRubbleBand = T("mhaRubbleBand", {
  deps: ["mhaKaminoRuins"],
  doc: "W3/W4 rubble band: ragged slab-and-column silhouette across the bottom of the image area with two mounds, over the ruins plate",
  draws: "A flat dark violet strip of broken slabs and columns along the bottom of the picture with two low mounds, a thin navy moon edge on top, over the stormy ruins.",
  use: "plate",
  params: "uMhaMoundA, uMhaMoundB: x of the two mounds (seal at 0.40, victim at 0.18) as a fraction of the width.",
  uni: { uMhaMoundA: 0.40, uMhaMoundB: 0.18 },
  body: `float mhaRubbleTop(float x) {
  float u = x * 22.0, id = floor(u), f = fract(u);
  float h = cH21(vec2(id, 3.7)), sl = cH21(vec2(id, 9.1)) - 0.5;
  float top = 0.2325 + (h - 0.5) * 0.030 + sl * (f - 0.5) * 0.03;
  top += step(0.90, cH21(vec2(id, 5.5))) * step(0.30, f) * step(f, 0.62) * 0.035;
  float a = (x - uMhaMoundA) / 0.07, b = (x - uMhaMoundB) / 0.07;
  return top + 0.016 * exp(-a * a) + 0.016 * exp(-b * b);
}
vec3 mhaRubbleBand(vec2 p, float t) {
  vec3 c = mhaKaminoRuins(p, t);
  float d = p.y - mhaRubbleTop(p.x);
  c = mix(c, ${C.rubble}, cFill(d));
  return mix(c, ${C.skyL}, cFill(d) * (1.0 - cFill(d + 0.004)) * 0.45);
}`,
  demo: "mhaRubbleBand(p, t)",
});

export const mhaRain = T("mhaRain", {
  doc: "E2 rain: slanted streaks 78 degrees from horizontal, 1.5 px wide, 60 px long, falling 1400 px/s and re-placed on twos",
  draws: "Thin pale blue-grey rain lines slanting down to the left across the whole frame, jumping to new positions every other frame.",
  use: "screen",
  params: "base: colour under the rain; uMhaRainGain: density gain 1.0 normal, 0.3 during the punch; uMhaSeed: lane layout.",
  uni: { uMhaRainGain: 1.0 },
  body: `vec3 mhaRain(vec2 p, float t, vec3 base) {
  float ang = radians(78.0);
  vec2 dir = vec2(-cos(ang), -sin(ang)), nrm = vec2(-dir.y, dir.x);
  vec2 q = mhaA(p);
  float u = dot(q, dir) - 1.75 * mhaDraw(t) / 12.0, v = dot(q, nrm);
  float lw = 0.0127, lane = floor(v / lw), per = 1.6;
  float s = mhaH(vec2(lane, 11.0)) * per;
  float w = u - s;
  w -= per * floor(w / per);
  float cc = (lane + 0.5 + (mhaH(vec2(lane, 5.0)) - 0.5) * 0.35) * lw;
  float body = cFill(abs(v - cc) - 0.00094) * (1.0 - cAA(w, 0.075));
  return mix(base, ${C.rain}, body * mix(0.35, 1.0, w / 0.075) * 0.5 * uMhaRainGain);
}`,
  demo: `mhaRain(p, t, ${DB})`,
});

export const mhaWindRibbons = T("mhaWindRibbons", {
  doc: "E3 wind ribbons: three pale bands y = y0 + A sin(x/90 + 1.3 i + 0.8 t) with gaussian falloff, masked out of the seal",
  draws: "Three soft pale blue wind bands rolling across the frame behind the figure, the only soft-edged shapes in the cutscene.",
  use: "screen",
  params: "base: colour under the ribbons; seal: 0..1 silhouette coverage that hides them; uMhaRibbonOn: 1 on, 0 off for the punch frames.",
  uni: { uMhaRibbonOn: 1.0 },
  body: `vec3 mhaWindRibbons(vec2 p, float t, vec3 base, float seal) {
  float y0[3] = float[3](0.33, 0.56, 0.78);
  float am[3] = float[3](0.050, 0.067, 0.039);
  float wd[3] = float[3](0.028, 0.039, 0.022);
  float x = p.x * 1280.0, a = 0.0;
  for (int i = 0; i < 3; i++) {
    float yi = y0[i] + am[i] * sin(x / 90.0 + 1.3 * float(i) + 0.8 * t);
    float g = (p.y - yi) / wd[i];
    a = max(a, exp(-g * g));
  }
  return mix(base, ${C.rib}, 0.85 * a * (1.0 - seal) * uMhaRibbonOn);
}`,
  demo: `mhaWindRibbons(p, t, ${DB}, cCover(p))`,
});

export const mhaFistGlow = T("mhaFistGlow", {
  doc: "E7 fist glow: gaussian gold halo e^(-r^2/0.09) plus a flattened white-gold core at the flipper tip, driven by one emit scalar",
  draws: "A warm gold glow around a fist with a bright white-gold oval at its heart, the brightest thing in the frame.",
  use: "screen",
  params: "base: colour under the glow; uMhaEmit: 0..1 power (ramps 0 to 1 over 7 to 8 s, 0.35 after 9.5 s); uMhaFistX, uMhaFistY: tip position in frame units (default 0.29, 0.29).",
  uni: { uMhaEmit: 1.0, uMhaFistX: 0.29, uMhaFistY: 0.29 },
  body: `vec3 mhaFistGlow(vec2 p, float t, vec3 base) {
  vec2 d = mhaA(p - vec2(uMhaFistX, uMhaFistY));
  vec3 c = mix(base, ${C.glow}, uMhaEmit * 0.80 * exp(-dot(d, d) / 0.090));
  vec2 e = (d - vec2(0.02, 0.0)) * vec2(1.0, 0.75);
  float fist = exp(-pow(length(e) / 0.20, 2.0));
  return mix(c, ${C.core}, uMhaEmit * smoothstep(0.25, 0.75, fist));
}`,
  demo: `mhaFistGlow(p, t, ${DB})`,
});

export const mhaDustSwirl = T("mhaDustSwirl", {
  doc: "E16 dust swirl: three blue-grey fbm bands spiralling out of the hit, 1.5 turns/s decaying, radius 0.35 to 0.6 of the height, on twos",
  draws: "A blue-grey cloud of dust in three flat tones twisting outward from the point of impact and fading as it grows.",
  use: "screen",
  params: "t: seconds since the dust starts (8.5 s into the cutscene); base: colour under it; uMhaDustX, uMhaDustY: centre in frame units; uMhaSeed: dust pattern.",
  uni: { uMhaDustX: 0.29, uMhaDustY: 0.29 },
  body: `vec3 mhaDustSwirl(vec2 p, float t, vec3 base) {
  float age = mhaDraw(t) / 12.0, u = clamp(age, 0.0, 1.0);
  vec2 d = mhaA(p - vec2(uMhaDustX, uMhaDustY));
  float r = length(d), R = mix(0.35, 0.60, u);
  float th = atan(d.y, d.x) + 6.2832 * 0.75 * (1.0 - exp(-2.0 * u)) + 2.0 * (1.0 - clamp(r / R, 0.0, 1.0));
  float f = cFbm(vec2(cos(th), sin(th)) * r * 5.5 + uMhaSeed * 0.43) + 0.15 * (1.0 - r / R);
  float edge = R * (0.88 + 0.24 * cVn(vec2(th * 1.4, 2.0)));
  vec3 c = mix(mix(${C.dust1}, ${C.dust2}, cAA(f, 0.58)), ${C.dust3}, cAA(f, 0.70));
  return mix(base, c, cAA(f, 0.45) * cFill(r - edge) * exp(-2.2 * u));
}`,
  demo: `mhaDustSwirl(p, mod(t, 1.0), ${DB})`,
});

export const mhaImpactMap = T("mhaImpactMap", {
  doc: "E8/E14 impact frames: k0 flat white #e8ebdc, k2 to k4 the picture flattened to orange where luma > 0.35 else red-black, other frames untouched",
  draws: "One flat off-white frame, then three frames where the whole picture is only orange and dark red, then back to normal.",
  use: "screen",
  params: "t: seconds in the cutscene (k = floor((t - 8) * 24)); base: the finished frame colour to flatten.",
  body: `vec3 mhaImpactMap(vec2 p, float t, vec3 base) {
  float k = mhaK(t);
  if (k > -0.5 && k < 0.5) return ${C.white};
  if (k > 1.5 && k < 4.5) return cLuma(base) > 0.35 ? ${C.orange} : ${C.redk};
  return base;
}`,
  demo: `mhaImpactMap(p, 8.125, ${DB})`,
});

export const mhaBonesCel = T("mhaBonesCel", {
  doc: "Bones TV cel for the cast: 2-tone band at N.L 0.25, 4 px hatch at 138 degrees in deep shade, thin moon rim, 2.8 px ink contour, gold fist-light",
  draws: "A rounded hero form in two flat tones with fine diagonal hatch lines in its darkest side, a narrow pale moon edge top right, and a thick dark outline.",
  use: "surface",
  params: "uMhaPart: 0 body, 1 blue suit, 2 red suit, 3 hair, 4 belt; uMhaGlow: 0..1 gold fist light from the lower left.",
  uni: { uMhaPart: 0.0, uMhaGlow: 0.0 },
  body: `vec3 mhaBonesCel(vec2 p, float t) {
  vec3 lit = ${C.body}, sh = lit * 0.56;
  if (uMhaPart > 0.5 && uMhaPart < 1.5) { lit = ${C.blue}; sh = ${C.blueS}; }
  else if (uMhaPart > 1.5 && uMhaPart < 2.5) { lit = ${C.red}; sh = ${C.redS}; }
  else if (uMhaPart > 2.5 && uMhaPart < 3.5) { lit = ${C.hair}; sh = ${C.hairS}; }
  else if (uMhaPart > 3.5) { lit = ${C.hair}; sh = lit * 0.56; }
  vec2 c = cN(p);
  float z = sqrt(max(0.0, 0.22 - dot(c, c)));
  vec3 n = normalize(vec3(c, z + 1e-4));
  float nl = dot(n, normalize(vec3(0.45, 0.8, -0.4)));
  float gl = uMhaGlow * max(dot(n, normalize(vec3(-0.7, -0.4, 0.6))), 0.0);
  float key = nl + gl;
  vec3 col = mix(sh, lit, cAA(key, 0.25));
  col = mix(col, ${C.glow}, cAA(gl, 0.30) * 0.5);
  vec2 px = p * vec2(1280.0, 800.0);
  float hc = dot(px, vec2(-0.7431, 0.6691)) / 4.0;
  float stroke = 1.0 - cAA(fract(hc), 0.25);
  float gate = step(cH21(vec2(floor(hc), 1.7)), clamp(-key / 0.6, 0.0, 1.0) * 0.5);
  col = mix(col, ${C.ink}, stroke * gate * (1.0 - cAA(key, 0.0)));
  float nv = z / 0.469;
  col = mix(col, ${C.rib}, cAA(pow(1.0 - nv, 4.0), 0.55) * cAA(nl, 0.15));
  col = mix(col, ${C.ink}, cLine(length(c) - 0.469, 2.8));
  return mix(${C.skyD}, col, cCover(p));
}`,
  demo: "mhaBonesCel(p, t)",
});

export const mhaEyeSpark = T("mhaEyeSpark", {
  doc: "Seal-as-All-Might eyes: narrowed dark lens, angled gold-shade brows, blue iris ring only when lit, two cyan catch-lights flickering one on one off every 0.5 s",
  draws: "A pair of narrowed dark glossy eyes under thick angled brows, with one small cyan point alternating between the eyes twice a second.",
  use: "card",
  params: "base: colour under the eyes; uMhaEyeLit: 0..1 shows the blue iris ring; uMhaEyeSteady: 1 holds both cyan points on.",
  uni: { uMhaEyeLit: 0.0, uMhaEyeSteady: 0.0 },
  body: `vec3 mhaEyeSpark(vec2 p, float t, vec3 base) {
  vec2 q = vec2((p.x - 0.5) * uMhaAsp, p.y - 0.5);
  float flick = mod(floor(t * 2.0 + 1e-3), 2.0);
  vec3 c = base;
  for (int i = 0; i < 2; i++) {
    float sg = i == 0 ? -1.0 : 1.0;
    vec2 e = q - vec2(sg * 0.17, 0.0);
    float lens = length(e / vec2(0.09, 0.045)) - 1.0;
    c = mix(c, ${C.lens}, cFill(lens));
    c = mix(c, ${C.iris}, cFill(abs(length(e) - 0.036) - 0.005) * cFill(lens) * uMhaEyeLit);
    float on = max(i == 0 ? flick : 1.0 - flick, uMhaEyeSteady);
    c = mix(c, ${C.cyan}, cFill(length(e - vec2(-sg * 0.022, 0.014)) - 0.007) * on);
    c = mix(c, ${C.ink}, cLine(lens, 2.0));
    vec2 dv = normalize(vec2(-sg, -0.4)), b = q - vec2(sg * 0.17, 0.085);
    float br = max(abs(dot(b, dv)) - 0.10, abs(dot(b, vec2(-dv.y, dv.x))) - 0.014);
    c = mix(c, ${C.brow}, cFill(br));
    c = mix(c, ${C.ink}, cLine(br, 1.8));
  }
  return c;
}`,
  demo: `mhaEyeSpark(p, t, mix(${C.skyD}, vec3(0.62, 0.66, 0.78), 0.45))`,
});

export const mhaIrisInk = T("mhaIrisInk", {
  doc: "E1/E19 ink iris: hard-edged circle in studio ink opening over 0 to 1 s and closing over 15 to 16 s in 12 steps, centred on the seal",
  draws: "A hard black-brown circle wipe that opens on the small hero at the start and closes on it at the end, moving in visible steps.",
  use: "mask",
  params: "t: seconds in the cutscene; base: frame colour; uMhaIrisX, uMhaIrisY: centre (the seal's chest) in frame units.",
  uni: { uMhaIrisX: 0.40, uMhaIrisY: 0.40 },
  body: `vec3 mhaIrisInk(vec2 p, float t, vec3 base) {
  float s = t < 8.0 ? clamp(t, 0.0, 1.0) : 1.0 - clamp(t - 15.0, 0.0, 1.0);
  float st = floor(s * 12.0 + 1e-3) / 12.0;
  float R = st * st * (3.0 - 2.0 * st) * 1.95;
  vec2 d = mhaA(p - vec2(uMhaIrisX, uMhaIrisY));
  return mix(base, ${C.ink}, 1.0 - cFill(length(d) - R));
}`,
  demo: `mhaIrisInk(p, mod(t, 1.0), ${DB})`,
});

export const mhaGradeStorm = T("mhaGradeStorm", {
  doc: "E20-E22 grade: 25 percent split tone to #0c0a14 / #a1a4b6 skipping saturated glow and impact colours, luma cap 0.92, ink-floor lift, twos grain off at k2-4",
  draws: "The whole frame pulled toward cold navy shadows and pale grey highlights with nothing blown out or pure black, and a fine film grain that holds for two frames.",
  use: "grade",
  params: "base: the finished frame colour; t: seconds in the cutscene (sets the 12/24 fps drawing and k); uMhaGrain: grain strength, 1 normal.",
  uni: { uMhaGrain: 1.0 },
  body: `vec3 mhaGradeStorm(vec2 p, float t, vec3 c) {
  float k = mhaK(t);
  bool flat_ = (k > -0.5 && k < 0.5) || (k > 1.5 && k < 4.5);
  float mx = max(c.r, max(c.g, c.b)), sat = (mx - min(c.r, min(c.g, c.b))) / max(mx, 1e-3);
  float w = 0.25 * (1.0 - smoothstep(0.35, 0.65, sat)) * (flat_ ? 0.0 : 1.0);
  c = mix(c, mix(${C.shLo}, ${C.shHi}, smoothstep(0.10, 0.70, cLuma(c))), w);
  c *= min(1.0, 0.92 / max(cLuma(c), 1e-4));
  float y = cLuma(c);
  c = mix(${C.ink}, c, smoothstep(0.035, 0.08, y));
  float fps = (t >= 8.0 && t < 8.5) ? 24.0 : 12.0;
  float g = mhaH(floor(p * vec2(1280.0, 800.0)) + floor(t * fps + 1e-3) * 37.0);
  bool tone = k > 1.5 && k < 4.5;
  return c + (tone ? 0.0 : 0.03 * uMhaGrain * (g - 0.5) * (1.0 - y) * smoothstep(0.06, 0.12, y));
}`,
  demo: `mhaGradeStorm(p, t, ${DB})`,
});

export const CUT_SHADERS = [
  mhaKit, mhaStormSky, mhaKaminoRuins, mhaRubbleBand, mhaRain, mhaWindRibbons, mhaFistGlow, mhaDustSwirl,
  mhaImpactMap, mhaBonesCel, mhaEyeSpark, mhaIrisInk, mhaGradeStorm,
];
export const CUT_SHADER_COUNT = 13;
export default CUT_SHADERS;
