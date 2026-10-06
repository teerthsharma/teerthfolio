// spawn-seal WORLD: the painted far layers (plates and cards). All GLSL is hand-painted shapes: hard edges, posterised
// tones, no smooth gradients except the dusk ramp itself. Uses tools/noise.js (h21, fbm, vn, ridged, warp, ramp4, strokes).
import { PlaneGeometry } from "three";
import { V, C } from "./common.js";

// DUSK SKY (card space: x in [0,2], y in [0,1], horizon at hz).
//   ramp:   h = (y - hz)/(1 - hz);  t = h^0.6;  ramp4(t, #ffb35a, #ff7a3a, #7a3fa0, #1c2a8a)   (horizon glow to deep dusk)
//   sun:    g = exp(-|((p - sun) * (1, 2.2))| * 3.2), posterised to 4 steps, mixed 0.7 of #ffb35a
//   clouds: n = fbm(p * (3, 14) + warp); hard bank where n > 0.53; tone by a second fbm: lit #ffd27a, mid #ff7a3a, shade #8a3fa0
const DUSK = /* glsl */ `
  vec3 duskSky(vec2 p, float hz) {
    float h = clamp((p.y - hz) / (1.0 - hz), 0.0, 1.0);
    vec3 sky = ramp4(pow(h, 0.6), ${V("#ffb35a")}, ${V("#ff7a3a")}, ${V("#7a3fa0")}, ${V("#1c2a8a")});
    float g = exp(-length((p - vec2(1.0, hz + 0.05)) * vec2(1.0, 2.2)) * 3.2);
    sky = mix(sky, ${V("#ffb35a")}, floor(g * 4.0) / 4.0 * 0.7);
    vec2 q = warp(p * vec2(3.0, 14.0), 0.6);
    float n = fbm(q), n2 = fbm(q * 1.7 + 4.0);
    float bank = step(0.53, n) * smoothstep(0.02, 0.10, h) * (1.0 - smoothstep(0.55, 0.85, h));
    vec3 cl = n2 > 0.56 ? ${V("#ffd27a")} : (n2 > 0.44 ? ${V("#ff7a3a")} : ${V("#8a3fa0")});
    return mix(sky, cl, bank * 0.9);
  }`;

// the plate (screen space, baked per shot). In the cave it is the unseen void behind the walls (deep indigo with inked
// strata); outdoors (uOut = 1, the home shot) it is the dusk sky. uEat grows a hard void disc (the Predator eating the sky).
export const CAVE_PLATE = /* glsl */ `
  uniform float uOut; uniform float uEat;
  ${DUSK}
  vec3 paint(vec2 p) {
    float asp = uRes.x / uRes.y;
    vec3 outc = duskSky(vec2(p.x * 2.0 / asp, p.y), 0.30);
    vec2 w = warp(p * 3.0, 0.5);
    float cell = vor(p * 4.0).y;
    vec3 cave = mix(${V(C.abyss)}, ${V(C.ceil)}, smoothstep(0.0, 1.0, p.y));
    cave = mix(cave, ${V(C.wallMid)}, step(0.5, fbm(w * 1.3)) * 0.5);
    float strata = abs(sin((p.y * 14.0 + fbm(p * 4.0) * 2.0) * 3.14159));
    cave = mix(cave, ${V(C.ink)}, (1.0 - smoothstep(0.05, 0.09, strata)) * 0.8);
    cave = mix(cave, ${V(C.crack)}, (1.0 - smoothstep(0.04, 0.07, cell)) * 0.6);
    vec3 col = mix(cave, outc, uOut);
    float d = length((p - vec2(asp * 0.5, 0.65)) * vec2(1.0, 1.0));
    return mix(col, ${V(C.void)}, step(d, uEat * 1.7));
  }`;

