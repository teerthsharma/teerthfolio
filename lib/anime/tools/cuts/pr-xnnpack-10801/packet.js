// pr-xnnpack-10801 packet shaders: Pierrot Bleach 2005, Aizen on the Las Noches throne, Kyoka Suigetsu breaks.
import { defineCut as M } from "../kit.glsl.js";

const F = "pr-xnnpack-10801";
const SUITS = ["pr-xnnpack-10801"];

const X = (name, doc, glsl, demoExpr, meta, deps = []) => ({
  ...M(name, F, doc, glsl, demoExpr),
  deps: ["cutKit", ...deps],
  suits: SUITS,
  ...meta,
});

export const xnSkyCrescent = X("xnSkyCrescent", "flat black sky #0a0614 with a thin crescent upper right, a hard 12% halo band and a 3 px rim",
  `const vec2 XN_MOON = vec2(0.84, 0.62);
  float xnBoxD(vec2 q, vec2 hs){ vec2 d = abs(q) - hs; return max(d.x, d.y); }
  float xnCrescent(vec2 q, float r){
    float a = length(q) - r;
    float b = length(q - vec2(r * 0.45, r * 0.20)) - r * 0.88;
    return max(a, -b);
  }
  vec3 xnSkyCrescent(vec2 p, float t){
    vec3 sky = vec3(0.039, 0.024, 0.078), halo = vec3(0.847, 0.925, 1.0);
    vec2 q = p - XN_MOON;
    float cr = xnCrescent(q, 0.040);
    vec3 c = mix(sky, mix(sky, halo, 0.12), 1.0 - cAA(length(q), 0.085));
    c = mix(c, halo * 0.9, cLine(cr - 0.003, 3.0) * 0.5);
    return mix(c, vec3(0.957, 0.957, 0.941), cFill(cr));
  }`, "xnSkyCrescent(p, t)",
  { draws: "A flat black night sky with one thin white crescent moon in the upper right and a hard pale halo band around it.",
    use: "plate",
    params: "p: plate uv; t: unused. Moon centre XN_MOON (0.84, 0.62), radius 0.04, halo radius 0.085 at 12% #d8ecff. The only glow-capable pixels in the dock." });

export const xnDuneContour = X("xnDuneContour", "dunes as cream contour lines on #181615 ground, hatch on the shadow side only, drawn on far to near from 1.0 to 2.4 s",
  `vec3 xnDuneContour(vec2 p, float t){
    float hz = 0.40;
    float kt = floor(t * 12.0 + 1e-3) / 12.0;
    float prog = clamp((kt - 1.0) / 1.4, 0.0, 1.0);
    float depth = (hz - p.y) / hz;
    float g = 1.0 - cAA(p.y, hz);
    float vis = 1.0 - cAA(depth, prog);
    float ph = p.x * 4.3 + 2.0 * depth;
    float h = 0.6 * sin(ph) + 0.4 * sin(p.x * 9.1 - 3.0 * depth + 1.3);
    float u = 24.0 * sqrt(max(depth, 0.0) + 0.04) + 3.0 * h * depth;
    float line = cLine(fract(u) - 0.5, 1.2);
    float shadow = 1.0 - cAA(cos(ph), 0.0);
    vec3 col = vec3(0.094, 0.086, 0.082);
    col = mix(col, vec3(0.388, 0.435, 0.412), cHatch(gl_FragCoord.xy, 6.0) * shadow * 0.8);
    col = mix(col, vec3(0.957, 0.910, 0.784), line * vis);
    return mix(xnSkyCrescent(p, t), col, g);
  }`, "xnDuneContour(p, t)",
  { draws: "A black desert drawn only as thin cream contour lines that grow from the horizon toward the viewer, with grey hatching on the shaded flanks.",
    use: "plate",
    params: "p: plate uv, horizon y 0.40; t: seconds, lines draw on over 1.0 to 2.4 s on a 12 fps clock. Line width 1.2 px, spacing about 14 px at the band." },
  ["xnSkyCrescent"]);

