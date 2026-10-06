// p-nerve WORLD: every shader, with its maths written out beside it. Colours via V() are the bible's hexes.
import { V } from "../../../paint.js";

const S = (n) => n.toFixed(4);

// =============================================================== NIGHT CLOUD CEILING (baked dome, sky(az, el))
// q = (az * 1.4, el * 3.0)                          cloud plane
// d = stormDensB(q, 0.04)                           boiling density from tools/storm.js, 0..1
// g = exp(-max(el, 0) / 0.30)                       city underglow falls off with height
// v = g * (0.30 + 0.75 * (1 - 0.65 d))              clouds block the glow: dense = dark
// tone = (celStep(v,.25)+celStep(v,.50)+celStep(v,.75)) / 3   FOUR flat posterised bands, pixel-wide AA edge
// colour = ramp4(tone, #07070d, #1a1220, #5a2f2a, #e8a23a)
// line: |d - .5| < fwidth(d)   one 1 px painted cloud edge  (#07070d at 70 percent)
// rim: d * (1 - dens(q + (0, .035)))  the top edge of each billow takes cool teal #2f7f86 at 22 percent
// below the horizon: a flat amber city-glow band to #1a1220
export const SKY = /* glsl */ `
  vec3 sky(float az, float el) {
    float e = max(el, -0.2);
    vec2 q = vec2(az * 1.4, e * 3.0);
    float d = stormDensB(q, 0.04);
    float g = exp(-max(el, 0.0) / 0.30);
    float v = g * (0.30 + 0.75 * (1.0 - 0.65 * d));
    float tone = (celStep(v, 0.25) + celStep(v, 0.50) + celStep(v, 0.75)) / 3.0;
    vec3 c = ramp4(tone, ${V("#07070d")}, ${V("#1a1220")}, ${V("#5a2f2a")}, ${V("#e8a23a")});
    float fw = fwidth(d) * 1.1 + 0.002;
    float line = 1.0 - smoothstep(0.0, fw, abs(d - 0.5));
    c = mix(c, ${V("#07070d")}, 0.7 * line * step(0.02, d));
    float rim = d * (1.0 - stormDensB(q + vec2(0.0, 0.035), 0.04));
    c = mix(c, ${V("#2f7f86")}, 0.22 * celStep(rim, 0.45) * step(0.25, el));
    if (el < 0.0) c = mix(${V("#5a2f2a")}, ${V("#1a1220")}, smoothstep(0.0, -0.25, el));
    return c + (h21(vec2(az, el) * 1731.3) - 0.5) / 255.0;
  }`;

