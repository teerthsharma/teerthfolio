// shadow-hue: complementary shadow of the key. Local adapter.
// TOOLKIT: engine/anime:lib/anime/style/shadow-hue.js
// Maths: shadow = value × 0.55, hue toward the complementary of KEY #a23cff (≈ yellow-green pulled to fill #1a0c24).
//   authored override k=0.75 → FILL. No grey. No #000.
export const meta = {
  params: {
    vmul: { default: 0.55 },
    authored: { default: "#1a0c24" },
    k: { default: 0.75 },
  },
};

export const GLSL = /* glsl */ `
  vec3 shhApplyNazarick(vec3 lit, float mask) {
    vec3 authored = vec3(0.102, 0.047, 0.141);
    vec3 shade = mix(lit * 0.55, authored, 0.75);
    return mix(lit, shade, mask);
  }`;
