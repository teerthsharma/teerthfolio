// ゴゴゴゴ (bible "Glyphs GOGOGO"): EXACTLY 12 brush ゴ glyphs, two flanking columns of six, 18 % of frame height each,
// black outline + magenta shadow (drawn in the lettering atlas). Screen-space at |x| = .86 so they never touch the seal.
// Maths: glyph i appears at t_i = g0 + (i/12) 2.0 s (all 12 by g0 + 1.83: on screen at 3.5 s for g0 = 1.5), rises
//   y_i(t) = y_i^0 - .45 (1 - easeOut(clamp((t - t_i)/.4))), wobbles on twos: rot = .06 (h(step, i) - .5) * 2, dy = .012 (h' - .5) * 2.
//   fade over the last second of the window. Height 0.36 in NDC-y units (= 18 % of the frame).
import { clamp01, sstep, hash, beatOf, letter } from "./common.js";

export default function gogogo(ctx, sh) {
  const { THREE } = ctx;
  const { atlas, fps } = sh;
  const group = new THREE.Group();
  const gl = [];
  for (let i = 0; i < 12; i++) { const l = letter(ctx, atlas, 155); group.add(l.mesh); gl.push(l); }
  function update(t) {
    const b = beatOf(ctx, "gogogo"), end = b.t + b.dur, step = Math.floor(t * fps);
    const fade = 1 - sstep(end - 1.0, end, t);
    for (let i = 0; i < 12; i++) {
      const ti = b.t + (i / 12) * 2.0, age = (t - ti) / 0.4;
      if (t < ti || t >= end) { gl[i].hide(); continue; }
      const col = i % 2, row = i >> 1, side = col ? 1 : -1;
      const e = 1 - (1 - clamp01(age)) * (1 - clamp01(age));
      const y0 = -0.78 + row * 0.31 + (col ? 0.1 : 0);
      gl[i].show("GO", side * 0.88, y0 - 0.45 * (1 - e) + 0.024 * (hash(step * 1.3 + i) - 0.5), 0.36 * (0.7 + 0.3 * e), 0.12 * (hash(step * 2.1 + i * 3.7) - 0.5), fade, 1.0);
    }
  }
  return { group, update, dispose() { for (const l of gl) { l.mesh.material.dispose(); l.mesh.geometry.dispose(); } } };
}
