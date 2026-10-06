// FAR SKYLINE PLATES (layer 0, baked once as cards): the painted Shibuya skyline at 170 m on three sides, cold black-blue with
// the distance-haze tint. Matte paintings, not geometry (RULEBOOK 7).
//   column i = floor(x / 0.07), height hh = 0.22 + 0.55 h21(i, 3.1) (one in five halved), body = column fraction in (0.08, 0.94)
//   panes: cell (x / 0.012, y / 0.02); lit = h21 > 0.84 (paper 0.8, 0.76, 0.66), red = h21 > 0.975 (the one accent)
//   base colour climbs (0.02, 0.03, 0.06) -> (0.05, 0.06, 0.10) with height; a red haze 0.5 exp(-6 y) pools at the foot
import { Group } from "three";

const SKYLINE = /* glsl */ `
  vec4 paint(vec2 p) {
    float colw = 0.07, i = floor(p.x / colw), fx = fract(p.x / colw);
    float hh = 0.22 + 0.55 * h21(vec2(i, 3.1));
    if (h21(vec2(i, 7.7)) > 0.8) hh *= 0.5;
    float body = step(0.08, fx) * step(fx, 0.94) * step(p.y, hh);
    float ant = step(0.47, fx) * step(fx, 0.53) * step(p.y, hh + 0.08) * step(0.9, h21(vec2(i, 1.3)));
    vec2 g = vec2(p.x / 0.012, p.y / 0.02), id = floor(g), q = fract(g);
    float pane = step(0.25, q.x) * step(q.x, 0.75) * step(0.3, q.y) * step(q.y, 0.7);
    float r = h21(id + i * 1.7), lit = step(0.84, r), red = step(0.975, r);
    vec3 col = mix(vec3(0.02, 0.03, 0.06), vec3(0.05, 0.06, 0.10), clamp(p.y / hh, 0.0, 1.0));
    col = mix(col, vec3(0.80, 0.76, 0.66), lit * pane);
    col = mix(col, vec3(0.80, 0.03, 0.06), red * lit * pane);
    col = mix(col, vec3(0.10, 0.02, 0.04), 0.5 * exp(-6.0 * p.y));
    return vec4(col, max(body, ant));
  }`;

export function buildSkyline(ctx) {
  const group = new Group(), cards = [];
  for (const [x, z, ry, seed] of [[-170, 0, Math.PI / 2, 1], [170, 0, -Math.PI / 2, 2], [0, 170, Math.PI, 3]]) {
    const c = ctx.bake.card(SKYLINE.replace("h21(vec2(i, 3.1))", `h21(vec2(i, 3.1 + ${seed}.0))`), { w: 1536, h: 384, size: [320, 80], tint: "#9aa0c0" });
    c.position.set(x, 38, z); c.rotation.y = ry; group.add(c); cards.push(c);
  }
  return { object: group, dispose() { for (const c of cards) c.userData.dispose?.(); } };
}
