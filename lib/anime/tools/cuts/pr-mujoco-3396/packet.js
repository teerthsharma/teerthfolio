// Shaders for pr-mujoco-3396 (Attack on Titan, the Rumbling, MAPPA): one layered world chain, cast cards, one post.
import { defineCut } from "../kit.glsl.js";

const F = "pr-mujoco-3396";
const DOCKS = [F, "pr-mujoco-warp-1541", "pr-mujoco-3450"];
// each layer draws over the one before it, named in deps so a bare check or glslFor finds the whole chain
const M = (name, doc, glsl, demo, meta) => ({ ...defineCut(name, F, doc, glsl, demo), suits: DOCKS, quality: "real", ...meta });

export const aotSkyHot = M("aotSkyHot", "W1 hot amber sky: five flat bands, gold hot spot at (0.59 W, 0.17 H), no blue",
  `vec3 aotSkyHot(vec2 p, float t){
    float tq = floor(t * 12.0 + 1e-4) / 12.0;
    float v = clamp((p.y - 0.30) * 1.6, 0.0, 1.0);
    vec2 h = (p - vec2(0.59, 0.83)) * vec2(1.78, 1.0);
    float halo = exp(-dot(h, h) * 9.0);
    float s = 0.10 + 0.34 * v + 0.80 * halo + (cFbm(vec2(p.x * 3.0 + tq * 0.01, p.y * 5.0)) - 0.5) * 0.10;
    vec3 c = vec3(0.549, 0.306, 0.161);
    c = mix(c, vec3(0.682, 0.388, 0.200), cAA(s, 0.24));
    c = mix(c, vec3(0.761, 0.580, 0.447), cAA(s, 0.36));
    c = mix(c, vec3(0.859, 0.545, 0.263), cAA(s, 0.50));
    c = mix(c, vec3(0.941, 0.780, 0.361), cAA(s, 0.86));
    return cCap(c);
  }`, "aotSkyHot(p, t)", {
    draws: "A hot amber sky in flat bands from umber to tan to orange, with a gold glow top right of centre and no blue anywhere.",
    use: "plate",
    params: "t: sets a 12 fps drift of the band edges; the hot spot sits at (0.59, 0.83) in y-up uv",
  });

export const aotWallBreak = M("aotWallBreak", "W2 and E7 wall band of 14 stone slabs that crack, rotate and drop out of sight from 4.0 to 5.0 s",
  `vec3 aotWallBreak(vec2 p, float t){
    float tq = floor(t * 12.0 + 1e-4) / 12.0;
    float u = clamp(tq - 4.0, 0.0, 1.0);
    vec3 c = aotSkyHot(p, t);
    vec3 ink = vec3(0.102, 0.071, 0.047);
    for (int i = 0; i < 14; i++) {
      float fi = float(i);
      float cx = mod(fi, 7.0);
      float cy = floor(fi / 7.0);
      float h = cH21(vec2(fi + 1.0, 3.7));
      float k = clamp((u - 0.35 * h - 0.08 * (1.0 - cy)) / 0.57, 0.0, 1.0);
      vec2 ctr = vec2((cx + 0.5) / 7.0, 0.365 + 0.05 * cy);
      vec2 off = vec2(0.02 * (h - 0.5) * k, -0.12 * k * k * (0.6 + 0.4 * h));
      float a = (h - 0.5) * 0.87 * k;
      vec2 q = p - ctr - off;
      q = vec2(cos(a) * q.x + sin(a) * q.y, -sin(a) * q.x + cos(a) * q.y);
      float d = max(abs(q.x) - 0.0705, abs(q.y) - 0.0245);
      vec3 s = mix(vec3(0.333, 0.184, 0.114), vec3(0.412, 0.243, 0.157), cAA(q.y, -0.012));
      s = mix(s, vec3(0.498, 0.310, 0.196), cAA(q.y, 0.012));
      float seam = cLine(q.x - 0.03 * (h - 0.5) * 4.0, 1.2) * 0.5;
      float crack = cLine(q.x + 0.35 * q.y - 0.01 * (h - 0.5), 1.4) * k;
      s = mix(s, vec3(0.227, 0.102, 0.063), max(seam, crack));
      s = mix(s, vec3(0.761, 0.580, 0.447), 0.30);
      c = mix(c, s, cFill(d));
      c = mix(c, ink, cLine(d, 2.0) * 0.9);
    }
    return c;
  }`, "aotWallBreak(p, t)", {
    draws: "A stone wall along the horizon in flat brown slabs with ink seams that cracks and falls apart in fourteen pieces over one second.",
    use: "plate",
    deps: ["cutKit", "aotSkyHot"],
    params: "t: wall is whole until 4.0 s, slabs fall on twos until 5.0 s; slab fall 0.12 H, tilt up to 25 degrees",
  });