// =============================================================== SKYLINE CARD (baked; p.x in [0, asp] around the ring, p.y in [0,1] up)
// three sub-layers k = 0..2 (far to near); slot id = floor(x / w); r1 -> height, r2 -> fill width; the top 20 percent steps back
// body: left 65 percent #14131c, right 35 percent #0b0a12 (2-tone, one hard shadow edge); 1 px edge line #0b0e10
// windows: cell grid (cx, cy); hard rect 56 x 56 percent; r < .32 lit #f3c871, r < .36 cyan #7fd0d6 (1.1 = soft bloom), else tower*0.7
// haze: far rings pull toward blue-grey #1a2230 by `haze`; rim: the left edge takes teal #2f7f86 for one slot-fraction
export function skylineCard({ seed, W, cx, cy, hmax, haze }) {
  const s = seed.toFixed(1);
  return /* glsl */ `
  vec4 paint(vec2 p) {
    if (p.y < 0.10) return vec4(mix(${V("#0b0a12")}, ${V("#5a2f2a")}, smoothstep(0.1, 0.0, p.y) * 0.5), 1.0);
    vec3 col = vec3(0.0); float cov = 0.0;
    for (int k = 0; k < 3; k++) {
      float fk = float(k);
      float w = ${S(W)} * (1.0 + 0.4 * fk);
      float x = p.x + fk * 0.37 * w;
      float id = floor(x / w), lx = fract(x / w);
      float r1 = h21(vec2(id, fk + ${s})), r2 = h21(vec2(id + 7.0, fk * 3.1 + ${s}));
      float hgt = 0.10 + ${S(hmax)} * (0.25 + 0.75 * pow(r1, 1.5)) * (1.0 - 0.15 * fk);
      float fill = 0.55 + 0.35 * r2;
      bool top = p.y > 0.10 + (hgt - 0.10) * 0.8;
      float fw = top ? fill * 0.62 : fill;
      float x0 = (1.0 - fw) * 0.5;
      if (lx > x0 && lx < x0 + fw && p.y < hgt) {
        vec3 tone = ${V("#14131c")};
        if (lx > x0 + fw * 0.65) tone = ${V("#0b0a12")};
        vec2 cell = vec2(x / ${S(cx)}, p.y / ${S(cy)}), cf = fract(cell);
        float glass = step(0.22, cf.x) * step(cf.x, 0.78) * step(0.22, cf.y) * step(cf.y, 0.78);
        float r = h21(floor(cell) + id * 3.7 + ${s});
        vec3 wc = r < 0.32 ? ${V("#f3c871")} * 1.08 : (r < 0.36 ? ${V("#7fd0d6")} * 1.1 : tone * 0.7);
        vec3 c = mix(tone, wc, glass);
        c = mix(c, ${V("#2f7f86")}, 0.5 * (1.0 - smoothstep(0.0, 0.05, lx - x0)));
        float edge = min(lx - x0, x0 + fw - lx) * ${S(W)} * (1.0 + 0.4 * fk);
        c = mix(${V("#0b0e10")}, c, smoothstep(0.0, ${S(W * 0.012)}, edge) * smoothstep(0.0, 0.004, hgt - p.y));
        col = mix(c, ${V("#1a2230")}, ${S(haze)} * (0.6 + 0.2 * fk) / 1.6);
        cov = 1.0;
      }
    }
    return vec4(col, cov);
  }`;
}

