// FRIEREN (Madhouse), golden hour. Target: style-refs/_owner/frieren-madhouse.webp. Sampled:
// slope olive #978753, sunlit slope #de9368, sky glow #fdd9ac, rock light #f8d4b3 / shadow
// lavender, mist #fad8b6..#f1d6cf, line plum #4e2e3b. A BG painter's order: sky, slope in
// big value groups with grass strokes, pale rocks with cast shadows and thin warm line,
// foreground tufts, the stone ledge, mist, then a golden glaze toward the sun.
import { V } from "../paint.js";

export default /* glsl */ `
  const vec2 SUN = vec2(1.36, 1.04);
  vec3 sky(vec2 p) {
    float d = length(p - SUN);
    vec3 c = ramp4(smoothstep(0.0, 1.0, d), ${V("#ffe6b8")}, ${V("#f8b890")}, ${V("#dfa2b4")}, ${V("#b0a6d8")});
    vec2 q = warp(p * vec2(2.2, 7.0) + vec2(0.0, 2.0), 0.55);
    float f = fbm(q), cl = smoothstep(0.54, 0.6, f);
    float lit = step(fbm(q - vec2(0.35, 0.5)), f);
    c = mix(c, mix(${V("#c98aa6")}, ${V("#ffd7a8")}, lit), cl * 0.8);
    return c + ${V("#fff0c8")} * exp(-d * 6.0) * 1.4;
  }
  float ridge(float x) { return 1.08 - 0.22 * x + 0.03 * (fbm(vec2(x * 5.0, 1.3)) - 0.5); }
  vec3 slope(vec2 p) {
    vec2 g = p * vec2(2.4, 4.2);
    float h = fbm(g), hx = fbm(g + vec2(0.03, 0.0)) - h, hy = fbm(g + vec2(0.0, 0.03)) - h;
    float lam = clamp(0.5 + (hx * 0.8 + hy * 0.6) * 18.0, 0.0, 1.0);
    float sunk = smoothstep(1.25, 0.15, length(p - SUN));
    float cs = smoothstep(0.42, 0.6, fbm(p * vec2(1.4, 2.6) + 4.0));      // a cloud shadow sweeping the slope
    float v = 0.22 + 0.3 * lam + 0.5 * sunk - 0.2 * cs;
    // grass as painted strokes: two scales, finer toward the ridge (perspective); dark gaps between
    float sc = mix(1.0, 0.45, smoothstep(0.3, 1.0, p.y));
    float st = strokes(p, 1.4 + 0.08 * (vn(p * 5.0) - 0.5), 0.07 * sc, 0.013 * sc);
    float st2 = strokes(p + 0.37, 1.3 + 0.08 * (vn(p * 7.0) - 0.5), 0.045 * sc, 0.008 * sc);
    v += (st - 0.5) * 0.38 + (st2 - 0.5) * 0.22;
    vec3 c = ramp4(v, ${V("#3c5532")}, ${V("#6e8a40")}, ${V("#b2a052")}, ${V("#f6a46e")});
    c = mix(c, ${V("#f2c6a0")}, smoothstep(0.6, 1.0, p.y) * 0.3 * (0.4 + sunk));
    vec2 fc = p * 85.0, fi = floor(fc);
    float fl = step(0.94, h21(fi)) * (1.0 - smoothstep(0.12, 0.3, length(fract(fc) - 0.5 - (h22(fi) - 0.5) * 0.4)));
    c = mix(c, ${V("#8d7fe0")}, fl * smoothstep(0.8, 0.45, p.y) * 0.85);
    return c;
  }
  vec3 rock(vec3 c, vec2 p, vec2 ctr, vec2 r, float seed) {
    float d = max(blob(p, ctr, r, 0.45), (ctr.y - r.y * 0.5 + 0.012 * (vn(p * 60.0) - 0.5)) - p.y);  // seated in the grass
    float sh = aaf(blob(p, ctr + vec2(-0.3, -0.5) * r, r * vec2(1.15, 0.6), 0.3));
    float inside = aaf(d);
    c = mix(c, c * vec3(0.6, 0.58, 0.78), sh * 0.55 * (1.0 - inside));
    if (inside <= 0.0) return c;
    // form: a squat dome with a flattened, sunlit top plane; values posterised soft into three
    vec2 q = (p - ctr) / r;
    vec3 n = normalize(vec3(q.x, q.y * 1.6 + 0.35, sqrt(max(0.05, 1.0 - dot(q, q)))));
    float lit = dot(n, normalize(vec3(0.6, 0.75, 0.35))) + (fbm(p * 24.0 + seed) - 0.5) * 0.45;
    vec3 rc = mix(${V("#9d8fc0")}, ${V("#d9c8dc")}, smoothstep(0.05, 0.2, lit));
    rc = mix(rc, ${V("#f9e6dc")}, smoothstep(0.42, 0.55, lit));
    rc = mix(rc, ${V("#ffcda0")}, smoothstep(0.75, 0.95, lit) * 0.6);
    rc *= 0.93 + 0.12 * fbm(p * 70.0 + seed);
    vec2 vv = vor(p * 24.0 + seed);
    rc = mix(rc, ${V("#8a7cae")}, (1.0 - smoothstep(0.0, 0.05, vv.y)) * 0.3 * step(0.55, h21(floor(p * 24.0 + seed))));
    c = mix(c, rc, inside);
    float line = (1.0 - smoothstep(0.0, fwidth(d) * 1.6, abs(d))) * (0.45 + 0.55 * step(0.35, vn(p * 40.0 + seed)));
    return mix(c, ${V("#6e4a4e")}, line * 0.6);
  }
  // a tuft of painted blades leaning in the wind, lit gold on the sun side
  vec3 tuft(vec3 c, vec2 p, vec2 base, float h, float seed) {
    for (int k = 0; k < 14; k++) {
      float fk = float(k), a = (h21(vec2(fk, seed)) - 0.5) * 1.1 + 0.15, L = h * (0.55 + 0.45 * h21(vec2(seed, fk)));
      vec2 b = base + vec2((h21(vec2(fk + 3.0, seed)) - 0.5) * h * 0.5, 0.0);
      float t = (p.y - b.y) / (L * cos(a));
      if (t < 0.0 || t > 1.0) continue;
      float cx = b.x + sin(a) * t * L + 0.35 * sign(a) * t * t * L;
      float wdt = 0.011 * (1.0 - t) + 0.0008, dx = p.x - cx;
      float m = 1.0 - smoothstep(wdt - fwidth(p.x), wdt + fwidth(p.x), abs(dx));
      vec3 bc = mix(${V("#2c4524")}, ${V("#5d7a34")}, t);
      bc = mix(bc, ${V("#e8c06c")}, step(0.0, dx) * smoothstep(0.2, 0.9, t) * 0.75);
      c = mix(c, bc, m);
    }
    return c;
  }
  vec3 ledge(vec3 c, vec2 p) {
    float top = 0.25 - 0.045 * p.x + 0.015 * (fbm(vec2(p.x * 7.0, 2.0)) - 0.5);
    float face = top - 0.1 + 0.03 * fbm(vec2(p.x * 5.0, 5.0));
    if (p.y > top + 0.004) return c;
    float wash = fbm(p * vec2(8.0, 16.0));
    vec3 lc = p.y > face ? mix(${V("#e9d6e0")}, ${V("#fbe8de")}, smoothstep(face, top, p.y) * 0.6 + wash * 0.4)
                         : mix(${V("#9d8fbf")}, ${V("#c8b6d6")}, wash * 0.8 + smoothstep(face - 0.2, face, p.y) * 0.3);
    lc = mix(lc, ${V("#ffd6b0")}, smoothstep(0.6, 1.4, p.x) * 0.25 * step(face, p.y));
    vec2 vv = vor(p * vec2(9.0, 14.0) + 3.0);
    lc = mix(lc, ${V("#8576aa")}, (1.0 - smoothstep(0.0, 0.035, vv.y)) * 0.35);
    float edge = 1.0 - smoothstep(0.0, 0.004, abs(p.y - face));
    lc = mix(lc, ${V("#6e4a4e")}, edge * 0.35);
    return mix(c, lc, 1.0 - smoothstep(top - 0.003, top + 0.003, p.y));
  }
  vec3 paint(vec2 p) {
    float r = ridge(p.x), aa = fwidth(p.y) * 1.5;
    vec3 c = mix(slope(p), sky(p), smoothstep(r - aa, r + aa, p.y));
    c = rock(c, p, vec2(0.1, 0.93), vec2(0.17, 0.07), 1.0);
    c = rock(c, p, vec2(0.36, 0.975), vec2(0.08, 0.035), 2.0);
    c = rock(c, p, vec2(0.62, 0.79), vec2(0.06, 0.03), 3.0);
    c = rock(c, p, vec2(0.45, 0.42), vec2(0.09, 0.045), 9.0);
    c = rock(c, p, vec2(0.85, 0.36), vec2(0.13, 0.06), 10.0);
    c = rock(c, p, vec2(1.17, 0.86), vec2(0.075, 0.03), 4.0);
    c = rock(c, p, vec2(0.98, 0.66), vec2(0.04, 0.017), 5.0);
    c = rock(c, p, vec2(0.24, 0.6), vec2(0.035, 0.015), 6.0);
    c = rock(c, p, vec2(0.02, 0.6), vec2(0.11, 0.06), 7.0);
    c = rock(c, p, vec2(1.32, 0.52), vec2(0.06, 0.024), 8.0);
    c = tuft(c, p, vec2(0.05, 0.23), 0.24, 1.0);
    c = tuft(c, p, vec2(0.19, 0.24), 0.15, 2.0);
    c = tuft(c, p, vec2(1.33, 0.18), 0.22, 3.0);
    c = tuft(c, p, vec2(0.78, 0.22), 0.08, 4.0);
    // the foreground stones they sit on: a rubble of big rounded rocks
    c = rock(c, p, vec2(0.12, 0.13), vec2(0.26, 0.12), 11.0);
    c = rock(c, p, vec2(0.55, 0.11), vec2(0.3, 0.11), 12.0);
    c = rock(c, p, vec2(1.0, 0.12), vec2(0.28, 0.12), 13.0);
    c = rock(c, p, vec2(1.38, 0.09), vec2(0.2, 0.1), 14.0);
    // mist off the water, lavender to peach toward the sun
    float mist = smoothstep(0.13, -0.02, p.y + 0.05 * (fbm(p * vec2(4.0, 9.0) + uTime * 0.0) - 0.5));
    c = mix(c, mix(${V("#eadcf0")}, ${V("#fbe0c8")}, smoothstep(0.2, 1.4, p.x)), mist * 0.85);
    // golden glaze toward the sun, pastel lift in the shadows
    float g = exp(-length(p - SUN) * 1.4);
    c = mix(c, c * ${V("#ffc890")} * 1.35, g * 0.6);
    c += ${V("#ff8a50")} * exp(-length(p - SUN) * 3.2) * 0.35;           // the low sun's orange bloom
    c = mix(c, ${V("#f4c4b4")}, 0.12);                                     // pastel pink air
    c = max(c, ${V("#3a3048")} * 0.9);
    return c;
  }
`;