export const aotTitanRows = M("aotTitanRows", "W6 marching Wall Titan rows: 34 haze-dimmed heads and shoulders, 8 / 11 / 15 per row, rising 4.5 to 7.0 s (also owns the shared face outline)",
  `float aotFaceD(vec2 q){
    float skull = length(q / vec2(0.76, 1.0)) - 1.0;
    float jaw = max(abs(q.x) - (0.58 - 0.16 * clamp(-q.y - 0.1, 0.0, 1.0)), max(-q.y - 0.95, q.y + 0.2));
    return min(skull, jaw);
  }
  vec3 aotTitanRows(vec2 p, float t){
    float tq = floor(t * 12.0 + 1e-4) / 12.0;
    float tw = floor(t * 6.0 + 1e-4) / 6.0;
    vec3 c = aotWallBreak(p, t);
    vec3 hazeC = vec3(0.761, 0.580, 0.447);
    for (int r = 0; r < 3; r++) {
      float rr = 2.0 - float(r);
      float n = rr < 0.5 ? 8.0 : (rr < 1.5 ? 11.0 : 15.0);
      float hy = rr < 0.5 ? 0.40 : (rr < 1.5 ? 0.415 : 0.43);
      float z = rr < 0.5 ? 700.0 : (rr < 1.5 ? 900.0 : 1200.0);
      float ru = clamp((tq - 4.5 - 0.4 * rr) / 1.7, 0.0, 1.0);
      float rise = (1.0 - (0.5 - 0.5 * cos(3.14159 * ru))) * 0.14;
      float haze = 1.0 - exp(-0.0011 * z);
      for (int i = 0; i < 15; i++) {
        float fi = float(i);
        if (fi >= n) break;
        float h1 = cH21(vec2(fi + 1.0, rr + 11.0));
        float x = (fi + 0.5) / n + (h1 - 0.5) * 0.4 / n;
        if (abs(p.x - x) > 0.07) continue;
        float bob = 0.005 * sin(6.2832 * (tw * 1.25 + h1));
        vec2 q = vec2((p.x - x) * 1.78, p.y - (hy - rise + bob)) / 0.025;
        float sw = 0.35 * sin(3.14159 * fract(tw * 1.25 + h1));
        float sg = q.x < 0.0 ? -1.0 : 1.0;
        vec2 a0 = vec2(1.0, -1.3);
        vec2 a1 = a0 + 2.6 * vec2(sin(sw * sg), -cos(sw * sg));
        vec2 pa = vec2(abs(q.x), q.y) - a0;
        vec2 ba = a1 - a0;
        float arm = length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)) - 0.34;
        float torso = max(abs(q.x) - (0.9 + 0.5 * clamp(-q.y - 0.8, 0.0, 2.0)), max(-q.y - 6.0, q.y + 0.9));
        float d = min(min(aotFaceD(q), torso), arm);
        vec3 col = mix(vec3(0.412, 0.243, 0.157), vec3(0.333, 0.184, 0.114), cAA(-q.y, 0.85));
        col = mix(col, vec3(0.498, 0.310, 0.196), cAA(q.y, 0.45) * (1.0 - cAA(-q.y, 0.85)));
        col = mix(col, vec3(0.102, 0.071, 0.047), cFill(length(vec2(abs(q.x) - 0.30, q.y - 0.15)) - 0.16) * 0.8);
        col = mix(col, hazeC, haze);
        c = mix(c, col, cFill(d));
      }
    }
    return c;
  }`, "aotTitanRows(p, t)", {
    draws: "Three rows of small skinless Titan heads and shoulders marching out of the haze behind the rooftops, each one a value darker than the steam.",
    use: "plate",
    deps: ["cutKit", "aotWallBreak"],
    params: "t: rows rise 4.5 to 7.0 s, bob 0.10 head heights on twos; haze k 0.0011 per metre at 700 / 900 / 1200 m",
  });

export const aotTitanFace = M("aotTitanFace", "W5 and E30 three giant skinless Wall Titan faces from one SDF: ink sockets, cream grin, 30 to 60 muscle lines, haze 38 / 55 / 65 percent",
  `vec3 aotTitanFace(vec2 p, float t){
    float tq = floor(t * 12.0 + 1e-4) / 12.0;
    float tw = floor(t * 6.0 + 1e-4) / 6.0;
    float ru = clamp((tq - 7.0) / 2.0, 0.0, 1.0);
    float rise = 0.5 - 0.5 * cos(3.14159 * ru);
    vec3 c = aotTitanRows(p, t);
    vec3 ink = vec3(0.102, 0.071, 0.047);
    vec3 fib = vec3(0.227, 0.102, 0.063);
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float id = fi < 0.5 ? 2.0 : (fi < 1.5 ? 0.0 : 1.0);
      float hh = id < 0.5 ? 0.125 : (id < 1.5 ? 0.185 : 0.10);
      float z = id < 0.5 ? 200.0 : (id < 1.5 ? 120.0 : 260.0);
      float cy = id < 0.5 ? 0.66 : (id < 1.5 ? 0.64 : 0.67);
      vec2 ctr = vec2(0.2 + 0.3 * id, cy - 0.72 * (1.0 - rise) + 0.0025 * sin(6.2832 * (tw * 1.7 + id * 0.31)));
      vec2 q = vec2((p.x - ctr.x) * 1.78, p.y - ctr.y) / hh;
      if (abs(q.x) > 1.4 || abs(q.y) > 1.3) continue;
      float d = aotFaceD(q);
      float nr = (id > 0.5 && id < 1.5) ? 1.0 : 0.0;
      vec3 base = mix(vec3(0.412, 0.243, 0.157), vec3(0.498, 0.310, 0.196), nr);
      float v = 0.5 + 0.35 * q.y + 0.18 * q.x * sign(0.59 - ctr.x);
      vec3 col = cCel3(v, 0.30, 0.82, base * 0.78, base, base * 1.14);
      col = mix(col, vec3(0.498, 0.208, 0.094), cAA(cFbm(q * 2.6 + id * 3.1), 0.62) * 0.8);
      float eyeD = length(vec2((abs(q.x) - 0.30) / 0.19, (q.y - 0.18) / 0.10)) - 1.0;
      float brow = max(abs(q.x) - 0.58, abs(q.y - 0.34 + 0.25 * abs(q.x)) - 0.045);
      float nose = length((q - vec2(0.0, -0.10)) / vec2(0.07, 0.13)) - 1.0;
      float m = q.y + 0.50 + 0.30 * q.x * q.x;
      float mouth = max(abs(m) - 0.075, abs(q.x) - 0.50);
      float mv = q.x * 22.0 + 1.6 * sin(q.y * 5.0 + id) + (cFbm(q * 3.0 + id) - 0.5) * 3.0;
      float ml = cLine(0.5 - abs(fract(mv) - 0.5), 1.0) * step(0.3, cH21(vec2(floor(mv), 3.3 + id)));
      float mm = (1.0 - cAA(abs(q.y + 0.05), 0.42)) * (1.0 - cFill(eyeD - 0.12)) * (1.0 - cFill(mouth - 0.05));
      col = mix(col, fib, ml * mm * mix(0.55, 0.8, nr));
      col = mix(col, ink, max(cFill(eyeD), max(cFill(brow) * 0.8, cFill(nose))));
      col = mix(col, ink, cFill(mouth));
      float ty = cFill(mouth + 0.022);
      col = mix(col, vec3(0.851, 0.706, 0.541), ty);
      float sep = cLine(0.5 - abs(fract(q.x * 9.0) - 0.5), 1.0);
      col = mix(col, fib, max(sep, cLine(m, 1.0)) * ty * 0.85);
      float rimv = cFill(d) * (1.0 - cFill(d + 0.10));
      vec2 dir = normalize(vec2((p.x - ctr.x) * 1.78, p.y - ctr.y) + 1e-5);
      vec2 ld = normalize(vec2((0.59 - ctr.x) * 1.78, 0.83 - ctr.y));
      col = mix(col, vec3(0.906, 0.682, 0.318), rimv * cAA(dot(dir, ld), 0.15) * 0.55);
      col = mix(col, vec3(0.761, 0.580, 0.447), 1.0 - exp(-0.004 * z));
      c = mix(c, col, cFill(d));
    }
    return c;
  }`, "aotTitanFace(p, t)", {
    draws: "Three huge skinless Titan faces in the sky, one drawing repeated, with black eye sockets, a cream grin and fine muscle lines, the middle one nearest and the outer two paler in haze.",
    use: "plate",
    deps: ["cutKit", "aotTitanRows"],
    params: "t: faces rise from the steam 7.0 to 9.0 s (easeInOutSine), sway 2 px on twos; centres 0.2 / 0.5 / 0.8 W, haze k 0.004 per metre at 200 / 120 / 260 m",
  });