// =============================================================== REALM SKY GAP (layer-1 card, 44 m square facing the seal)
// p = (uv - .5) * 44 m; R = 11 uOpen; rim radius Rr = R (1 + jag(ang)), jag = .10 sin(7a+1.3) + .07 sin(13a+seed) + .05 (h(cell)-.5)
// monochrome plate: 3 flat greys by t = r/Rr (hard bands) + 24 radial streaks (white 30 percent, narrowing outward, re-rolled on twos)
// white core t < .1; broken bones (distance to segments); a dead tree #20201c; THREE apples #c91a14 (the only colour)
// rim: ink #0b0e10, everything beyond Rr + 0.15 discarded
export const REALM_FRAG = /* glsl */ `
  uniform float uOpen; uniform float uT; uniform float uSeed; varying vec2 vUv;
  float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float seg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
  void main() {
    vec2 p = (vUv - 0.5) * 44.0;
    float R = 11.0 * uOpen;
    if (R < 0.05) discard;
    float r = length(p), ang = atan(p.y, p.x);
    float jag = 0.10 * sin(7.0 * ang + 1.3) + 0.07 * sin(13.0 * ang + uSeed) + 0.05 * (h21(vec2(floor(ang * 9.0), uSeed)) - 0.5);
    float Rr = R * (1.0 + jag);
    if (r > Rr + 0.15) discard;
    float t = r / Rr;
    float aa = fwidth(r) + 1e-4;
    vec3 grey = t < 0.35 ? ${V("#8f8d86")} : (t < 0.7 ? ${V("#4a4a46")} : ${V("#1a1a18")});
    float sector = ang / 6.2831853 * 24.0 + 0.37 * floor(uT * 12.0);
    float sd = abs(fract(sector) - 0.5);
    float streak = step(sd, 0.10 * (1.0 - t) + 0.015) * step(0.5, h21(vec2(floor(sector), 3.1)));
    grey = mix(grey, vec3(1.0), 0.30 * streak);
    vec2 u = p / R; float bd = 9.0;
    bd = min(bd, seg(u, vec2(-0.7, -0.5), vec2(-0.2, -0.25)));
    bd = min(bd, seg(u, vec2(-0.2, -0.25), vec2(0.05, -0.32)));
    bd = min(bd, seg(u, vec2(0.45, -0.6), vec2(0.7, -0.15)));
    bd = min(bd, seg(u, vec2(-0.55, 0.45), vec2(-0.3, 0.7)));
    bd = min(bd, seg(u, vec2(0.3, 0.55), vec2(0.6, 0.35)));
    bd = min(bd, seg(u, vec2(-0.1, 0.62), vec2(0.15, 0.78)));
    float ua = aa / R;
    grey = mix(grey, ${V("#1a1a18")}, 1.0 - smoothstep(0.05, 0.05 + ua, bd));
    grey = mix(grey, ${V("#8f8d86")}, 1.0 - smoothstep(0.035, 0.035 + ua, bd));
    float td = seg(u, vec2(0.0, -1.0), vec2(0.02, 0.05)) - (0.05 - 0.03 * clamp((u.y + 1.0) / 1.05, 0.0, 1.0));
    td = min(td, seg(u, vec2(0.02, 0.05), vec2(-0.35, 0.45)) - 0.018);
    td = min(td, seg(u, vec2(0.0, -0.2), vec2(0.4, 0.2)) - 0.02);
    td = min(td, seg(u, vec2(0.01, -0.05), vec2(-0.42, 0.12)) - 0.015);
    grey = mix(grey, ${V("#20201c")}, 1.0 - smoothstep(0.0, ua, td));
    vec2 ap[3]; ap[0] = vec2(-0.35, 0.38); ap[1] = vec2(0.4, 0.14); ap[2] = vec2(-0.42, 0.06);
    for (int i = 0; i < 3; i++) {
      vec2 q = (u - ap[i]) / 0.075; float L = length(q);
      float disc = 1.0 - smoothstep(1.0 - ua / 0.075, 1.0 + ua / 0.075, L);
      vec3 a = ${V("#c91a14")};
      a = mix(a, ${V("#7a0d0f")}, step(0.0, dot(q, vec2(0.7, -0.5)) + 0.25));
      a = mix(a, ${V("#ff6a5a")}, step(length(q - vec2(-0.4, 0.45)), 0.2));
      grey = mix(grey, a, disc);
    }
    grey = mix(grey, vec3(1.0), 1.0 - smoothstep(0.1, 0.12, t));
    float rim = 1.0 - smoothstep(0.0, aa * 1.5 + 0.1, abs(r - Rr));
    grey = mix(grey, ${V("#0b0e10")}, rim);
    gl_FragColor = vec4(grey, 0.5);
  }`;

// =============================================================== SHATTER (the world breaks into flat falling shards)
// per-triangle: c = triangle centre (aShard), h = hash(c); t = max(0, uShat - 0.5 h)   staggered start
// rotate (w - c) about a random axis by ang = t (2 + 6 h2) (Rodrigues); drift = (h - .5) 2 t, (h2 - .5) 2 t; fall = -4.5 t^2
export const SHATTER_DECL = /* glsl */ `
  attribute vec3 aShard; uniform float uShat;
  vec3 shatterWP(vec3 w, vec3 c) {
    if (uShat <= 0.0) return w;
    float h = fract(sin(dot(c, vec3(12.9898, 78.233, 37.719))) * 43758.5453), h2 = fract(h * 57.31);
    float t = max(0.0, uShat - 0.5 * h);
    vec3 ax = normalize(vec3(h - 0.5, h2 - 0.5, fract(h * 91.7) - 0.5) + vec3(1e-3));
    float ang = t * (2.0 + 6.0 * h2), ca = cos(ang), sa = sin(ang);
    vec3 v = w - c;
    v = v * ca + cross(ax, v) * sa + ax * dot(ax, v) * (1.0 - ca);
    return c + v + vec3((h - 0.5) * 2.0, 0.0, (h2 - 0.5) * 2.0) * t - vec3(0.0, 4.5 * t * t, 0.0);
  }`;

