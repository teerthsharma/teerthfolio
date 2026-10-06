// p-faraday WORLD: the painted GLSL. Every shader's maths is written out beside it.
import { V } from "../../../paint.js";
import { MOON, GLOW_AZ } from "./layout.js";

// ---- NIGHT SKY (baked dome, sky(az, el); direction = (sin az cos el, sin el, -cos az cos el)) ----
// gradient: g = (clamp(el / 1.15, 0, 1))^0.62, colour = ramp3(g, horizon #ff5a9d, mid #4a2bc8, zenith #0a1a66)
// city glow: horizon band exp(-el/0.07), strongest at az = GLOW_AZ with gaussian width exp(-da^2 / 0.5); core #ff8ab5
// wisps: 3 thin horizontals at el .32/.51/.70: w = exp(-((el-e0)/0.012)^2) * smoothstep(.45,.7,fbm), mixed to #2a2f9a at 20 percent
// stars: ~14 four-point crosses: a cell grid of 8 cells/rad, a cell holds a star with p = 0.023, cross = arm along each axis
//        (thin axis 0.0025 rad, long axis 0.014 rad = 9 px at 640 px/rad), value 0.95 (never blooms)
// moon: q = (dAz cos el, el - MEL); disc where |q| < R; hard crescent shadow lower right where |q - (-.3R, .3R)| > R; 3 craters;
//       cyan halo ring at 1.35 R (value 1.1); outer glow #b6ecff 25 percent, exp(-(|q|-R)/(2R))
// dither: +-0.5/255 from a hash, so the gradient never bands
export const SKY = /* glsl */ `
  float wrapd(float a) { return mod(a + 3.14159265, 6.2831853) - 3.14159265; }
  vec3 sky(float az, float el) {
    float e = max(el, 0.0);
    float g = pow(clamp(e / 1.15, 0.0, 1.0), 0.62);
    vec3 c = ramp3(g, ${V("#ff5a9d")}, ${V("#4a2bc8")}, ${V("#0a1a66")});
    float da = wrapd(az - ${GLOW_AZ.toFixed(3)});
    float glow = exp(-e / 0.07) * (0.45 + 0.55 * exp(-da * da / 0.5));
    c = mix(c, ${V("#ff8ab5")}, clamp(glow, 0.0, 1.0) * 0.75);
    for (int k = 0; k < 3; k++) {
      float e0 = 0.32 + 0.19 * float(k);
      float w = exp(-pow((el - e0) / 0.012, 2.0)) * smoothstep(0.45, 0.7, fbm(vec2(az * 3.0 + float(k) * 5.0, el * 40.0)));
      c = mix(c, ${V("#2a2f9a")}, 0.2 * w);
    }
    if (el < 0.0) c = mix(${V("#ff5a9d")} * 0.5, ${V("#0a1a66")} * 0.6, smoothstep(0.0, -0.35, el));
    vec2 sp = vec2(az, el) * 8.0, sc = floor(sp), sf = fract(sp) - 0.5;
    float has = step(h21(sc + 3.7), 0.023) * step(0.06, el);
    vec2 jit = (h22(sc + 9.1) - 0.5) * 0.5, d = abs(sf - jit) / 8.0;
    float cr = max(step(d.x, 0.0025) * step(d.y, 0.014), step(d.y, 0.0025) * step(d.x, 0.014));
    c = mix(c, ${V("#fff8e0")} * 0.95, has * cr);
    vec2 q = vec2(wrapd(az - ${MOON.az.toFixed(4)}) * cos(el), el - ${MOON.el.toFixed(4)});
    float R = ${MOON.r.toFixed(4)}, L = length(q);
    float disc = step(L, R);
    vec3 m = ${V("#fff0c8")};
    float crater = step(length(q - vec2(-0.30, 0.25) * R), 0.22 * R) + step(length(q - vec2(0.25, 0.20) * R), 0.14 * R) + step(length(q - vec2(-0.1, -0.45) * R), 0.18 * R);
    m = mix(m, ${V("#e6d3a0")}, clamp(crater, 0.0, 1.0));
    m = mix(m, ${V("#d9c28a")}, step(R, length(q - vec2(-0.3, 0.3) * R)));
    c += ${V("#b6ecff")} * 0.25 * exp(-max(L - R, 0.0) / (2.0 * R)) * (1.0 - disc);
    c = mix(c, m * 1.1, disc);
    c = mix(c, ${V("#7fe4ff")} * 1.1, 0.6 * (1.0 - smoothstep(0.0, 0.003, abs(L - 1.35 * R))));
    return c + (h21(vec2(az, el) * 1731.3) - 0.5) / 255.0;
  }`;

