// p-asmodeus packet shaders: Devil Is a Part-Timer, White Fox 2013 (throne, Gate, Sasazuka street, fear motes, aura, kill beam, mend, grade).
import { defineCut as M } from "../kit.glsl.js";

const F = "p-asmodeus";
const SUITS = ["p-asmodeus"];
const v2 = (x, y) => ({ x, y });
const h = (x) => {
  const n = parseInt(x.slice(1), 16);
  const f = (s) => (((n >> s) & 255) / 255).toFixed(3);
  return `vec3(${f(16)}, ${f(8)}, ${f(0)})`;
};

const N = (name, doc, glsl, demoExpr, meta, uniforms, deps = []) => ({
  ...M(name, F, doc, glsl, demoExpr),
  deps: ["cutKit", ...deps],
  ...(uniforms ? { uniforms: () => uniforms } : {}),
  suits: SUITS,
  ...meta,
});

const TT = "float tt = floor(t * 12.0 + 0.02) / 12.0;";

export const asmThroneHall = N("asmThroneHall", "Ente Isla throne hall: red-black walls, five gold edge lines, pillar rows, red runner up a 9-step dais to a gold-edged throne",
  `vec3 asmThroneHall(vec2 p, float t){
    vec3 dark = ${h("#2a060c")}, red = ${h("#5a0e16")}, runner = ${h("#7a1420")}, gold = ${h("#b8913c")}, ink = ${h("#120c14")};
    vec3 c = mix(dark, red, cAA(p.y, 0.55) * 0.6 + cAA(p.y, 0.80) * 0.4);
    for (int i = 0; i < 5; i++) c = mix(c, gold * 0.8, cLine(p.y - (0.46 + 0.11 * float(i)), 1.4) * 0.55);
    for (int i = 0; i < 4; i++) {
      float x = i < 2 ? 0.08 + 0.12 * float(i) : 0.68 + 0.12 * float(i);
      float w = i == 0 || i == 3 ? 0.045 : 0.032;
      float pil = cAA(w - abs(p.x - x), 0.0) * cAA(p.y, 0.30);
      c = mix(c, mix(ink, dark, cAA(p.x - x, 0.0) * 0.8), pil);
      c = mix(c, gold * 0.7, cLine(abs(p.x - x) - w, 1.2) * cAA(p.y, 0.30) * 0.5);
    }
    float fl = 1.0 - cAA(p.y, 0.30);
    c = mix(c, mix(ink * 1.5, dark, cAA(p.y, 0.14)), fl);
    float hw = mix(0.20, 0.09, clamp(p.y / 0.30, 0.0, 1.0));
    c = mix(c, runner, fl * cAA(hw - abs(p.x - 0.5), 0.0));
    float s = floor((p.y - 0.30) / 0.0133);
    float onD = cAA(p.y, 0.30) * (1.0 - cAA(p.y, 0.42));
    float shw = 0.09 - 0.006 * s;
    vec3 stepC = mix(runner * 0.75, runner, mod(s, 2.0));
    c = mix(c, stepC, onD * cAA(shw - abs(p.x - 0.5), 0.0));
    float top = 0.78 + 0.07 * (1.0 - smoothstep(0.0, 0.055, abs(p.x - 0.5)));
    float thr = cAA(0.055 - abs(p.x - 0.5), 0.0) * cAA(p.y, 0.42) * (1.0 - cAA(p.y, top));
    c = mix(c, mix(ink, dark, cAA(p.x, 0.5) * 0.6), thr);
    float sd = max(abs(p.x - 0.5) - 0.055, max(0.42 - p.y, p.y - top));
    c = mix(c, gold, cLine(sd, 1.8) * cAA(p.y, 0.40));
    float seat = cAA(0.075 - abs(p.x - 0.5), 0.0) * cAA(p.y, 0.42) * (1.0 - cAA(p.y, 0.48));
    c = mix(c, runner, seat);
    return cCap(c);
  }`,
  "asmThroneHall(p, t)",
  {
    draws: "a red-black hall with gold edge lines, pillars, a red carpet climbing nine steps to a tall gold-edged throne at the centre",
    use: "plate",
    params: "p: plate uv, throne on x 0.5 with the seat at y 0.42 to 0.48; runner and dais drawn from y 0 to 0.42; pillars at x 0.08, 0.20, 0.80, 0.92; t unused",
  });

