// SKY (bible 3.1): two painted domes baked ONCE (day cumulus, storm cloud deck), blended in the display shader by the storm front.
// DAY dome   zenith #1b57c8 -> mid #3f8ee8 -> horizon #bfe6ff, posterised cumulus heaps with a flat base, top lit #ffffff, base #8fb4e8,
//            a hard value cut between them, NO fbm mush; far islands hazed blue at the horizon (frame 06 / 04 blue sky with cumulus).
// STORM dome zenith #0a0f3a -> mid #1f2a78 -> horizon #3a4aa8, a spiral cloud deck round the zenith (the column's cloud), 3 posterised
//            tones #0e1650 / #1f2a78 / #3a4aa8, cyan rim #7fc8ff on the zenith-facing edge, torn slits of horizon light.
// Maths (all coordinates seamless in azimuth so there is no seam behind the seal):
//   cyl(az, el, R, K) = (R cos az + K el, R sin az): a noise-plane point continuous round the circle; large K stretches features
//     horizontally (brush strokes), small R makes long banks.
//   cumulus deck(base, hgt, R): n = fbm(R (cos az, sin az) + seed); h = hgt smoothstep(0.38, 0.75, n) is the heap height; the crown is
//     scalloped by 0.18 hgt |sin(5 R az + 6 fbm)|; the cloud is {base < el < base + h + scallop}; t = (el - base)/(top - base);
//     lit = step(0.28 + 0.22 fbm2, t): the flat base stays cool, the ragged cut above it is hard (a value cut, never a gradient).
//   spiral: th = az + 2.6 r with r = pi/2 - el (angle from the zenith); q = 1.7 (cos th, sin th) + (2.4 r, 0); n = fbm(warp(q)).
//     tones by n: [0.50, 0.58) shadow, [0.58, 0.68) body, >= 0.68 lit; rim where n(r + 0.03) < 0.5 <= n(r).
//   display: the storm FRONT: key o = 0.6 (1 - el/1.3) + 0.4 fbm(az 2, el 3); the storm shows where o < 1.3 uStorm - 0.1 (a ragged edge
//     sweeps from the zenith to the horizon), edged by a 1.5% hard strip #cfe6ff. Day clouds drift 0.4 deg/s (0.007 rad/s) on world
//     time, storm clouds turn 0.35 rad/s weighted by smoothstep(0.1, 0.6, el) (a shear, so the horizon deck holds still).
//   bruise: a hard torn band #2b2a6b at el 0.10 (the Focalor strike sky), mix amount 0.9 uViolet. Flash: += #cfe6ff 22% on the 4 frame events.
import { glslFor } from "../../../tools/index.js";
import { C, V } from "./common.js";

const DAY = /* glsl */ `
  vec2 cyl(float az, float el, float R, float K) { return vec2(cos(az) * R + K * el, sin(az) * R); }
  vec4 deck(float az, float el, float base, float hgt, float R, float seed) {
    vec2 q = vec2(cos(az), sin(az)) * R + seed;
    float n = fbm(q);
    float h = hgt * smoothstep(0.38, 0.75, n);
    float scal = 0.18 * hgt * abs(sin(az * R * 5.0 + 6.0 * fbm(q * 2.0 + seed)));
    float top = base + h + scal * step(0.001, h);
    float inside = step(base, el) * step(el, top) * step(0.001, h);
    float t = (el - base) / max(top - base, 1e-4);
    float n2 = fbm(q * 3.0 + vec2(el * 18.0, seed));
    float lit = step(0.28 + 0.22 * n2, t);
    return vec4(inside, lit, t, 0.0);
  }
  vec3 sky(float az, float el) {
    float mott = fbm(cyl(az, el, 6.0, 55.0));
    float e2 = el + 0.02 * (mott - 0.5);
    vec3 c = mix(${V(C.dayHorizon)}, ${V(C.dayMid)}, smoothstep(0.0, 0.35, e2));
    c = mix(c, ${V(C.dayZenith)}, smoothstep(0.3, 1.0, e2));
    c = mix(c, ${V("#5fb5d8")}, smoothstep(0.0, -0.04, el));                      // distant sea haze below the horizon
    // the low sun (top-left, behind the lens): a hard disc and a warm halo, only seen when the camera turns round
    vec3 d = vec3(sin(az) * cos(el), sin(el), -cos(az) * cos(el));
    vec3 S = normalize(vec3(-0.5, 0.72, 0.46));
    float sd = acos(clamp(dot(d, S), -1.0, 1.0));
    c += ${V("#fff0c8")} * (exp(-sd * sd * 14.0) * 0.55 + (1.0 - smoothstep(0.05, 0.056, sd)) * 1.6);
    // far islands: hazed blue silhouettes, hard top edge
    float hr = 0.010 + 0.034 * smoothstep(0.55, 0.78, fbm(vec2(cos(az), sin(az)) * 2.5 + 9.0)) + 0.004 * step(0.5, fract(az * 60.0));
    c = mix(c, ${V("#7fb8d8")}, step(0.0, el) * step(el, hr) * step(0.02, hr));
    // three cumulus decks, far to near: flat base #8fb4e8, lit crown #ffffff
    vec4 a = deck(az, el, 0.030, 0.17, 1.6, 3.0);  c = mix(c, mix(${V("#a8c8f0")}, ${V(C.cumLit)} * 0.97, a.y), a.x);
    vec4 b = deck(az, el, 0.100, 0.34, 1.2, 11.0); c = mix(c, mix(${V(C.cumShade)}, ${V(C.cumLit)}, b.y), b.x);
    vec4 f = deck(az, el, 0.420, 0.10, 2.6, 23.0); c = mix(c, mix(${V(C.cumShade)}, ${V(C.cumLit)}, f.y), f.x);
    return c * (0.97 + 0.06 * mott);
  }`;