// ---- SKYLINE CARD (a ring of towers, baked; paint(p) rgba; p.x in [0, asp] around the ring, p.y in [0, 1] up) ----
// three sub-layers k = 0..2 (far to near), each a row of slots of width w_k = W (1 + .45 k); a slot id gives a tower:
//   height = .14 + hmax (.2 + .8 r1^1.6)(1 - .18 k); fill width .5 + .4 r2; the top 22 percent steps back to .6 of the width (setback #1a1f6a)
// colour = mix(far #2a2f9a, near #3b3fbe, k/2); right 40 percent of the block takes the violet half (x [.72 .62 1.0]) = the 2-tone
// windows: cell (cx, cy) in card units, 60 x 50 percent of a cell is glass; r = hash(cell): r < .4 lit #ffe9a8, < .5 #e8f3ff, else dark
export function skylineCard({ seed, W, cx, cy, hmax, aspect, sign = false }) {
  const s = seed.toFixed(1);
  return /* glsl */ `
  vec4 paint(vec2 p) {
    if (p.y < 0.14) return vec4(${V("#14186a")}, 1.0);
    vec3 col = vec3(0.0); float cov = 0.0;
    for (int k = 0; k < 3; k++) {
      float fk = float(k);
      float w = ${W.toFixed(4)} * (1.0 + 0.45 * fk);
      float x = p.x + fk * 0.37 * w;
      float id = floor(x / w), lx = fract(x / w);
      float r1 = h21(vec2(id, fk + ${s})), r2 = h21(vec2(id + 7.0, fk * 3.1 + ${s}));
      float hgt = 0.14 + ${hmax.toFixed(3)} * (0.2 + 0.8 * pow(r1, 1.6)) * (1.0 - 0.18 * fk);
      float fill = 0.5 + 0.4 * r2;
      bool top = p.y > 0.14 + (hgt - 0.14) * 0.78;
      float fw = top ? fill * 0.6 : fill;
      float x0 = (1.0 - fw) * 0.5;
      if (lx > x0 && lx < x0 + fw && p.y < hgt) {
        vec3 tone = mix(${V("#2a2f9a")}, ${V("#3b3fbe")}, fk / 2.0);
        if (top) tone = mix(tone, ${V("#1a1f6a")}, 0.7);
        if (lx > x0 + fw * 0.6) tone *= vec3(0.72, 0.62, 1.0);
        vec2 cell = vec2(x / ${cx.toFixed(5)}, p.y / ${cy.toFixed(5)}), cf = fract(cell);
        float glass = step(0.2, cf.x) * step(cf.x, 0.8) * step(0.25, cf.y) * step(cf.y, 0.75);
        float r = h21(floor(cell) + id * 3.7 + ${s});
        vec3 wc = r < 0.4 ? ${V("#ffe9a8")} : (r < 0.5 ? ${V("#e8f3ff")} : tone * 0.7);
        col = mix(tone, wc * (0.7 + 0.3 * fk / 2.0), glass);
        cov = 1.0;
      }
    }
    ${sign ? `
    // the 'Level 5' rank sign (right third): a magenta plate carrying five pale pips
    vec2 sq = (p - vec2(${(aspect * 0.72).toFixed(3)}, 0.55)) / vec2(0.07, 0.03);
    if (abs(sq.x) < 1.0 && abs(sq.y) < 1.0) { col = ${V("#ff5a9d")}; for (int i = 0; i < 5; i++) col = mix(col, ${V("#fff8e0")}, step(length(sq - vec2(-0.7 + 0.35 * float(i), 0.0)), 0.13)); cov = 1.0; }` : ""}
    return vec4(col, cov);
  }`;
}

