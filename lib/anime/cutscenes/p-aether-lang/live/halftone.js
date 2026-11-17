// HALFTONE GLSL from 995cc0c components/world/cutscene/Stage.jsx.
export const HALFTONE = /* glsl */ `
  uniform float uCell;
  float halftone(float tone) {
    vec2 p = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / uCell;
    float d = length(fract(p) - 0.5);
    float r = 0.56 * sqrt(clamp(tone, 0.0, 1.0));
    return 1.0 - smoothstep(r - 0.07, r + 0.07, d);
  }`;