export const xnPalaceCard = X("xnPalaceCard", "Las Noches card: white dome, 8 spired towers, curtain wall, black slits, 1 px ink, pops on at 1.25 s and goes at 8.0 s",
  `vec3 xnPalaceCard(vec2 p, float t){
    vec3 base = xnDuneContour(p, t);
    float u = 0.0043;
    vec2 q = p - vec2(0.5, 0.40);
    float d = xnBoxD(q - vec2(0.0, 3.5 * u), vec2(36.0 * u, 3.5 * u));
    float cx = 0.0;
    float dr = xnBoxD(q - vec2(0.0, 2.0 * u), vec2(7.5 * u, 2.0 * u));
    vec2 dq = q - vec2(0.0, 4.0 * u);
    float dd = min(dr, max((length(dq / vec2(7.5 * u, 11.0 * u)) - 1.0) * 7.5 * u, -dq.y));
    if (dd < d) { d = dd; cx = 0.0; }
    for (int i = 0; i < 8; i++) {
      float x0 = 34.0 * u * sin(0.7853982 * float(i));
      vec2 tq = q - vec2(x0, 0.0);
      float shaft = xnBoxD(tq - vec2(0.0, 14.0 * u), vec2(1.8 * u, 14.0 * u));
      vec2 sq = tq - vec2(0.0, 28.0 * u);
      float spire = max(abs(sq.x) - 2.3 * u * (1.0 - sq.y / (10.0 * u)), max(-sq.y, sq.y - 10.0 * u));
      float dt = min(shaft, spire);
      if (dt < d) { d = dt; cx = x0; }
    }
    vec3 col = mix(vec3(0.600, 0.624, 0.588), vec3(0.957, 0.910, 0.784), cAA(q.x - cx, 0.0));
    float sx = 1.0 - cAA(abs(fract(q.x / (5.0 * u)) - 0.5) * 5.0 * u, 0.35 * u);
    float fy = fract(q.y / (6.0 * u));
    float slit = sx * cAA(fy, 0.3) * (1.0 - cAA(fy, 0.7)) * cAA(-d, 0.8 * u);
    col = mix(col, vec3(0.039, 0.024, 0.078), slit);
    float vis = step(1.25, t) * (1.0 - step(8.0, t));
    vec3 c = mix(base, col, cFill(d) * vis);
    return mix(c, vec3(0.055, 0.051, 0.051), cLine(d, 1.0) * vis);
  }`, "xnPalaceCard(p, t)",
  { draws: "A tiny white dome ringed by eight slender spired towers and a low wall on the black horizon, flat two-tone with black window slits and a thin ink edge.",
    use: "plate",
    params: "p: plate uv, horizon y 0.40, centred x 0.5; t: visible from 1.25 s to 8.0 s. Unit u = 0.0043 per metre, so the palace spans 30% of frame width." },
  ["xnDuneContour"]);

export const xnStair12 = X("xnStair12", "12-step white stair between six dark pillars on black, step 7 absent from the mesh and filled by a card that only the main camera sees",
  `const float XN_YF = 0.40;
  const float XN_DY = 0.030;
  vec4 xnStairCol(vec2 p, float card){
    float yy = (p.y - XN_YF) / XN_DY;
    float i = clamp(floor(yy), 0.0, 11.0);
    float fy = clamp(yy - i, 0.0, 1.0);
    float hw = 0.20 - 0.006 * i;
    float ax = abs(p.x - 0.5);
    float inY = cAA(yy, 0.0) * (1.0 - cAA(yy, 12.0));
    float isGap = step(5.5, i) * step(i, 6.5);
    float onStep = inY * (1.0 - cAA(ax, hw)) * (1.0 - isGap * (1.0 - card));
    float cheek = inY * cAA(ax, hw) * (1.0 - cAA(ax, hw + 0.014));
    vec3 lit = vec3(0.957, 0.910, 0.784), shade = vec3(0.600, 0.624, 0.588);
    vec3 col = vec3(0.0);
    float a = 0.0;
    for (int k = 0; k < 6; k++) {
      float fk = float(k);
      float side = (k < 3) ? -1.0 : 1.0;
      float z = mod(fk, 3.0);
      float cx = 0.5 + side * (0.30 + 0.055 * z);
      float hp = 0.026 - 0.004 * z;
      float inP = (1.0 - cAA(abs(p.x - cx), hp)) * cAA(p.y, XN_YF) * (1.0 - cAA(p.y, 0.94 - 0.02 * z));
      vec3 pc = mix(vec3(0.071, 0.063, 0.059), vec3(0.165, 0.149, 0.141), cAA(p.x - cx, hp * 0.35));
      col = mix(col, pc, inP);
      a = max(a, inP);
    }
    col = mix(col, mix(shade, lit, cAA(fy, 0.72)), onStep);
    col = mix(col, shade, cheek);
    return vec4(col, max(a, max(onStep, cheek)));
  }
  vec3 xnStair12(vec2 p, float t){
    vec4 s = xnStairCol(p, 1.0 - step(8.0, t));
    return mix(xnSkyCrescent(p, t), s.rgb, s.a);
  }`, "xnStair12(p, t)",
  { draws: "A white stair of twelve cream treads and grey risers climbs between dark pillars into a black sky; step seven looks solid from the front.",
    use: "plate",
    params: "p: plate uv; floor line XN_YF 0.40, step rise XN_DY 0.030, width narrows 0.006 per step; t: the step-7 card shows until 8.0 s. xnStairCol(p, card) returns rgba, card 0 leaves the real gap." },
  ["xnSkyCrescent"]);