// ---- FLAT-BAND WATER (world-space; the river plane) ----
// n = fbm(warp(vec2(x .06 + scroll, z .15))) posterised into 3 bands: base #062a4a / band #0a5a7a / lit #0e7a92 (scroll 0.2 m/s on threes)
// reflection streaks stretched along z: s = fbm(vec2(x .9, z .08)) > .62 -> teal #10c9b0, masked toward the bridge, smoothstep(14, 2, |z|)
// bank glow: gold windows #ffb347 at 30 percent in the 8 m nearest each bank
// ripple ink lines: v = 9 n, d = |fract v - .5|, a 1.5 px line as d -> .5, #28d7ff at 30 percent
// the bridge's cel shadow: the deck strip projected along the moon key by (+8.5, +7.9) m, darkened toward #1c356b at 60 percent
// the beam's reflection: a gold streak along z = beam z, from x0 to x0 + head, ragged by noise, core value 1.15; uGold ramps it in and settles
export const RIVER_FRAG = /* glsl */ `
  uniform float uT; uniform float uGold; uniform float uBeamZ; uniform vec2 uX; // uX: x0, head
  varying vec3 vW;
  void main() {
    vec2 q = vec2(vW.x * 0.06 + uT * 0.012, vW.z * 0.15);
    float n = fbm(warp(q, 0.4));
    float band = floor(n * 3.0 + 0.2);
    vec3 c = band < 1.0 ? ${V("#062a4a")} : (band < 2.0 ? ${V("#0a5a7a")} : ${V("#0e7a92")});
    float az = abs(vW.z);
    float s = fbm(vec2(vW.x * 0.9 + uT * 0.2, vW.z * 0.08));
    c = mix(c, ${V("#10c9b0")}, step(0.62, s) * smoothstep(14.0, 2.0, az) * 0.8);
    c = mix(c, ${V("#ffb347")}, 0.3 * step(0.6, fbm(vec2(vW.x * 1.3, vW.z * 0.2))) * smoothstep(8.0, 0.0, 20.0 - az));
    float v = n * 9.0, d = abs(fract(v) - 0.5), fw = fwidth(v);
    c = mix(c, ${V("#28d7ff")}, 0.3 * smoothstep(0.5 - 1.5 * fw, 0.5, d));
    vec2 sh = vW.xz - vec2(8.5, 7.9);
    float inSh = step(abs(sh.y), 3.3) * step(-22.0, sh.x) * step(sh.x, 28.0);
    c = mix(c, ${V("#1c356b")}, 0.6 * inSh);
    float rag = (fbm(vec2(vW.x * 1.7 - uT * 3.0, 3.0)) - 0.5) * 0.7;
    float w = 0.45 + 0.25 * uGold;
    float bz = abs(vW.z - uBeamZ) + rag;
    float on = step(uX.x, vW.x) * step(vW.x, uX.x + uX.y) * step(0.001, uGold);
    float core = (1.0 - smoothstep(w * 0.4, w * 0.5, bz)) * on * uGold, body = (1.0 - smoothstep(w, w * 1.1, bz)) * on * uGold;
    c = mix(c, ${V("#ffb347")}, body * 0.9);
    c = mix(c, ${V("#ffd23a")} * 1.15, core);
    gl_FragColor = vec4(c, 0.5);
  }`;

// ---- GLASS SLAB (the substation platform) ----
// base = mix(#0d3d7a, #7fd8ff, .55); two-step cel on N . key (hue-shifted violet shadow); hard diagonal stripe
// s = fract((x + .7 z) .18) < .04 -> #e8f3ff; the fields light it from below: three hard radial bands of uUnder;
// the top rim is a 1.5 px #fff3d0 line
export const GLASS_FRAG = /* glsl */ `
  uniform vec3 uUnder; uniform vec3 uKey;
  varying vec3 vW; varying vec3 vN; varying vec3 vP;
  void main() {
    vec3 base = mix(${V("#0d3d7a")}, ${V("#7fd8ff")}, 0.55);
    float nl = dot(normalize(vN), normalize(uKey));
    vec3 c = nl > 0.15 ? base : base * vec3(0.62, 0.55, 0.95);
    float r = length(vW.xz - vec2(2.5, 0.0)) / 6.0;
    float bandg = 1.0 - clamp(floor(r * 3.0) / 3.0, 0.0, 1.0);
    c += uUnder * bandg * 0.55;
    float s = fract((vW.x + vW.z * 0.7) * 0.18);
    c = mix(c, ${V("#e8f3ff")}, step(s, 0.04) * step(0.5, vN.y));
    float rim = max(step(5.8 - 0.07, abs(vP.x)), step(1.95 - 0.07, abs(vP.z))) * step(0.5, vN.y);
    c = mix(c, ${V("#fff3d0")}, rim);
    gl_FragColor = vec4(c, 0.45);
  }`;

export const FLAT_VERT = /* glsl */ `
  varying vec3 vW; varying vec3 vN; varying vec3 vP;
  void main() { vP = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w; }`;