export const asmGateTunnel = N("asmGateTunnel", "the Gate: concentric rings drawn inward on twos, radius 0 to 0.34 H over f12-f21 (easeOutCubic), then swallowing the frame",
  `uniform vec2 uAsmGateC;
  vec3 asmGateTunnel(vec2 p, float t){
    ${TT}
    float g = clamp((tt - 1.0) * 1.2, 0.0, 1.0);
    float e = 1.0 - pow(1.0 - g, 3.0);
    float R = 0.34 * e + 2.2 * clamp((tt - 22.0 / 12.0) * 6.0, 0.0, 1.0);
    vec2 q = (p - uAsmGateC) * vec2(2.39, 1.0);
    float d = length(q);
    float r = d / max(R, 1e-3);
    float inside = (1.0 - cAA(r, 1.0)) * step(0.001, R);
    vec3 core = ${h("#fff4ee")}, edge = ${h("#5a0e16")};
    vec3 base = mix(core, edge, cAA(r, 0.25) * 0.34 + cAA(r, 0.50) * 0.33 + cAA(r, 0.75) * 0.33);
    float tick = floor(t * 12.0 + 0.02);
    float band = cAA(fract(d / 0.03 + tick * 0.5), 0.5);
    base = mix(base, base * 0.55, band * smoothstep(0.05, 0.3, r));
    vec3 c = mix(${h("#2a060c")}, base, inside);
    c = mix(c, ${h("#ffe2e0")}, cLine(r - 1.0, 2.0) * step(0.001, R) * (1.0 - step(2.0, R)));
    return cCap(c);
  }`,
  "asmGateTunnel(p, t)",
  {
    draws: "a bright cream-white tunnel of hard rings that deepens to throne red at its rim, opening behind the hero and then flooding the frame",
    use: "plate",
    params: "uAsmGateC: tunnel centre in plate uv (0.5, 0.5); t: seconds, opens at 1.0, swallows from 1.833, rings step inward by half a ring on every drawing; ring spacing 0.03 H and radius 0.34 H fixed",
  },
  { uAsmGateC: { value: v2(0.5, 0.5) } });