// =============================================================== PAINTED TOWER FACES (own flat material)
// face tangent T = normalize((-N.z, 0, N.x)); window cell = (dot(P, T) / 1.25, P.y / 1.6); hard rect 56 x 56 percent
// r = hash(cell): r < .30 lit #f3c871 (1.08, soft bloom), r < .34 cyan #7fd0d6, else body * 0.7
// body 2-tone: faces toward +x darker (the one hard shadow side); roofs #1d1b24
// haze: toward #1a2230 by smoothstep(40, 160, distance) * 0.55
export const TOWER_VERT = /* glsl */ `${SHATTER_DECL}
  varying vec3 vWP; varying vec3 vN;
  void main() {
    vec3 w = (modelMatrix * vec4(position, 1.0)).xyz;
    w = shatterWP(w, aShard);
    vWP = w; vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
  }`;
export const TOWER_FRAG = /* glsl */ `
  varying vec3 vWP; varying vec3 vN; uniform float uWin; uniform vec3 uBody;
  float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  void main() {
    vec3 N = normalize(vN);
    vec3 body = N.x > 0.2 ? uBody * 0.55 : uBody;
    if (N.y > 0.5) body = ${V("#1d1b24")};
    vec3 T = normalize(vec3(-N.z, 0.0, N.x) + vec3(1e-4, 0.0, 0.0));
    vec2 cell = vec2(dot(vWP, T) / 1.25, vWP.y / 1.6), cf = fract(cell);
    float glass = step(0.22, cf.x) * step(cf.x, 0.78) * step(0.22, cf.y) * step(cf.y, 0.78) * step(abs(N.y), 0.5) * uWin;
    float r = h21(floor(cell) + floor(vWP.x * 0.01) * 3.1 + vec2(floor(vWP.z), 0.0));
    vec3 wc = r < 0.30 ? ${V("#f3c871")} * 1.08 : (r < 0.34 ? ${V("#7fd0d6")} * 1.1 : body * 0.7);
    vec3 c = mix(body, wc, glass);
    float hz = smoothstep(40.0, 160.0, length(vWP - cameraPosition)) * 0.55;
    c = mix(c, ${V("#1a2230")}, hz);
    gl_FragColor = vec4(c, 0.5);
  }`;

// flat lit colour (value may exceed 1 to bloom): gl_FragColor = (uCol * uK, 0.5); shatter-aware, instancing-aware
export const FLAT_FRAG = /* glsl */ `uniform vec3 uCol; uniform float uK; void main() { gl_FragColor = vec4(uCol * uK, 0.5); }`;
export const FLAT_VERT = /* glsl */ `${SHATTER_DECL}
  void main() {
    #ifdef USE_INSTANCING
      mat4 im = instanceMatrix;
    #else
      mat4 im = mat4(1.0);
    #endif
    vec3 w = (modelMatrix * im * vec4(position, 1.0)).xyz;
    w = shatterWP(w, aShard);
    gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
  }`;

// =============================================================== BROADCAST SCREENS (layer 1, self-lit)
// frame: bezel outside |p - .5|inf > .46 in #14131c. Before uCut: kind 0 a news graphic (pale field #cfe8ea, red tag block, lower-third bar,
// a ticker rule that scrolls on threes); kind 1 MISA: flat painted panel, twin pigtails, skin #f0dcc2, hair #d8b45a, black collar.
// After uCut: the torn chip-bag page: foil #c9cdd1 over flat crumple facets (voronoi cell, tone steps of 1/3), red stripe #b3171f, one hard white glint.
export const SCREEN_VERT = /* glsl */ `${SHATTER_DECL}
  varying vec2 vUv;
  void main() { vUv = uv; vec3 w = (modelMatrix * vec4(position, 1.0)).xyz; w = shatterWP(w, aShard); gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`;
