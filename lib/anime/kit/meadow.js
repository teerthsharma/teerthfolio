// meadow: the painted grass ground for terrain, laid the way a BG painter lays a slope: big value groups
// first (light by the slope's facing, a cloud shadow, warmth toward the sun), then grass strokes over them
// (tools/brushgrass) whose tips catch the light. Stroke size is held near-constant on screen by blending two
// world scales by distance (a painter does not shrink strokes with perspective as fast as a camera does).
//   meadowMaterial(shared, palette, { sun: [x, y, z] direction to the sun, up: [x, z] up-slope direction, stroke: row height m at 2 m, lean, contrast, clouds, flowers })
//   palette (hex): { shadow, body, light, sun, tip, sunTip, flower, cast }; o.occluders: [[x, y, z, r]] stones that cast onto it
import { Vector2, Vector3 } from "three";
import { occluders } from "../tools/blobshadow.js";
import { surface } from "./surface.js";
import { V } from "../paint.js";

export function meadowMaterial(shared, pal = {}, o = {}) {
  const p = { cast: "#6c6088", shadow: "#23391a", body: "#5a8634", light: "#97ae4a", sun: "#e2784a", tip: "#d8d872", sunTip: "#ffb78a", flower: "#8d7fe0", ...pal };
  const f = (x) => x.toFixed(4);
  return surface(shared, /* glsl */ `
    uniform vec3 uSun; uniform vec2 uUp;
    vec3 grassAt(vec3 P, float scale, float lean) { vec2 up = normalize(uUp); return grassLayers(vec2(dot(P.xz, vec2(-up.y, up.x)), dot(P.xz, up)), scale, lean); }
    vec3 shade(vec3 P, vec3 N, vec3 V) {
      float dist = length(cameraPosition - P);
      vec3 L = normalize(uLightDir);
      // 1. value groups
      float lam = dot(N, L) * 0.5 + 0.5;
      float cloud = smoothstep(0.45, 0.62, fbm(P.xz * ${f(o.clouds ?? 0.06)} + 3.0));
      float sunk = pow(max(dot(-V, normalize(uSun)), 0.0), ${f(o.sunPow ?? 5)});
      float pat = fbm(P.xz * 0.35 + 11.0);
      float v = 0.12 + 0.6 * lam + 0.45 * (pat - 0.5) - 0.28 * cloud;
      // 2. strokes, two world scales blended by distance (screen size held roughly constant)
      float lv = log2(max(dist, 1.0) / 2.0), s0 = floor(lv), fr = fract(lv);
      float base = ${f(o.stroke ?? 0.045)};
      vec3 g0 = grassAt(P, base * exp2(s0), ${f(o.lean ?? 0.6)}), g1 = grassAt(P + 0.37, base * exp2(s0 + 1.0), ${f(o.lean ?? 0.6)});
      vec3 g = mix(g0, g1, smoothstep(0.0, 1.0, fr));
      float tone = (g.x - 0.5) * ${f(o.contrast ?? 0.75)} + (g.z - 0.5) * 0.1;
      float w = clamp(v + tone, 0.0, 1.0);
      vec3 c = w < 0.33 ? mix(${V(p.shadow)}, ${V(p.body)}, w / 0.33) : (w < 0.66 ? mix(${V(p.body)}, ${V(p.light)}, (w - 0.33) / 0.33) : mix(${V(p.light)}, ${V(p.tip)}, (w - 0.66) / 0.34));
      // 3. the sun: warm wash over the slope toward it, tips go peach
      float warm = clamp(sunk * 1.6 + smoothstep(0.55, 0.9, lam) * 0.25, 0.0, 1.0) * (1.0 - cloud * 0.6);
      c = mix(c, mix(${V(p.sun)}, ${V(p.sunTip)}, smoothstep(0.55, 0.9, g.x) * g.y), warm * 0.75);
      // cast shadows of the stones: a cool lavender shape on the grass
      c = mix(c, c * ${V(p.cast)} * 1.6, blobShadow(P, L) * 0.75);
      // 4. flowers dotted in, only in the near and mid ground
      vec2 fc = P.xz * ${f(o.flowers ?? 9)}, fi = floor(fc);
      float fl = step(0.965, h21(fi)) * (1.0 - smoothstep(0.1, 0.25, length(fract(fc) - 0.5)));
      c = mix(c, ${V(p.flower)}, fl * (1.0 - smoothstep(4.0, 14.0, dist)) * 0.8);
      return c;
    }`, { tools: ["noise", "brushgrass", "blobshadow"], uniforms: { uSun: { value: new Vector3(...(o.sun ?? [0.5, 0.3, -0.8])).normalize() }, uUp: { value: new Vector2(...(o.up ?? [0, -1])) }, ...occluders(o.occluders ?? []) }, id: o.id ?? 0.99 });
}

export default { name: "meadow", doc: "painted grass ground: value groups, two-scale brush strokes with lit tips, sun warmth, flowers" };
