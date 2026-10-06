// THE GREAT WINDOW behind the throne: a painted stained-glass card (static) on the back wall, z = -19.95, 9 m x 20 m, bottom at
// y = 3, so the throne's black silhouette sits against glowing glass. Flat panes, dark mullions, a rose, hard edges, no noise.
//
// GLSL MATHS (card space: p.x in [0, asp] with asp = 9/20, p.y in [0, 1]; q.x = 2 p.x / asp - 1 in [-1, 1]).
//   pointed arch half-width  hw(y) = 1                          for y <= 0.62
//                                    1 - ((y - 0.62) / 0.38)^1.7 above (reaches 0 at the apex y = 1)
//   coverage = |q.x| <= hw(y)                                     (outside: alpha 0, the card is cut out)
//   frame    = band where hw - |q.x| < 0.07, or y < 0.02          (deep ink, the cartoon's thick outline)
//   metres   m = ((q.x + 1) * 4.5, y * 20): panes are 2.25 m x 3.4 m, mullions 0.13 m wide
//   rose     centre (0, 0.78): d = |(q.x * 4.5, (y - 0.78) * 20)|, radius 3.1 m, 8 spokes (sector = floor(atan2 / (pi/4)))
//   pane colour = palette[hash(cell) mod 5] * (0.78 + 0.26 (1 - y))   (brighter low: lit from beyond)
import { V } from "../../../paint.js";
import { C } from "./helpers.js";

const GLSL = /* glsl */ `
  float wnH(vec2 c) { return fract(sin(dot(c, vec2(127.1, 311.7))) * 43758.5453); }
  vec3 wnPane(float h) {
    int k = int(floor(h * 5.0));
    if (k == 0) return ${V(C.purple)};
    if (k == 1) return ${V(C.goldLit)};
    if (k == 2) return ${V(C.crimson)};
    if (k == 3) return ${V("#2f6ab0")};
    return ${V(C.purpleDeep)} * 1.5;
  }
  vec4 paint(vec2 p) {
    float asp = 0.45;
    vec2 q = vec2(p.x / asp * 2.0 - 1.0, p.y);
    float y = q.y;
    float hw = y <= 0.62 ? 1.0 : 1.0 - pow(clamp((y - 0.62) / 0.38, 0.0, 1.0), 1.7);
    if (abs(q.x) > hw || y > 0.998) return vec4(0.0);
    vec3 ink = ${V(C.deep)};
    if (hw - abs(q.x) < 0.07 || y < 0.02) return vec4(ink, 1.0);
    vec2 m = vec2((q.x + 1.0) * 4.5, y * 20.0);
    vec2 cell = vec2(floor(m.x / 2.25), floor(m.y / 3.4));
    vec2 f = vec2(fract(m.x / 2.25) * 2.25, fract(m.y / 3.4) * 3.4);
    float mull = step(min(min(f.x, 2.25 - f.x), min(f.y, 3.4 - f.y)), 0.13);
    vec3 col = wnPane(wnH(cell)) * (0.78 + 0.26 * (1.0 - y));
    // the rose in the arch head
    vec2 rp = vec2(q.x * 4.5, (y - 0.78) * 20.0);
    float d = length(rp);
    if (d < 3.1) {
      float sector = floor((atan(rp.y, rp.x) + 3.14159) / 0.785398);
      col = wnPane(wnH(vec2(sector, 7.0))) * 1.05;
      float rim = step(2.75, d), hub = step(d, 0.55);
      col = mix(col, ink, rim);
      // spokes: thin dark wedges on the sector boundaries
      float edge = abs(fract((atan(rp.y, rp.x) + 3.14159) / 0.785398) - 0.5);
      col = mix(col, ink, step(0.47, edge) * step(0.55, d));
      col = mix(col, ${V(C.goldLit)}, hub);
      mull *= 0.0;
    }
    col = mix(col, ink, mull);
    // hard inner highlight bar on the left frame edge (the bible's 4 px cut-line)
    col = mix(col, ${V(C.goldHi)}, step(hw - abs(q.x), 0.095) * step(0.07, hw - abs(q.x)) * step(q.x, 0.0) * 0.8);
    return vec4(col, 1.0);
  }`;

export function buildWindow(ctx, group) {
  const card = ctx.bake.card(GLSL, { w: 450, h: 1000, size: [9, 20] });
  card.position.set(0, 13, -19.94); // faces +z into the hall
  group.add(card);
  return card;
}