export const SCREEN_FRAG = /* glsl */ `
  uniform float uCut; uniform float uKind; uniform float uT; varying vec2 vUv;
  float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  vec2 h22(vec2 p) { float a = h21(p); return vec2(a, h21(p + a + 17.0)); }
  float box(vec2 p, vec2 c, vec2 hs, float aa) { vec2 d = abs(p - c) - hs; return 1.0 - smoothstep(-aa, aa, max(d.x, d.y)); }
  float ell(vec2 p, vec2 c, vec2 r, float aa) { return 1.0 - smoothstep(-aa, aa, length((p - c) / r) - 1.0); }
  void main() {
    vec2 p = vUv; float aa = fwidth(p.x) * 1.2 + 1e-4;
    vec3 col = ${V("#cfe8ea")} * 0.85;
    if (uKind < 0.5) {
      col = mix(col, ${V("#14131c")}, box(p, vec2(0.5, 0.14), vec2(0.46, 0.07), aa));
      col = mix(col, ${V("#b3171f")}, box(p, vec2(0.14, 0.82), vec2(0.09, 0.06), aa));
      col = mix(col, ${V("#7fa4a6")}, box(p, vec2(0.58, 0.55), vec2(0.30, 0.22), aa));
      float sc = fract(p.x * 3.0 - floor(uT * 8.0) * 0.12);
      col = mix(col, ${V("#f4efe3")}, box(vec2(sc, p.y), vec2(0.5, 0.14), vec2(0.18, 0.012), aa));
    } else {
      col = ${V("#cfe8ea")} * 0.7;
      col = mix(col, ${V("#d8b45a")}, max(ell(p, vec2(0.27, 0.40), vec2(0.07, 0.20), aa), ell(p, vec2(0.73, 0.40), vec2(0.07, 0.20), aa)));
      col = mix(col, ${V("#14131c")}, box(p, vec2(0.5, 0.12), vec2(0.30, 0.12), aa));
      col = mix(col, ${V("#d8b45a")}, ell(p, vec2(0.5, 0.60), vec2(0.20, 0.16), aa));
      col = mix(col, ${V("#f0dcc2")}, ell(p, vec2(0.5, 0.48), vec2(0.17, 0.22), aa));
      col = mix(col, ${V("#d8b45a")}, box(p, vec2(0.5, 0.64), vec2(0.17, 0.04), aa));
      col = mix(col, ${V("#2b1b10")}, max(ell(p, vec2(0.44, 0.50), vec2(0.022, 0.035), aa), ell(p, vec2(0.56, 0.50), vec2(0.022, 0.035), aa)));
      col = mix(col, vec3(1.0), max(ell(p, vec2(0.437, 0.515), vec2(0.008, 0.012), aa), ell(p, vec2(0.557, 0.515), vec2(0.008, 0.012), aa)));
      col = mix(col, ${V("#b3171f")}, ell(p, vec2(0.5, 0.40), vec2(0.03, 0.012), aa));
    }
    if (uCut > 0.5) {
      vec2 q = p * vec2(3.2, 2.0); vec2 v = vec2(8.0); vec2 id = vec2(0.0);
      vec2 i = floor(q), f = fract(q);
      for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(x, y); float d = length(g + h22(i + g) - f); if (d < v.x) { v = vec2(d, v.x); id = i + g; } }
      float tone = floor(h21(id) * 3.0) / 3.0;
      vec3 foil = mix(${V("#565c64")}, ${V("#c9cdd1")}, 0.4 + 0.6 * tone);
      foil = mix(foil, ${V("#b3171f")}, box(p, vec2(0.5, 0.5), vec2(0.5, 0.075), aa));
      foil = mix(foil, vec3(1.0), box(p, vec2(0.3 + 0.2 * tone, 0.8), vec2(0.07, 0.012), aa) * 0.9);
      col = foil;
    }
    col = mix(col, ${V("#14131c")}, step(0.46, max(abs(p.x - 0.5), abs(p.y - 0.5))));
    gl_FragColor = vec4(col, 0.5);
  }`;

// =============================================================== PUDDLE (layer 1): planar-flip reflection with ripple lines
// V = normalize(P - cam); R = (V.x, -V.y, V.z) mirror about the water plane.
// sources, value x 0.5 over #0b0e10, mixed at 40 percent: city underglow band (cel, 3 tones), the floodlight (hard disc, angle .036),
// the three screens (angular rectangles), Ryuk (dark angular ellipse + two yellow eyes).
// ripples: 3 drops per puddle, ring radius = phase * .5, phase = fract(0.9 uT + k/3), ring width 0.025; uT is the stepped clock (twos);
// the ring also tilts R by its slope. rim: a 1 px wet cut #8d9498 at the edge.
export const PUDDLE_VERT = /* glsl */ `${SHATTER_DECL}
  varying vec2 vUv; varying vec3 vWP;
  void main() { vUv = uv; vec3 w = (modelMatrix * vec4(position, 1.0)).xyz; vWP = w; w = shatterWP(w, aShard); gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`;