export const xnThroneSeat = X("xnThroneSeat", "plain white throne on step 12 rising 1.4 m out of the sand over 1.0 to 3.0 s, blue inlay line along the seat front",
  `vec3 xnThroneSeat(vec2 p, float t){
    float kt = floor(t * 12.0 + 1e-3) / 12.0;
    float s = smoothstep(0.0, 1.0, clamp((kt - 1.0) / 2.0, 0.0, 1.0));
    vec2 q = vec2(p.x - 0.5, p.y - (0.76 - 0.233 * (1.0 - s)));
    float seat = xnBoxD(vec2(q.x, q.y - 0.0125), vec2(0.055, 0.0125));
    float back = xnBoxD(vec2(q.x, q.y - 0.10), vec2(0.050, 0.075));
    float arm = xnBoxD(vec2(abs(q.x) - 0.050, q.y - 0.0225), vec2(0.007, 0.0225));
    float d = min(seat, min(back, arm));
    vec3 lit = vec3(0.957, 0.910, 0.784), shade = vec3(0.600, 0.624, 0.588);
    vec3 col = mix(shade, lit, cAA(q.x, 0.0));
    col = mix(col, shade, cFill(arm) * 0.35);
    col = mix(col, vec3(0.239, 0.498, 0.769), cLine(q.y - 0.019, 1.2) * cFill(seat));
    float above = cAA(p.y, 0.56);
    return mix(xnStair12(p, t), col, cFill(d) * above);
  }`, "xnThroneSeat(p, t)",
  { draws: "A tall plain white throne with two armrests sits on the top step, rising slowly out of the black sand with a thin blue line along the seat edge.",
    use: "surface",
    params: "p: plate uv, seat base y 0.76 when risen; t: rise from buried (-0.233) to seated over 1.0 to 3.0 s on a 12 fps smoothstep; sand line y 0.56 hides the buried part." },
  ["xnStair12"]);

export const xnMirrorApron = X("xnMirrorApron", "dark blue mirror apron: stair reflected without the step-7 card (11 steps), 55% blend, 15% blue tint, crescent reflection rippling from 3.0 s",
  `vec3 xnMirrorApron(vec2 p, float t){
    vec3 fl = vec3(0.063, 0.102, 0.173);
    vec4 s = xnStairCol(vec2(p.x, 2.0 * XN_YF - p.y), 0.0);
    vec3 c = mix(fl, s.rgb, 0.55 * s.a);
    c = mix(c, vec3(0.239, 0.498, 0.769), 0.15 * s.a);
    float tt = floor(t * 12.0 + 1e-3) / 12.0;
    vec2 mc = vec2(XN_MOON.x, 2.0 * XN_YF - XN_MOON.y);
    float r = 0.040;
    float xr = (p.x - mc.x) / r;
    float dy = 0.06 * sin(14.0 * xr - 6.0 * tt) * exp(-2.0 * xr * xr) * step(3.0, t);
    vec2 mq = vec2(p.x - mc.x, -(p.y - mc.y - dy * r));
    float m = cFill(xnCrescent(mq, r)) * (1.0 - step(8.0, t));
    return mix(c, vec3(0.957, 0.957, 0.941), 0.55 * m);
  }`, "xnMirrorApron(p, t)",
  { draws: "A glossy blue-black floor mirrors the white stair below the horizon with one step missing, and a wobbling reflected crescent.",
    use: "surface",
    params: "p: plate uv, mirror line y 0.40; t: ripple dy = 0.06 sin(14 x - 6 t) e^(-2 x^2) in moon radii from 3.0 s, gone at 8.0 s. Reflection strength 0.55, tint 0.15 of #3d7fc4." },
  ["xnStair12", "xnSkyCrescent"]);

