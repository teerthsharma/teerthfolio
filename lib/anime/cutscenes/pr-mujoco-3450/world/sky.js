// THE SKY DOME (baked once, layer 0): bible E01 "soft painted sky behind", E13 "blue plate behind the hole", E17.
// What it shows: overcast haze at the horizon (blue-tinted #8d95ad, never white) with posterised cloud banks in three flat
// steps; ABOVE the deck's edge a clean blue gap ramp (#6aa3e0 -> #3e7fd0 -> #2c53af at the zenith) that is only ever seen
// through the torn hole; a hard-edged sun disc with two flat warm halo rings in the gap (the flare of E18: #f5e0b0 at 20%).
// The deck (deck.js) hides everything above el ~ 6 deg until the punch splits it.
//
// Maths. The dome is sampled by (az, el) with d = (cos el sin az, sin el, -cos el cos az) (paint.js bakedDome's atan(d.x,-d.z)).
// Noise must be continuous across az = +-pi, so it is sampled on the unit circle u = (cos az, sin az), never on az itself:
//   n(az, el) = fbm( 3 u + (7 el, -3 el) ).
// Bank mask: lobes = step(0.5 + 0.35 (0.06 - el) 8, n) inside the horizon band el in [0, 0.12], 3 flat steps lit / mid / haze.
// Sun: cosang = d . s ; disc = cosang > cos 0.07 ; ring1 = cosang > cos 0.2 ; ring2 = cosang > cos 0.34.
import { ALL } from "./palette.js";

const BODY = /* glsl */ `
${ALL}
vec3 sky(float az, float el) {
  vec2 u = vec2(cos(az), sin(az));
  float n = fbm(u * 3.0 + vec2(el * 7.0, -el * 3.0));
  float n2 = fbm(u * 1.6 + vec2(el * 2.2, el * 1.1) + 11.0);
  // overcast: haze at and under the horizon, easing to the deck's slate underside as it climbs
  vec3 col = mix(C_haze, C_deckMid, smoothstep(0.05, 0.7, el) * 0.7);
  col = mix(C_haze, col, step(0.0, el));
  // the horizon bank: 3 flat steps, a hard cut each, no feather
  float band = smoothstep(0.0, 0.02, el) * (1.0 - smoothstep(0.07, 0.13, el));
  float l1 = step(0.5 + 0.35 * (0.06 - el) * 8.0, n), l2 = step(0.62 + 0.35 * (0.06 - el) * 8.0, n);
  col = mix(col, mix(C_haze, C_deckLit, 0.6), l1 * band);
  col = mix(col, mix(C_deckLit, C_deckTop, 0.5), l2 * band);
  // the blue gap: only visible through the hole
  float g = smoothstep(0.2, 0.5, el);
  vec3 blue = ramp3((el - 0.2) / 1.38, C_gapRim, C_gapMid, C_gapZen);
  float wisp = step(0.64, n2) * smoothstep(0.35, 0.7, el);                  // thin high cloud, one flat step
  blue = mix(blue, mix(C_gapRim, C_white, 0.55), wisp * 0.4);
  col = mix(col, blue, g);
  // the sun through the hole: a hard disc and two flat rings
  vec3 d = vec3(cos(el) * sin(az), sin(el), -cos(el) * cos(az));
  vec3 s = normalize(vec3(sin(-0.61) * cos(1.2), sin(1.2), -cos(-0.61) * cos(1.2)));
  float ca = dot(d, s);
  col = mix(col, mix(col, C_warm, 0.2), step(cos(0.34), ca));
  col = mix(col, mix(col, C_warm, 0.3), step(cos(0.2), ca));
  col = mix(col, C_sunDisc * 1.15, step(cos(0.07), ca));
  return col;
}`;

export function buildSky(ctx) {
  const dome = ctx.bake.sky(BODY, { tools: ["noise"], az: [-Math.PI, Math.PI], el: [-0.5, 1.58], pxPerRad: 640 });
  return { mesh: dome, dispose() { dome.userData.target?.dispose(); dome.material.dispose(); dome.geometry.dispose(); } };
}
