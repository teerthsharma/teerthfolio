// THE FILM STAGE: one grade over every pocket and the island (grain,
// vignette, lift/gamma/gain). Chromatic fringe rides in RadiationPov (uFringe),
// which already resamples per channel; a second resampling effect cannot merge
// into the same pass. Plain per-pixel maths, constant program (uniforms only),
// so a tier or a place never recompiles anything. Linear light, before the
// tone map, in the same pass as it.

import { BlendFunction, Effect } from "postprocessing";
import { Uniform, Vector3 } from "three";

const fragment = /* glsl */ `
uniform float uGrain;
uniform float uVig;
uniform vec3 uLift;
uniform vec3 uGamma;
uniform vec3 uGain;
uniform float uTime;
uniform float uAspect;

float h21(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = inputColor.rgb;
  // lift (shadows) / gain (highlights) / gamma, per channel
  c = max(c * uGain + uLift * (1.0 - clamp(c, 0.0, 1.0)), 0.0);
  c = pow(c, uGamma);
  // vignette: quadratic falloff from the corners, aspect-true
  vec2 d = (uv - 0.5) * vec2(uAspect, 1.0);
  c *= 1.0 - uVig * smoothstep(0.25, 1.05, length(d));
  // grain: hashed per pixel per 24 Hz tick, strongest in the mids
  float g = h21(gl_FragCoord.xy + floor(uTime * 24.0) * 17.0) - 0.5;
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c += g * uGrain * (0.35 + 0.65 * smoothstep(0.0, 0.5, lum) * (1.0 - smoothstep(0.8, 3.0, lum)));
  outputColor = vec4(c, inputColor.a);
}
`;

export class FilmEffect extends Effect {
  constructor() {
    super("FilmEffect", fragment, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ["uGrain", new Uniform(0)],
        ["uVig", new Uniform(0)],
        ["uLift", new Uniform(new Vector3(0, 0, 0))],
        ["uGamma", new Uniform(new Vector3(1, 1, 1))],
        ["uGain", new Uniform(new Vector3(1, 1, 1))],
        ["uTime", new Uniform(0)],
        ["uAspect", new Uniform(1)],
      ]),
    });
  }
}
