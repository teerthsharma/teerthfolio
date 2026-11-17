// The return to the playable pup: two drawings of an eight-point ink-and-white star over the pup's box (the swap is under it), then 14 shards fly off.
import { makeCel, rgb } from "../../../kit/fx/cel.js";
import { hash } from "../live/city.js";
import { BACK } from "../clock.js";
import { PAL, toned } from "../tone.js";

const INK = toned(PAL.ink), WHITE = rgb(PAL.white), SHARDS = PAL.shards.map((h) => toned(h));

const star = (B, cx, cy, r, rot, col) => B.fan(cx, cy, Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2 + rot, q = r * (i % 2 ? 0.55 : 1) * (0.92 + 0.16 * hash(i, 31));
  return [cx + Math.cos(a) * q, cy + Math.sin(a) * q];
}), col);

export default function swapCel(ctx) {
  const cel = makeCel(ctx.engine, {
    max: 400, order: 1260,
    draw(B, ts, A) {
      const f = Math.floor((ts - BACK) * 24 + 1e-6), box = ctx.player?.box;
      if (f < 0 || f > 5 || !box) return;
      const bh = box[3] - box[1], cx = ((box[0] + box[2]) / 2) * A, cy = (box[1] + box[3]) / 2 - 0.1 * bh, r = 0.86 * bh * (1 + 0.14 * f);
      if (f < 2) {
        for (const [k, c] of [[1, INK], [0.965, WHITE], [0.6, INK], [0.56, WHITE]]) star(B, cx, cy, r * k, f * 0.4 + (k < 0.7 ? 0.14 : 0), c);
        return;
      }
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + hash(i, 5), q = r * (0.8 + 0.3 * hash(i, 6)) * (1 + 0.12 * (f - 2)), w = (0.03 * (6 - f)) / 4, x = cx + Math.cos(a) * q, y = cy + Math.sin(a) * q;
        B.tri(x - w, y, x + w, y - w * 0.4, x + Math.cos(a) * w * 3, y + Math.sin(a) * w * 3, SHARDS[i % 4]);
      }
    },
  });
  return { group: cel.group, update: (t, cue) => cel.update(cue?.t ?? t, cue), dispose: () => cel.dispose() };
}
