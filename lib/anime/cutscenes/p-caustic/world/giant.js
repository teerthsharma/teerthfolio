// p-caustic WORLD / easter egg 2 (bible 7): the dark-green hand-inked giant of ref 03 stands as a still rock formation on the
// far-right ridge, 1 to 5 s. A painted card (baked once): union of blobs for head, shoulders, torso, a raised arm.
//   d    = min over blobs(p, c, r, rough)  (< 0 inside)           alpha = aaf(d)      coverage, discard < .5 in the card shader
//   edge = |d| < .012  -> hand ink #0f1a10                         fill = #1f3a22, a hard lit cut up-left lighter, dry-brush hatch lines
import { PAL, V, since } from "./common.js";

const PAINT = /* glsl */ `
  vec4 paint(vec2 p) {
    float d = blob(p, vec2(0.52, 0.86), vec2(0.10, 0.11), 0.25);
    d = min(d, blob(p, vec2(0.50, 0.64), vec2(0.31, 0.19), 0.30));
    d = min(d, blob(p, vec2(0.50, 0.34), vec2(0.25, 0.38), 0.35));
    d = min(d, blob(p, vec2(0.84, 0.62), vec2(0.09, 0.27), 0.30));
    d = min(d, blob(p, vec2(0.18, 0.40), vec2(0.12, 0.30), 0.30));
    float a = aaf(d);
    float edge = 1.0 - smoothstep(0.008, 0.016, abs(d));
    float lit = step(0.5, fbm(p * 4.0) * 0.6 + (0.5 - p.x) * 0.5 + (p.y - 0.4) * 0.3 + 0.2);
    vec3 col = mix(${V(PAL.giant)} * 0.7, ${V(PAL.giant)} * 1.35, lit);
    col = mix(col, ${V("#3a5a32")}, 0.35 * smoothstep(0.55, 0.9, strokes(p * 30.0, 0.9, 1.6, 0.35)));
    col = mix(col, ${V(PAL.giantInk)}, edge);
    return vec4(col, a);
  }`;

export function buildGiant(ctx, env) {
  const mesh = ctx.bake.card(PAINT, { w: 512, h: 512, size: [26, 26], billboard: true, layer: 1, id: 0.5 });
  mesh.userData.layer = 1;
  return {
    obj: mesh,
    update(t, dt, cue) { mesh.visible = cue.ts >= 1 && cue.ts <= 5 && since(cue, "break") < 0; },
    dispose() { mesh.userData.dispose?.(); },
  };
}