export const xnAizenHair = X("xnAizenHair", "Aizen's swept-back hair on the seal: 7 flat tapered clumps with a hard highlight stripe, plus one forelock, swaying 4 deg on twos",
  `float xnHairSeg(vec2 p, vec2 a, vec2 b){
    vec2 pa = p - a, ba = b - a;
    return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
  }
  vec3 xnAizenHair(vec2 p, float t){
    float kt = floor(t * 12.0 + 1e-3) / 12.0;
    float sway = 0.07 * sin(kt * 5.0) * step(1.0, t);
    vec3 c = mix(CUT_INK * 2.2, vec3(0.525, 0.667, 0.839), cCover(p));
    vec2 o = cN(p);
    vec3 base = vec3(0.659, 0.471, 0.353), dark = vec3(0.478, 0.322, 0.220), hi = vec3(0.878, 0.741, 0.596);
    for (int i = 0; i < 7; i++) {
      float fi = float(i);
      float th = 1.5708 + (fi - 3.0) * 0.30 + sway;
      vec2 rad = vec2(cos(th), sin(th));
      vec2 dir = normalize(rad + vec2(0.0, 0.55));
      vec2 q = o - rad * 0.30;
      float al = dot(q, dir);
      float ac = dot(q, vec2(-dir.y, dir.x));
      float len = 0.26 - 0.03 * abs(fi - 3.0);
      float w = 0.060 * (1.0 - clamp(al / len, 0.0, 1.0));
      float d = max(abs(ac) - w, max(-al, al - len));
      vec3 hc = mix(dark, base, cAA(ac, -0.2 * w));
      hc = mix(hc, hi, (1.0 - cAA(abs(ac - 0.45 * w), 0.14 * w)) * cAA(al, 0.12 * len));
      c = mix(c, hc, cFill(d));
    }
    float fl = xnHairSeg(o, vec2(0.05, 0.31), vec2(0.07, 0.17)) - 0.020 * (1.0 - clamp((0.31 - o.y) / 0.25, 0.0, 1.0));
    float fl2 = xnHairSeg(o, vec2(0.07, 0.17), vec2(0.04, 0.07)) - 0.010;
    float fd = min(fl, fl2);
    vec3 fc = mix(base, hi, (1.0 - cAA(abs(o.x - 0.065 + 0.01), 0.004)) * cFill(fd));
    return mix(c, fc, cFill(fd));
  }`, "xnAizenHair(p, t)",
  { draws: "A brown swept-back hair crown on a blue-grey seal head: seven pointed clumps fanning over the top and one curved lock hanging over the brow.",
    use: "surface",
    params: "p: cast uv (seal centred at cN); t: sway 0.07 rad on a 12 fps clock from 1.0 s. Colours #a8785a, shade #7a5238, stripe #e0bd98; clump length 0.17 to 0.26." });