export const aotSteamBands = M("aotSteamBands", "W7 and E8 banded steam wall: exactly four flat density levels, scalloped crown, cream over umber, clears from 13.5 to 16.0 s",
  `vec3 aotSteamBands(vec2 p, float t){
    float st = (t >= 12.0 && t < 12.5) ? 24.0 : 12.0;
    float tq = floor(t * st + 1e-3) / st;
    float grow = smoothstep(4.0, 5.0, tq);
    float clearU = clamp((tq - 13.5) / 2.5, 0.0, 1.0);
    vec3 c = aotTitanFace(p, t);
    float ys = clamp((p.y - 0.30) / 0.20, 0.0, 1.0);
    float f = cFbm(vec2(p.x * 5.0 + tq * 0.08, p.y * 9.0 - tq * 0.45));
    float rho = clamp(0.9 * f + 0.55 - 0.35 * ys, 0.0, 1.0);
    float rq = clamp(rho * grow - clearU, 0.0, 1.0);
    float edge = 0.475 + 0.022 * sqrt(abs(sin(34.0 * p.x + 3.0 * f)));
    float mask = cAA(edge - p.y, 0.0) * cAA(p.y, 0.22) * step(0.001, rq);
    float lv = cAA(rq, 0.25) + cAA(rq, 0.50) + cAA(rq, 0.75);
    vec3 col = mix(vec3(0.333, 0.184, 0.114), vec3(0.851, 0.706, 0.541), lv / 3.0);
    return mix(c, col, mask * (0.40 + 0.17 * lv));
  }`, "aotSteamBands(p, t)", {
    draws: "A wall of steam in four flat bands of cream and umber with a scalloped top edge, drifting upward and thinning away at the end.",
    use: "plate",
    deps: ["cutKit", "aotTitanFace"],
    params: "t: grows in 4.0 to 5.0 s, drifts at 12 fps (24 fps in 12.0 to 12.5 s), bands drop one at a time from 13.5 s and are gone by 16.0 s",
  });