export const asmNightStreet = N("asmNightStreet", "Sasazuka night: navy sky with a light-pollution band, skyline, two window walls (7 x 12) that go dark by column and relight by row, overpass, wet street, two lamp pools",
  `uniform float uAsmLamp;
  vec4 asmWinCell(vec2 p){
    float wall = step(0.5, p.x);
    float u = wall < 0.5 ? p.x / 0.2 : (p.x - 0.8) / 0.2;
    float v = (p.y - 0.20) / 0.78;
    float ins = step(0.0, u) * step(u, 1.0) * step(0.0, v) * step(v, 1.0);
    return vec4(floor(u * 6.999), floor(v * 11.999), wall, ins);
  }
  vec2 asmWinPos(float col, float row, float wall){
    float x = (col + 0.5) / 7.0 * 0.2;
    return vec2(wall < 0.5 ? x : 0.8 + x, 0.20 + (row + 0.5) / 12.0 * 0.78);
  }
  float asmWinLit(float col, float row, float wall){
    return step(cH21(vec2(col + 7.0 * wall, row) + 3.7), 0.571);
  }
  float asmWinOn(float col, float row, float wall, float tt){
    float dark = step(4.5 + 0.083 * col, tt);
    float back = step(9.0 + 0.06 * row, tt);
    return asmWinLit(col, row, wall) * (1.0 - dark + dark * back);
  }
  vec3 asmNightStreet(vec2 p, float t){
    ${TT}
    vec3 top = ${h("#0b1430")}, hor = ${h("#1e2c5a")}, poll = ${h("#3a3a5a")}, sil = ${h("#0e1424")}, ink = ${h("#120c14")};
    float sy = clamp((p.y - 0.40) / 0.60, 0.0, 1.0);
    vec3 c = mix(hor, top, cAA(sy, 0.35) * 0.5 + cAA(sy, 0.70) * 0.5);
    c = mix(c, poll * 0.9, cAA(0.035 - abs(p.y - 0.46), 0.0));
    float sh = 0.40 + 0.10 * cH21(vec2(floor(p.x / 0.04), 9.1));
    c = mix(c, sil, 1.0 - cAA(p.y, sh));
    c = mix(c, ${h("#24304f")}, cLine(p.y - sh, 1.2) * 0.5);
    vec3 under = ink * 1.3;
    vec3 street = mix(${h("#161a2c")}, ${h("#1d2238")}, cAA(p.y, 0.10));
    c = mix(c, mix(under, street, cAA(p.y, 0.20)), 1.0 - cAA(p.y, 0.33));
    float lp = 0.0;
    for (int i = 0; i < 2; i++) {
      float lx = i == 0 ? 0.25 : 0.78;
      vec2 dd = vec2((p.x - lx) * 2.39, (p.y - 0.12) * 3.0);
      float pool = exp(-dot(dd, dd) / (0.16 * 0.16));
      lp = max(lp, 0.5 * cAA(pool, 0.25) + 0.5 * cAA(pool, 0.60));
      float post = cLine(abs(p.x - lx) - 0.0025, 1.2) * cAA(p.y, 0.20) * (1.0 - cAA(p.y, 0.31));
      c = mix(c, sil * 1.6, post);
      float head = cFill(length(vec2((p.x - lx) * 2.39, p.y - 0.305)) - 0.014);
      c = mix(c, ${h("#ffb04a")}, head * uAsmLamp);
    }
    c = mix(c, ${h("#ffb04a")} * 0.85, lp * uAsmLamp * 0.7 * (1.0 - cAA(p.y, 0.21)));
    vec4 w = asmWinCell(p);
    float wallM = cAA(0.2 - (p.x < 0.5 ? p.x : 1.0 - p.x), 0.0) * cAA(p.y, 0.14);
    float u = w.z < 0.5 ? p.x / 0.2 : (p.x - 0.8) / 0.2;
    float litFace = w.z < 0.5 ? cAA(u, 0.80) : 1.0 - cAA(u, 0.20);
    c = mix(c, mix(${h("#2a2f44")}, ${h("#5a5470")}, litFace * 0.8), wallM);
    vec2 cellf = vec2(fract(u * 7.0), fract((p.y - 0.20) / 0.78 * 12.0));
    float win = cAA(0.30 - abs(cellf.x - 0.5), 0.0) * cAA(0.25 - abs(cellf.y - 0.5), 0.0) * w.w;
    float on = asmWinOn(w.x, w.y, w.z, tt);
    vec3 wcol = mix(${h("#9fc4ff")}, ${h("#ffd27a")}, step(cH21(vec2(w.x, w.y + 5.0 * w.z) + 11.3), 0.62));
    c = mix(c, mix(${h("#1a1f33")}, wcol, on), win * wallM);
    float deck = cAA(p.y, 0.33) * (1.0 - cAA(p.y, 0.38));
    c = mix(c, mix(under, ${h("#1f2236")}, cAA(p.y, 0.36)), deck);
    c = mix(c, ${h("#59607f")}, cLine(p.y - 0.38, 1.0) * 0.6);
    float post = (1.0 - cAA(abs(fract(p.x / 0.012) - 0.5), 0.10)) * cAA(p.y, 0.38) * (1.0 - cAA(p.y, 0.415));
    c = mix(c, sil * 1.3, post);
    c = mix(c, sil * 1.3, cLine(p.y - 0.415, 1.2) * 0.8);
    return cCap(c);
  }`,
  "asmNightStreet(p, t)",
  {
    draws: "a cold navy night with a grey haze band, flat rooftop silhouettes, two apartment walls with grids of warm and cold windows, a dark overpass across the middle and amber lamp pools on a wet street",
    use: "plate",
    params: "uAsmLamp: 1 sodium lamps and pools lit, 0 dead from the fear beat; t: seconds, window columns go dark at 4.5 + 0.083 col, rows relight at 9.0 + 0.06 row, held on 12 fps drawings; roughly 96 of 168 windows lit by a fixed hash",
  },
  { uAsmLamp: { value: 1 } });