export const xnHaoriCoral = X("xnHaoriCoral", "white captain's haori worn open over the seal: coral #e8a898 shade, black collar V, two 2.4 px folds, hem swaying on twos",
  `vec3 xnHaoriCoral(vec2 p, float t){
    float kt = floor(t * 12.0 + 1e-3) / 12.0;
    float hem = 0.012 * sin(kt * 7.0) * step(1.0, t);
    vec3 c = mix(CUT_INK * 2.2, vec3(0.525, 0.667, 0.839), cCover(p));
    vec2 o = cN(p);
    float ax = abs(o.x);
    float gap = 0.07 + 0.12 * max(-o.y, 0.0);
    float inGap = (1.0 - cAA(ax, gap)) * (1.0 - cAA(o.y, -0.10));
    c = mix(c, mix(vec3(0.973, 0.933, 0.878), vec3(0.827, 0.886, 0.945), cAA(ax, gap - 0.03)), inGap * cCover(p));
    float cloth = cAA(ax + hem * (-o.y) * sign(o.x), gap) * (1.0 - cAA(o.y, -0.04)) * cCover(p);
    vec3 lit = vec3(0.961, 0.965, 1.0), coral = vec3(0.910, 0.659, 0.596);
    vec3 hc = mix(coral, lit, cAA(o.y + 0.32 - 0.30 * o.x, 0.0));
    float fold = cLine(ax - (gap + 0.10), 2.4) * cAA(-o.y, 0.14);
    hc = mix(hc, CUT_INK, fold * 0.8);
    c = mix(c, hc, cloth);
    float v = -o.y - 0.03;
    float collar = (1.0 - cAA(ax, 0.6 * v + 0.035)) * cAA(ax, 0.6 * v) * cAA(v, 0.0) * (1.0 - cAA(v, 0.14));
    c = mix(c, vec3(0.102, 0.102, 0.157), collar);
    return cCap(c);
  }`, "xnHaoriCoral(p, t)",
  { draws: "A white open haori with coral-pink shadow planes falls from the seal's shoulders, showing the cream belly between and a black V at the neck.",
    use: "surface",
    params: "p: cast uv; t: hem sway 0.012 on a 12 fps clock from 1.0 s. Lit #f5f6ff capped at 0.92, shade #e8a898, collar #1a1a28, belly #f8eee0." });

export const xnKanjiGo = X("xnKanjiGo", "the kanji for 5 (Fifth Division) in ink on the haori back, 0.16 m tall, shown only in the home shot",
  `float xnSeg(vec2 p, vec2 a, vec2 b){
    vec2 pa = p - a, ba = b - a;
    return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
  }
  vec3 xnKanjiGo(vec2 p, float t){
    vec3 c = mix(CUT_INK * 2.2, vec3(0.961, 0.965, 1.0), cCover(p));
    vec2 k = (cN(p) - vec2(0.0, -0.22)) / 0.19;
    float d = xnSeg(k, vec2(-0.30, 0.45), vec2(0.28, 0.45));
    d = min(d, xnSeg(k, vec2(-0.06, 0.45), vec2(-0.12, 0.08)));
    d = min(d, xnSeg(k, vec2(-0.12, 0.08), vec2(0.24, 0.08)));
    d = min(d, xnSeg(k, vec2(0.24, 0.08), vec2(0.26, -0.20)));
    d = min(d, xnSeg(k, vec2(-0.12, 0.08), vec2(-0.26, -0.44)));
    d = min(d, xnSeg(k, vec2(-0.38, -0.45), vec2(0.36, -0.45)));
    float vis = step(8.5, t);
    return cCap(mix(c, vec3(0.102, 0.102, 0.157), cFill(d - 0.028) * cCover(p) * vis));
  }`, "xnKanjiGo(p, t)",
  { draws: "A bold black brush-style number-five character sits on the white back of the seal's haori.",
    use: "card",
    params: "p: cast uv, glyph centre 0.22 below the seal centre, 0.19 tall, stroke half-width 0.028 glyph units; t: shown from 8.5 s only." });

export const xnBladeSnap = X("xnBladeSnap", "Kyoka Suigetsu lying across the top step: pale blade, blue-white edge, tip snaps at 8.167 s and tumbles on twos in the 24 fps window",
  `vec3 xnBladeSnap(vec2 p, float t){
    vec3 base = xnThroneSeat(p, t);
    float kk = floor(t * 24.0 + 1e-3) / 24.0;
    float vis = step(8.0, t) * (1.0 - step(8.5, t));
    vec2 q = vec2(p.x - 0.560, p.y - 0.762 - 0.03 * (p.x - 0.560));
    float body = max(abs(q.y) - 0.0035, max(-q.x, q.x - 0.092));
    float n = floor(max(0.0, (kk - 0.16667 - 8.0) * 24.0) * 0.5) * 2.0;
    vec2 off = vec2(0.003 * n, 0.006 * n - 0.0016 * n * n);
    float ang = 0.30 * n;
    vec2 l = q - vec2(0.092, 0.0) - off;
    vec2 tq = vec2(cos(ang) * l.x + sin(ang) * l.y, -sin(ang) * l.x + cos(ang) * l.y);
    float tip = max(abs(tq.y) - 0.0035 * (1.0 - tq.x / 0.022), max(-tq.x, tq.x - 0.022));
    float d = min(body, tip);
    vec3 col = mix(vec3(0.957, 0.957, 0.941), vec3(0.847, 0.925, 1.0), cAA(q.y, 0.0012));
    return cCap(mix(base, col, cFill(d) * vis));
  }`, "xnBladeSnap(p, t)",
  { draws: "A thin pale sword blade lies across the top stair step; its tip breaks off with a clean cut and tumbles away in a few jumpy frames.",
    use: "card",
    params: "p: plate uv, blade from x 0.56 to 0.652 at y 0.762 plus a 0.022 tip; t: shown 8.0 to 8.5 s, snap at 8.167 s, tip motion on twos of the 24 fps clock." },
  ["xnThroneSeat"]);

