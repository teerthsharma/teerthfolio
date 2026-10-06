// OUTSIDE: everything seen through the west windows and, from the dollhouse wide, around the room.
// Painted cards (baked once, id 0 so no set lines): the rooftop skyline with a lamp post, and a cherry-blossom bough that
// frames the south windows and leaves the sun windows clear. Ground: a dim courtyard disc that fogs into the horizon haze.
//
// MATHS
//   skyline  cell i = floor(x * 14); roof height H_i = 0.06 + 0.16 h(i); 40% of cells are gabled: H += 0.04 (1 - |2 frac(x*14) - 1|).
//            coverage = step(y, H). lit edge: the top 0.012 of every roof takes the sun colour (the sun is west, so
//            every roof is lit on its sky-facing rim). haze: colour -> #d9a58a by 0.18 + 0.4 y.
//   blossom  14 clumps c_k, radius r_k; d = min_k( |p - c_k| - r_k + 0.03 (fbm(9p) - .5) ); coverage = d < 0.
//            bands: highlight #ffe3ea where (p - c)·(-0.6, 0.8) > 0.32 r; shade #e98ea4 where (p - c)·(0.55, -0.83) > 0.30 r.
import * as THREE from "three";
import { paint, painted } from "../../../sdf.js";
import { V } from "../../../paint.js";
import { P } from "./kit.js";

export function buildOutside(ctx) {
  const g = new THREE.Group();
  const { engine, bake } = ctx;

  // the courtyard
  const gg = painted(new THREE.CircleGeometry(380, 48).rotateX(-Math.PI / 2), paint("#a8845a", "#7a5058", { id: 0.5, line: 0 }));
  const ground = engine.prop(gg, 0.5); ground.position.y = -0.06; g.add(ground);

  // rooftop skyline, 150 m west
  const roofs = bake.card(/* glsl */ `
  vec4 paint(vec2 p) {
    float cx = p.x * 14.0, id = floor(cx), fr = fract(cx);
    float H = 0.06 + 0.16 * h21(vec2(id, 3.1));
    if (h21(vec2(id, 9.7)) < 0.4) H += 0.04 * (1.0 - abs(2.0 * fr - 1.0));
    float a = step(p.y, H);
    // street lamp: pole, arm, head
    float lx = 3.12;
    float pole = step(abs(p.x - lx), 0.0035) * step(p.y, 0.34);
    float arm = step(abs(p.y - 0.335), 0.004) * step(lx, p.x) * step(p.x, lx + 0.07);
    float head = step(length((p - vec2(lx + 0.075, 0.325)) * vec2(1.0, 2.0)), 0.014);
    a = max(a, max(pole, max(arm, head)));
    vec3 col = ${V("#3a2a3a")};
    col = mix(col, ${V("#6a4658")}, step(H - 0.012, p.y) * step(p.y, H) * (1.0 - pole));
    // a few lit windows, blown warm
    vec2 wc = vec2(cx * 3.0, p.y * 70.0); vec2 wi = floor(wc), wf = fract(wc);
    float lit = step(0.88, h21(wi + 5.3)) * step(0.2, wf.x) * step(wf.x, 0.7) * step(0.25, wf.y) * step(wf.y, 0.7) * step(p.y, H - 0.02) * step(0.03, p.y);
    col = mix(col, ${V(P.glow)} * 1.25, lit);
    col = mix(col, ${V("#d9a58a")}, 0.18 + 0.4 * p.y);
    return vec4(col, a);
  }`, { w: 2048, h: 256, size: [300, 37.5], id: 0.0, tools: ["noise"] });
  roofs.rotation.y = Math.PI / 2; roofs.position.set(-150, -0.06 + 37.5 / 2, -4); g.add(roofs);

  // a blossom bough 16 m out, south of the sun windows
  const blossom = bake.card(/* glsl */ `
  vec4 paint(vec2 p) {
    float d = 9.0; vec2 bc = vec2(0.0); float br = 0.1;
    for (int k = 0; k < 14; k++) {
      float fk = float(k);
      vec2 c = vec2(3.84 * (fk + 0.5) / 14.0 + (h21(vec2(fk, 1.3)) - 0.5) * 0.25, 0.52 + 0.24 * h21(vec2(fk, 7.7)));
      float r = 0.13 + 0.10 * h21(vec2(fk, 4.1));
      float dk = length(p - c) - r + 0.03 * (fbm(p * 9.0 + fk) - 0.5);
      if (dk < d) { d = dk; bc = c; br = r; }
    }
    vec2 q = p - bc;
    vec3 col = ${V("#ffb4c8")};
    col = mix(col, ${V("#ffe3ea")}, step(0.32 * br, dot(q, vec2(-0.6, 0.8))));
    col = mix(col, ${V("#e98ea4")}, step(0.30 * br, dot(q, vec2(0.55, -0.83))));
    float fleck = step(0.93, h21(floor(p * 90.0)));
    col = mix(col, ${V("#ffe3ea")}, fleck * 0.8);
    float bough = step(abs(p.y - (0.40 + 0.05 * sin(p.x * 2.4))), 0.009);
    col = mix(col, ${V("#5a3a3a")}, bough * step(0.0, d));
    float a = max(step(d, 0.0), bough);
    return vec4(col, a);
  }`, { w: 1536, h: 400, size: [14, 3.64], id: 0.0, tools: ["noise"] });
  blossom.rotation.y = Math.PI / 2; blossom.position.set(-16, 6.2, 9.2); g.add(blossom);
  return { group: g };
}