export const PUDDLE_FRAG = /* glsl */ `
  uniform float uT; uniform vec3 uKey; uniform vec3 uScr[3]; uniform vec2 uScrHS[3]; uniform vec3 uRyuk; varying vec2 vUv; varying vec3 vWP;
  float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  vec2 h22(vec2 p) { float a = h21(p); return vec2(a, h21(p + a + 17.0)); }
  float wrapd(float a) { return mod(a + 3.14159265, 6.2831853) - 3.14159265; }
  void main() {
    vec2 q = (vUv - 0.5) * 2.0; float rq = length(q);
    if (rq > 1.0) discard;
    vec3 V = normalize(vWP - cameraPosition);
    vec3 R = vec3(V.x, -V.y, V.z);
    float ring = 0.0; vec2 sl = vec2(0.0);
    for (int k = 0; k < 3; k++) {
      vec2 c = (h22(vec2(float(k) * 3.7, floor(vWP.x * 3.0))) - 0.5) * 1.2;
      float ph = fract(0.9 * uT + float(k) * 0.33), rad = ph * 0.5;
      float d = length(q - c) - rad;
      float rr = 1.0 - smoothstep(0.0, 0.025 + fwidth(d), abs(d));
      ring += rr * (1.0 - ph); sl += normalize(q - c + vec2(1e-4)) * rr * (1.0 - ph) * 0.04;
    }
    R = normalize(R + vec3(sl.x, 0.0, sl.y));
    float g = exp(-max(R.y, 0.0) / 0.3);
    vec3 refl = mix(${V("#07070d")}, ${V("#5a2f2a")}, step(0.22, g));
    refl = mix(refl, ${V("#e8a23a")}, step(0.55, g));
    vec3 dk = normalize(uKey - vWP);
    refl = mix(refl, ${V("#fff6e0")} * 1.1, 1.0 - smoothstep(0.034, 0.038, acos(clamp(dot(R, dk), -1.0, 1.0))));
    for (int i = 0; i < 3; i++) {
      vec3 d = uScr[i] - vWP; float L = length(d);
      float ha = abs(wrapd(atan(R.x, -R.z) - atan(d.x, -d.z))), va = abs(asin(clamp(R.y, -1.0, 1.0)) - asin(clamp(d.y / L, -1.0, 1.0)));
      refl = mix(refl, ${V("#cfe8ea")} * 0.95, step(ha, uScrHS[i].x / L) * step(va, uScrHS[i].y / L));
    }
    vec3 dr = uRyuk - vWP; float Lr = length(dr);
    float hr = wrapd(atan(R.x, -R.z) - atan(dr.x, -dr.z)) / (0.5 / Lr), vr = (asin(clamp(R.y, -1.0, 1.0)) - asin(clamp(dr.y / Lr, -1.0, 1.0))) / (1.0 / Lr);
    refl = mix(refl, ${V("#0a0a0c")}, 1.0 - smoothstep(0.95, 1.05, length(vec2(hr, vr))));
    refl = mix(refl, ${V("#e8d04a")}, step(length(vec2(abs(hr) - 0.35, vr - 0.55)), 0.12));
    vec3 col = mix(${V("#0b0e10")}, refl * 0.5 + vec3(ring * 0.22), 0.4);
    col = mix(col, ${V("#8d9498")}, (1.0 - smoothstep(0.0, 0.05 + fwidth(rq), 1.0 - rq)) * 0.6);
    gl_FragColor = vec4(col, 0.5);
  }`;

