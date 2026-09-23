// THE RADIATION, on the viewer's own eyes: crossing into a radioactive area
// warps and floods the whole view with that area's colour, then at the
// mutation beat a shockwave rings out from the seal and the view clears
// (moments.js RADIATION; live.rad from Controller.jsx). Inside an area a
// faint Geiger shimmer stays at the edges. Cool, not creepy, and faint (the
// owner: "don't do the whole page red, just a little, so it's still jolly"):
// a light tint burning in from the rim, glow and sparkle, never grime.
//
// One effect in Look.jsx's composer, before tone mapping, so it works in the
// same linear light as the scene and the tone map settles it like everything
// else. It resamples the input (chromatic split, warp), so it carries the
// CONVOLUTION attribute, and it adds back whatever the effects before it in
// the pass (the lamp bloom) contributed at this pixel.

import { BlendFunction, Effect, EffectAttribute } from "postprocessing";
import { Color, Uniform } from "three";
import { RADIATION } from "../../../lib/world/moments";
import { live } from "../../../lib/world/store";

const fragment = /* glsl */ `
uniform float uStrength; // 0..1 the flood, rising to the mutation beat then clearing
uniform float uAmbient;  // the faint in-area shimmer
uniform float uRing;     // 0..1 the shockwave's progress, or -1
uniform vec3 uColor;
uniform float uTime;
uniform float uAspect;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 c = uv - 0.5;
  vec2 ca = c * vec2(uAspect, 1.0);
  float r = length(ca);

  // the heat-haze wobble of a view full of radiation
  vec2 w = vec2(sin(uv.y * 34.0 + uTime * 7.0), cos(uv.x * 29.0 - uTime * 6.0)) * 0.005 * uStrength;
  // the shockwave pushes the image outward as it passes
  float ringD = uRing >= 0.0 ? r - uRing * 1.25 : 9.0;
  float ringAmt = uRing >= 0.0 ? exp(-ringD * ringD * 160.0) * (1.0 - uRing) : 0.0;
  w += normalize(c + 1e-5) * ringAmt * 0.035;
  // glitch: thin horizontal slices of the image jump sideways, flickering
  float slice = step(0.9, hash(vec2(floor(uv.y * 46.0), floor(uTime * 18.0))));
  w.x += slice * (hash(vec2(floor(uTime * 18.0), floor(uv.y * 46.0))) - 0.5) * 0.06 * uStrength * uStrength;
  vec2 u = uv + w;

  // chromatic split, strongest at the edges
  float split = (0.014 * uStrength + 0.012 * ringAmt) * (0.3 + r);
  vec3 col;
  col.r = texture2D(inputBuffer, u + c * split).r;
  col.g = texture2D(inputBuffer, u).g;
  col.b = texture2D(inputBuffer, u - c * split).b;
  // keep what the effects before this one (the lamp bloom) added here
  col += inputColor.rgb - texture2D(inputBuffer, uv).rgb;

  // the colour flood: the snow burns in the area's colour with white-hot
  // cores, shadows sink deep. Kept under 1: the Neutral tone map after this
  // desaturates anything brighter, and a pastel wash reads as a blush.
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  vec3 graded = mix(uColor * 0.08, uColor * 0.95, smoothstep(0.04, 0.9, lum)) + vec3(pow(clamp(lum, 0.0, 1.0), 10.0)) * 0.45;
  // it burns in from the edges: the rim floods, the centre (the seal) stays readable
  float edgeIn = smoothstep(0.15, 0.75, r);
  col = mix(col, graded, uStrength * (0.06 + 0.3 * edgeIn));

  // a detector's interference: faint bands rolling down the view
  col *= 1.0 - 0.05 * uStrength * smoothstep(0.4, 0.6, fract(uv.y * 90.0 - uTime * 3.0));

  // glowing edges, pulsing on a Geiger beat
  float geiger = 0.7 + 0.3 * sin(uTime * 17.0) * sin(uTime * 5.3);
  float edge = smoothstep(0.38, 0.95, r);
  col += uColor * edge * (1.1 * uStrength + 0.25 * uAmbient) * geiger;

  // radiation hitting the lens: bright sparks in the area's colour
  vec2 cell = floor(uv * vec2(360.0 * uAspect, 360.0));
  float spark = step(1.0 - (0.004 * uStrength + 0.0012 * uAmbient), hash(cell + floor(uTime * 30.0)));
  col += mix(uColor, vec3(1.0), 0.5) * spark * 3.0;

  // the ring itself glows, and the mutation beat lands as a flash
  col += uColor * exp(-ringD * ringD * 420.0) * (1.0 - max(uRing, 0.0)) * 2.2 * step(0.0, uRing);
  col = mix(col, mix(uColor, vec3(1.0), 0.55) * 1.6, pow(1.0 - clamp(uRing, 0.0, 1.0), 10.0) * 0.3 * step(0.0, uRing));

  outputColor = vec4(col, inputColor.a);
}
`;

export class RadiationPovEffect extends Effect {
  constructor() {
    super("RadiationPovEffect", fragment, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map([
        ["uStrength", new Uniform(0)],
        ["uAmbient", new Uniform(0)],
        ["uRing", new Uniform(-1)],
        ["uColor", new Uniform(new Color("#ffffff"))],
        ["uTime", new Uniform(0)],
        ["uAspect", new Uniform(1)],
      ]),
    });
    this.colorHex = null;
  }
}

const smooth = (x) => x * x * (3 - 2 * x);

// Drive the effect from live.rad on the scene clock. `reduced` (prefers
// reduced motion) keeps the colour but drops the warp, split and ring.
export function stepRadiationPov(effect, t, aspect, reduced) {
  const u = effect.uniforms;
  const rad = live.rad;
  const since = t - rad.start;
  const M = RADIATION.mutateAt;
  let strength = 0;
  if (rad.id && since >= 0) {
    strength = since < M ? smooth(since / M) : since < M + RADIATION.clear ? 1 - smooth((since - M) / RADIATION.clear) : 0;
  } else if (!rad.id && since >= 0 && since < 0.5) {
    strength = 0.35 * (1 - since / 0.5); // leaving: a short exhale
  }
  const ring = rad.id && since >= M && since < M + RADIATION.ring ? (since - M) / RADIATION.ring : -1;
  if (rad.color !== effect.colorHex) {
    effect.colorHex = rad.color;
    u.get("uColor").value.set(rad.color);
  }
  u.get("uStrength").value = reduced ? strength * 0.4 : strength;
  u.get("uAmbient").value = rad.id ? 1 : 0;
  u.get("uRing").value = reduced ? -1 : ring;
  u.get("uTime").value = t;
  u.get("uAspect").value = aspect;
}