export const aotRoofline = M("aotRoofline", "W3 and E21 city roofline: 34 house cells, three minarets, spire at 0.683 W, dome, bell tower at 0.72 W that breaks into 8 chunks on k3",
  `float aotRoofD(vec2 p, float u){
    float cell = floor(p.x * 34.0);
    float f = fract(p.x * 34.0);
    float d = p.y - (0.20 + 0.07 * cH21(vec2(cell, 1.3)) + 0.018 * cH21(vec2(cell, 5.1)) * (1.0 - abs(f * 2.0 - 1.0)));
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float top = 0.36 + 0.02 * fi;
      float w = 0.007 * (1.0 - 0.8 * clamp((p.y - 0.22) / (top - 0.22), 0.0, 1.0));
      d = min(d, max(abs(p.x - (0.17 + 0.355 * fi)) - w, p.y - top));
    }
    float ws = 0.010 * (1.0 - 0.85 * clamp((p.y - 0.22) / 0.18, 0.0, 1.0));
    d = min(d, max(abs(p.x - 0.683) - ws, p.y - 0.40));
    d = min(d, length((p - vec2(0.075, 0.19)) * vec2(1.78, 1.0)) - 0.11);
    float shaft = max(abs(p.x - 0.72) - 0.020, p.y - 0.37);
    float capD = max(abs(p.x - 0.72) - 0.026 * (1.0 - clamp((p.y - 0.37) / 0.035, 0.0, 1.0)), max(p.y - 0.405, 0.36 - p.y));
    float broken = max(abs(p.x - 0.72) - 0.020, p.y - 0.31);
    d = min(d, u > 0.0 ? broken : min(shaft, capD));
    for (int j = 0; j < 8; j++) {
      float fj = float(j);
      float hj = cH21(vec2(fj + 2.0, 9.1));
      float hs = 0.007 + 0.006 * hj;
      float cx = 0.72 + (hj - 0.5) * (0.05 + 0.10 * u);
      float cy = 0.32 + 0.011 * fj - 0.22 * u * u * (0.6 + 0.8 * hj);
      float cd = max(abs(p.x - cx) - hs, abs(p.y - cy) - hs);
      d = min(d, u > 0.0 ? cd : 1e3);
    }
    return d;
  }
  vec3 aotRoofline(vec2 p, float t){
    float t24 = floor(t * 24.0 + 1e-3) / 24.0;
    float trig = step(12.125 - 1e-3, t24);
    float ut = floor((t24 - 12.125) * 12.0 + 1e-3) / 12.0;
    float u = trig * clamp(ut / 0.375 + 0.05, 0.0, 1.0);
    vec3 c = aotSteamBands(p, t);
    float d = aotRoofD(p, u);
    vec3 fc = vec3(0.176, 0.118, 0.086);
    float rimband = cFill(d) * (1.0 - cFill(d + 0.007)) * cAA(dFdy(d), 0.2);
    fc = mix(fc, vec3(0.255, 0.149, 0.102), rimband);
    float cell = floor(p.x * 34.0);
    float hh = 0.20 + 0.07 * cH21(vec2(cell, 1.3));
    vec2 wq = vec2(fract(p.x * 34.0) - 0.5, p.y - (hh - 0.035));
    float win = cFill(max(abs(wq.x) - 0.12, abs(wq.y) - 0.008)) * step(0.78, cH21(vec2(cell, 7.7))) * cFill(d + 0.03);
    fc = mix(fc, vec3(0.859, 0.545, 0.263), win * 0.9);
    c = mix(c, fc, cFill(d));
    return mix(c, vec3(0.102, 0.071, 0.047), cLine(d, 2.0) * 0.9);
  }`, "aotRoofline(p, t)", {
    draws: "A dark brown city skyline with minarets, a spire, a dome and a bell tower, warm windows here and there, and a tower top that crumbles in eight chunks when the foot lands.",
    use: "plate",
    deps: ["cutKit", "aotSteamBands"],
    params: "t: tower breaks at 12.125 s (k3), chunks fall on twos over 0.375 s; tower sits at x 0.72, foot target",
  });

export const aotRidge = M("aotRidge", "W4 and E28 tile ridge the seals stand on: lit top lip, tile seams, 5 rubble blocks, three contact shadows",
  `vec3 aotRidge(vec2 p, float t){
    vec3 c = aotRoofline(p, t);
    vec3 ink = vec3(0.102, 0.071, 0.047);
    float top = 0.240 + 0.002 * abs(sin(p.x * 150.0));
    float d = max(max(0.20 - p.x, p.x - 0.62), max(p.y - top, 0.178 - p.y));
    vec3 g = mix(vec3(0.255, 0.149, 0.102), vec3(0.333, 0.184, 0.114), cAA(p.y, 0.222));
    float seam = cLine(0.5 - abs(fract(p.x * 55.0) - 0.5), 1.2) * (1.0 - cAA(p.y, 0.222)) * cAA(p.y, 0.200);
    g = mix(g, vec3(0.176, 0.118, 0.086), max(seam, cLine(p.y - 0.200, 1.2)) * 0.8);
    c = mix(c, g, cFill(d));
    c = mix(c, ink, cLine(d, 2.0) * 0.8);
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float h = cH21(vec2(fi + 4.0, 2.2));
      float hs = 0.007 + 0.008 * h;
      vec2 bq = p - vec2(0.24 + 0.075 * fi + 0.02 * (h - 0.5), 0.236 + hs * 0.8);
      float a = (h - 0.5) * 0.4;
      bq = vec2(cos(a) * bq.x + sin(a) * bq.y, -sin(a) * bq.x + cos(a) * bq.y);
      float bd = max(abs(bq.x) - hs * 1.3, abs(bq.y) - hs);
      c = mix(c, mix(vec3(0.333, 0.184, 0.114), vec3(0.498, 0.310, 0.196), cAA(bq.y, hs * 0.35)), cFill(bd));
      c = mix(c, ink, cLine(bd, 2.0) * 0.8);
    }
    float s1 = cFill(length(vec2((p.x - 0.30) / 0.05, (p.y - 0.226) / 0.007)) - 1.0);
    float s2 = cFill(length(vec2((p.x - 0.55) / 0.035, (p.y - 0.216) / 0.006)) - 1.0);
    float s3 = cFill(length(vec2((p.x - 0.59) / 0.035, (p.y - 0.206) / 0.006)) - 1.0);
    return mix(c, vec3(0.216, 0.129, 0.090), max(s1, max(s2, s3)) * 0.75);
  }`, "aotRidge(p, t)", {
    draws: "A tiled rooftop ridge in dark brown with a lit top lip, five small rubble blocks and warm shadow blobs where the three seals stand.",
    use: "plate",
    deps: ["cutKit", "aotRoofline"],
    params: "t: not used; ridge spans x 0.20 to 0.62, feet at y 0.22; contact shadows at x 0.30, 0.55, 0.59",
  });