export const asmFearMotes = N("asmFearMotes", "24 window streams x 4 flat motes on quadratic Bezier arcs: cold specks in from the dying windows to the chest turning red, or red specks out to the relit windows turning cold",
  `uniform vec2 uAsmChest;
  uniform float uAsmOut;
  vec3 asmFearMotes(vec2 p, float t){
    ${TT}
    vec3 c = asmNightStreet(p, t);
    vec2 pa = p * vec2(2.39, 1.0);
    vec2 ch = uAsmChest * vec2(2.39, 1.0);
    float acc = 0.0;
    float hue = 0.0;
    for (int i = 0; i < 24; i++) {
      float fi = float(i);
      float wall = step(cH21(vec2(fi, 1.3)), 0.5);
      float col = floor(cH21(vec2(fi, 2.7)) * 6.999);
      float row = floor(cH21(vec2(fi, 5.1)) * 11.999);
      float lit = asmWinLit(col, row, wall);
      vec2 w = asmWinPos(col, row, wall) * vec2(2.39, 1.0);
      vec2 dir = ch - w;
      vec2 perp = normalize(vec2(-dir.y, dir.x) + 1e-4) * (cH21(vec2(fi, 8.8)) < 0.5 ? 0.18 : -0.18);
      vec2 ctl = 0.5 * (w + ch) + perp;
      for (int j = 0; j < 4; j++) {
        float fj = float(j);
        float td = uAsmOut > 0.5 ? 8.5 + 0.06 * row + 0.01 * fj : 4.5 + 0.083 * col + 0.04 * fj;
        float tf = uAsmOut > 0.5 ? 0.5 : 0.9;
        float u = clamp((tt - td) / tf, 0.0, 1.0);
        float live = step(0.001, u) * step(u, 0.999) * lit;
        float s = uAsmOut > 0.5 ? 1.0 - u : u;
        vec2 b = (1.0 - s) * (1.0 - s) * w + 2.0 * (1.0 - s) * s * ctl + s * s * ch;
        float disc = cFill(length(pa - b) - 0.005) * live;
        acc = max(acc, disc);
        float hu = uAsmOut > 0.5 ? 1.0 - smoothstep(0.35, 0.9, u) : smoothstep(0.35, 0.9, u);
        hue = mix(hue, hu, disc);
      }
    }
    vec3 mc = mix(${h("#c8d8ff")}, ${h("#ff4a5a")}, hue);
    return cCap(mix(c, mc, acc));
  }`,
  "asmFearMotes(p, t)",
  {
    draws: "tiny flat discs flying in curved arcs between the lit windows and the hero's chest, blue-white at the window end and red at the chest end",
    use: "screen",
    params: "uAsmChest: absorb point in plate uv (0.2, 0.34); uAsmOut: 0 streams in from windows starting at 4.5 + 0.083 col over 0.9 s, 1 streams back out from 8.5 + 0.06 row over 0.5 s with colours reversed; t: seconds on 12 fps drawings; arc bow 0.18 H and disc radius 0.005 H fixed",
  },
  { uAsmChest: { value: v2(0.2, 0.34) }, uAsmOut: { value: 0 } }, ["asmNightStreet"]);

export const asmAuraShell = N("asmAuraShell", "red flame shell hugging the demon silhouette: r_a = 0.06 H Q, A = smoothstep(r_a, 0, d) * fbm^1.5 rising on twos, banded from #3a0812 to #ff2a3a",
  `uniform vec2 uAsmHero;
  uniform vec2 uAsmHeroR;
  uniform float uAsmQ;
  vec3 asmAuraShell(vec2 p, float t){
    float tp = floor(t * 12.0 + 0.02) / 12.0;
    vec2 q = (p - uAsmHero) * vec2(2.39, 1.0);
    float d = (length(q / uAsmHeroR) - 1.0) * min(uAsmHeroR.x, uAsmHeroR.y);
    float ra = 0.06 * uAsmQ + 1e-4;
    float shell = smoothstep(ra, 0.0, d) * step(0.0, d);
    float f = 0.5 + 0.5 * cFbm(3.0 * p - vec2(0.0, 1.4 * tp));
    float A = shell * pow(f, 1.5);
    float b = cAA(A, 0.12) * 0.4 + cAA(A, 0.30) * 0.3 + cAA(A, 0.55) * 0.3;
    vec3 col = mix(${h("#3a0812")}, ${h("#ff2a3a")}, b * b);
    return cCap(mix(${h("#120c14")} * 1.2, col, cAA(A, 0.12)));
  }`,
  "asmAuraShell(p, t)",
  {
    draws: "a hard-banded red flame wall licking up around an upright oval figure, dark crimson at its outer edge and bright red against the body",
    use: "card",
    params: "uAsmHero: figure centre in plate uv (0.5, 0.45); uAsmHeroR: figure radii in H units (0.07, 0.20); uAsmQ: 0 off, 1 full shell thickness 0.06 H; t: seconds, flames rise on twos at 1.4 H/s",
  },
  { uAsmHero: { value: v2(0.5, 0.45) }, uAsmHeroR: { value: v2(0.07, 0.2) }, uAsmQ: { value: 1 } });

