// The turn back to the pale seal: two drawings of a gold star over the character, then fourteen gold and cream flecks fly off (24 fps).
import { Group } from "three";
import { makeCel } from "../../../kit/fx/cel.js";
import { BACK } from "../clock.js";
import { hash } from "../live/toon.js";
import { toned } from "../tone.js";

const GOLD = toned("#f3c04e"), CREAM = toned("#fbfaf7"), FLASH = toned("#ffd27a");

const star = (B, cx, cy, r, seed, col) => B.fan(cx, cy, Array.from({ length: 22 }, (_, i) => {
  const a = (i / 22) * Math.PI * 2 + seed, q = r * (i % 2 ? 0.66 : 1) * (0.92 + 0.16 * hash(i, 31));
  return [cx + Math.cos(a) * q, cy + Math.sin(a) * q];
}), col);

export function buildSwap(ctx) {
  const group = new Group();
  const cel = makeCel(ctx.engine, {
    max: 400, order: 1260,
    draw(B, ts, A) {
      const f = Math.floor((ts - BACK) * 24 + 1e-6), box = ctx.player?.box;
      if (f < 0 || f > 5 || !box) return;
      const bh = box[3] - box[1], cx = ((box[0] + box[2]) / 2) * A, cy = (box[1] + box[3]) / 2 - 0.1 * bh, r = 0.86 * bh * (1 + 0.14 * f);
      if (f < 2) {
        B.rect(0, 0, A, 1, FLASH, 0.12);
        for (const [k, c] of [[1, GOLD], [0.6, CREAM], [0.56, GOLD]]) star(B, cx, cy, r * k, f * 0.4 + (k < 0.7 ? 0.14 : 0), c);
        return;
      }
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + hash(i, 5), q = r * (0.8 + 0.3 * hash(i, 6)) * (1 + 0.12 * (f - 1));
        const w = (0.03 * (6 - f)) / 4, x = cx + Math.cos(a) * q, y = cy + Math.sin(a) * q;
        B.tri(x - w, y, x + w, y - w * 0.4, x + Math.cos(a) * w * 3, y + Math.sin(a) * w * 3, i % 2 ? CREAM : GOLD);
      }
    },
  });
  group.add(cel.group);
  return {
    group,
    update(t, cue) { cel.update(t, cue); group.visible = t >= BACK - 1e-6 && t < BACK + 6 / 24; },
    dispose() { cel.dispose(); },
  };
}
