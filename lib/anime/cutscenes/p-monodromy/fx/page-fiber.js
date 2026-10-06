// page-fiber: laid paper grain for the Magi page-tear dimension. Not a flash.
// Maths: fibre = strokes(p * 9, ang, 0.08, 0.012); laid = 0.5 + 0.5 * sin(p.y * 72)
//   deckle = 1 - smoothstep(0, fwidth(e), e) where e = |p.x| - (0.48 + 0.02 * fbm)
export const meta = { params: { paper: { default: "#f4e8c8" }, gold: { default: "#d9a441" } } };

export const GLSL = /* glsl */ `
  float pageFiber(vec2 p) {
    float fib = strokes(p * 9.0, 0.12, 0.08, 0.012);
    float laid = 0.5 + 0.5 * sin(p.y * 72.0);
    return clamp(0.55 * fib + 0.25 * laid, 0.0, 1.0);
  }
  float pageDeckle(vec2 p) {
    float e = abs(p.x) - (0.48 + 0.02 * fbm(p * 14.0));
    return 1.0 - smoothstep(0.0, fwidth(e) + 0.008, e);
  }`;