const STORM = /* glsl */ `
  vec3 sky(float az, float el) {
    vec3 c = mix(${V(C.stormHorizon)}, ${V(C.stormMid)}, smoothstep(0.0, 0.3, el));
    c = mix(c, ${V(C.stormZenith)}, smoothstep(0.25, 1.2, el));
    float r = 1.5708 - el, th = az + 2.6 * r;
    vec2 q = vec2(cos(th), sin(th)) * 1.7 + vec2(r * 2.4, 0.0);
    float n = fbm(warp(q, 0.4));
    float th2 = az + 2.6 * (r + 0.03);
    float n2 = fbm(warp(vec2(cos(th2), sin(th2)) * 1.7 + vec2((r + 0.03) * 2.4, 0.0), 0.4));
    float m = step(0.50, n), rim = m * (1.0 - step(0.50, n2));
    vec3 cl = mix(${V(C.deepNavy)}, ${V(C.stormMid)}, step(0.58, n));
    cl = mix(cl, ${V(C.stormHorizon)}, step(0.68, n));
    c = mix(c, cl, m * smoothstep(0.02, 0.16, el + 0.3));
    c = mix(c, ${V(C.rim)}, rim * 0.9);
    // torn slits of horizon light between the banks (the Focalor tear)
    float tear = step(0.94, ridged(vec2(az * 2.0, el * 7.0) + 4.0)) * smoothstep(0.03, 0.12, el) * (1.0 - smoothstep(0.45, 0.8, el));
    c = mix(c, ${V(C.rim)} * 1.1, tear * 0.8);
    c = mix(c, ${V(C.deepNavy)}, smoothstep(0.0, -0.05, el));
    return c;
  }`;

const DISPLAY = /* glsl */ `
  uniform sampler2D tSky; uniform sampler2D tStorm; uniform vec2 uAz; uniform vec2 uEl;
  uniform float uStorm; uniform float uViolet; uniform float uStrike; uniform float uFlash; uniform float uTw;
  varying vec3 vD;
  float wrapA(float a) { return mod(a + 3.14159265, 6.2831853) - 3.14159265; }
  void main() {
    vec3 d = normalize(vD);
    float az = atan(d.x, -d.z), el = asin(clamp(d.y, -1.0, 1.0));
    float ad = wrapA(az + 0.007 * uTw);
    float as = wrapA(az + 0.35 * uTw * smoothstep(0.1, 0.6, el));
    vec2 uvD = vec2((ad - uAz.x) / (uAz.y - uAz.x), (el - uEl.x) / (uEl.y - uEl.x));
    vec2 uvS = vec2((as - uAz.x) / (uAz.y - uAz.x), (el - uEl.x) / (uEl.y - uEl.x));
    vec3 day = texture2D(tSky, clamp(uvD, 0.0, 1.0)).rgb, st = texture2D(tStorm, clamp(uvS, 0.0, 1.0)).rgb;
    float o = 0.6 * (1.0 - el / 1.3) + 0.4 * fbm(vec2(az * 2.0, el * 3.0) + 2.0);
    float dd = 1.3 * uStorm - 0.1, w = fwidth(o) * 0.8 + 1e-4;
    float inS = (1.0 - smoothstep(dd - w, dd + w, o)) * step(0.001, uStorm);
    float edge = inS * (1.0 - (1.0 - smoothstep(dd - 0.015 - w, dd - 0.015 + w, o)));
    vec3 c = mix(day, st, inS);
    c = mix(c, ${V(C.flash)}, edge * 0.85);
    // the strike sky: a hard torn bruise-violet band low on the horizon, with a cyan lip
    float band = step(0.45, fbm(vec2(az * 2.0, el * 14.0) + 6.0)) * smoothstep(0.0, 0.03, el) * (1.0 - smoothstep(0.13, 0.20, el));
    float lip = band * (1.0 - step(0.45, fbm(vec2(az * 2.0, el * 14.0 + 0.25) + 6.0)));
    c = mix(c, ${V(C.bruise)}, uViolet * band * 0.9);
    c = mix(c, ${V(C.rim)}, uViolet * lip * 0.7);
    c += ${V(C.flash)} * 0.22 * uFlash;
    c += vec3(0.62, 0.8, 1.0) * 0.38 * uStrike * exp(-max(el, 0.0) * 2.2);
    gl_FragColor = vec4(c, 0.0);
  }`;

export function buildSky(ctx, U) {
  const o = { tools: ["noise"], az: [-3.2, 3.2], el: [-0.3, 1.5708], pxPerRad: 560 };
  const day = ctx.bake.sky(DAY, o), storm = ctx.bake.sky(STORM, o);
  const m = day.material;
  m.uniforms.tStorm = { value: storm.material.uniforms.tSky.value };
  for (const k of ["uStorm", "uViolet", "uStrike", "uFlash", "uTw"]) m.uniforms[k] = U[k];
  m.fragmentShader = glslFor(["noise"]) + DISPLAY;
  m.needsUpdate = true;
  storm.material.dispose(); storm.geometry.dispose();
  const dispose = () => { m.dispose(); day.geometry.dispose(); day.userData.target?.dispose(); storm.userData.target?.dispose(); };
  return { mesh: day, dispose };
}
