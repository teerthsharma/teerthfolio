// J.C.Staff last-pass shaders: the shared split-tone grade and the flat-area grain on twos.
import { defineModule } from "./define.js";

export const GRADE = [
  defineModule({
    name: "jcsGradeClean",
    doc: "shared TV grade: luma cap 0.92, split tone with a cool hue shift in the shade, ink-floor lift, no grain; one uniform blends the Faraday and Index tone pairs",
    draws: "A colour test card whose right half is graded: cool shadows, clean pale highlights, nothing clipped white or crushed to pure black, the left half left raw.",
    use: "grade", params: "uJcsGradeMix is the split-tone strength (0.35); uJcsToneSet blends the Index pair (0, blue-black and warm grey) into the Faraday pair (1, violet-grey and cool white); uJcsHueShade pushes shadows toward blue (0.12).",
    uniforms: { uJcsGradeMix: 0.35, uJcsToneSet: 0, uJcsHueShade: 0.12 },
    glsl: /* glsl */ `
    uniform float uJcsGradeMix;
    uniform float uJcsToneSet;
    uniform float uJcsHueShade;
    vec3 jcsGradeClean(vec3 c) {
      c = c * min(1.0, 0.92 / max(jcsLuma(c), 1e-4));
      float Y = jcsLuma(c);
      float w = smoothstep(0.2, 0.8, Y);
      vec3 ts = mix(JCS_TONE_SA, JCS_TONE_SB, uJcsToneSet);
      vec3 th = mix(JCS_TONE_HA, JCS_TONE_HB, uJcsToneSet);
      c *= mix(mix(vec3(1.0), ts, uJcsGradeMix), mix(vec3(1.0), th, uJcsGradeMix), w);
      c = mix(c, c * vec3(0.9, 0.97, 1.12), uJcsHueShade * (1.0 - w));
      c = mix(JCS_INK, c, smoothstep(0.035, 0.08, jcsLuma(c)));
      return jcsOut(c);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) {
      vec3 hue = 0.5 + 0.5 * cos(6.2831853 * (p.x * 0.5 + vec3(0.0, 0.33, 0.67)));
      vec3 raw = hue * (1.1 * p.y);
      return mix(raw, jcsGradeClean(raw), jcsAA(p.x, 0.89));
    }`,
  }),

  defineModule({
    name: "jcsGrainTwos",
    doc: "banding-killer grain: stepped 12 times a second, weighted toward darks, and silent wherever the picture has an edge",
    draws: "A smooth blue sky with a faint stepped speckle that sits only on the flat bands and leaves cloud edges and lines untouched.",
    use: "noise", params: "uJcsGrainAmp is the grain amplitude (0.02); the speckle reseeds every twelfth of a second.",
    uniforms: { uJcsGrainAmp: 0.02 },
    deps: ["jcsKit", "jcsBlueSky"],
    glsl: /* glsl */ `
    uniform float uJcsGrainAmp;
    vec3 jcsGrainTwos(vec3 c, float t) {
      float Y = jcsLuma(c);
      float calm = 1.0 - clamp(length(vec2(dFdx(Y), dFdy(Y))) * 120.0, 0.0, 1.0);
      vec2 f = gl_FragCoord.xy + floor(t * 12.0) * 5.588;
      float n = fract(52.9829189 * fract(dot(f, vec2(0.06711056, 0.00583715)))) - 0.5;
      return jcsOut(c + n * 2.0 * uJcsGrainAmp * (1.0 - Y) * calm);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return jcsGrainTwos(jcsBlueSky(p, t), t); }`,
  }),
];