export const asmPalmRings = N("asmPalmRings", "three thin red rings collapsing onto the palm over k0-k7, r_g = 0.10 H (1 - tau)^2 + 0.02 H, with a growing core disc",
  `uniform vec2 uAsmPalm;
  uniform float uAsmK;
  vec3 asmPalmRings(vec2 p, float t){
    float k = floor(clamp(uAsmK, 0.0, 11.0) + 1e-3);
    float tau = clamp(k / 8.0, 0.0, 1.0);
    vec2 q = (p - uAsmPalm) * vec2(2.39, 1.0);
    float d = length(q);
    float rg = 0.10 * (1.0 - tau) * (1.0 - tau) + 0.02;
    float acc = 0.0;
    for (int n = 0; n < 3; n++) {
      float x = (d - rg - 0.03 * float(n)) / 0.004;
      acc = max(acc, exp(-x * x));
    }
    float live = step(k, 7.5);
    float ring = cAA(acc, 0.3) * live;
    float core = cFill(d - 0.015 * tau) * step(0.5, k) * live;
    vec3 c = mix(${h("#2a0610")}, ${h("#ff2a3a")}, ring);
    c = mix(c, ${h("#ffe2e0")}, core);
    return cCap(c);
  }`,
  "asmPalmRings(p, t)",
  {
    draws: "three thin red rings that shrink inward onto one point and leave a small pale dot where they meet",
    use: "card",
    params: "uAsmPalm: palm position in plate uv (0.55, 0.42); uAsmK: kill sub-clock drawing 0 to 11 (rings gather over 0 to 7, gone from 8); ring spacing 0.03 H and width 0.004 H fixed",
  },
  { uAsmPalm: { value: v2(0.55, 0.42) }, uAsmK: { value: 4 } });

export const asmKillBeam = N("asmKillBeam", "capsule beam from the palm to the foe, 0.09 H wide, hot white core in a red body, fading to dark smoke along its path",
  `uniform vec2 uAsmFoe;
  uniform float uAsmReach;
  uniform float uAsmSmoke;
  vec3 asmKillBeam(vec2 p, float t){
    vec2 a = uAsmPalm * vec2(2.39, 1.0);
    vec2 b = mix(a, uAsmFoe * vec2(2.39, 1.0), clamp(uAsmReach, 0.0, 1.0));
    vec2 pa = p * vec2(2.39, 1.0);
    vec2 ab = b - a;
    float s = clamp(dot(pa - a, ab) / max(dot(ab, ab), 1e-5), 0.0, 1.0);
    float d = length(pa - a - ab * s);
    float body = cAA(0.045 - d, 0.0);
    float mid = cAA(0.022 - d, 0.0);
    float core = cAA(exp(-(d / 0.01) * (d / 0.01)), 0.4);
    float live = 1.0 - clamp(uAsmSmoke, 0.0, 1.0);
    vec3 red = mix(${h("#ff2a3a")}, ${h("#2a0610")}, 1.0 - live);
    vec3 c = mix(${h("#120c14")} * 1.2, red, body);
    c = mix(c, mix(red, ${h("#ffe2e0")}, 0.5), mid * live);
    c = mix(c, ${h("#ffe2e0")}, core * live);
    return cCap(c);
  }`,
  "asmKillBeam(p, t)",
  {
    draws: "a straight red bar with a bright white centre line stretching from the hero's hand to a target, turning to dark smoke when spent",
    use: "card",
    params: "uAsmPalm: beam start, shared with asmPalmRings (0.55, 0.42); uAsmFoe: target chest (0.80, 0.78); uAsmReach: 0 to 1 how far the beam has crossed, 1 at k9 to k11; uAsmSmoke: 0 live, 1 smoke #2a0610; width 0.09 H fixed",
  },
  { uAsmFoe: { value: v2(0.8, 0.78) }, uAsmReach: { value: 1 }, uAsmSmoke: { value: 0 } }, ["asmPalmRings"]);