// THE MOUTH PANORAMA CARD (3.2 + 3.11): a painted burning battlefield seen only through the arch, as through a window.
// Card space x in [0,2], y in [0,1], horizon at 0.28. Layers back to front:
//   dusk sky (above) -> far mountains #4a2a6a with a #8a3fa0 rim line -> mid ranks #33204e -> smoke columns #3a2040
//   -> the field (below the horizon): #3a2040 to #2a1830 with hash furrow strokes, fire teardrops (#ff5a1a, core #ffb35a)
//   -> broken standards (poles #1a1030, torn flags #8a3fa0). No silhouettes of soldiers: the victims are costumed seals.
export const MOUTH_CARD = /* glsl */ `
  ${DUSK}
  vec4 paint(vec2 p) {
    float hz = 0.28;
    vec3 col;
    if (p.y > hz) {
      col = duskSky(p, hz);
      float ridge = hz + 0.045 + 0.07 * ridged(vec2(p.x * 2.5, 0.3));
      float mid = hz + 0.016 + 0.030 * ridged(vec2(p.x * 5.0 + 3.0, 1.7));
      if (p.y < ridge) col = p.y > ridge - 0.006 ? ${V("#8a3fa0")} : ${V("#4a2a6a")};
      if (p.y < mid) col = p.y > mid - 0.004 ? ${V("#5a3a7a")} : ${V("#33204e")};
      for (int i = 0; i < 5; i++) {
        float fi = float(i), x = 0.3 + fi * 0.37 + (h21(vec2(fi, 3.0)) - 0.5) * 0.16, y = p.y - hz;
        float wid = 0.012 + y * (0.22 + 0.1 * h21(vec2(fi, 9.0)));
        float rag = (fbm(vec2(p.x * 9.0 + fi * 5.0, y * 10.0)) - 0.5) * 0.05;
        float body = step(abs(p.x - x + rag), wid) * step(y, 0.22 + 0.1 * h21(vec2(fi, 5.0))) * step(0.0, y);
        col = mix(col, ${V("#3a2040")}, body * 0.9);
      }
    } else {
      float d = (hz - p.y) / hz;
      col = mix(${V("#3a2040")}, ${V("#2a1830")}, smoothstep(0.0, 1.0, d));
      float st = strokes(vec2(p.x * 40.0, p.y * 90.0), 0.15, 2.0, 0.22);
      col = mix(col, ${V("#1a1030")}, step(0.55, st) * 0.45);
      vec2 q = vec2(p.x * 22.0, p.y * 46.0);
      vec2 id = floor(q), f = fract(q) - 0.5;
      float on = step(0.86, h21(id + 7.0)) * (1.0 - step(0.5, d) * 0.5);
      float tear = length(vec2(f.x * 1.5, f.y - 0.18 * f.x * f.x)) + max(0.0, f.y) * 0.5;
      col = mix(col, ${V("#ff5a1a")}, on * step(tear, 0.42));
      col = mix(col, ${V("#ffb35a")}, on * step(tear, 0.2));
    }
    for (int i = 0; i < 9; i++) {
      float fi = float(i), x = (fi + 0.5) / 9.0 * 2.0 + (h21(vec2(fi, 1.0)) - 0.5) * 0.15;
      float top = hz + 0.04 + 0.05 * h21(vec2(fi, 2.0)), bot = hz - 0.14 * h21(vec2(fi, 4.0));
      float pole = step(abs(p.x - x), 0.0025) * step(p.y, top) * step(bot, p.y);
      float fl = step(0.0, p.x - x) * step(p.x - x, 0.03) * step(top - 0.022, p.y) * step(p.y, top) * step(p.y - top + 0.022, (0.03 - (p.x - x)) * 0.7);
      col = mix(col, ${V("#1a1030")}, pole);
      col = mix(col, ${V("#8a3fa0")}, fl);
    }
    return vec4(col, 1.0);
  }`;

// OUTDOOR RIDGE CARD (home shot): three painted mountain ranges with coverage in alpha, haze-washed toward the dusk.
//   range k top = base_k + amp_k * ridged(x * f_k); colour #8a3fa0 (far) -> #5a3a7a -> #33204e (near); a thin lit rim #ff7a3a
export const RIDGE_CARD = /* glsl */ `
  vec4 paint(vec2 p) {
    float r1 = 0.40 + 0.28 * ridged(vec2(p.x * 1.6, 0.2));
    float r2 = 0.26 + 0.22 * ridged(vec2(p.x * 2.7 + 5.0, 1.1));
    float r3 = 0.12 + 0.16 * ridged(vec2(p.x * 4.4 + 9.0, 2.3));
    vec3 col = ${V("#8a3fa0")}; float a = step(p.y, r1);
    if (a > 0.5 && p.y > r1 - 0.008) col = ${V("#ff7a3a")};
    if (p.y < r2) { col = p.y > r2 - 0.008 ? ${V("#ff7a3a")} : ${V("#5a3a7a")}; a = 1.0; }
    if (p.y < r3) { col = p.y > r3 - 0.006 ? ${V("#8a3fa0")} : ${V("#33204e")}; a = 1.0; }
    return vec4(col, a);
  }`;
export const planeGeo = (w, h) => new PlaneGeometry(w, h);
