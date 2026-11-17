// Things break, in the style's inks: the chessboard shatters at CHECKMATE and the board sheds chalk dust at its hit. Flat, screen-space, behind the seal.
import { Group } from "three";
import { makeCel } from "../../../kit/fx/cel.js";
import { BD, MT } from "../clock.js";
import { toned } from "../tone.js";

const INK = toned("#111111"), CREAM = toned("#fbf6ea"), CHALK = toned("#f4f0e0");
const hash = (i, k) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
const SHARDS = Array.from({ length: 48 }, (_, i) => ({
  x0: 0.1 + 0.8 * hash(i, 1), y0: 0.35 + 0.6 * hash(i, 2), s: 0.07 + 0.09 * hash(i, 3),
  v: 0.6 + 1.2 * hash(i, 4), spin: 2 + 4 * hash(i, 5), a0: 2 * Math.PI * hash(i, 6), col: i < 36 ? INK : CREAM,
}));
const KING = Array.from({ length: 6 }, (_, i) => ({
  t0: 9.135 + 0.083 * hash(i, 10), a0: 2 * Math.PI * hash(i, 11), v: 0.5 + 0.8 * hash(i, 12), s: 0.05 + 0.04 * hash(i, 13), spin: 3 + 4 * hash(i, 14),
}));
const PUFF = Array.from({ length: 14 }, (_, i) => ({ x: 0.78 + (hash(i, 7) - 0.5) * 0.1, y: 0.3 + (hash(i, 8) - 0.5) * 0.08, r: 0.07 + 0.03 * hash(i, 9) }));
const LIFE = 0.9, PUFF_LIFE = 0.5;
const tri = (B, cx, cy, s, th, col) => {
  const p = [[0, -1], [0.87, 0.5], [-0.87, 0.5]].map(([x, y]) => [cx + s * (x * Math.cos(th) - y * Math.sin(th)), cy + s * (x * Math.sin(th) + y * Math.cos(th))]);
  B.tri(p[0][0], p[0][1], p[1][0], p[1][1], p[2][0], p[2][1], col);
};

export function buildBreak(ctx) {
  const group = new Group();
  const cel = makeCel(ctx.engine, {
    max: 800, order: 1210, behind: true,
    draw(B, ts, A) {
      const age = ts - MT;
      if (age >= 0 && age < LIFE) {
        const k = 1 - age / LIFE, O = [0.5 * A, 0.7];
        for (const sh of SHARDS) {
          const px = sh.x0 * A, py = sh.y0;
          let dx = px - O[0], dy = py - O[1];
          const l = Math.hypot(dx, dy) || 1;
          dx /= l; dy /= l;
          tri(B, px + dx * sh.v * age, py + dy * sh.v * age, sh.s * k, sh.a0 + sh.spin * age, sh.col);
        }
      }
      for (const f of KING) {
        const a = ts - f.t0;
        if (a >= 0 && a < LIFE) tri(B, 0.2 * A + Math.cos(f.a0) * f.v * a, 0.9 + Math.sin(f.a0) * f.v * a, f.s, f.spin * a, CREAM);
      }
      const dust = ts - BD;
      if (dust >= 0 && dust < PUFF_LIFE) {
        const g = dust / PUFF_LIFE;
        for (const p of PUFF) {
          const cx = p.x * A, cy = p.y, r = p.r * g;
          B.fan(cx, cy, Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }), CHALK);
        }
      }
    },
  });
  group.add(cel.group);
  return {
    group,
    update(t, cue) { cel.update(t, cue); },
    dispose() { cel.dispose(); },
  };
}