export const asmShardField = N("asmShardField", "road and wall slab cut by Voronoi into shards: displaced and cracked after the break at 6.667, flying home close-first from 8.5 to 9.9 with a red seam as each one seats",
  `uniform vec2 uAsmHeroP;
  vec3 asmShardField(vec2 p, float t){
    ${TT}
    vec2 sc = vec2(2.39, 1.0) * 7.0;
    vec2 g = p * sc;
    vec2 ip = floor(g);
    vec2 fp = fract(g);
    float d1 = 9.0, d2 = 9.0;
    vec2 best = vec2(0.0);
    vec2 bestPt = vec2(0.0);
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 n = vec2(float(x), float(y));
        vec2 pt = n + cH22(ip + n) * 0.8 + 0.1;
        float d = length(pt - fp);
        if (d < d1) { d2 = d1; d1 = d; best = ip + n; bestPt = (ip + pt) / sc; }
        else if (d < d2) { d2 = d; }
      }
    }
    float broken = step(6.667, tt);
    float dist = length((bestPt - uAsmHeroP) * vec2(2.39, 1.0));
    float tau = clamp((tt - 8.5 - 0.6 * dist / 1.2) / 0.8, 0.0, 1.0);
    float f = broken * pow(1.0 - tau, 3.0);
    vec2 off = (cH22(best + 31.0) - 0.5) * vec2(0.05, 0.07) * f + vec2(0.0, 0.02) * f;
    vec2 q = p - off;
    float lane = cAA(0.012 - abs(q.x - 0.5), 0.0) * step(0.5, fract(q.y * 9.0));
    vec3 slab = mix(${h("#242a3d")}, ${h("#2f3550")}, cAA(cVn(q * 60.0), 0.6));
    slab = mix(slab, ${h("#ffd27a")} * 0.7, lane);
    float edge = d2 - d1;
    float gap = 1.0 - cAA(edge, 0.02 + 0.10 * f);
    vec3 c = mix(slab, ${h("#120c14")}, gap * broken * 0.9);
    float seam = exp(-(tau - 1.0) * (tau - 1.0) / 0.01) * step(0.001, tau) * broken;
    c = mix(c, ${h("#ff2a3a")}, cLine(edge - 0.02, 2.0) * seam * 0.9);
    return cCap(c);
  }`,
  "asmShardField(p, t)",
  {
    draws: "a night road slab split into jagged pieces with dark gaps that slide back together and close with a thin red seam",
    use: "plate",
    params: "uAsmHeroP: impact centre in plate uv (0.5, 0.2), shards nearest it mend first; t: seconds, held on 12 fps drawings; break at 6.667, mend 8.5 to 9.9, cell scale 7 per H",
  },
  { uAsmHeroP: { value: v2(0.5, 0.2) } });

