// THE TURN of Railgun: the paper star at the pup-to-character swap (2.16 s) and the character-to-pup swap (17.08 s).
import { makeCel, rgb } from "../../../kit/fx/cel.js";
import { R } from "../clock.js";
import { AMBER, CREAM, NAVY } from "../palette.js";

const C = { AMBER: rgb(AMBER), CREAM: rgb(CREAM), NAVY: rgb(NAVY) };

const star = (B, cx, cy, r, col) => B.fan(cx, cy, Array.from({ length: 22 }, (_, i) => {
  const a = (i / 22) * Math.PI * 2, q = r * (i % 2 ? 0.66 : 1);
  return [cx + Math.cos(a) * q, cy + Math.sin(a) * q];
}), col);

export function swapCel(ctx) {
  const rnd = ctx.rng(41);
  const FL = Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * Math.PI * 2 + rnd() * 6.283, s: 0.8 + 0.3 * rnd(), col: i % 2 ? C.CREAM : C.AMBER }));
  const cel = makeCel(ctx.engine, {
    max: 2000, order: 1260,
    draw(B, ts, A) {
      const box = ctx.player?.box ?? [0.4, 0.3, 0.6, 0.7], bh = box[3] - box[1];
      const cx = ((box[0] + box[2]) / 2) * A, cy = (box[1] + box[3]) / 2 - 0.1 * bh;
      const f1 = Math.floor((ts - R.impact) * 24 + 1e-6), f2 = Math.floor((ts - R.pass) * 24 + 1e-6);
      if (f1 >= 0 && f1 <= 1) {
        const r = 0.86 * bh * (1 + 0.14 * f1);
        star(B, cx, cy, r, C.CREAM); star(B, cx, cy, r * 0.6, C.NAVY); star(B, cx, cy, r * 0.56, C.CREAM);
      } else if (f2 >= 0 && f2 <= 1) {
        const r = 0.86 * bh * (1 + 0.14 * f2);
        star(B, cx, cy, r, C.AMBER); star(B, cx, cy, r * 0.965, C.CREAM); star(B, cx, cy, r * 0.6, C.NAVY); star(B, cx, cy, r * 0.56, C.CREAM);
      } else if (f2 >= 2 && f2 <= 5) {
        const r = 0.86 * bh * 1.14;
        for (const p of FL) {
          const q = r * p.s, x = cx + Math.cos(p.a) * q, y = cy + Math.sin(p.a) * q, w = (0.03 * (6 - f2)) / 4;
          B.tri(x - w, y, x + w, y - w * 0.4, x + Math.cos(p.a) * w * 3, y + Math.sin(p.a) * w * 3, p.col);
        }
      }
    },
  });
  return { group: cel.group, update: (t, cue) => cel.update(t, cue), dispose: () => cel.dispose() };
}
