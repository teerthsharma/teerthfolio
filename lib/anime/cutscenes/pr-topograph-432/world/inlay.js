// THE DORMANT FLOOR CIRCLE (static art, layer 0): the gold inlay the Super-Tier circle blooms out of (shot 2, "the circle
// blooms"). The FX layer owns the LIVE counter-rotating circle (rings, 24 glyphs a ring, hex star, beams); this is the stone-cut
// version underneath: 3 ring bands (outer radius 8 m), 24 rune ticks on the outer band, a hex star, a hub, flat gold lit
// #e6b43a on shadow #a8741a, black outline via engine.ink, no emission (the live circle carries the 0.25 emissive).
//
// EASTER EGG 6: "432" cut in the outer band as three 7-segment digits at the back (-z) of the ring, readable from the lens
// side. Segments (u right, v up; v maps to -z): a top, b top-right, c bottom-right, d bottom, e bottom-left, f top-left, g mid.
//   4 = f b g c     3 = a b g c d     2 = a b g e d
import { BoxGeometry, CylinderGeometry, RingGeometry } from "three";
import { C, part, joined } from "./helpers.js";

const SEG = { a: [0, 1, 1, 0], b: [0.5, 0.5, 0, 1], c: [0.5, -0.5, 0, 1], d: [0, -1, 1, 0], e: [-0.5, -0.5, 0, 1], f: [-0.5, 0.5, 0, 1], g: [0, 0, 1, 0] };
const DIGITS = { 4: "fbgc", 3: "abgcd", 2: "abged" };

export function buildInlay(engine, group) {
  const parts = [];
  const flat = (g, y) => g.rotateX(-Math.PI / 2).translate(0, y, 0);
  const ring = (r0, r1, y, col = C.goldMid, sh = C.goldShade) => parts.push(part(flat(new RingGeometry(r0, r1, 64, 1), y), col, sh));
  ring(7.55, 8.0, 0.05); ring(6.35, 6.5, 0.052); ring(4.55, 4.7, 0.054); ring(2.5, 2.62, 0.056);
  parts.push(part(flat(new RingGeometry(0, 0.7, 24, 1), 0.058), C.goldLit, C.goldMid)); // hub

  // 24 rune ticks on the outer band: tangential bars of alternating length (a stand-in alphabet; the live circle draws glyphs)
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2, r = 7.78, len = k % 2 ? 0.2 : 0.34;
    parts.push(part(new BoxGeometry(0.05, 0.012, len).rotateY(-a).translate(Math.cos(a) * r, 0.062, Math.sin(a) * r), C.goldDeepish ?? C.goldShade, C.goldShade));
  }
  // second glyph row on the middle ring: dots
  for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2 + 0.13; parts.push(part(new CylinderGeometry(0.07, 0.07, 0.012, 6).translate(Math.cos(a) * 5.45, 0.06, Math.sin(a) * 5.45), C.goldLit, C.goldMid)); }

  // hex star: two triangles, R = 4.4, each edge a thin flat bar
  for (const off of [Math.PI / 2, -Math.PI / 2]) for (let k = 0; k < 3; k++) {
    const a0 = off + (k * 2 * Math.PI) / 3, a1 = off + ((k + 1) * 2 * Math.PI) / 3, R = 4.4;
    const x0 = Math.cos(a0) * R, z0 = Math.sin(a0) * R, x1 = Math.cos(a1) * R, z1 = Math.sin(a1) * R;
    const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0);
    parts.push(part(new BoxGeometry(len, 0.012, 0.12).rotateY(-ang).translate((x0 + x1) / 2, 0.06, (z0 + z1) / 2), C.goldMid, C.goldShade));
  }

  // 432: digits 0.42 wide, 0.8 tall, bars 0.07, centred on the outer band's inner edge at angle -90 deg (the -z side)
  const text = "432", dw = 0.42, dh = 0.8, gap = 0.18, t0 = -((text.length * dw + (text.length - 1) * gap) / 2) + dw / 2;
  for (let n = 0; n < text.length; n++) {
    const cx = t0 + n * (dw + gap);
    for (const s of DIGITS[text[n]]) {
      const [u, v, hz, vt] = SEG[s];
      const sx = hz ? dw : 0.07, sz = vt ? dh / 2 : 0.07;
      parts.push(part(new BoxGeometry(sx, 0.012, sz).translate(cx + u * dw, 0.064, -6.95 - v * dh / 2), C.goldLit, C.goldMid));
    }
  }
  const m = engine.prop(joined(parts, "inlay"), 0.5);
  engine.ink(m, 0.6);
  group.add(m);
  return m;
}