export const asmCloakCel = N("asmCloakCel", "demon seal costume on the pup body: black high-collar cloak open on a cream belly strip, red lining, gold-edged pauldrons, hard two-tone cel",
  `vec3 asmCloakCel(vec2 p, float t){
    vec2 n = cN(p);
    float hh = cNdL(p);
    vec3 fur = mix(${h("#4a4e5c")}, ${h("#7c8190")}, cAA(hh, 0.50));
    float torso = cAA(0.40 - abs(n.x), 0.0) * cAA(n.y + 0.40, 0.0) * (1.0 - cAA(n.y, 0.16));
    vec3 outer = mix(${h("#0b0910")}, ${h("#14101a")}, cAA(hh, 0.50));
    outer = mix(outer, ${h("#2c2430")}, cAA(hh, 0.82) * 0.6);
    vec3 c = mix(fur, outer, torso);
    c = mix(c, ${h("#7a1420")}, cAA(0.12 - abs(n.x), 0.0) * torso);
    float belly = cAA(0.075 - abs(n.x), 0.0) * torso * (1.0 - cAA(n.y, 0.06));
    c = mix(c, mix(${h("#c9b79a")}, ${h("#f1e6d3")}, cAA(hh, 0.50)), belly);
    float collar = cAA(0.30 - abs(n.x), 0.0) * cAA(n.y, 0.10) * (1.0 - cAA(n.y, 0.19));
    c = mix(c, ${h("#14101a")}, collar);
    c = mix(c, ${h("#7a1420")}, cLine(n.y - 0.10, 1.6) * collar * 0.9);
    for (int i = 0; i < 2; i++) {
      float sx = i == 0 ? -0.30 : 0.30;
      vec2 e = (n - vec2(sx, 0.14)) / vec2(0.11, 0.06);
      float pd = (length(e) - 1.0) * 0.06;
      c = mix(c, mix(${h("#1a141e")}, ${h("#2c2430")}, cAA(hh, 0.50)), cFill(pd));
      c = mix(c, ${h("#b8913c")}, cLine(pd, 1.6));
    }
    return cCap(mix(${h("#120c14")} * 1.3, c, cCover(p)));
  }`,
  "asmCloakCel(p, t)",
  {
    draws: "a round grey seal in a black high-collar cloak that opens on a cream belly strip with red lining, dark-gold-edged shoulder plates and flat two-tone shading",
    use: "surface",
    params: "p: screen position, body centred on the kit sphere cN; cel threshold 0.50 on N.L; cloak half-width 0.40, belly strip 0.075 either side of centre",
  });

export const asmBurnEdge = N("asmBurnEdge", "crew shirt burning away into the cloak: shirt stays above a noisy front climbing from the hem, with a red band 0.02 wide on the front",
  `uniform float uAsmBurn;
  vec3 asmBurnEdge(vec2 p, float t){
    vec2 n = cN(p);
    float hh = cNdL(p);
    float up = (n.y + 0.40) / 0.58;
    float torso = cAA(0.40 - abs(n.x), 0.0) * cAA(up, 0.0) * (1.0 - cAA(up, 1.0));
    vec3 cloak = mix(${h("#0b0910")}, ${h("#14101a")}, cAA(hh, 0.50));
    vec3 shirt = mix(${h("#b9b5ad")}, ${h("#e9e6df")}, cAA(hh, 0.50));
    float front = 1.2 * clamp(uAsmBurn, 0.0, 1.0) - 0.1 + 0.1 * (cVn(p * 14.0) - 0.5);
    float delta = up - front;
    float keep = cAA(delta, 0.0);
    vec3 c = mix(cloak, shirt, keep);
    c = mix(c, ${h("#c8262c")}, cLine(n.y + 0.30, 1.4) * keep);
    float band = cAA(exp(-(delta / 0.02) * (delta / 0.02)), 0.35) * step(0.001, uAsmBurn) * step(uAsmBurn, 0.999);
    c = mix(c, ${h("#ff2a3a")}, band);
    return cCap(mix(${h("#120c14")} * 1.3, c, torso));
  }`,
  "asmBurnEdge(p, t)",
  {
    draws: "a white short-sleeve shirt on the chest being eaten from the hem upward, a thin red glowing line on its edge and the black cloak showing beneath",
    use: "surface",
    params: "p: screen position on the kit body cN; uAsmBurn: 0 shirt whole, 1 fully burnt (drive it in 8 steps, floor(8 * clamp((f - 82) / 7)) / 8); band 0.02 wide fixed",
  },
  { uAsmBurn: { value: 0.5 } });

