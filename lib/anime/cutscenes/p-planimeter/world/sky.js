// E1 SKY: the golden-hour dome (baked once) and the far painted cards seen through the windows.
//
// MATHS (comments carry the shader maths, as the brief asks):
//   direction -> (az, el): az = atan(x, -z), el = asin(y). The dome is baked over az in [-3.0, 1.0], el in [-0.25, 1.05].
//   gradient  g(el) = mix(low, horizon, S(-0.05, 0.10, el)) then mix(.., top, S(0.10, 0.80, el)),  S = smoothstep
//             top #f9dabb, horizon glow #ffd98a, low #eed192 (sampled from 03-ep008-077).
//   sun       d = | ( (az - az_s) cos(el), el - el_s ) |   (angular distance, small-angle)
//             core = 1 - S(0.043, 0.049, d) -> #fff4c8 x 1.35 (the one thing that blooms),
//             halo = 2 hard bands (d < 0.17: +0.07, d < 0.30: +0.04) of #fff0b8, a posterised glow, never a smooth blob.
//   clouds    D(u) = fbm(u) + 0.62 - 1.7 el  with u = (az*3.1, el*9.5) warped by 0.35 fbm; coverage m = S(0.50, 0.515, D).
//             Sunward sample D2 = D(u + s*0.07), s = unit(sun - here). Lit side: L = clamp((D - D2) * 9 + 0.5, 0, 1).
//             body = mix(shade #f0b7a0, lit #fae3b9, step(0.5, L)); pink rim where D in (0.50, 0.545): #f2a3a0.
//             Two bands only (cel), edges bleed through the plate's Kuwahara pass.
import { V } from "../../../paint.js";
import { SUN, P } from "./kit.js";

export function buildSky(ctx) {
  const body = /* glsl */ `
  const float SAZ = ${SUN.az.toFixed(4)};
  const float SEL = ${SUN.el.toFixed(4)};
  float cloudD(vec2 u, float el) {
    vec2 w = warp(u * 0.9, 0.35) / 0.9;
    return fbm(w * vec2(1.0, 1.55)) + 0.62 - 1.7 * el;
  }
  vec3 sky(float az, float el) {
    vec3 top = ${V("#f9dabb")}, hor = ${V(P.glow)}, low = ${V("#eed192")};
    vec3 col = mix(low, hor, smoothstep(-0.05, 0.10, el));
    col = mix(col, top, smoothstep(0.10, 0.80, el));
    vec2 sp = vec2((az - SAZ) * cos(el), el - SEL);
    float d = length(sp);
    // posterised halo bands around the sun
    col += ${V(P.coreRay)} * (0.07 * (1.0 - smoothstep(0.17, 0.175, d)) + 0.04 * (1.0 - smoothstep(0.30, 0.305, d)));
    // cumulus banks, low on the horizon, thinning upward
    vec2 u = vec2(az * 3.1, el * 9.5);
    float D = cloudD(u, el);
    vec2 sd = normalize(vec2(SAZ - az, (SEL - el) * 2.6) + 1e-4);
    float D2 = cloudD(u + sd * 0.07 * vec2(1.0, 1.0), el);
    float m = smoothstep(0.50, 0.515, D) * smoothstep(-0.06, 0.02, el);
    float L = clamp((D - D2) * 9.0 + 0.5, 0.0, 1.0);
    vec3 cb = mix(${V("#f0b7a0")}, ${V("#fae3b9")}, step(0.5, L));
    float rim = smoothstep(0.50, 0.505, D) - smoothstep(0.535, 0.55, D);
    cb = mix(cb, ${V("#f2a3a0")}, rim * 0.65);
    cb = mix(cb, ${V(P.sunCore)}, (1.0 - smoothstep(0.0, 0.25, d)) * 0.30 * step(0.5, L));
    col = mix(col, cb, m * 0.92);
    // the sun itself, drawn last and emissive (values above 1 bloom)
    float core = 1.0 - smoothstep(0.043, 0.049, d);
    col = mix(col, ${V(P.sunCore)} * 1.35, core);
    // below the horizon the plate warms toward the street haze
    col = mix(col, ${V("#e9b27c")}, smoothstep(0.0, -0.22, el) * 0.7);
    return col;
  }`;
  const dome = ctx.bake.sky(body, { az: [-3.0, 1.0], el: [-0.25, 1.05], pxPerRad: 900, tools: ["noise"] });
  dome.userData.layer = 0;
  return dome;
}
