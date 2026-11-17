// CRUNCH: the two-drawing impact at the break (an umber field with ivory crack veins and their branches, then the ivory field with the same
// veins in crimson and a crimson ring), the shard burst that falls off the picture, and the transform back as an event: a paper star for
// two drawings, then flecks flying off over the seal's box. Drawn at 24 fps from BACK.
import { Group, Vector3 } from "three";
import { makeCel } from "../../../kit/fx/cel.js";
import { BACK } from "../clock.js";
import { hash } from "../live/look.js";
import { IVORY, SFX, UMBER } from "../palette.js";
import { toned } from "../tone.js";

export const CRUNCH = { back: BACK, shards: 140, impact: 2, star: [1, 0.965, 0.6, 0.56] };
const IVORY_C = toned(IVORY), UMBER_C = toned(UMBER), SFX_C = toned(SFX);
const SHARD = [IVORY_C, IVORY_C, IVORY_C, UMBER_C, UMBER_C, UMBER_C, SFX_C];

function star(B, cx, cy, r, seed, col) {
  B.fan(cx, cy, Array.from({ length: 22 }, (_, i) => { const a = (i / 22) * Math.PI * 2 + seed, q = r * (i % 2 ? 0.66 : 1) * (0.92 + 0.16 * hash(i, 31)); return [cx + Math.cos(a) * q, cy + Math.sin(a) * q]; }), col);
}

// main vein i: 5 points from the mouth out, and its base angle
function main(cx, cy, i) {
  const a = (i / 24) * Math.PI * 2 + 0.1 * hash(i, 51), pts = [];
  for (let k = 0; k <= 4; k++) { const r = (0.05 + 0.3 * (k / 4)) * (1 + 0.3 * hash(i * 5 + k, 52)), j = 0.05 * hash(k, i); pts.push([cx + Math.cos(a + j) * r, cy + Math.sin(a + j) * r]); }
  return { a, pts };
}

// the crack web: 24 veins from the mouth, and 12 branches off the middle of every other one (from 55 percent of its length, plus or minus 0.5 rad)
function veins(B, cx, cy, col) {
  for (let i = 0; i < 24; i++) B.ribbon(main(cx, cy, i).pts, [0, 1, 2, 3, 4].map((k) => 0.0025 * (1 - k / 5)), col);
  for (let i = 0; i < 12; i++) {
    const { a, pts } = main(cx, cy, 2 * i), [p, q] = [pts[2], pts[3]], o = [p[0] + 0.2 * (q[0] - p[0]), p[1] + 0.2 * (q[1] - p[1])];
    const b = a + (i % 2 ? 0.5 : -0.5), L = 0.1 + 0.05 * hash(i, 61);
    B.ribbon([o, [o[0] + (Math.cos(b) * L) / 2, o[1] + (Math.sin(b) * L) / 2], [o[0] + Math.cos(b) * L, o[1] + Math.sin(b) * L]], [0.0016, 0.001, 0.0004], col);
  }
}

export function buildCrunch(ctx) {
  const group = new Group(), V = new Vector3();
  const frameAt = (p, A) => { V.copy(p).project(ctx.player.camera); return [(V.x * 0.5 + 0.5) * A, 0.5 - V.y * 0.5]; };
  const mouth = (A) => {
    const m = ctx.nerve?.mouth;
    if (m && ctx.player?.camera) return frameAt(m, A);
    const box = ctx.player?.box;
    return box ? [((box[0] + box[2]) / 2) * A, (box[1] + box[3]) / 2] : [A / 2, 0.5];
  };

  // drawings 0 and 1 of the impact: the umber field and its ivory veins (0); the ivory field, the same veins in crimson and a crimson ring (1)
  const field = makeCel(ctx.engine, {
    max: 4000, order: 1270,
    draw(B, ts, A) {
      const f = Math.floor((ts - BACK) * 24 + 1e-6);
      if (f < 0 || f >= CRUNCH.impact) return;
      const [cx, cy] = mouth(A);
      B.rect(0, 0, A, 1, f === 0 ? UMBER_C : IVORY_C);
      veins(B, cx, cy, f === 0 ? IVORY_C : SFX_C);
      if (f === 1) { const pts = Array.from({ length: 49 }, (_, k) => { const a = (k / 48) * Math.PI * 2; return [cx + Math.cos(a) * 0.36, cy + Math.sin(a) * 0.36]; }); B.ribbon(pts, pts.map(() => 0.006), SFX_C); }
    },
  });

  // 140 shards: each an outer triangle in the opposite field tone, and its inner triangle at 0.62 of the radius in its own colour
  const shards = makeCel(ctx.engine, {
    max: 4000, order: 1205, behind: true,
    draw(B, ts, A) {
      const tau = ts - BACK;
      if (tau < 0 || tau > 0.9) return;
      const [cx, cy] = mouth(A);
      for (let i = 0; i < CRUNCH.shards; i++) {
        const a = 2 * Math.PI * hash(i, 41), v = 0.4 + 1.2 * hash(i, 42), s = 0.012 + 0.05 * hash(i, 44);
        const x = cx + Math.cos(a) * v * tau, y = cy - Math.sin(a) * v * tau + 4.5 * tau * tau;
        const spin = (hash(i, 45) - 0.5) * 14 * tau + 2 * Math.PI * hash(i, 46), col = SHARD[i % SHARD.length], outer = col === IVORY_C ? UMBER_C : IVORY_C;
        const p = [0, 1, 2].map((k) => [x + Math.cos(spin + (k * 2 * Math.PI) / 3) * s, y + Math.sin(spin + (k * 2 * Math.PI) / 3) * s]);
        const q = p.map(([px, py]) => [x + (px - x) * 0.62, y + (py - y) * 0.62]);
        B.tri(p[0][0], p[0][1], p[1][0], p[1][1], p[2][0], p[2][1], outer);
        B.tri(q[0][0], q[0][1], q[1][0], q[1][1], q[2][0], q[2][1], col);
      }
    },
  });

  const poof = makeCel(ctx.engine, {
    max: 800, order: 1275,
    draw(B, ts, A) {
      const f = Math.floor((ts - BACK) * 24 + 1e-6), box = ctx.player?.box;
      if (f < 0 || f > 5 || !box) return;
      const bh = box[3] - box[1], cx = ((box[0] + box[2]) / 2) * A, cy = (box[1] + box[3]) / 2 - 0.1 * bh, r = 0.86 * bh * (1 + 0.14 * f);
      if (f < 2) { CRUNCH.star.forEach((k, j) => star(B, cx, cy, r * k, f * 0.4 + j * 0.05, j % 2 ? IVORY_C : UMBER_C)); return; }
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + hash(i, 5), q = r * (0.8 + 0.3 * hash(i, 6)) * (1 + 0.22 * (f - 2)), w = (0.03 * (6 - f)) / 4, x = cx + Math.cos(a) * q, y = cy + Math.sin(a) * q;
        B.tri(x - w, y, x + w, y - w * 0.4, x + Math.cos(a) * w * 3, y + Math.sin(a) * w * 3, i % 3 ? UMBER_C : IVORY_C);
      }
    },
  });

  group.add(shards.group, field.group, poof.group);
  return {
    group,
    update(t, cue) { shards.update(t, cue); field.update(t, cue); poof.update(t, cue); },
    dispose() { shards.dispose(); field.dispose(); poof.dispose(); },
  };
}