export const asmWingFan = N("asmWingFan", "Lucifer's black wings: two fans of 9 feather cards from the shoulder blades, spread or folded, with a pale rim on each feather edge",
  `uniform vec2 uAsmShoulder;
  uniform float uAsmWingOpen;
  vec3 asmWingFan(vec2 p, float t){
    vec2 q = (p - uAsmShoulder) * vec2(2.39, 1.0);
    float acc = 0.0, rim = 0.0;
    for (int s = 0; s < 2; s++) {
      float sg = s == 0 ? -1.0 : 1.0;
      for (int i = 0; i < 9; i++) {
        float fi = float(i);
        float ang = mix(1.45, 0.25 + 0.17 * fi, clamp(uAsmWingOpen, 0.0, 1.0));
        float len = 0.10 + 0.07 * sin(fi * 0.35 + 0.8);
        vec2 dir = vec2(sg * sin(ang), cos(ang));
        vec2 r = vec2(dot(q, dir), dot(q, vec2(-dir.y, dir.x)));
        vec2 e = (r - vec2(len * 0.5, 0.0)) / vec2(len * 0.5, 0.012);
        float d = (length(e) - 1.0) * 0.012;
        acc = max(acc, cFill(d));
        rim = max(rim, cLine(d + 0.004, 1.0));
      }
    }
    vec3 c = mix(${h("#120c14")} * 1.4, ${h("#151318")}, acc);
    c = mix(c, ${h("#4a4656")}, rim * acc);
    return cCap(c);
  }`,
  "asmWingFan(p, t)",
  {
    draws: "two near-black feathered wings, each a fan of nine long pointed feathers, spread wide on either side or folded upright, with a faint grey edge on each feather",
    use: "card",
    params: "uAsmShoulder: root between the wings in plate uv (0.5, 0.5); uAsmWingOpen: 0 folded upright, 1 fully spread; feather length 0.10 to 0.17 H fixed",
  },
  { uAsmShoulder: { value: v2(0.5, 0.5) }, uAsmWingOpen: { value: 1 } });

export const asmGradeFinal = N("asmGradeFinal", "final grade: uGradeK split-tone (#0b1430 shadows, #ffb04a to #ff2a3a highs at 0.30), invert or flat white impact frame, grain on twos weighted (1 - Y), ink floor lift, 0.92 cap, 2.39:1 bars",
  `uniform float uAsmGradeK;
  uniform float uAsmImpact;
  vec3 asmGradeFinal(vec3 col, vec2 p, float t){
    vec3 ink = ${h("#120c14")};
    vec3 sh = ${h("#0b1430")};
    vec3 hi = mix(${h("#ffb04a")}, ${h("#ff2a3a")}, clamp(uAsmGradeK, 0.0, 1.0));
    vec3 ts = sh / max(cLuma(sh), 1e-3);
    vec3 th = hi / max(cLuma(hi), 1e-3);
    float w = smoothstep(0.2, 0.8, cLuma(col));
    vec3 c = col * mix(mix(vec3(1.0), ts, 0.30), mix(vec3(1.0), th, 0.30), w);
    float tick = floor(t * 12.0 + 0.02);
    float g = cH21(floor(p * vec2(640.0, 400.0)) + vec2(17.0 * tick, 3.71 * tick));
    c = max(c + 0.03 * (1.0 - cLuma(c)) * (g - 0.5), 0.0);
    c = uAsmImpact > 1.5 ? ${h("#ebe6e6")} : (uAsmImpact > 0.5 ? vec3(0.92) - c : c);
    c = mix(ink, c, smoothstep(0.035, 0.08, cLuma(c)));
    c = cCap(c);
    float bar = 1.0 - cAA(0.33475 - abs(p.y - 0.5), 0.0);
    return mix(c, ink, bar);
  }`,
  "asmGradeFinal(mix(vec3(0.05, 0.08, 0.16), vec3(0.95, 0.80, 0.55), clamp(p.x, 0.0, 1.0)) * (0.3 + 0.7 * p.y), p, t)",
  {
    draws: "the frame tinted navy in the shadows and amber or red in the lights with fine grain, a solid pale-white or negative image on impact, no pure black and wide dark bars top and bottom",
    use: "grade",
    params: "col: input colour; p: screen uv (bars 0.16525 each); t: seconds, grain re-rolls 12 times a second; uAsmGradeK: 0 amber highs, 1 red highs; uAsmImpact: 0 normal, 1 invert (0.92 - c) on k9, 2 flat #ebe6e6 on k10",
  },
  { uAsmGradeK: { value: 0 }, uAsmImpact: { value: 0 } });

export const CUT_PACKET = [
  asmThroneHall, asmGateTunnel, asmNightStreet, asmFearMotes, asmAuraShell, asmPalmRings, asmKillBeam,
  asmShardField, asmCloakCel, asmBurnEdge, asmWingFan, asmGradeFinal,
];
export const CUT_PACKET_COUNT = 12;
export default CUT_PACKET;
