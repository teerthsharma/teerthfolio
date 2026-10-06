// GROUND: the court (flagstones in running bond 0.85 x 0.36 m, per-stone tone, seams as value drops, moss and autumn grass in the
// seams and on the rim, gold leaf litter) rising to a painted-stroke meadow slope (owner ref: green strokes with yellow tips, peach
// sun warmth). Shader maths, in order:
//   value groups: cloud-shadow blotch = smoothstep(0.46, 0.5, fbm(P.xz 0.05)), a HARD edged violet cast patch, then strokes over them.
//   flagstones: g = (x / 0.85, z / 0.36); odd rows offset half a stone; seam = 1 - smoothstep(0.010, 0.022, min edge distance in metres).
//   stone tone t = h21(stone id): <0.25 #c4a67c, <0.6 #cdb088, <0.85 #d3b88f, else #b99c76 (the bible STONE ramp), chips = top-right
//     corner cuts on 1 stone in 5 (a darker plane) and vor pits; seams mix toward #7a5578 (value drop, no line).
//   grass weight gm: 0 on the court, 1 beyond r 40, ragged by fbm, plus seam moss everywhere (autumn grass in the cracks).
//   strokes: brushgrass layers at 0.045 m x 2^k where k = log2(dist / 2), blended across the octave so the stroke size on screen holds.
//   litter: one cell in ten holds a flat leaf ellipse, #e08a2e / #f0b840 / #b84a22.
import { Mesh } from "three";
import { terrain } from "../../../kit/terrain.js";
import { C, V, mat, groundY } from "./common.js";

export function buildGround(ctx, U) {
  const geo = terrain(groundY, [-92, 92], [-92, 92], [230, 230]);
  const m = mat(ctx, U, /* glsl */ `
    vec3 shade(vec3 P, vec3 N, vec3 Vw) {
      float edge = unmakeEdge(P);
      vec3 L = normalize(uLightDir);
      float lam = dot(N, L) * 0.5 + 0.5;
      float r = length(P.xz), dist = length(cameraPosition - P);
      float cloud = smoothstep(0.46, 0.5, fbm(P.xz * 0.05 + 3.0));
      // flagstones
      vec2 g = vec2(P.x / 0.85, P.z / 0.36);
      float row = floor(g.y);
      g.x += 0.5 * mod(row, 2.0) + h21(vec2(row, 1.0)) * 3.0;
      vec2 id = vec2(floor(g.x), row), f = fract(g);
      float sm = min(min(f.x, 1.0 - f.x) * 0.85, min(f.y, 1.0 - f.y) * 0.36);
      float seam = 1.0 - smoothstep(0.010, 0.022, sm);
      float t = h21(id);
      vec3 sc = t < 0.25 ? ${V(C.stone[0])} : (t < 0.6 ? ${V(C.stone[1])} : (t < 0.85 ? ${V(C.stone[2])} : ${V(C.stone[3])}));
      float chip = step(0.8, h21(id + 4.0)) * step(0.72, f.x) * step(0.62, f.y);
      sc = mix(sc, sc * vec3(0.72, 0.64, 0.8), chip);
      vec2 pit = vor(P.xz * 6.0);
      sc = mix(sc, sc * 0.82, (1.0 - smoothstep(0.0, 0.05, pit.y)) * step(0.5, h21(id + 8.0)) * (1.0 - smoothstep(18.0, 30.0, dist)));
      sc = mix(sc, ${V(C.stoneTop)}, step(0.9, h21(id + 2.0)) * 0.5);          // a few sun-bleached stones
      sc = mix(sc, ${V(C.stoneShade)}, seam * 0.85);
      sc *= vec3(1.06, 1.0, 0.92);                                              // low sun warmth
      // grass: rim, ragged, plus seam moss
      float gm = smoothstep(0.0, 1.0, (r - 31.0) / 7.0 + (fbm(P.xz * 0.35) - 0.5) * 1.4);
      gm = max(gm, seam * 0.6 * step(0.5, fbm(P.xz * 1.3 + 2.0)));
      gm = max(gm, smoothstep(0.55, 0.62, fbm(P.xz * 0.5 + 21.0)) * 0.9 * smoothstep(8.0, 20.0, r));   // moss drifts across the court
      float lv = log2(max(dist, 1.0) / 2.0), s0 = floor(lv), fr = fract(lv);
      vec3 g0 = grassLayers(P.xz, 0.045 * exp2(s0), 0.5), g1 = grassLayers(P.xz + 0.37, 0.045 * exp2(s0 + 1.0), 0.5);
      vec3 gg = mix(g0, g1, smoothstep(0.0, 1.0, fr));
      float w = clamp(0.2 + 0.55 * lam + 0.5 * (fbm(P.xz * 0.35 + 11.0) - 0.5) - 0.28 * cloud + (gg.x - 0.5) * 0.8, 0.0, 1.0);
      vec3 sh = ${V(C.moss)} * 0.45 * vec3(0.9, 0.85, 1.1);
      vec3 grass = w < 0.33 ? mix(sh, ${V(C.moss)}, w / 0.33) : (w < 0.66 ? mix(${V(C.moss)}, ${V(C.grassLight)}, (w - 0.33) / 0.33) : mix(${V(C.grassLight)}, ${V(C.grassTip)}, (w - 0.66) / 0.34));
      grass = mix(grass, ${V(C.grassWarm)} * 1.1, 0.28 * smoothstep(0.55, 0.9, gg.x) * gg.y);   // peach tips toward the sun
      vec3 c = mix(sc, grass, gm);
      // cloud shadow: a hard violet patch (shadow = value x 0.55, hue toward violet)
      c = mix(c, c * vec3(0.6, 0.5, 0.8), cloud * 0.55);
      // gold leaf litter
      vec2 cell = P.xz * 2.2, cf = fract(cell) - 0.5 - (h22(floor(cell)) - 0.5) * 0.5;
      float ch = h21(floor(cell) + 5.0);
      float leaf = step(0.9, ch) * (1.0 - smoothstep(0.07, 0.09, length(cf * vec2(1.0, 2.2))));
      vec3 lc = ch < 0.93 ? ${V(C.litter[0])} : (ch < 0.97 ? ${V(C.litter[1])} : ${V(C.litter[2])});
      c = mix(c, lc, leaf * mix(0.9, 0.5, gm));
      return finish(c, P, edge);
    }`, { tools: ["noise", "brushgrass"] });
  const mesh = new Mesh(geo, m);
  mesh.frustumCulled = false;
  return { mesh, dispose() { geo.dispose(); m.dispose(); } };
}