export const aotWatchers = M("aotWatchers", "cast: the two small costumed watcher seals (sand tunic and rope belt with messy hair, rust tunic and head wrap), reacting to footfalls, the wall, the faces and the kill",
  `vec3 aotBody(vec2 q){
    float z = sqrt(max(0.0, 0.22 - dot(q, q)));
    float v = 0.5 + 0.5 * dot(normalize(vec3(q, z + 1e-3)), normalize(vec3(0.55, 0.60, 0.35)));
    vec3 back = cCel3(v, 0.40, 0.80, vec3(0.333, 0.384, 0.439), vec3(0.435, 0.478, 0.533), vec3(0.533, 0.573, 0.627));
    vec3 belly = cCel3(v, 0.40, 0.80, vec3(0.616, 0.541, 0.459), vec3(0.827, 0.753, 0.675), vec3(0.973, 0.933, 0.878));
    return mix(belly, back, cAA(q.y + 0.06 * sin(q.x * 6.0), -0.10));
  }
  vec3 aotWatcherOne(vec3 c, vec2 p, vec2 ctr, float hgt, float who, float ovh){
    vec3 ink = vec3(0.102, 0.071, 0.047);
    vec2 q = (p - ctr) * vec2(1.78, 1.0) * 13.4;
    q.y = (q.y + 0.469) / hgt - 0.469;
    float body = length(q) - 0.469;
    vec3 tc = who < 0.5 ? vec3(0.659, 0.518, 0.310) : vec3(0.549, 0.306, 0.161);
    vec3 ts = who < 0.5 ? vec3(0.416, 0.290, 0.188) : vec3(0.333, 0.184, 0.114);
    vec3 col = mix(c, aotBody(q), cFill(body));
    float tun = max(abs(q.y + 0.20) - 0.09, body);
    col = mix(col, mix(ts, tc, cAA(q.y, -0.22)), cFill(tun));
    float rope = cFill(max(abs(q.y + 0.15) - 0.014, body)) * (who < 0.5 ? 1.0 : 0.0);
    col = mix(col, vec3(0.478, 0.353, 0.227), rope);
    col = mix(col, ts, rope * cLine(0.5 - abs(fract(q.x * 14.0) - 0.5), 1.0));
    vec3 hc = who < 0.5 ? vec3(0.227, 0.149, 0.086) : vec3(0.416, 0.290, 0.188);
    float hairD = max(body, (who < 0.5 ? 0.30 : 0.26) - q.y + (who < 0.5 ? 0.05 * sin(q.x * 28.0) : 0.0));
    col = mix(col, hc, cFill(hairD));
    float wrap = max(body, 0.34 - q.y);
    col = mix(col, vec3(0.761, 0.580, 0.447), cFill(wrap) * who);
    col = mix(col, ts, cLine(q.y - 0.40, 1.4) * cFill(wrap) * who);
    float eye = length(q - vec2(0.20, 0.08)) - 0.085;
    col = mix(col, vec3(0.125, 0.137, 0.173), cFill(eye));
    col = mix(col, vec3(0.851, 0.788, 0.659), cFill(length(q - vec2(0.225, 0.105)) - 0.018));
    float fl = min(length((q - vec2(-0.18, 0.62)) / vec2(0.05, 0.09)) - 1.0, length((q - vec2(0.18, 0.62)) / vec2(0.05, 0.09)) - 1.0);
    col = mix(col, vec3(0.533, 0.573, 0.627), cFill(fl) * ovh);
    vec2 dir = normalize(q + 1e-4);
    col = mix(col, vec3(0.906, 0.682, 0.318), cFill(body) * (1.0 - cFill(body + 0.05)) * cAA(dot(dir, normalize(vec2(0.5, 0.8))), 0.2) * 0.55);
    return mix(col, ink, cLine(body, 2.0) * 0.85);
  }
  vec3 aotWatchers(vec2 p, float t){
    float st = (t >= 12.0 && t < 12.5) ? 24.0 : 12.0;
    float ts = floor(t * st + 1e-3) / st;
    vec3 c = aotRidge(p, t);
    float n = clamp(floor((ts - 2.1) / 0.8), 0.0, 9.0);
    float age = ts - (2.1 + 0.8 * n);
    float flinch = step(1.5, ts) * step(ts, 4.0) * step(2.1 - 1e-3, ts) * step(age, 0.17);
    float rise = smoothstep(4.0, 5.0, ts);
    float duck = step(12.0 - 1e-3, ts) * (1.0 - smoothstep(13.5, 16.0, ts));
    float hA = mix(mix(0.75, 1.0, rise), 0.55, duck) * (1.0 - 0.04 * flinch);
    float hB = mix(mix(0.72, 0.90, rise), 0.60, step(7.0, ts) * (1.0 - step(12.0, ts)));
    hB = mix(hB, 0.50, duck);
    float ovh = step(7.0, ts) * (1.0 - step(10.0, ts));
    c = aotWatcherOne(c, p, vec2(0.55, 0.275), hA, 0.0, ovh);
    return aotWatcherOne(c, p, vec2(0.59, 0.265), hB, 1.0, 0.0);
  }`, "aotWatchers(p, t)", {
    draws: "Two small costumed seals on the ridge, one in a sand tunic with a rope belt and messy hair, one in a rust tunic with a head wrap, lit by a warm back rim.",
    use: "card",
    deps: ["cutKit", "aotRidge"],
    params: "t: A crouches then stands 4.0 to 5.0 s, hands over head 7.0 to 10.0 s, both duck flat at 12.0 s and rise 13.5 to 16.0 s; B hides behind A from 7.0 s",
  });

