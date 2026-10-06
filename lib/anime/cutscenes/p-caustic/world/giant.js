// p-caustic WORLD / titan: Sukuna shrine-shadow (LOW manhwa), retargeted from the green rock giant.
// Protected blue Susanoo is NOT here. Four-armed shrine silhouette, tattoo hatch, ink slats.
//
// MATHS (p on the card, y up; d = min of blobs and slat capsules):
//   body     union of head, grin, torso, four arms (blobs)
//   shrine   7 vertical slats: |p.x - (0.18 + 0.07 i)| < 0.012, y in [0.08, 0.42]
//   fill     cel3(lit, 0.4, 0.75, soot, ash, lace) with left-up key
//   hatch    strokes(p * 38, 1.05, 1.4, 0.28) mixed 0.4 into ink
//   tattoos  hashed dashes on torso (h21 > 0.72) as ink bars
//   edge     jaggedInk(d, 0, 2.2, 22, p) -> #2a1f1a (never #000)
import { PAL, V, since } from "./common.js";

const PAINT = /* glsl */ `
  vec4 paint(vec2 p) {
    float d = blob(p, vec2(0.38, 0.82), vec2(0.11, 0.10), 0.22);
    d = min(d, blob(p, vec2(0.38, 0.72), vec2(0.16, 0.08), 0.18));
    d = min(d, blob(p, vec2(0.38, 0.48), vec2(0.22, 0.28), 0.28));
    d = min(d, blob(p, vec2(0.14, 0.62), vec2(0.10, 0.22), 0.26));
    d = min(d, blob(p, vec2(0.62, 0.64), vec2(0.10, 0.24), 0.26));
    d = min(d, blob(p, vec2(0.10, 0.38), vec2(0.09, 0.20), 0.30));
    d = min(d, blob(p, vec2(0.66, 0.36), vec2(0.09, 0.20), 0.30));
    float slat = 9.0;
    for (int i = 0; i < 7; i++) {
      float x = 0.16 + 0.07 * float(i);
      vec2 q = p - vec2(x, 0.22);
      slat = min(slat, max(abs(q.x) - 0.011, abs(q.y) - 0.16));
    }
    d = min(d, slat);
    float a = aaf(d);
    float lit = celStep((0.55 - p.x) * 0.55 + (p.y - 0.4) * 0.35 + fbm(p * 5.0) * 0.35, 0.42);
    vec3 soot = ${V("#433a30")};
    vec3 ash = ${V(PAL.ash)};
    vec3 lace = ${V("#e8dcc2")};
    vec3 ink = ${V("#2a1f1a")};
    vec3 blood = ${V("#b80a17")};
    vec3 col = cel3(lit, 0.35, 0.78, soot, ash, lace);
    col = mix(col, ink, 0.38 * strokes(p * 38.0, 1.05, 1.4, 0.28));
    float tat = step(0.72, h21(floor(p * vec2(18.0, 14.0)))) * step(0.32, p.y) * step(p.y, 0.62) * aaf(-d);
    col = mix(col, ink, tat * 0.85);
    col = mix(col, blood, step(0.86, p.y) * step(abs(p.x - 0.38), 0.07) * a * 0.35);
    col = mix(col, ink, jaggedInk(d, 0.0, 2.2, 22.0, p));
    float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
    if (L > 0.92) col *= 0.92 / L;
    return vec4(col, a);
  }`;

export function buildGiant(ctx) {
  const mesh = ctx.bake.card(PAINT, {
    w: 768, h: 1024, size: [24, 32], billboard: true, layer: 1, id: 0.5,
    tools: ["noise", "cel", "ink"],
  });
  mesh.userData.layer = 1;
  return {
    obj: mesh,
    update(t, dt, cue) { mesh.visible = cue.ts >= 1 && cue.ts <= 5 && since(cue, "break") < 0; },
    dispose() { mesh.userData.dispose?.(); },
  };
}
