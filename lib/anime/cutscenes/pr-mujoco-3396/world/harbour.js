// E02 the MARLEY HARBOUR far plate (quay, three cranes, two piers) and the far "God" (egg 6: the Founding Titan's skeleton in the
// haze, a Sistine Michelangelo pose). All three are painted CARDS baked once (ctx.bake.card), cut out by coverage in alpha.
// They sit at z = -900 (inside a 1500 m far plane); sizes are scaled so the angular size matches the bible's z = -1400 plate.
//
// MATHS (card space p: x in [0, asp], y in [0, 1] up)
//  sdBox / sdSeg are the exact distance fields; a shape is filled where d < 0 and lined with sepia where |d| < lw (1.3 px at the card's
//  resolution, lw = 1.3 / H). Lattice cranes: two chords of the jib joined by alternating diagonals (loop of 12 sdSeg).
//  Quay stone: lit #8c7a62 on top, shade #4b3621 below the lip; crane iron #3a2a1e.
//  Skeleton: spine = column of vertebra discs at 1/22 pitch; 8 rib arcs |len((p - c)/r) - 1| < .035 on the upper half; skull ellipse; green eye pinprick.
import { V } from "../../../paint.js";
import { C, T } from "./pal.js";

const SHAPES = /* glsl */ `
  float sdBox(vec2 p, vec2 c, vec2 h) { vec2 d = abs(p - c) - h; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
  float sdSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
`;

const QUAY = /* glsl */ `
  ${SHAPES}
  const vec3 QLIT = ${V(C.quayLit)}; const vec3 QSHD = ${V(C.quayShade)}; const vec3 IRON = ${V(C.crane)}; const vec3 SEP = ${V(C.sepia)};
  // one lattice crane: mast at x, base y0, height h, jib reaching left
  float crane(vec2 p, float x, float y0, float h, float jib) {
    float d = 1e3;
    d = min(d, sdBox(p, vec2(x, y0 + h * 0.5), vec2(0.0035, h * 0.5)));
    d = min(d, sdBox(p, vec2(x + 0.012, y0 + h * 0.5), vec2(0.0025, h * 0.5)));
    d = min(d, sdSeg(p, vec2(x - jib, y0 + h), vec2(x + 0.02, y0 + h)) - 0.0022);
    d = min(d, sdSeg(p, vec2(x - jib, y0 + h - 0.012), vec2(x + 0.02, y0 + h - 0.012)) - 0.0018);
    for (int i = 0; i < 12; i++) { float a = float(i) / 12.0, b = float(i + 1) / 12.0;
      d = min(d, sdSeg(p, vec2(x - jib * a, y0 + h - (i % 2 == 0 ? 0.0 : 0.012)), vec2(x - jib * b, y0 + h - (i % 2 == 0 ? 0.012 : 0.0))) - 0.0009); }
    for (int i = 0; i < 9; i++) { float a = float(i) / 9.0, b = float(i + 1) / 9.0;
      d = min(d, sdSeg(p, vec2(x - 0.0035 + 0.0035 * (i % 2 == 0 ? 0.0 : 1.0) , y0 + h * a), vec2(x + 0.012 - 0.0125 * (i % 2 == 0 ? 0.0 : 1.0), y0 + h * b)) - 0.0008); }
    d = min(d, sdBox(p, vec2(x + 0.03, y0 + h - 0.006), vec2(0.012, 0.008)));        // counterweight
    d = min(d, sdSeg(p, vec2(x - jib * 0.8, y0 + h - 0.012), vec2(x - jib * 0.8, y0 + h * 0.55)) - 0.0005);   // the hoist cable
    return d;
  }
  vec4 paint(vec2 p) {
    float lw = 1.3 / 256.0;
    // the quay: a long low block along the bottom with a lit lip
    float dq = sdBox(p, vec2(4.0, 0.075), vec2(4.0, 0.075));
    vec3 col = vec3(0.0); float a = 0.0;
    if (dq < 0.0) { col = p.y > 0.12 ? QLIT : mix(QSHD, QLIT, step(0.5, fract(p.x * 18.0 + floor(p.y * 14.0) * 0.5)) * 0.35); a = 1.0; }
    if (abs(dq) < lw) { col = SEP; a = 1.0; }
    float dc = 1e3;
    dc = min(dc, crane(p, 6.2, 0.14, 0.62, 0.36));
    dc = min(dc, crane(p, 4.9, 0.14, 0.5, 0.3));
    dc = min(dc, crane(p, 3.7, 0.14, 0.42, 0.26));
    if (dc < 0.0) { col = IRON; a = 1.0; }
    // cargo stacks on the quay
    for (int i = 0; i < 6; i++) { float fi = float(i);
      float db = sdBox(p, vec2(1.2 + fi * 0.33, 0.165), vec2(0.09, 0.03 + 0.01 * mod(fi, 3.0)));
      if (db < 0.0) { col = mix(QSHD, IRON, 0.5); a = 1.0; } if (abs(db) < lw * 0.8) { col = SEP; a = 1.0; } }
    return vec4(col, a);
  }`;

