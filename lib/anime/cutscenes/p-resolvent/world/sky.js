// SKY: the baked, painted golden-hour dome (ref 06 + owner ref), with the unmaking hooks (uDim dusk, uCrack, uDis) patched into the
// dome's display shader. Baked ONCE over az [-3.2, 3.2], el [-0.25, 1.2]; the display shader samples it by view direction.
// Maths (all coordinates seamless in azimuth, so there is no seam behind the seal):
//   cyl(az, el) = (R cos az + K el, R sin az): a noise-plane point that is continuous round the circle; small R and big K stretch
//     every feature HORIZONTALLY, which is how clouds and ridges are painted (long flat bands).
//   gradient: horizon gold #f0b840 -> coral #da806a (el 0..0.10) -> violet #b47491 (0.08..0.5) -> teal #6fc4c0 (0.45..1.15), with the
//     elevation jittered 0.03 by brush mottle so the bands have painted edges instead of a smooth blend.
//   clouds: coverage smoothstep(0.55, 0.57, n) (a hard shape), lit where the field is steeper toward the lower neighbour (the sun face),
//     rose underside #d68fa0, NO gradient inside a cloud.
//   ridges i = 1..3: h_i(az) = base_i + amp_i ridged(cyl) + a serrated 0.003 conifer fringe; mist #be6443 sits above each ridge base.
import { glslFor } from "../../../tools/index.js";
import { C, SUN, V } from "./common.js";

const SKY = /* glsl */ `
  vec2 cyl(float az, float el, float R, float K) { return vec2(cos(az) * R + K * el, sin(az) * R); }
  float ridgeH(float az, float base, float amp, float R, float seed, float fringe) {
    float h = base + amp * ridged(vec2(cos(az), sin(az)) * R + seed);
    return h + fringe * step(0.5, fract(az * 140.0 + seed));                       // conifer serration on the near ridges
  }
  vec3 sky(float az, float el) {
    vec3 d = vec3(sin(az) * cos(el), sin(el), -cos(az) * cos(el));
    vec3 S = vec3(${SUN.x.toFixed(4)}, ${SUN.y.toFixed(4)}, ${SUN.z.toFixed(4)});
    float sd = acos(clamp(dot(d, S), -1.0, 1.0));
    float mott = fbm(cyl(az, el, 6.0, 55.0));                                      // brush mottle, 6 to 10 px
    float e2 = el + 0.03 * (mott - 0.5);
    vec3 c = mix(${V(C.gold)}, ${V(C.horizon)}, smoothstep(0.0, 0.10, e2));
    c = mix(c, ${V(C.mid)}, smoothstep(0.08, 0.5, e2));
    c = mix(c, ${V(C.zenith)}, smoothstep(0.45, 1.15, e2));
    c = mix(c, ${V(C.gold)}, exp(-sd * sd * 3.0) * 0.45 * (1.0 - smoothstep(0.0, 0.7, el)));      // warmth toward the sun
    c += ${V(C.sunHalo)} * exp(-sd * sd * 18.0) * 0.9;
    // clouds: flat shapes, sun face and rose underside
    vec2 cq = cyl(az, el, 1.8, 10.0);
    float n = fbm(warp(cq, 0.35)), n2 = fbm(warp(cyl(az, el - 0.03, 1.8, 10.0), 0.35));
    float m = smoothstep(0.55, 0.57, n) * smoothstep(0.12, 0.24, el) * (1.0 - smoothstep(0.95, 1.15, el));
    float lit = clamp(step(0.012, n2 - n) + step(0.66, n) * (1.0 - smoothstep(0.3, 1.2, sd)), 0.0, 1.0);
    c = mix(c, mix(${V(C.cloudUnder)}, ${V(C.cloudLit)}, lit), m);
    c += ${V(C.disc)} * 2.2 * (1.0 - smoothstep(0.045, 0.05, sd));
    // three ridges back to front, mist banks between
    float h1 = ridgeH(az, 0.075, 0.030, 2.2, 3.0, 0.0), h2 = ridgeH(az, 0.045, 0.025, 3.1, 11.0, 0.002), h3 = ridgeH(az, 0.020, 0.018, 4.3, 23.0, 0.004);
    c = mix(c, ${V(C.mist)}, 0.45 * (1.0 - smoothstep(h1, h1 + 0.05, el)));
    c = mix(c, mix(${V(C.ridge1)}, ${V(C.treeBody)}, 0.25 * smoothstep(h1 - 0.012, h1, el)), step(el, h1));
    c = mix(c, ${V(C.mist)}, 0.45 * (1.0 - smoothstep(h2, h2 + 0.04, el)) * step(h1, el + 0.01));
    c = mix(c, mix(${V(C.ridge2)}, ${V(C.treeBody)}, 0.30 * smoothstep(h2 - 0.01, h2, el)), step(el, h2));
    c = mix(c, ${V(C.mist)}, 0.4 * (1.0 - smoothstep(h3, h3 + 0.03, el)) * step(h2, el + 0.01));
    c = mix(c, mix(${V(C.ridge3)}, ${V(C.treeMid)}, 0.35 * smoothstep(h3 - 0.008, h3, el)), step(el, h3));
    c = mix(c, ${V(C.mist)}, step(el, 0.0) * 0.9);                                         // below the horizon, far past the court
    c *= 0.96 + 0.08 * mott;                                                              // brush grain
    return c;
  }`;