export const aotHeroEren = M("aotHeroEren", "cast: the hero seal as Eren in the Rumbling: half-bun hair, heavy-lidded eye with a timed warm catchlight, cream tunic, belt, wrapped flippers, command flipper 11.5 to 12.0 s",
  `vec3 aotHeroEren(vec2 p, float t){
    float st = (t >= 12.0 && t < 12.5) ? 24.0 : 12.0;
    float ts = floor(t * st + 1e-3) / st;
    vec3 ink = vec3(0.102, 0.071, 0.047);
    vec3 c = aotWatchers(p, t);
    float brace = smoothstep(1.4, 1.6, ts) * (1.0 - smoothstep(5.4, 5.6, ts));
    float lookU = clamp((ts - 5.5) / 0.3, 0.0, 1.0);
    float widen = step(5.5, ts) * (1.0 - step(6.5, ts));
    float raiseF = step(11.5, ts) * (1.0 - step(12.0, ts));
    vec2 q = (p - vec2(0.30, 0.27)) * vec2(1.78, 1.0) * 9.38;
    q.y = (q.y + 0.469) * (1.0 + 0.2 * brace) - 0.469;
    float body = length(q) - 0.469;
    vec3 col = mix(c, aotBody(q), cFill(body));
    float tun = max(abs(q.y + 0.22) - 0.075, length(q) - 0.466);
    col = mix(col, mix(vec3(0.659, 0.549, 0.408), vec3(0.851, 0.788, 0.659), cAA(q.y, -0.245)), cFill(tun));
    col = mix(col, vec3(0.227, 0.149, 0.086), cFill(max(abs(q.y + 0.17) - 0.012, length(q) - 0.466)));
    float buckle = max(abs(q.x - 0.10) - 0.022, abs(q.y + 0.17) - 0.022);
    col = mix(col, vec3(0.718, 0.529, 0.392), cFill(buckle));
    col = mix(col, ink, cLine(buckle, 1.2) * 0.7);
    vec2 fc = mix(vec2(0.30, -0.28), vec2(0.40, 0.05), raiseF);
    vec2 fr = mix(vec2(0.11, 0.045), vec2(0.05, 0.13), raiseF);
    float fl = length((q - fc) / fr) - 1.0;
    float fw = mix(abs(q.x - fc.x), abs(q.y - fc.y), raiseF);
    col = mix(col, vec3(0.435, 0.478, 0.533), cFill(fl));
    col = mix(col, vec3(0.416, 0.290, 0.188), cFill(fl) * cFill(fw - 0.03));
    float fl2 = length((q - vec2(-0.30, -0.28)) / vec2(0.11, 0.045)) - 1.0;
    col = mix(col, vec3(0.435, 0.478, 0.533), cFill(fl2));
    col = mix(col, vec3(0.416, 0.290, 0.188), cFill(fl2) * cFill(abs(q.x + 0.30) - 0.03));
    col = mix(col, ink, max(cLine(fl, 1.4), cLine(fl2, 1.4)) * 0.7);
    float cap = max(length(q) - 0.50, 0.20 - q.y + 0.025 * sin(q.x * 16.0));
    float lockL = length((q - vec2(-0.16, 0.20)) / vec2(0.06, 0.13)) - 1.0;
    float lockR = length((q - vec2(0.16, 0.20)) / vec2(0.055, 0.12)) - 1.0;
    float bun = length(q - vec2(-0.04, 0.50)) - 0.075;
    float tail = length((q - vec2(-0.34, 0.12)) / vec2(0.045, 0.20)) - 1.0;
    float hair = min(min(cap, bun), min(min(lockL, lockR), tail));
    vec3 hcol = cCel3(fract(q.x * 6.0 + q.y * 2.5), 0.34, 0.72, vec3(0.141, 0.086, 0.047), vec3(0.227, 0.149, 0.086), vec3(0.310, 0.200, 0.120));
    float hrim = cFill(hair) * (1.0 - cFill(hair + 0.05)) * cAA(dot(normalize(q + 1e-4), normalize(vec2(0.5, 0.8))), 0.2);
    col = mix(col, hcol, cFill(hair));
    col = mix(col, vec3(0.906, 0.682, 0.318), hrim * 0.55);
    vec2 ec = vec2(0.20, 0.06 + 0.05 * lookU);
    float wd = 0.012 * widen;
    float ell = length((q - ec) / vec2(0.085, 0.060 + wd)) - 1.0;
    float lid = q.y - ec.y - 0.03 - wd + 0.25 * (q.x - ec.x);
    float vis = max(ell, lid);
    col = mix(col, vec3(0.125, 0.137, 0.173), cFill(vis));
    col = mix(col, vec3(0.427, 0.522, 0.459), cLine(length(q - ec) - 0.038, 1.2) * cFill(vis));
    col = mix(col, ink, cLine(lid, 2.0) * cFill(ell - 0.015));
    float catchOn = smoothstep(9.0, 9.1, ts) * (1.0 - smoothstep(9.9, 10.0, ts));
    col = mix(col, vec3(0.906, 0.682, 0.318), cFill(length((q - ec - vec2(0.045, 0.020)) / vec2(0.014, 0.010)) - 1.0) * cFill(vis) * catchOn);
    col = mix(col, vec3(0.973, 0.933, 0.878), cFill(length((q - vec2(0.30, -0.06)) / vec2(0.10, 0.07)) - 1.0) * 0.9);
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      vec2 fp = vec2(0.26 + 0.035 * fi, -0.06 + 0.02 * sin(fi * 2.3));
      col = mix(col, vec3(0.463, 0.380, 0.310), cFill(length(q - fp) - 0.008));
    }
    col = mix(col, ink, cLine(body, 2.0) * 0.85);
    return col;
  }`, "aotHeroEren(p, t)", {
    draws: "The hero seal standing on the ridge as Eren: a long dark half-bun and fringe locks, one heavy-lidded dark eye with a thin green-grey ring, a cream tunic and belt, brown wrapped flippers, a warm rim along its back.",
    use: "card",
    deps: ["cutKit", "aotWatchers"],
    params: "t: braces low 1.5 to 5.4 s, eye widens and head lifts from 5.5 s, warm catchlight 9.0 to 10.0 s, right flipper raised 11.5 to 12.0 s then dropped at k0; drawn at (0.30, 0.27), 0.10 H tall",
  });

