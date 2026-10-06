// AKATSUKI HIDEOUT: SE-corner painted card. Red-cloud cave, stone alcove, paper seals.
// Not Tensura (no slime pool). Not a statue. Not a dock hall.
//
// MATHS: cave mouth = blob union; ceiling crimson band; candle discs; paper rectangles;
//   fill cel3; jagged ink; luma ≤ 0.92
import { HEX } from "./palette.js";

const hx = (h) => {
  const n = parseInt(h.slice(1), 16);
  return `vec3(${((n >> 16) & 255) / 255}, ${((n >> 8) & 255) / 255}, ${(n & 255) / 255})`;
};

const PAINT = /* glsl */ `
  vec4 paint(vec2 p) {
    float d = blob(p, vec2(0.70, 0.42), vec2(0.55, 0.48), 0.22);
    d = min(d, blob(p, vec2(0.78, 0.18), vec2(0.40, 0.22), 0.18));
    float a = aaf(d);
    if (a < 0.01) return vec4(0.0);
    float lit = celStep(p.y * 0.5 + (1.0 - p.x) * 0.25 + fbm(p * 4.0) * 0.3, 0.4);
    vec3 deep = ${hx(HEX.deep)};
    vec3 stone = ${hx(HEX.basaltDark)};
    vec3 litS = ${hx(HEX.basaltLit)};
    vec3 crim = ${hx(HEX.crimson)};
    vec3 ink = ${hx("#2a1f1d")};
    vec3 cream = ${hx(HEX.cream)};
    vec3 col = cel3(lit, 0.35, 0.75, deep, stone, litS);
    float band = smoothstep(0.62, 0.78, p.y) * aaf(-d);
    col = mix(col, crim, band * (0.35 + 0.4 * fbm(p * 3.0)));
    for (int i = 0; i < 5; i++) {
      vec2 c = vec2(0.42 + 0.09 * float(i), 0.16 + 0.02 * h21(vec2(float(i), 2.0)));
      float cd = length(p - c) - 0.018;
      col = mix(col, ${hx(HEX.gold)}, aaf(cd) * 0.9);
    }
    float paper = step(abs(p.x - 0.86), 0.04) * step(abs(p.y - 0.38), 0.08);
    col = mix(col, cream, paper * 0.85);
    col = mix(col, ink, jaggedInk(d, 0.0, 2.0, 18.0, p));
    float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
    if (L > 0.92) col *= 0.92 / L;
    return vec4(col, a);
  }`;

export function buildHideout(ctx, frame) {
  const mesh = ctx.bake.card(PAINT, {
    w: 768, h: 512, size: [16, 10], billboard: false, layer: 0, id: 0.48,
    tools: ["noise", "cel", "ink"],
  });
  // SE of the seal (yaw 0 faces +z = north): +x east, -z south
  mesh.position.set(14.5, 3.2, -12.0);
  mesh.rotation.y = -0.85;
  mesh.userData.layer = 0;
  frame.add(mesh);
  return { mesh, dispose() { mesh.userData.dispose?.(); } };
}
