// PAINTED SKIES. bgSky(ctx, preset, o) bakes a dome once (ctx.bake.sky) and returns it, layer 0.
//   presets   day  dusk  night  storm  void  domain (the red domain sky: smoke masses and lightning veins that recede into black)
//   o         { az:[a0,a1], el:[e0,e1], ppr, sun:{az,el,size}, cover, scale, drift, focus:{az,el}, flash, stars, colors:{ zenith, high, mid, low, horizon, cloudLit, cloudMid, cloudShade, rim, sun, glow } }
// A sky here is built the way a background painter builds one: a gradient that glows at the horizon, cloud masses with a sun-facing lit
// edge, a cool belly and a thin silver rim, a second high layer of streaks, and the weather of the preset on top. The az window is
// the part of the circle the shots can see (az 0 looks down -z, + turns toward +x); set it to the shots, the texels are spent there.
import { V } from "../../paint.js";
import { PAINT } from "./glsl.js";

const PRESETS = {
  day: { colors: { zenith: "#2c64c8", high: "#4f8fe0", mid: "#8cc0f0", low: "#cfe6f6", horizon: "#fdf1da", cloudLit: "#ffffff", cloudMid: "#d6e4f4", cloudShade: "#7e98c4", rim: "#fff6e0", sun: "#fff4d0", glow: "#ffe9b0" },
    sun: { az: 0.6, el: 0.55, size: 0.045 }, cover: 0.1, scale: 2.6, stars: 0, cirrus: 0.55, mode: 0 },
  dusk: { colors: { zenith: "#26307a", high: "#5a4a9a", mid: "#c26a8a", low: "#ff9a62", horizon: "#ffd890", cloudLit: "#ffd0a0", cloudMid: "#d4708a", cloudShade: "#4a3a78", rim: "#ffe8b8", sun: "#fff0c0", glow: "#ff9a50" },
    sun: { az: 0.2, el: 0.06, size: 0.05 }, cover: 0.12, scale: 2.2, stars: 0.05, cirrus: 0.8, mode: 0 },
  night: { colors: { zenith: "#04061a", high: "#0a1030", mid: "#141c4a", low: "#2a2f66", horizon: "#6a4a6a", cloudLit: "#46508a", cloudMid: "#22295a", cloudShade: "#0a0d26", rim: "#9aa8e0", sun: "#e8eeff", glow: "#a8b8ff" },
    sun: { az: -0.5, el: 0.7, size: 0.035 }, cover: 0.0, scale: 2.4, stars: 1, cirrus: 0.35, mode: 1 },
  storm: { colors: { zenith: "#10131c", high: "#1c2230", mid: "#2c3548", low: "#46546a", horizon: "#7a8aa0", cloudLit: "#9aa8c0", cloudMid: "#3e4a62", cloudShade: "#0c1018", rim: "#cfe0ff", sun: "#dfe8ff", glow: "#7a90c0" },
    sun: { az: 0.3, el: 0.4, size: 0.0 }, cover: 0.2, scale: 1.8, stars: 0, cirrus: 0.2, mode: 2 },
  void: { colors: { zenith: "#020208", high: "#08061c", mid: "#1a1048", low: "#3a1a78", horizon: "#9a5ad8", cloudLit: "#c8a8ff", cloudMid: "#5a3aa8", cloudShade: "#0c0626", rim: "#f0e0ff", sun: "#ffffff", glow: "#a870ff" },
    sun: { az: 0, el: 0.1, size: 0.0 }, cover: 0.0, scale: 1.6, stars: 1, cirrus: 0.0, mode: 3 },
  domain: { colors: { zenith: "#030104", high: "#0c0308", mid: "#2a050c", low: "#5a0812", horizon: "#e0381a", cloudLit: "#a01018", cloudMid: "#4a060c", cloudShade: "#0a0206", rim: "#ff7a40", sun: "#ffb060", glow: "#ff4a22" },
    sun: { az: 0, el: 0.1, size: 0.0 }, cover: 0.0, scale: 1.7, stars: 0, cirrus: 0.0, mode: 4 },
};

const f = (n) => Number(n).toFixed(4);