// the display shader: samples the bake by view direction and applies dusk, the island sky (dissolve) and the sky cracks
const DISPLAY = /* glsl */ `
  uniform sampler2D tSky; uniform vec2 uAz; uniform vec2 uEl; uniform float uCrack; uniform float uDis; uniform float uDim; uniform vec3 uSunDir;
  varying vec3 vD;
  void main() {
    vec3 d = normalize(vD);
    float az = atan(d.x, -d.z), el = asin(clamp(d.y, -1.0, 1.0));
    vec2 uv = vec2((az - uAz.x) / (uAz.y - uAz.x), (el - uEl.x) / (uEl.y - uEl.x));
    vec3 c = texture2D(tSky, clamp(uv, 0.0, 1.0)).rgb;
    float ang = acos(clamp(dot(d, uSunDir), -1.0, 1.0));
    vec2 q = vec2(az * 3.0, el * 6.0);
    // island sky: pale teal haze up to #6fc4c0, low flat cream clouds; the dome dissolves into it with a gold edge
    float ci = smoothstep(0.58, 0.6, fbm(vec2(az * 2.0, el * 9.0) + 5.0)) * smoothstep(0.1, 0.3, el);
    vec3 isl = mix(vec3(0.78, 0.92, 0.9), ${V(C.zenith)}, smoothstep(0.0, 0.8, el));
    isl = mix(isl, ${V(C.snow)}, ci * 0.8);
    float f = 0.6 * fbm(q + 3.0) + 0.4 * clamp(ang / 2.4, 0.0, 1.0), dd = uDis * 1.25 - 0.05;
    c = mix(c, isl, step(f, dd) * step(0.0001, uDis));
    c = mix(c, vec3(1.0, 0.78, 0.38) * 2.2, (1.0 - smoothstep(dd, dd + 0.03, f)) * step(dd, f) * step(0.0001, uDis));
    // cracks across the sky: the same two-layer Voronoi tree, reaching out from the sun by 2.2 uCrack radians
    if (uCrack > 0.0) {
      float grow = 1.0 - smoothstep(uCrack * 2.2 - 0.25, uCrack * 2.2, ang);
      vec2 p = vec2(az * 2.4, el * 4.2) + 0.25 * vec2(fbm(vec2(az, el) * 3.0), fbm(vec2(az, el) * 3.0 + 9.0));
      vec2 a = vor(p), b = vor(p * 2.7 + 7.0);
      float k = clamp((1.0 - smoothstep(0.0, 0.035, a.y)) + (1.0 - smoothstep(0.0, 0.026, b.y)) * step(0.45, h21(floor(p * 2.7 + 7.0))), 0.0, 1.0) * grow;
      float core = (1.0 - smoothstep(0.0, 0.012, a.y)) * grow;
      c = mix(c, ${V(C.kEdge)} * 1.2, k); c = mix(c, ${V(C.kGold)} * 1.8, core * step(0.5, k));
    }
    c *= mix(vec3(1.0), vec3(0.62, 0.5, 0.86), uDim * 0.7);
    gl_FragColor = vec4(c, 0.0);
  }`;

export function buildSky(ctx, U) {
  const az = [-3.2, 3.2], el = [-0.25, 1.2];
  const sky = ctx.bake.sky(SKY, { tools: ["noise"], az, el, pxPerRad: 620 });
  const m = sky.material;
  m.uniforms.uCrack = U.uCrack; m.uniforms.uDis = U.uDis; m.uniforms.uDim = U.uDim;
  m.uniforms.uSunDir = { value: SUN.clone() };
  m.fragmentShader = glslFor(["noise"]) + DISPLAY;
  m.needsUpdate = true;
  return sky;
}
