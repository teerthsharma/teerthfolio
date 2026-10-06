// THE FAR PLATE (layer 0, baked): the violet vault beyond the hall, seen where the lens pulls out through a wall (shot 1,
// "the island recedes into a purple vault") and through the arches. A painted background cel: flat bands, no photo noise.
//
// GLSL MATHS (p in height units, x in [0, asp], y up in [0, 1]):
//   vault   c0(y) = mix(deep, stoneShade, smoothstep(1.0, 0.45, y))     violet at the horizon rising to black overhead
//   glow    g = 1 - |p - (asp/2, 0.42)| / 0.42, banded: band = step(0.25, g) + step(0.55, g)   (two hard rings, a cel glow)
//           c = c0 + band * (purple * 0.16)  -- a flat gold-purple haze, never a smooth blur
//   ARCH ROW (multiplane, 3 rows far -> near, scale s, offset o, opening top h0):
//     u = fract(p.x s + o) - 0.5;  d = 0.28 - |u| - max(0, y - h0) * 0.5   (> 0 inside the pointed opening)
//     wall = (y < h0 + 0.6) * (d <= 0);  pillars are the wall: lit on the u < 0 half, shadow on u >= 0 (a hard 2 band)
//     ink line where |d| < 0.006 (uniform, no taper), a gold capital stripe at y = h0 - 0.02 on the pillar
//   Rows use value for depth: far (#241044/#09030f), mid (#34205f/#241044), near (#4a3a78/#241044).
import { V } from "../../../paint.js";
import { C } from "./helpers.js";

const GLSL = /* glsl */ `
  vec3 plRow(vec3 c, vec2 p, float s, float o, float h0, vec3 lit, vec3 sh) {
    float u = fract(p.x * s + o) - 0.5;
    float d = 0.28 - abs(u) - max(0.0, p.y - h0) * 0.5;
    float wall = step(p.y, h0 + 0.6) * step(d, 0.0);
    vec3 w = u < 0.0 ? lit : sh;
    // gold capital stripe and a dark floor skirt
    w = mix(w, ${V(C.goldShade)}, step(abs(p.y - (h0 - 0.02)), 0.006) * step(0.28, abs(u) + 0.0));
    c = mix(c, w, wall);
    float line = step(abs(d), 0.006) * step(p.y, h0 + 0.6) * step(0.0, 0.58 - abs(u) * 2.0 - max(0.0, p.y - h0));
    return mix(c, ${V(C.deep)}, line);
  }
  vec3 paint(vec2 p) {
    float asp = uRes.x / uRes.y;
    float y = p.y;
    vec3 c = mix(${V(C.deep)}, ${V(C.stoneShade)}, smoothstep(1.0, 0.45, y));
    float g = 1.0 - length((p - vec2(asp * 0.5, 0.42)) * vec2(1.0, 1.15)) / 0.5;
    float band = step(0.25, g) + step(0.55, g);
    c += ${V(C.purple)} * 0.16 * band;
    c = mix(c, ${V(C.purpleDeep)}, step(0.8, g) * 0.6);
    c = plRow(c, p, 3.2, 0.10, 0.34, ${V(C.stoneShade)}, ${V(C.deep)});
    c = plRow(c, p, 2.1, 0.45, 0.30, ${V(C.purpleDeep)}, ${V(C.stoneShade)});
    c = plRow(c, p, 1.3, 0.80, 0.26, ${V(C.stoneMid)}, ${V(C.stoneShade)});
    // below the floor line the plate is the dark stone, a hard horizon cut
    c = mix(c, mix(${V(C.stoneShade)}, ${V(C.deep)}, smoothstep(0.2, 0.0, y)), step(y, 0.08));
    return c;
  }`;

export function buildPlate(ctx, group) {
  const m = ctx.bake.plateLayer(GLSL, {});
  group.add(m);
  return m;
}