// =============================================================== CRACK WEB (layer 1, a dome at R 140 about the origin)
// d = normalize(P); frame (a, b) around c = direction of the first screen; rho = acos(d . c), ang = atan(d.b, d.a)
// 22 rays: s = ang N / 2pi; arc distance da = |fract(s + wob) - .5| (2pi / N) rho, wob = (vn(rho 9, s) - .5) .8 (jagged)
// ray length = uCrack 2.2 (.6 + .8 h(s)); 5 jagged ring arcs at rho = .14 k; core disc r < .05 uCrack
// white lines over a darker backing #0b0e10; alpha = coverage
export const CRACK_FRAG = /* glsl */ `
  uniform float uCrack; uniform vec3 uC; varying vec3 vWP;
  float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
  void main() {
    if (uCrack <= 0.0) discard;
    vec3 d = normalize(vWP);
    vec3 a = normalize(cross(vec3(0.0, 1.0, 0.0), uC)), b = cross(uC, a);
    float rho = acos(clamp(dot(d, uC), -1.0, 1.0)), ang = atan(dot(d, b), dot(d, a));
    float N = 22.0, s = ang / 6.2831853 * N;
    float wob = (vn(vec2(rho * 9.0, floor(s))) - 0.5) * 0.8;
    float da = abs(fract(s + wob) - 0.5) * (6.2831853 / N) * rho;
    float len = uCrack * 2.2 * (0.6 + 0.8 * h21(vec2(floor(s + wob + 0.5), 5.0)));
    float w = 0.0018 + fwidth(da);
    float ray = (1.0 - smoothstep(w, w * 1.6, da)) * step(rho, len);
    float rd = 9.0;
    for (int k = 1; k <= 5; k++) {
      float rr = 0.14 * float(k) + (vn(vec2(ang * 3.0, float(k))) - 0.5) * 0.04;
      float on = step(0.45, h21(vec2(floor(s * 0.5 + float(k)), 9.0))) * step(rr, len);
      rd = min(rd, mix(9.0, abs(rho - rr), on));
    }
    float ringc = 1.0 - smoothstep(w, w * 1.6, rd);
    float core = 1.0 - smoothstep(0.045 * uCrack, 0.05 * uCrack + 0.003, rho);
    float line = max(ray, ringc);
    float back = (1.0 - smoothstep(w * 1.6, w * 2.6, da)) * step(rho, len);
    vec3 col = mix(${V("#0b0e10")}, vec3(1.0), max(line, core));
    float cov = max(max(line, back * 0.9), core);
    gl_FragColor = vec4(col, cov);
  }`;

// =============================================================== GAUGE GLASS (layer 1)
// tube: #bfe8ea at 22 percent; two hard highlight strips at uv.x .18-.24 and .30-.33 (angle round the tube, fixed toward the key);
// both ends capped in ink #1c1816; uDie greys the glass when its hypothesis dies
export const GLASS_FRAG = /* glsl */ `
  varying vec2 vUv; uniform float uDie;
  void main() {
    float s = max(step(0.18, vUv.x) * step(vUv.x, 0.24), step(0.30, vUv.x) * step(vUv.x, 0.33));
    vec3 c = mix(${V("#bfe8ea")}, vec3(1.0), s * 0.9);
    float a = 0.22 + 0.55 * s;
    c = mix(c, ${V("#6b7a80")}, uDie * 0.6);
    float cap = clamp(step(vUv.y, 0.02) + step(0.98, vUv.y), 0.0, 1.0);
    c = mix(c, ${V("#1c1816")}, cap); a = max(a, cap);
    gl_FragColor = vec4(c, a);
  }`;

// =============================================================== BEAD (layer 1): 2-tone sphere, hard glint
// n.l with l = (-.5, .7, .6): core #d9efff above .55 else #4aa8ff; hard glint where n.l > .93; value uK (dead .45, live 1.0, flare 1.6)
export const BEAD_FRAG = /* glsl */ `
  varying vec3 vN; uniform float uK; uniform vec3 uDead; uniform float uDeadAmt;
  void main() {
    vec3 n = normalize(vN); float nl = dot(n, normalize(vec3(-0.5, 0.7, 0.6)));
    vec3 c = nl > 0.55 ? ${V("#d9efff")} : ${V("#4aa8ff")};
    c = nl > 0.93 ? vec3(1.0) : c;
    c = mix(c, uDead, uDeadAmt);
    gl_FragColor = vec4(c * uK, 0.5);
  }`;
export const BEAD_VERT = /* glsl */ `varying vec3 vN; void main() { vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
export const UV_VERT = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
