// The return of pr-topograph-432 and Ainz's eye flare, as flat polygons over the picture (kit/fx/cel.js). A pure function of the layer clock.
// At BACK: one ink gutter drawing, two star drawings over the figure, then 14 flecks for four drawings while the pale pup stands.
import { Group, Vector3 } from "three";
import { makeCel } from "../../../kit/fx/cel.js";
import { T, W } from "../clock.js";
import { toned } from "../tone.js";
import { ANCHOR, hash } from "./hits.js";

const col = { ink: toned("#05020a"), gold: toned("#f0b429"), gold2: toned("#ffd35a") };
const EYES = [[-0.12, 0.04, 0.27], [0.12, 0.04, 0.27]];

export function makePoof(ctx) {
  const group = new Group(), V = new Vector3();
  const proj = (p, A) => { const c = ctx.player?.camera; if (!c) return null; V.set(p[0], p[1], p[2]).project(c); return V.z > 1 ? null : [(V.x * 0.5 + 0.5) * A, 0.5 - V.y * 0.5]; };
  const star = (B, cx, cy, r, seed, c) => B.fan(cx, cy, Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * Math.PI * 2 + seed, q = r * (i % 2 ? 0.66 : 1) * (0.92 + 0.16 * hash(i, 31));
    return [cx + Math.cos(a) * q, cy + Math.sin(a) * q];
  }), c);
  const flare = (B, x, y) => {
    const pts = Array.from({ length: 25 }, (_, i) => { const a = (i / 24) * Math.PI * 2; return [x + Math.cos(a) * 0.06, y + Math.sin(a) * 0.06]; });
    B.ribbon(pts, pts.map(() => 0.004), col.gold);
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 + Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
      B.tri(x + c * 0.05 - s * 0.006, y + s * 0.05 + c * 0.006, x + c * 0.1, y + s * 0.1, x + c * 0.05 + s * 0.006, y + s * 0.05 - c * 0.006, col.gold);
    }
  };

  const cel = makeCel(ctx.engine, {
    max: 800, order: 1260,
    draw(B, ts, A) {
      const f = Math.floor((ts - T.back) * 24 + 1e-6), box = ctx.player?.box;
      if (f === -1) B.rect(0, 0, A, 1, col.ink);
      if (box && f >= 0 && f <= 5) {
        const bh = box[3] - box[1], cx = ((box[0] + box[2]) / 2) * A, cy = (box[1] + box[3]) / 2 - 0.1 * bh, r = 0.86 * bh * (1 + 0.14 * f);
        if (f < 2) for (const [k, c] of [[1, col.ink], [0.965, col.gold], [0.6, col.ink], [0.56, col.gold2]]) star(B, cx, cy, r * k, f * 0.4 + (k < 0.7 ? 0.14 : 0), c);
        else for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2 + hash(i, 5), q = r * (0.8 + 0.3 * hash(i, 6)), w = (0.03 * (6 - f)) / 4, L = w * (1 + (i % 3)), x = cx + Math.cos(a) * q, y = cy + Math.sin(a) * q;
          B.tri(x - w, y, x + w, y - w * 0.4, x + Math.cos(a) * L, y + Math.sin(a) * L, i % 3 ? col.ink : col.gold);
        }
      }
      const age = ts - T.ignite[0];
      if (age >= 0 && age < 2 / 12 + 1e-6) {
        const s = W(ANCHOR.skull);
        for (const e of EYES) { const p = proj([s[0] + e[0], s[1] + e[1], s[2] + e[2]], A); if (p) flare(B, p[0], p[1]); }
      }
    },
  });
  group.add(cel.group);

  return { group, update(t, dt, cue) { cel.update(t, cue); }, dispose() { cel.dispose(); } };
}