export const xnIslandPlate = X("xnIslandPlate", "island plate behind the break: five flat blue sky bands, two flat clouds, snow plane with hard shade, #3d7fc4 trim ring under the seal",
  `vec3 xnIslandPlate(vec2 p, float t){
    float hz = 0.36;
    float g = clamp((p.y - hz) / (1.0 - hz), 0.0, 1.0);
    vec3 sky = mix(vec3(0.588, 0.753, 0.867), vec3(0.071, 0.349, 0.608), min(floor(g * 5.0) / 4.0, 1.0));
    vec3 snow = vec3(0.906, 0.886, 0.882);
    float cl = min(length((p - vec2(0.25, 0.62)) / vec2(0.14, 0.035)) - 1.0, length((p - vec2(0.74, 0.74)) / vec2(0.18, 0.04)) - 1.0);
    vec3 c = mix(sky, snow, cFill(cl) * 0.9);
    vec3 ground = mix(snow, vec3(0.725, 0.682, 0.667), cAA(cFbm(p * vec2(3.0, 9.0)), 0.55) * 0.6);
    vec2 rq = (p - vec2(0.5, 0.20)) / vec2(0.22, 0.07);
    float ring = 1.0 - cAA(abs(length(rq) - 1.0) * 0.07, 0.006);
    ground = mix(ground, vec3(0.239, 0.498, 0.769), ring);
    return mix(c, ground, 1.0 - cAA(p.y, hz));
  }`, "xnIslandPlate(p, t)",
  { draws: "A bright blue sky in five flat bands over a pale snow field, with a thin blue ring on the snow where the seal sits.",
    use: "plate",
    params: "p: plate uv, horizon y 0.36, ring centre (0.5, 0.20) radii (0.22, 0.07); t: unused. Sky #12599b to #96c0dd, snow #e7e2e1, shade #b9aeaa." });

export const xnKyokaBreak = X("xnKyokaBreak", "36-cell Voronoi shatter of the throne-room picture at 24 fps, cells fall 4 to 28 px then out through the bottom bar, island plate in the gaps, #d8ecff hairlines",
  `vec3 xnVor(vec2 p){
    vec2 g = floor(p * 6.0);
    vec2 f = fract(p * 6.0);
    float d1 = 9.0, d2 = 9.0;
    vec2 id = vec2(0.0);
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 o = vec2(float(i), float(j));
        vec2 cell = g + o;
        vec2 pt = o + 0.15 + 0.7 * cH22(cell + 11.0) - f;
        float d = dot(pt, pt);
        if (d < d1) { d2 = d1; d1 = d; id = cell; } else if (d < d2) { d2 = d; }
      }
    }
    return vec3(id, sqrt(d2) - sqrt(d1));
  }
  vec3 xnKyokaBreak(vec2 p, float t){
    float k = clamp(floor((t - 8.0) * 24.0 + 1e-3), 0.0, 11.0);
    float fall = smoothstep(0.0, 11.0, k);
    float tt = floor(t * 12.0 + 1e-3) / 12.0;
    float late = smoothstep(0.0, 1.0, clamp((tt - 8.5) / 1.8, 0.0, 1.0)) * step(8.5, t);
    vec3 v = xnVor(p);
    vec2 hh = cH22(v.xy + 31.0);
    float dy = mix(4.0, 28.0, hh.x) / 535.6 * fall + 1.31 * late * (0.6 + 0.8 * cH21(v.xy + 7.0));
    float dx = (hh.y - 0.5) * 12.0 / 535.6 * fall;
    vec2 src = p + vec2(-dx, dy);
    vec3 vs = xnVor(src);
    float same = step(0.5, float(all(equal(vs.xy, v.xy))));
    vec3 pic = (src.y > XN_YF) ? xnThroneSeat(src, t) : xnMirrorApron(src, t);
    pic = mix(pic, vec3(0.847, 0.925, 1.0), cLine(vs.z, 1.0) * 0.85);
    return cCap(mix(xnIslandPlate(p, t), pic, same));
  }`, "xnKyokaBreak(p, t)",
  { draws: "The throne-room picture cracks into thirty-six hairline-edged pieces that drop away unevenly, showing a bright blue island sky behind.",
    use: "card",
    params: "p: plate uv; t: seconds, k = floor((t - 8) x 24) up to 11 drives the first fall (d 4 to 28 px, dx up to 6 px), after 8.5 s cells slide 700 px out on twos. Hairline 1 px #d8ecff. Cell hash seed fixed." },
  ["xnThroneSeat", "xnMirrorApron", "xnIslandPlate"]);

