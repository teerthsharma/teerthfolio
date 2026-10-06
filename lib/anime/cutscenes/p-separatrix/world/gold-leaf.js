// gold-leaf: Araki fresco flakes. Plaster #f4e8c8, leaf #d9a441, under-red #b3122a.
// Maths: flake id = floor(P.xz * 7.2); keep if h21(id) > 0.72
//   d = length(fract(P.xz*7.2) - 0.5) - (0.18 + 0.08 * h)
//   leaf = 1 - smoothstep(0, fwidth(d), d); spec = pow(max(dot(N, H), 0), 32) sliver
//   erase: mix(leaf, UNDER, uErase) so plaster lifts to the red sketch
import { V } from "../../../paint.js";

export const meta = {
  params: {
    leaf: { default: "#d9a441" },
    plaster: { default: "#f4e8c8" },
    under: { default: "#b3122a" },
  },
};

export const GLSL = /* glsl */ `
  const vec3 LEAF = ${V("#d9a441")};
  const vec3 PLAST = ${V("#f4e8c8")};
  const vec3 UNDER = ${V("#b3122a")};
  vec3 goldLeaf(vec3 P, vec3 N, vec3 V, vec3 base, float erase) {
    vec2 g = P.xz * 7.2;
    vec2 id = floor(g), f = fract(g) - 0.5;
    float h = h21(id + 3.0);
    float keep = step(0.72, h);
    float rad = 0.18 + 0.08 * h21(id + 9.0);
    float d = length(f) - rad;
    float leaf = (1.0 - smoothstep(0.0, fwidth(d) + 1e-4, d)) * keep;
    vec3 H = normalize(normalize(vec3(0.4, 0.8, 0.3)) + normalize(V));
    float spec = pow(max(dot(normalize(N), H), 0.0), 32.0);
    vec3 gold = mix(LEAF, ${V("#e8c36a")}, spec * 0.55);
    vec3 c = mix(base, gold, leaf * 0.85);
    c = mix(c, mix(PLAST, UNDER, 0.65 + 0.35 * h21(id + 1.0)), erase * (0.35 + 0.65 * (1.0 - leaf)));
    float Y = dot(c, vec3(0.2126, 0.7152, 0.0722));
    return c * min(1.0, 0.92 / max(Y, 1e-4));
  }`;
