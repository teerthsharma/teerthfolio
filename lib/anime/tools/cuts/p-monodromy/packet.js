// p-monodromy packet shaders: the storm-violet Foraz Zora look from .oneshot/p-monodromy/PACKET.md (A-1 Pictures TV cel).
import { defineCut as M } from "../kit.glsl.js";

const F = "p-monodromy";
const H = (h) => `vec3(${[0, 2, 4].map((i) => (parseInt(h.slice(i, i + 2), 16) / 255).toFixed(4)).join(", ")})`;
const U = (o) => () => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));
const SUIT = ["p-monodromy"];
const OWNER = { monoSkyBlob: "monoStormSky", monoCloudV: "monoCloudDeck", monoFunnelLayer: "monoFunnel", monoTearX: "monoTearCrack" };
const needs = (name, glsl, demo) => [...new Set([...(glsl + demo).matchAll(/(mono[A-Z]\w*)\s*\(/g)].map((m) => OWNER[m[1]] ?? m[1]).filter((n) => n !== name))];
const S = (name, doc, glsl, demo, meta, uni) => {
  const t = M(name, F, doc, glsl, demo);
  return { ...t, deps: ["cutKit", ...needs(name, glsl, demo)], ...meta, suits: SUIT, uniforms: U(uni) };
};

export const monoStormSky = S("monoStormSky", "moonless storm dome: four flat violet bands, bruise horizon, cloud highs", `
uniform float uMonoSkySeed;
float monoSkyBlob(vec2 p) { return cFbm(p * vec2(2.2, 5.5) + uMonoSkySeed * 1.7 + vec2(0.0, 3.0)); }
vec3 monoStormSky(vec2 p, float t) {
  float s = clamp((p.y - 0.12) / 0.88, 0.0, 1.0);
  float y = clamp(s + (cFbm(p * vec2(2.4, 5.0) + uMonoSkySeed) - 0.5) * 0.09, 0.0, 1.0);
  vec3 c = mix(mix(mix(${H("974b59")}, ${H("4a457f")}, cAA(y, 0.08)), ${H("3a335e")}, cAA(y, 0.36)), ${H("28213c")}, cAA(y, 0.70));
  float f = cAA(monoSkyBlob(p), 0.56);
  float up = cAA(monoSkyBlob(p + vec2(0.0, 0.03)), 0.56);
  c = mix(c, ${H("4a457f")}, f * 0.5 * (1.0 - cAA(y, 0.70)));
  return mix(c, ${H("6967b1")}, f * (1.0 - up) * cAA(y, 0.08));
}`, "monoStormSky(p, t)", {
  draws: "A moonless violet sky in four flat bands from near-black zenith to a bruise-red strip at the horizon, with lighter cloud tops cut hard on the upper edges.",
  use: "plate", params: "uMonoSkySeed: seed of the band wobble and cloud blobs.", quality: "real",
}, { uMonoSkySeed: 3.0 });

export const monoCloudDeck = S("monoCloudDeck", "three hard-banded cloud cards over the storm sky, stepped drift from 5 s to 8 s", `
uniform float uMonoDeckSeed;
float monoCloudV(vec2 p, float yc, float hh, float sc, float seed) {
  return cFbm(p * vec2(sc, sc * 2.4) + seed) * 1.1 + (1.0 - abs(p.y - yc) / hh) * 0.7 - 0.95;
}
vec3 monoCloudDeck(vec2 p, float t) {
  vec3 c = monoStormSky(p, t);
  float dr = clamp(floor(t * 6.0) / 6.0 - 5.0, 0.0, 3.0);
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float spd = 0.2 + 0.1 * fk + 0.05 * fk * fk;
    vec2 q = p - vec2(dr * spd * 0.02, 0.0);
    float yc = 0.62 - 0.07 * fk, hh = 0.10 + 0.03 * fk, sc = 2.4 - 0.5 * fk, sd = uMonoDeckSeed + 11.0 * fk;
    float inn = cAA(monoCloudV(q, yc, hh, sc, sd), 0.0);
    float up = cAA(monoCloudV(q + vec2(0.0, 0.03), yc, hh, sc, sd), 0.0);
    float dn = cAA(monoCloudV(q - vec2(0.0, 0.035), yc, hh, sc, sd), 0.0);
    c = mix(c, ${H("4a457f")}, inn);
    c = mix(c, ${H("6967b1")}, inn * (1.0 - up));
    c = mix(c, ${H("26213c")}, inn * (1.0 - dn) * 0.9);
  }
  return c;
}`, "monoCloudDeck(p, 6.5)", {
  draws: "Three layers of flat violet clouds, each with a pale hard-cut top and a near-black underside, sliding sideways in small steps.",
  use: "plate", params: "uMonoDeckSeed: seed of the three cloud fields; t drives the drift (active 5 to 8 s, speeds 0.2, 0.35, 0.6).", quality: "real",
}, { uMonoDeckSeed: 7.0 });

export const monoDuskSea = S("monoDuskSea", "dark violet sea strip with wide bands and 3 to 5 thin highlight strokes redrawn on twos", `
uniform float uMonoSeaSeed;
vec3 monoDuskSea(vec2 p, float t) {
  float hz = 0.12;
  float d = max(hz - p.y, 0.0) / hz;
  float persp = 1.0 / (d * 3.0 + 0.25);
  float band = cFbm(vec2(p.x * 0.8 * persp, persp * 1.6 + uMonoSeaSeed));
  vec3 sea = mix(${H("261f39")}, ${H("342d50")}, cAA(band, 0.50));
  float tt = floor(t * 6.0);
  float n = 3.0 + floor(cH21(vec2(tt, 5.0)) * 3.0);
  float stroke = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 h = cH22(vec2(fi + 1.0, tt + uMonoSeaSeed));
    float yy = hz - (0.01 + h.y * 0.10);
    float len = 0.04 + 0.10 * (hz - yy) / hz;
    float seg = cFill(max(abs(p.x - h.x) - len, abs(p.y - yy) - 0.0016));
    stroke = max(stroke, seg * step(fi + 0.5, n));
  }
  sea = mix(sea, ${H("6c6ab6")}, stroke);
  return mix(monoStormSky(p, t), sea, cAA(hz - p.y, 0.0));
}`, "monoDuskSea(p, t)", {
  draws: "A near-black violet sea under the storm sky, in wide flat bands that widen toward the viewer, with a handful of short pale strokes that jump every other drawing.",
  use: "plate", params: "uMonoSeaSeed: seed of the bands and the stroke placement.", quality: "real",
}, { uMonoSeaSeed: 2.0 });

export const monoGrade = S("monoGrade", "A-1 grade: violet-to-rose split tone, sky-only grain on twos, luma cap 0.92, ink-floor lift", `
uniform float uMonoGradeHz;
vec3 monoGrade(vec3 col, vec2 p, float t) {
  float y0 = cLuma(col);
  float n = cH21(floor(p * vec2(1280.0, 800.0)) + 17.0 * floor(t * 12.0));
  col += 0.025 * (1.0 - y0) * (n - 0.5) * cAA(p.y, uMonoGradeHz);
  col = mix(col, mix(${H("281d2d")}, ${H("ac8fa9")}, smoothstep(0.2, 0.8, y0)), 0.35);
  col = cCap(col);
  return mix(${H("110c10")}, col, smoothstep(0.035, 0.08, cLuma(col)));
}`, "monoGrade(monoStormSky(p, t), p, t)", {
  draws: "The whole frame pulled toward violet in the shadows and rose-lilac in the lights, with fine grain that changes twelve times a second over the sky only.",
  use: "grade", params: "col: the frame so far; uMonoGradeHz: horizon height below which the grain stops (0.12).", quality: "real",
}, { uMonoGradeHz: 0.12 });

export const monoCineFrame = S("monoCineFrame", "2.39:1 cinema bars that snap on at 1 s and a round iris opening at 0 s and closing at 11 s", `
vec3 monoCineFrame(vec3 col, vec2 p, float t) {
  vec3 ink = ${H("110c10")};
  float bar = 0.1653;
  float inBar = clamp((1.0 - cAA(p.y, bar)) + cAA(p.y, 1.0 - bar), 0.0, 1.0);
  col = mix(col, ink, inBar * step(1.0, t));
  float fo = clamp(floor(t * 12.0) / 11.0, 0.0, 1.0);
  float fc = 1.0 - clamp(floor((t - 11.0) * 12.0) / 11.0, 0.0, 1.0);
  float r = mix(fo, fc, step(6.0, t)) * 1.4;
  float d = length((p - vec2(0.72, 0.50)) * vec2(1.6, 1.0));
  return mix(ink, col, cAA(r - d, 0.0));
}`, "monoCineFrame(monoStormSky(p, t), p, 0.6 + 4.0 * p.x)", {
  draws: "A round hole opens on the seal from a dark violet-black frame, then two flat cinema bars appear top and bottom, and at the end the hole closes again.",
  use: "screen", params: "col: the frame so far; t: seconds (iris open 0 to 1, bars from 1, iris closes 11 to 12).", quality: "real",
}, {});

export const monoFunnel = S("monoFunnel", "Rankine funnel of thin helix streaks: one tornado, or two small ones that merge", `
uniform float uMonoFunX, uMonoFunBase, uMonoFunH, uMonoFunW, uMonoFunN, uMonoFunGrow, uMonoFunSplit;
vec2 monoFunnelLayer(vec2 p, float cx, float tt) {
  float v = (p.y - uMonoFunBase) / uMonoFunH;
  float on = step(0.0, v) * step(v, uMonoFunGrow);
  float R = 0.5 * (30.0 + 150.0 * pow(max(v, 0.0), 1.6)) / 640.0 * uMonoFunW;
  float rc = 0.5 * R;
  float fr = 0.0, bk = 0.0;
  for (int i = 0; i < 48; i++) {
    float fi = float(i);
    float r = (0.35 + 0.65 * fract(fi * 0.618034)) * R;
    float rate = 4.18879 * min(1.0, (rc * rc) / max(r * r, 1e-8));
    float span = (0.8 + 1.4 * fract(fi * 0.381966)) / 7.0;
    float v0 = fract(fi * 0.2236) * (1.0 - span);
    float win = step(v0, v) * step(v, v0 + span);
    float th = 6.2831853 * fract(fi * 0.7548777) + rate * tt + 7.0 * (v - v0);
    float ln = cLine(p.x - (cx + r * sin(th)), 2.5) * win * step(fi + 0.5, uMonoFunN) * on;
    float cs = cos(th);
    fr = max(fr, ln * step(0.0, cs));
    bk = max(bk, ln * step(cs, 0.0));
  }
  return vec2(fr, bk);
}
vec3 monoFunnel(vec2 p, float t) {
  float tt = floor(t * 12.0) / 12.0;
  vec2 a = monoFunnelLayer(p, uMonoFunX - uMonoFunSplit, tt);
  vec2 b = monoFunnelLayer(p, uMonoFunX + uMonoFunSplit, tt) * step(0.0005, uMonoFunSplit);
  vec3 c = monoStormSky(p, t);
  c = mix(c, ${H("1fbdb4")} * 0.85, max(a.y, b.y) * 0.9);
  return cCap(mix(c, ${H("e8f4ff")}, max(a.x, b.x)));
}`, "monoFunnel(p, t)", {
  draws: "A wind funnel made of thin curved streaks that wrap around an invisible cone, pale white on the near side and teal on the far side, turning once every one and a half seconds.",
  use: "card", params: "uMonoFunX: centre x; uMonoFunBase: y of the tip; uMonoFunH: height; uMonoFunW: width scale (0.3 small, 1.0 full); uMonoFunN: streaks per funnel (23 or 46); uMonoFunGrow: 0 to 1 reveal up the cone; uMonoFunSplit: half-gap between two funnels, 0 for one.", quality: "real",
}, { uMonoFunX: 0.72, uMonoFunBase: 0.56, uMonoFunH: 0.42, uMonoFunW: 1.0, uMonoFunN: 46.0, uMonoFunGrow: 1.0, uMonoFunSplit: 0.0 });

export const monoRukh = S("monoRukh", "24 dark feather motes that gather overhead, then spiral into the funnel top on twos", `
uniform float uMonoRukhGather, uMonoRukhSpiral, uMonoRukhX, uMonoRukhTopY;
vec3 monoRukh(vec2 p, float t) {
  vec3 c = monoStormSky(p, t);
  float tt = floor(t * 6.0) / 6.0;
  vec2 top = vec2(uMonoRukhX, uMonoRukhTopY);
  for (int i = 0; i < 24; i++) {
    float fi = float(i);
    vec2 h = cH22(vec2(fi + 3.0, 7.0));
    vec2 rest = vec2(0.08 + 0.84 * h.x, 0.62 + 0.30 * h.y);
    vec2 over = top + (h - 0.5) * vec2(0.34, 0.10) + vec2(0.0, 0.06);
    float a = 6.2831853 * h.x + tt * (2.0 + 2.0 * h.y);
    vec2 sp = top + vec2(cos(a), sin(a) * 0.35) * ((1.0 - uMonoRukhSpiral) * (0.05 + 0.12 * h.y) + 0.004);
    vec2 pos = mix(mix(rest, over, uMonoRukhGather), sp, uMonoRukhSpiral);
    float ang = mix(0.4 + 2.0 * h.y, a + 1.5708, uMonoRukhSpiral);
    vec2 q = p - pos;
    q = vec2(cos(ang) * q.x + sin(ang) * q.y, -sin(ang) * q.x + cos(ang) * q.y);
    float d = (length(q / vec2(0.021, 0.0065)) - 1.0) * 0.0065;
    c = mix(c, mix(${H("1a1424")}, ${H("4a3a82")}, cLine(d, 1.8)), cFill(d));
  }
  return c;
}`, "monoRukh(p, t)", {
  draws: "Two dozen small dark leaf-shaped feathers with violet edges drift across the upper sky, bunch above the hero, then circle tighter and tighter around one point.",
  use: "card", params: "uMonoRukhGather: 0 scattered to 1 overhead; uMonoRukhSpiral: 0 to 1 circling into the point; uMonoRukhX, uMonoRukhTopY: the funnel top.", quality: "real",
}, { uMonoRukhGather: 0.5, uMonoRukhSpiral: 0.0, uMonoRukhX: 0.72, uMonoRukhTopY: 0.82 });

export const monoTearCrack = S("monoTearCrack", "fractal hairline page tear growing from the top edge, 8 levels, 60 px x 0.58^level", `
uniform float uMonoTearK, uMonoTearSeed;
float monoTearX(float y, float seed) {
  float u = 1.0 - y;
  float x = mix(0.38, 0.60, u);
  float f = 3.0, amp = 0.0469;
  for (int l = 0; l < 8; l++) {
    x += (cVn(vec2(u * f, seed + float(l) * 3.1)) - 0.5) * 2.0 * amp;
    f *= 2.0;
    amp *= 0.58;
  }
  return x;
}
vec3 monoTearCrack(vec2 p, float t) {
  float ln = cLine(p.x - monoTearX(p.y, uMonoTearSeed), 1.2) * step(1.0 - p.y, uMonoTearK);
  return mix(monoStormSky(p, t), ${H("110c10")}, ln * 0.9);
}`, "monoTearCrack(p, t)", {
  draws: "A single hair-thin dark crack runs down the frame from the top, jagged at every scale, reaching further down as the grow value rises.",
  use: "line", params: "uMonoTearK: 0 to 1 how far down the crack has grown; uMonoTearSeed: seed of the jitter.", quality: "real",
}, { uMonoTearK: 0.7, uMonoTearSeed: 5.0 });

export const monoTearGap = S("monoTearGap", "the same tear opened: gold-lipped gap, teal fibre paper beneath, right page slid and darkened 8%", `
uniform float uMonoGapOpen, uMonoGapSeed;
vec3 monoTearGap(vec2 p, float t) {
  float xc = monoTearX(p.y, uMonoGapSeed);
  float g = uMonoGapOpen;
  float open = step(0.0005, g);
  float fib = step(0.985, cH21(floor(p * vec2(1280.0, 800.0)) + 31.0));
  vec3 teal = ${H("1fbdb4")} - 0.06 * fib;
  float rt = cAA(p.x, xc + g) * open;
  vec3 c = mix(monoStormSky(p, t), teal, cAA(p.x, xc) * (1.0 - cAA(p.x, xc + g)) * open);
  c = mix(c, monoStormSky(p - vec2(g, 0.0), t) * 0.92, rt);
  float lip = max(cLine(p.x - xc, 4.0), cLine(p.x - xc - g, 4.0)) * open;
  return mix(c, ${H("d9a441")}, lip);
}`, "monoTearGap(p, t)", {
  draws: "The frame split along a jagged line: a thin gold edge on both sides, flecked teal paper showing in the gap, and the right half of the picture shifted aside and slightly darker.",
  use: "mask", params: "uMonoGapOpen: gap width in picture widths (0.02 at first, 0.4 at the end); uMonoGapSeed: tear seed, keep equal to uMonoTearSeed.", quality: "real",
}, { uMonoGapOpen: 0.08, uMonoGapSeed: 5.0 });

export const monoCoat = S("monoCoat", "Sinbad-seal coat: three hard blue tones at N.L 0.17 and 0.92, cream belly, gold rim, dark-blue contour", `
vec3 monoCoat(vec2 p, float t) {
  vec2 c = cN(p);
  float z = sqrt(max(0.22 - dot(c, c), 0.0));
  vec3 N = normalize(vec3(c, z + 1e-4));
  float NL = dot(N, normalize(vec3(-0.5, 0.6, -0.4)));
  vec3 coat = cCel3(NL, 0.17, 0.92, ${H("455d78")}, ${H("86aad6")}, ${H("d3e2f1")});
  coat = mix(coat, ${H("f8eee0")} * 0.97, cAA(-c.y, 0.03) * cAA(N.z, 0.45));
  coat = mix(coat, ${H("d9a441")}, cAA(pow(1.0 - max(N.z, 0.0), 5.0), 0.5) * cAA(NL + 0.3, 0.0));
  vec3 col = mix(monoStormSky(p, t), coat, cCover(p));
  float px = mix(3.2, 1.6, smoothstep(-0.3, 0.6, NL));
  return mix(col, mix(${H("1a384b")}, ${H("110c10")}, 0.35), cLine(length(c) - 0.46904, px));
}`, "monoCoat(p, t)", {
  draws: "A round seal body in three flat blues with a cream belly, a thin gold edge on the lit left side and a dark-blue outline that is thicker on the shadow side.",
  use: "surface", params: "none: light is fixed at (-0.5, 0.6, -0.4), the body is the kit sphere around cN.", quality: "real",
}, {});

export const monoEye = S("monoEye", "A-1 eyes: round lens, gold-amber iris in flat steps, hard angular upper lid, one warm glint", `
uniform float uMonoEyeLid, uMonoEyeGlint;
vec3 monoEye(vec2 p, float t) {
  vec3 col = monoCoat(p, t);
  vec2 c0 = cN(p);
  for (int k = 0; k < 2; k++) {
    float sd = (k == 0) ? -1.0 : 1.0;
    vec2 q = (c0 - vec2(sd * 0.085, 0.05)) / 0.042;
    float lens = length(q) - 1.0;
    float lidY = 0.55 - uMonoEyeLid * 0.45 - 0.30 * abs(q.x);
    vec2 iq = q - vec2(0.0, -0.05);
    float g = floor(clamp(0.5 - q.y * 0.8, 0.0, 0.999) * 3.0) / 2.0;
    vec3 e = mix(${H("f0e6dc")} * 0.97, mix(${H("8a5e1a")}, ${H("d9a83a")}, g), cFill(length(iq) - 0.62));
    e = mix(e, ${H("1a1424")}, cFill(length(iq) - 0.28));
    e = mix(e, mix(${H("d9a441")}, ${H("f2d07a")}, uMonoEyeGlint), cFill(length(q - vec2(-0.28, 0.22)) - 0.14));
    float vis = cFill(lens) * cAA(lidY - q.y, 0.0);
    col = mix(col, e, vis);
    col = mix(col, ${H("1a384b")}, max(cLine(lens * 0.042, 1.8), cLine((lidY - q.y) * 0.042, 2.4) * cFill(lens)));
  }
  return col;
}`, "monoEye(p, t)", {
  draws: "Two round eyes on the seal with a gold-to-amber iris in three steps, a dark pupil, a pointed upper lid and one small warm spark in each.",
  use: "card", params: "uMonoEyeLid: 0 open to 1 narrowed; uMonoEyeGlint: 0 dull gold spark to 1 bright spark.", quality: "real",
}, { uMonoEyeLid: 0.0, uMonoEyeGlint: 0.3 });

export const monoScarfX = S("monoScarfX", "two red scarves whipping up and out into an X, light edge, ripple on twos", `
vec3 monoScarfX(vec2 p, float t) {
  vec3 col = monoCoat(p, t);
  float tt = floor(t * 6.0) / 6.0;
  for (int k = 0; k < 2; k++) {
    float sd = (k == 0) ? -1.0 : 1.0;
    vec2 S0 = vec2(0.72 + sd * 0.06, 0.50);
    vec2 dv = vec2(0.72 - sd * 0.17, 0.78) - S0;
    float L = length(dv);
    vec2 dr = dv / L;
    vec2 q = p - S0;
    float s = dot(q, dr) / L;
    float n = dot(q, vec2(-dr.y, dr.x)) - sin(s * 9.0 - tt * 7.0 + sd) * 0.014 * s;
    float wd = 0.020 * (1.0 - 0.55 * s);
    float d = max(abs(n) - wd, max(-s, s - 1.0) * L);
    col = mix(col, mix(${H("b32a3a")}, ${H("e0586a")}, cAA(abs(n), wd * 0.55)), cFill(d));
    col = mix(col, ${H("1a384b")}, cLine(d, 1.6));
  }
  return col;
}`, "monoScarfX(p, t)", {
  draws: "Two long red ribbons leave the shoulders, cross above the body in an X and taper to points, each with a lighter pink edge and a dark outline.",
  use: "card", params: "none: shoulders at (0.66, 0.50) and (0.78, 0.50), tips at (0.89, 0.78) and (0.55, 0.78); t drives the ripple.", quality: "real",
}, {});

export const monoWingCloak = S("monoWingCloak", "dark feather cloak: two wings of five tapered blades, violet edge, ripple on twos", `
vec3 monoWingCloak(vec2 p, float t) {
  vec3 col = monoStormSky(p, t);
  float tt = floor(t * 6.0) / 6.0;
  for (int k = 0; k < 2; k++) {
    float sd = (k == 0) ? -1.0 : 1.0;
    vec2 q = p - vec2(0.72 + sd * 0.05, 0.52);
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float a = 0.35 + 0.30 * fi;
      vec2 dir = vec2(sd * sin(a), cos(a));
      float len = 0.36 - 0.025 * fi;
      float s = dot(q, dir) / len;
      float n = dot(q, vec2(-dir.y, dir.x)) + sin(tt * 5.0 + fi + sd) * 0.006 * s;
      float wd = 0.11 * s * (1.0 - s) + 0.004;
      float d = max(abs(n) - wd, max(-s, s - 1.0) * len);
      col = mix(col, mix(${H("1a1424")}, ${H("342944")}, cAA(abs(n), wd * 0.7)), cFill(d));
    }
  }
  return col;
}`, "monoWingCloak(p, t)", {
  draws: "Two fans of five long pointed black feathers spread out behind the body, each with a thin violet-grey edge, over the storm sky.",
  use: "plate", params: "none: roots at (0.67, 0.52) and (0.77, 0.52); fan angles 0.35 to 1.55 rad from vertical; t drives the flutter.", quality: "real",
}, {});

export const monoEggCrack = S("monoEggCrack", "dark plum egg with a gold band that takes one hard crack and throws five shards", `
uniform float uMonoEggX, uMonoEggY, uMonoEggAt, uMonoEggShard;
vec3 monoEggCrack(vec2 p, float t) {
  vec3 col = monoStormSky(p, t);
  vec2 q = (p - vec2(uMonoEggX, uMonoEggY)) / 0.045;
  q.x /= 1.0 + 0.18 * q.y;
  float d = (length(q * vec2(1.0, 0.82)) - 1.0) * 0.045;
  float on = step(uMonoEggAt, t);
  vec3 egg = mix(${H("3a1e2a")}, ${H("d9a441")}, 1.0 - cAA(abs(q.y + 0.05), 0.20));
  float zig = (abs(fract(q.y * 1.3 + 0.2) * 2.0 - 1.0) - 0.5) * 0.45;
  egg = mix(egg, ${H("110c10")}, cLine((q.x - zig) * 0.045, 1.6) * on);
  col = mix(col, egg, cFill(d));
  col = mix(col, ${H("1a384b")}, cLine(d, 1.8));
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float a = 1.2566 * fi + 0.6;
    vec2 r = p - vec2(uMonoEggX, uMonoEggY) - vec2(cos(a), sin(a) * 0.7) * (0.03 + 0.12 * uMonoEggShard * (0.6 + 0.4 * fract(fi * 0.618)));
    float ds = abs(r.x) + abs(r.y) * 0.6 - 0.010;
    col = mix(col, mix(${H("3a1e2a")}, ${H("d9a441")}, mod(fi, 2.0)), cFill(ds) * on);
  }
  return col;
}`, "monoEggCrack(p, 8.0)", {
  draws: "A small dark plum egg with a gold stripe round its middle; once cracked it shows one zigzag line and five small diamond shards fly out around it.",
  use: "card", params: "uMonoEggX, uMonoEggY: egg centre; uMonoEggAt: second the crack and shards switch on (7.6); uMonoEggShard: 0 to 1 how far the shards have flown.", quality: "real",
}, { uMonoEggX: 0.55, uMonoEggY: 0.62, uMonoEggAt: 7.6, uMonoEggShard: 0.5 });

export const PACKET_SHADERS = [
  monoStormSky, monoCloudDeck, monoDuskSea, monoGrade, monoCineFrame, monoFunnel, monoRukh,
  monoTearCrack, monoTearGap, monoCoat, monoEye, monoScarfX, monoWingCloak, monoEggCrack,
];
export default PACKET_SHADERS;