export const xnGradeLas = X("xnGradeLas", "dock grade: luma cap 0.92, split tone #214770 / #eae8e9 at 0.35, ink-floor lift to #0e0d0d at Y 0.035 to 0.08, grain on twos weighted by (1 - Y)",
  `vec3 xnGradeLas(vec3 col, vec2 p, float t){
    col *= min(1.0, 0.92 / max(cLuma(col), 1e-4));
    float Y = cLuma(col);
    vec3 cs = vec3(0.129, 0.278, 0.439), ch = vec3(0.918, 0.910, 0.914);
    vec3 ts = cs / max(cLuma(cs), 1e-4), th = ch / max(cLuma(ch), 1e-4);
    float w = smoothstep(0.2, 0.8, Y);
    col *= mix(mix(vec3(1.0), ts, 0.35), mix(vec3(1.0), th, 0.35), w);
    col = mix(vec3(0.055, 0.051, 0.051), col, smoothstep(0.035, 0.08, cLuma(col)));
    float Y2 = cLuma(col);
    float gr = cH21(floor(p * vec2(1280.0, 536.0)) + 17.0 * floor(t * 12.0 + 1e-3)) - 0.5;
    col += 0.02 * (1.0 - Y2) * gr;
    return cCap(col);
  }`, "xnGradeLas(xnIslandPlate(p, t), p, t)",
  { draws: "The whole picture takes a cold blue shadow and cool white highlight tint, no pixel goes true black or above 0.92, with fine grain that changes twelve times a second.",
    use: "grade",
    params: "col: linear picture colour; p: plate uv (grain cell size 1280 x 536); t: grain reseeds on floor(12 t). Cap 0.92, split strength 0.35, ink floor smoothstep(0.035, 0.08)." },
  ["xnIslandPlate"]);

export const xnFrameInk = X("xnFrameInk", "studio frame: 2.39:1 letterbox bars #0e0d0d plus an iris that opens on the seal over 0.917 s and closes over 11.0 to 12.0 s, never below 1.2 x seal half-height",
  `vec3 xnFrameInk(vec3 col, vec2 w, float t, vec2 c){
    float kt = floor(t * 12.0 + 1e-3) / 12.0;
    float r0 = 1.2 * 0.07;
    float r = mix(mix(r0, 1.4, smoothstep(0.0, 0.917, kt)), r0, smoothstep(11.0, 11.917, kt));
    float dist = length(vec2((w.x - c.x) * 1.6, w.y - c.y));
    float inIris = 1.0 - cAA(dist, r);
    float bars = cAA(abs(w.y - 0.5), 0.33475);
    return mix(vec3(0.055, 0.051, 0.051), col, inIris * (1.0 - bars));
  }`, "xnFrameInk(xnGradeLas(xnIslandPlate(p, t), p, t), p, t, vec2(0.5, 0.5))",
  { draws: "Thick ink-black letterbox bars top and bottom, and a clean round iris that opens on the seal at the start and closes round it at the end.",
    use: "mask",
    params: "col: graded colour; w: window uv (1280 x 800, y up); t: iris on a 12 fps clock, radius from 0.084 (1.2 x 0.07 seal half-height) to 1.4; c: iris centre in window uv; bars 132.2 px = 0.16525 each." },
  ["xnGradeLas"]);
