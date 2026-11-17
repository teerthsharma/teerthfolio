// The turn back of pr-highway-3244: two 24 fps drawings of a stacked paper star over the seal's box at POP, then gold and cream flecks fly off.
import { Group } from "three";
import { makeCel, rgb } from "../../../kit/fx/cel.js";
import { POP } from "../clock.js";
import { hash } from "../live/shade.js";

const GOLD = rgb("#ffc926"), CREAM = rgb("#fff1d0");
const star = (B, cx, cy, r, seed, col) => B.fan(cx, cy, Array.from({ length: 22 }, (_, i) => {
  const a = (i / 22) * Math.PI * 2 + seed, q = r * (i % 2 ? 0.66 : 1) * (0.92 + 0.16 * hash(i, 31));
  return [cx + Math.cos(a) * q, cy + Math.sin(a) * q];
}), col);

export default function build(ctx) {
  const group = new Group();
  const cel = makeCel(ctx.engine, {
    max: 400, order: 1260,
    draw(B, ts, A) {
      const f = Math.floor((ts - POP) * 24 + 1e-6), box = ctx.player?.box;
      if (f < 0 || f > 5 || !box) return;
      const bh = box[3] - box[1], cx = ((box[0] + box[2]) / 2) * A, cy = (box[1] + box[3]) / 2 - 0.1 * bh, r = 1.3 * 0.86 * bh * (1 + 0.14 * f);
      if (f < 2) {
        for (const [k, c] of [[1, GOLD], [0.965, CREAM], [0.6, GOLD], [0.56, CREAM]]) star(B, cx, cy, r * k, f * 0.4 + (k < 0.7 ? 0.14 : 0), c);
        return;
      }
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + hash(i, 5), q = r * (0.8 + 0.3 * hash(i, 6)), w = (0.03 * (6 - f)) / 4, x = cx + Math.cos(a) * q, y = cy + Math.sin(a) * q;
        B.tri(x - w, y, x + w, y - w * 0.4, x + Math.cos(a) * w * 3, y + Math.sin(a) * w * 3, GOLD);
      }
    },
  });
  group.add(cel.group);
  return {
    group,
    update(t, cue) {
      cel.update(t, cue);
    },
    dispose() {
      cel.dispose();
    },
  };
}