export const aotTitanFoot = M("aotTitanFoot", "W8 and E18 skinless Wall Titan foot card: four toes, leg with muscle lines, ink contour, drops from above frame to the tower in k0 to k3",
  `vec3 aotTitanFoot(vec2 p, float t){
    float k = floor((t - 12.0) * 24.0 + 1e-3);
    vec3 c = aotHeroEren(p, t);
    if (k < 0.0) return c;
    float u = clamp(k / 3.0, 0.0, 1.0);
    vec2 q = vec2((p.x - 0.72) * 1.78, p.y - 0.30 - 0.9 * (1.0 - u * u));
    float body = length((q - vec2(0.0, 0.075)) / vec2(0.267, 0.085)) - 1.0;
    float toes = 1e3;
    for (int i = 0; i < 4; i++) {
      float tx = (float(i) - 1.5) * 0.1135;
      toes = min(toes, length(vec2(q.x - tx, (q.y - 0.035) * 1.15)) - 0.058);
    }
    float leg = max(abs(q.x) - 0.12, max(q.y - 0.40, 0.10 - q.y));
    float d = min(min(body, toes), leg);
    vec3 base = vec3(0.455, 0.277, 0.177);
    vec3 col = cCel3(0.5 + 0.8 * (q.y - 0.12) + 0.2 * q.x, 0.30, 0.82, base * 0.78, base, base * 1.14);
    float mv = q.x * 38.0 + 2.0 * sin(q.y * 9.0);
    col = mix(col, vec3(0.227, 0.102, 0.063), cLine(0.5 - abs(fract(mv) - 0.5), 1.0) * cAA(q.y, 0.12) * 0.75);
    float seam = cLine(0.5 - abs(fract(q.x / 0.1135) - 0.5), 1.4) * (1.0 - cAA(q.y, 0.075));
    col = mix(col, vec3(0.102, 0.071, 0.047), seam * 0.8);
    float rimv = cFill(d) * (1.0 - cFill(d + 0.03));
    col = mix(col, vec3(0.906, 0.682, 0.318), rimv * cAA(q.x + 0.4 * q.y, 0.0) * 0.55);
    col = mix(col, vec3(0.761, 0.580, 0.447), 0.38);
    c = mix(c, col, cFill(d));
    return mix(c, vec3(0.102, 0.071, 0.047), cLine(d, 2.0) * 0.9);
  }`, "aotTitanFoot(p, t)", {
    draws: "A giant skinless foot with four toes and a muscled leg slams down from above the frame onto the bell tower in four quick drawings.",
    use: "card",
    deps: ["cutKit", "aotHeroEren"],
    params: "t: nothing before 12.0 s; drops k0 to k3 at 24 fps (accelerating), then stays; lands at (0.72, 0.30), 0.30 W wide, haze 38 percent",
  });

export const aotFootBurst = M("aotFootBurst", "E20 and E22 banded steam burst at the foot base with a flat dust ring on the ridge: expands over k3 to k11, decays 1.0 to 0.4 until 13.5 s, then clears",
  `vec3 aotFootBurst(vec2 p, float t){
    float st = (t >= 12.0 && t < 12.5) ? 24.0 : 12.0;
    float tq = floor(t * st + 1e-3) / st;
    vec3 c = aotTitanFoot(p, t);
    float act = step(12.125 - 1e-3, tq);
    float u = clamp((tq - 12.125) / 0.375, 0.0, 1.0);
    float dec = mix(1.0, 0.4, clamp((tq - 12.5) / 1.0, 0.0, 1.0)) * (1.0 - clamp((tq - 13.5) / 2.5, 0.0, 1.0));
    float ease = 1.0 - (1.0 - u) * (1.0 - u);
    float R = 0.48 * ease + 1e-3;
    vec2 q = (p - vec2(0.72, 0.31)) * vec2(1.78, 1.25);
    float f = cFbm(q * 6.0 + tq * 0.3);
    float r = length(q) * (1.0 + 0.18 * (f - 0.5));
    float rq = clamp((1.0 - r / R) * 1.1 * dec, 0.0, 1.0) * act;
    float lv = cAA(rq, 0.25) + cAA(rq, 0.50) + cAA(rq, 0.75);
    vec3 col = mix(vec3(0.333, 0.184, 0.114), vec3(0.851, 0.706, 0.541), lv / 3.0);
    c = mix(c, col, step(0.001, rq) * cAA(p.y, 0.225) * (0.45 + 0.15 * lv));
    float ring = length(vec2((p.x - 0.72) * 1.78 / (0.55 * ease + 0.01), (p.y - 0.232) / (0.06 * ease + 0.003))) - 1.0;
    return mix(c, vec3(0.851, 0.706, 0.541), cLine(ring, 3.0) * dec * act * 0.9);
  }`, "aotFootBurst(p, t)", {
    draws: "A puff of flat cream and umber steam in four bands bursts out of the tower where the foot lands, with a thin dust ring spreading along the ridge.",
    use: "plate",
    deps: ["cutKit", "aotTitanFoot"],
    params: "t: starts at 12.125 s (k3), radius 0.30 W by 12.5 s, density 1.0 to 0.4 by 13.5 s, gone by 16.0 s; 24 fps inside 12.0 to 12.5 s",
  });