export function skyGLSL(preset, o = {}) {
  const P = PRESETS[preset] ?? PRESETS.day, C = { ...P.colors, ...(o.colors ?? {}) }, S = { ...P.sun, ...(o.sun ?? {}) };
  const cover = o.cover ?? P.cover, scale = o.scale ?? P.scale, stars = o.stars ?? P.stars, cirrus = o.cirrus ?? P.cirrus;
  const focus = o.focus ?? { az: S.az, el: Math.max(0.04, S.el) }, flash = o.flash ?? 0, drift = o.drift ?? 0;
  return /* glsl */ `
  float bgSkyDens(vec2 q) {
    vec2 w = warp(q, 0.5);
    float fb = fbm(w);
    vec2 v = vor(w * 1.7); float b1 = sqrt(max(0.0, 1.0 - v.x * v.x * 1.15));
    vec2 v2 = vor(w * 4.1 + 4.0); float b2 = sqrt(max(0.0, 1.0 - v2.x * v2.x * 1.3));
    return 0.42 * fb + 0.36 * b1 + 0.22 * b2;
  }
  float bgVein(vec2 p, float sc, out float halo) {
    vec2 w = warp(p * sc, 0.75); vec2 v = vor(w * 2.2);
    halo = exp(-v.y * 7.0);
    return 1.0 - smoothstep(0.0, 0.055, v.y);
  }
  vec3 sky(float az, float el) {
    vec3 d = vec3(sin(az) * cos(el), sin(el), -cos(az) * cos(el));
    vec3 S = vec3(sin(${f(S.az)}) * cos(${f(S.el)}), sin(${f(S.el)}), -cos(${f(S.az)}) * cos(${f(S.el)}));
    float sd = clamp(dot(d, S), -1.0, 1.0), ang = acos(sd);
    float t = pow(clamp(el / 1.25, 0.0, 1.0), 0.62);
    vec3 col = bgRamp5(t, ${V(C.horizon)}, ${V(C.low)}, ${V(C.mid)}, ${V(C.high)}, ${V(C.zenith)});
    col *= 0.97 + 0.03 * vn(vec2(az, el) * 300.0);
    float below = 1.0 - smoothstep(-0.12, 0.0, el);
    col = mix(col, ${V(C.horizon)} * 0.8, below);
    float glowK = exp(-ang * 2.6) * 0.55 + exp(-ang * 9.0) * 0.8;
    float mode = ${f(P.mode)};
    if (mode < 3.5 && ${f(S.size)} > 0.0) col += ${V(C.glow)} * glowK * (mode < 1.5 ? 1.0 : 0.35);
    // the horizon glow: a warm band that gathers under the light and thins away from it
    float hz = exp(-max(el, 0.0) * 7.0) * (0.35 + 0.65 * exp(-ang * 1.1));
    col = mix(col, ${V(C.glow)}, hz * ${mode3(P.mode)});
    if (mode < 3.5) {
      vec2 cp = d.xz / (max(d.y, 0.0) + 0.24) * ${f(scale)} + vec2(${f(drift)}, 0.0);
      float thr = 0.56 - ${f(cover)} - 0.12 * (mode > 1.5 ? 1.0 : 0.0);
      float dens = bgSkyDens(cp);
      vec2 ls = normalize(S.xz + 1e-4);
      float dens2 = bgSkyDens(cp + ls * 0.085);
      float a = smoothstep(thr, thr + 0.03, dens);
      float lit = clamp(0.5 + (dens - dens2) * 11.0, 0.0, 1.0);
      float body = smoothstep(thr, thr + 0.3, dens);
      float belly = smoothstep(0.55, 0.0, cp.y * 0.0 + el) * 0.0;
      float tone = bgTone(lit * 0.72 + (1.0 - body) * 0.28 - 0.1 * smoothstep(0.0, 0.8, 1.0 - el), 3.0, 0.14);
      vec3 cc = bgRamp5(tone, ${V(C.cloudShade)}, mix(${V(C.cloudShade)}, ${V(C.cloudMid)}, 0.6), ${V(C.cloudMid)}, mix(${V(C.cloudMid)}, ${V(C.cloudLit)}, 0.55), ${V(C.cloudLit)});
      cc = mix(cc, cc * 0.5 + ${V(C.glow)} * 0.4, (1.0 - tone) * 0.35 * hz);
      float rim = smoothstep(thr, thr + 0.025, dens) * (1.0 - smoothstep(thr + 0.03, thr + 0.1, dens)) * lit;
      cc += ${V(C.rim)} * rim * (0.35 + 1.6 * exp(-ang * 1.8));
      float fade = smoothstep(0.0, 0.17, el);
      cc = mix(cc, mix(${V(C.horizon)}, ${V(C.low)}, 0.4), (1.0 - smoothstep(0.0, 0.45, el)) * 0.5 * (mode < 1.5 ? 1.0 : 0.6));
      col = mix(col, cc, a * fade);
      // cirrus: a high thin layer of brush streaks
      float st = bgBrush(vec2(az * 1.2, el * 1.2) * 5.0, 0.12, 2.0) * (0.5 + 0.5 * fbm(vec2(az, el) * 3.0));
      float ci = smoothstep(0.52, 0.8, st) * ${f(cirrus)} * smoothstep(0.1, 0.45, el) * (1.0 - a * 0.8);
      col = mix(col, mix(${V(C.cloudLit)}, ${V(C.glow)}, 0.4), ci * 0.45);
    }
    if (mode > 0.5 && mode < 1.5 || ${f(stars)} > 0.5) {
      vec2 sg = vec2(az, el) * 160.0; vec2 sc = floor(sg), sf = fract(sg) - 0.5;
      float h = h21(sc), sz = 0.12 + 0.3 * h21(sc + 3.0);
      float star = step(0.975, h) * (1.0 - smoothstep(0.0, sz, length(sf + (h21(sc + 7.0) - 0.5) * 0.5))) * smoothstep(0.02, 0.2, el);
      col += mix(${V(C.rim)}, vec3(1.0), 0.5) * star * (0.6 + 1.6 * h21(sc + 9.0));
    }
    if (mode > 0.5 && mode < 1.5) {
      float md = acos(clamp(dot(d, S), -1.0, 1.0)); float mr = ${f(S.size)};
      float disc = 1.0 - smoothstep(mr * 0.96, mr, md);
      vec3 lp = normalize(d - S * dot(d, S)); float lunar = fbm(vec2(az, el) * 90.0);
      col += ${V(C.sun)} * disc * (0.75 + 0.25 * lunar) * 2.0;
    } else if (mode < 1.5 && ${f(S.size)} > 0.0) {
      col += ${V(C.sun)} * (1.0 - smoothstep(${f(S.size * 0.9)}, ${f(S.size)}, ang)) * 3.0;
      vec3 T = normalize(cross(vec3(0.0, 1.0, 0.0), S)); vec3 B = cross(S, T);
      float phi = atan(dot(d, B), dot(d, T));
      float rays = pow(abs(cos(phi * 3.0)), 40.0) * 0.6 + pow(abs(cos(phi * 3.0 + 0.5236)), 90.0) * 0.45;
      col += ${V(C.sun)} * rays * exp(-ang * 6.5) * 0.9;
    }
    if (mode > 1.5 && mode < 2.5) { // storm: a flash lights the masses from inside
      float fl = ${f(flash)}; col += ${V(C.rim)} * fl * (0.25 + 0.75 * smoothstep(0.4, 0.8, bgSkyDens(d.xz / (max(d.y, 0.0) + 0.24) * ${f(scale)})));
    }
    if (mode > 2.5 && mode < 3.5) { // void: nebula bands, dust, a bright seam at the horizon
      float nb = fbm(vec2(az * 1.5, el * 3.0) + fbm(vec2(az, el) * 4.0) * 1.6);
      col = mix(col, ${V(C.mid)} * 1.4, smoothstep(0.45, 0.8, nb) * 0.6 * smoothstep(-0.1, 0.5, el));
      col += ${V(C.rim)} * exp(-abs(el - 0.02) * 40.0) * 0.5;
      float dust = step(0.985, h21(floor(vec2(az, el) * 400.0))); col += ${V(C.sun)} * dust * 0.8;
    }
    if (mode > 3.5) { // the red domain sky
      vec2 p = vec2(az, el) * vec2(1.0, 1.35);
      float smoke = fbm(warp(p * 1.6 + 3.0, 0.9));
      col = mix(${V(C.zenith)}, ${V(C.mid)}, smoothstep(0.35, 0.75, smoke) * 0.9);
      float h1, h2; float v1 = bgVein(p, 1.0, h1), v2 = bgVein(p * 1.6 + 5.0, 1.0, h2);
      float reach = 0.25 + 0.75 * smoothstep(0.05, 0.6, abs(az - ${f(focus.az)}));
      float body = smoothstep(0.3, 0.7, smoke);
      col += (${V(C.low)} * (v1 * 1.3 + h1 * 0.35) + ${V(C.horizon)} * (v2 * 0.9 + h2 * 0.15) * (0.5 + 0.5 * v1)) * body * reach * 1.4;
      col += ${V(C.rim)} * v1 * v2 * body * 1.2;
      vec2 wv = warp(p * 0.8 + 11.0, 0.9); vec2 vb = vor(wv * 1.5);
      float thick = 1.0 - smoothstep(0.0, 0.16, vb.y), side = smoothstep(0.12, 0.7, abs(az - ${f(focus.az)}));
      col += (${V(C.low)} * 1.7 * thick + ${V(C.horizon)} * pow(thick, 3.0) * 1.1 + ${V(C.rim)} * pow(thick, 6.0) * 1.4) * side * (0.4 + 0.6 * smoothstep(0.2, 0.7, smoke));
      float fd = length(vec2((az - ${f(focus.az)}) * 0.8, el - ${f(focus.el)}));
      col += ${V(C.glow)} * exp(-fd * fd * 18.0) * 1.1 + ${V(C.low)} * exp(-fd * 3.5) * 0.35;
      col *= mix(0.45, 1.0, smoothstep(0.0, 0.3, el + 0.2));
      float eh = step(0.9985, h21(floor(vec2(az, el) * 220.0))); col += ${V(C.sun)} * eh * 1.6 * smoothstep(0.0, 0.5, el);
    }
    return col;
  }`;
}

const mode3 = (m) => (m > 3.5 ? "0.0" : m > 2.5 ? "0.0" : m > 1.5 ? "0.55" : m > 0.5 ? "0.6" : "0.85");

export function bgSky(ctx, preset = "day", o = {}) {
  const glsl = skyGLSL(preset, o);
  return ctx.bake.sky(`${PAINT}\n${glsl}`, { az: o.az ?? [-3.2, 3.2], el: o.el ?? [-0.3, 1.35], pxPerRad: o.ppr ?? 420 });
}
export const SKY_PRESETS = Object.keys(PRESETS);
