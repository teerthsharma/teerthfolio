// The stage wash at the credit (the live ReturnWipe, flat #e0559b) and the turn back to the pale seal: a paper star over the seal, then its flecks fly off.
import { Group } from "three";
import { makeCel } from "../../../kit/fx/cel.js";
import { BACK, WASH, smooth } from "../clock.js";
import { PAL } from "../palette.js";
import { toned } from "../tone.js";

export const SWAP = { back: BACK, squashOut: [0.86], squashIn: [0.6, 1.14, 1.14, 0.96, 0.96] };
const WASH_C = toned(PAL.wash), HOT = toned(PAL.hot), SUN = toned(PAL.sunWhite), CREAM = toned(PAL.title);
const STAR = [[1, HOT], [0.965, SUN], [0.6, HOT], [0.56, CREAM]];
const hash = (i, k) => { let h = Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(k + 7, 0x85ebca6b); h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h = Math.imul(h ^ (h >>> 12), 0x297a2d39); return ((h ^ (h >>> 15)) >>> 0) / 4294967296; };

const star = (B, cx, cy, r, seed, col) => B.fan(cx, cy, Array.from({ length: 22 }, (_, i) => {
  const a = (i / 22) * Math.PI * 2 + seed, q = r * (i % 2 ? 0.66 : 1) * (0.92 + 0.16 * hash(i, 31));
  return [cx + Math.cos(a) * q, cy + Math.sin(a) * q];
}), col);

export function makeSwap(ctx) {
  const wash = makeCel(ctx.engine, { max: 4, order: 1250, draw(B, ts, A) {
    const a = smooth(WASH[0], WASH[1], ts) * (1 - smooth(WASH[1], WASH[2], ts));
    if (a > 0.003) B.rect(0, 0, A, 1, WASH_C, Math.min(1, a));
  } });
  const poof = makeCel(ctx.engine, { max: 400, order: 1260, draw(B, ts, A) {
    const f = Math.floor((ts - BACK) * 24 + 1e-6), box = ctx.player?.box;
    if (f < 0 || f > 5 || !box) return;
    const bh = box[3] - box[1], cx = ((box[0] + box[2]) / 2) * A, cy = (box[1] + box[3]) / 2 - 0.1 * bh, r = 0.86 * bh * (1 + 0.14 * f);
    if (f < 2) { for (const [k, c] of STAR) star(B, cx, cy, r * k, f * 0.4 + (k < 0.7 ? 0.14 : 0), c); return; }
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + hash(i, 5), q = r * (0.8 + 0.3 * hash(i, 6)) * (1 + 0.12 * (f - 2)), w = (0.03 * (6 - f)) / 4;
      const x = cx + Math.cos(a) * q, y = cy + Math.sin(a) * q;
      B.tri(x - w, y, x + w, y - w * 0.4, x + Math.cos(a) * w * 3, y + Math.sin(a) * w * 3, i % 3 ? SUN : HOT);
    }
  } });
  const group = new Group();
  group.add(wash.group, poof.group);
  return {
    group,
    update(t, dt, cue) { wash.update(t, cue); poof.update(t, cue); },
    dispose() { wash.dispose(); poof.dispose(); },
  };
}