export const aotDust = M("aotDust", "W9, E4 and E6 warm dust: 60 floating cream motes, plus 8 flat three-tone puffs kicked up at the seals' feet on each of 10 footfalls",
  `vec3 aotDust(vec2 p, float t){
    float st = (t >= 12.0 && t < 12.5) ? 24.0 : 12.0;
    float tq = floor(t * st + 1e-3) / st;
    vec3 c = aotFootBurst(p, t);
    vec3 cream = vec3(0.851, 0.706, 0.541);
    float fade = 1.0 - 0.65 * smoothstep(1.5, 2.5, tq);
    for (int i = 0; i < 60; i++) {
      float fi = float(i);
      vec2 h = cH22(vec2(fi + 1.0, 4.4));
      float y = 0.13 + 0.74 * fract(h.y + 0.027 * tq);
      float x = h.x + 0.01 * sin(fi + tq * 0.7);
      float rad = (2.0 + 1.0 * cH21(vec2(fi, 8.8))) / 800.0;
      c = mix(c, cream, cFill(length((p - vec2(x, y)) * vec2(1.78, 1.0)) - rad) * fade * 0.85);
    }
    float n = clamp(floor((tq - 2.1) / 0.8), 0.0, 9.0);
    float age = (tq - (2.1 + 0.8 * n)) / 0.4;
    float on = step(2.1 - 1e-3, tq) * step(0.0, age) * step(age, 1.0);
    for (int j = 0; j < 8; j++) {
      float fj = float(j);
      vec2 hj = cH22(vec2(fj + 3.0, n + 7.0));
      vec2 pc = vec2(0.24 + 0.34 * hj.x, 0.235 + 0.04 * age);
      float rad = 0.010 + 0.012 * age;
      vec3 pcol = hj.y < 0.33 ? vec3(0.549, 0.306, 0.161) : (hj.y < 0.66 ? vec3(0.700, 0.500, 0.350) : cream);
      c = mix(c, pcol, cFill(length((p - pc) * vec2(1.78, 1.0)) - rad) * on * (1.0 - age * age));
    }
    return c;
  }`, "aotDust(p, t)", {
    draws: "Tiny cream specks drift up through the hot light, and short kicks of brown and cream dust jump at the seals' feet each time a Titan steps.",
    use: "plate",
    deps: ["cutKit", "aotFootBurst"],
    params: "t: motes at full strength to 1.5 s then 35 percent, rising 0.02 H per second; puffs at 2.1 + 0.8 n s for n 0 to 9, rise 0.04 H in 0.4 s",
  });

export const aotGradeFrame = M("aotGradeFrame", "E1, E3, E19, E25 to E27 the frame and the grade in one post: 2.39:1 ink bars, iris on the hero, one cream kill flash at k3, split tone, grain on twos, luma cap 0.92, ink floor",
  `vec3 aotGradeFrame(vec3 c, vec2 p, float t){
    vec3 ink = vec3(0.102, 0.071, 0.047);
    float st = (t >= 12.0 && t < 12.5) ? 24.0 : 12.0;
    float tq = floor(t * st + 1e-3) / st;
    float t24 = floor(t * 24.0 + 1e-3) / 24.0;
    c = mix(c, vec3(0.957, 0.890, 0.722), step(12.125 - 1e-3, t24) * step(t24, 12.125 + 1e-3));
    float bar = 0.5 - 0.5 * 1.78 / 2.39;
    c = mix(ink, c, cAA(0.5 - abs(p.y - 0.5), bar));
    float eo = 0.5 - 0.5 * cos(3.14159 * clamp(tq, 0.0, 1.0));
    float uo = clamp((tq - 17.0) / 0.9167, 0.0, 1.0);
    float r = tq < 1.0 ? 2.1 * eo : (tq < 17.0 ? 2.1 : mix(2.1, 0.09, 0.5 - 0.5 * cos(3.14159 * uo)));
    float dI = length((p - vec2(0.30, 0.27)) * vec2(1.78, 1.0)) - r;
    c = mix(c, ink, 1.0 - cAA(-dI, 0.0));
    float Y = cLuma(c);
    vec3 sh = vec3(0.216, 0.129, 0.090);
    vec3 hi = vec3(0.718, 0.529, 0.392);
    c = mix(c, vec3(Y) * sh / cLuma(sh), (1.0 - smoothstep(0.05, 0.40, Y)) * 0.35);
    c = mix(c, vec3(Y) * hi / cLuma(hi), smoothstep(0.45, 0.85, Y) * 0.30);
    float g = cH21(gl_FragCoord.xy + 113.0 * floor(t * st + 1e-3)) - 0.5;
    c += 0.035 * g * (1.0 - Y) * smoothstep(0.06, 0.12, Y);
    c *= min(1.0, 0.92 / max(cLuma(c), 1e-4));
    return mix(ink, c, smoothstep(0.035, 0.08, cLuma(c)));
  }`, "aotGradeFrame(aotDust(p, t), p, t)", {
    draws: "Two solid dark-brown bars top and bottom, a circle of picture opening from the hero at the start and closing round the hero at the end, warm brown shadows with cream highlights, boiling grain, one flat cream flash frame.",
    use: "grade",
    deps: ["cutKit", "aotDust"],
    params: "c: the finished frame colour; t: iris opens 0 to 1.0 s and closes 17.0 to 18.0 s to a ring of radius 0.09 H, flash at 12.125 s, grain held per drawing (24 fps in 12.0 to 12.5 s); bars sized for 1.78 aspect",
  });

export const CUT_SHADERS = [
  aotSkyHot, aotWallBreak, aotTitanRows, aotTitanFace, aotSteamBands, aotRoofline, aotRidge,
  aotWatchers, aotHeroEren, aotTitanFoot, aotFootBurst, aotDust, aotGradeFrame,
];
export const CUT_SHADER_COUNT = 13;
if (CUT_SHADERS.length !== CUT_SHADER_COUNT) {
  throw new Error(`pr-mujoco-3396 cut pack: ${CUT_SHADERS.length} != ${CUT_SHADER_COUNT}`);
}
export default CUT_SHADERS;