const PIERS = /* glsl */ `
  ${SHAPES}
  const vec3 PIER = ${V(C.quayShade)}; const vec3 IRON = ${V(C.crane)}; const vec3 SEP = ${V(C.sepia)};
  vec4 paint(vec2 p) {
    float lw = 1.3 / 256.0;
    vec3 col = vec3(0.0); float a = 0.0;
    for (int i = 0; i < 2; i++) { float fi = float(i);
      float d = sdBox(p, vec2(1.6 + fi * 2.6, 0.06), vec2(1.1, 0.025 + 0.012 * fi));
      for (int k = 0; k < 10; k++) d = min(d, sdBox(p, vec2(0.6 + fi * 2.6 + float(k) * 0.22, 0.035), vec2(0.008, 0.035)));  // the piles
      d = min(d, sdBox(p, vec2(2.1 + fi * 2.6, 0.12), vec2(0.06, 0.04)));                                            // a shed
      if (d < 0.0) { col = mix(PIER, IRON, 0.35); a = 1.0; } else if (d < lw) { col = SEP; a = 1.0; } }
    return vec4(col, a);
  }`;

const GOD = /* glsl */ `
  ${SHAPES}
  const vec3 BONE = ${V(C.bone)}; const vec3 BSHD = ${V(C.cloudShade)}; const vec3 SEP = ${V(C.sepia)}; const vec3 EYE = ${V(C.founderGreen)};
  vec4 paint(vec2 p) {
    // card is square: x in [0, 1], y in [0, 1]; the God sits with his spine on x = .5, reaching a hand left (Creation of Adam)
    float lw = 1.3 / 512.0;
    float d = 1e3;
    d = min(d, sdBox(p, vec2(0.5, 0.5), vec2(0.012, 0.34)));                                  // the spine
    for (int i = 0; i < 22; i++) d = min(d, length((p - vec2(0.5, 0.17 + float(i) * 0.033)) * vec2(1.0, 1.6)) - 0.02);
    for (int i = 0; i < 8; i++) { float y = 0.42 + float(i) * 0.048, r = 0.2 - 0.016 * float(i);
      vec2 q = (p - vec2(0.5, y)) / vec2(r, 0.07);
      float rb = (abs(length(q) - 1.0) - 0.035) * 0.07;
      d = min(d, p.y > y - 0.01 ? rb : 1e3); }                                                // rib arcs (upper half only)
    d = min(d, length((p - vec2(0.5, 0.86)) / vec2(0.07, 0.085)) * 0.07 - 0.07);              // the skull
    d = min(d, sdBox(p, vec2(0.5, 0.15), vec2(0.13, 0.03)));                                  // the pelvis
    d = min(d, sdSeg(p, vec2(0.36, 0.66), vec2(0.12, 0.74)) - 0.012);                         // the reaching arm
    d = min(d, sdSeg(p, vec2(0.12, 0.74), vec2(0.04, 0.73)) - 0.006);                         // the finger
    vec3 col = mix(BONE, BSHD, smoothstep(0.45, 0.55, p.x));                                  // shade on the far side
    float eye = 1.0 - smoothstep(0.0, 0.006, length(p - vec2(0.485, 0.865)));
    col = mix(col, EYE * 1.5, eye);
    float a = d < 0.0 ? 1.0 : 0.0;
    if (d >= 0.0 && d < lw) { col = SEP; a = 1.0; }
    return vec4(col, a);
  }`;

export function buildHarbour(ctx) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const cards = [];
  const put = (card, x, y, z) => { card.position.set(x, y, z); card.frustumCulled = false; cards.push(card); group.add(card); return card; };
  // the quay and cranes at the lower RIGHT, the piers at the lower LEFT (frame 06)
  put(ctx.bake.card(QUAY, { w: 2048, h: 256, size: [400, 50], tint: "#d9b89a" }), 330, 25 - 0.3, -900);
  put(ctx.bake.card(PIERS, { w: 2048, h: 256, size: [400, 50], tint: "#cfa98c" }), -330, 25 - 0.3, -900);
  // far God: layer 1 so it can appear and leave on the clock (f154-247). Hazed by the tint, never a hard silhouette.
  const god = put(ctx.bake.card(GOD, { w: 512, h: 512, size: [330, 330], tint: "#b88a68", layer: 1, id: 0.5 }), 60, 150, -1250);
  god.visible = false;
  return {
    group,
    update(t) { god.visible = t >= T.godOn && t < T.godOff; },
    dispose() { for (const c of cards) c.userData.dispose?.(); },
  };
}
