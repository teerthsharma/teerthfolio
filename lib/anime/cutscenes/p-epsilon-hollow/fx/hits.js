// The hits as comic panels (pr-triton-kernels-22/fx/index.js, recoloured): a panel beat draws its negative on frame 0, then paper with ink spikes;
// the turn and the return are two paper stars over the seal, then flecks. Behind the seal, except the stars.
import { Group, Vector3 } from "three";
import { makeCel } from "../../../kit/fx/cel.js";
import { hash } from "../live/slime.js";
import { HIT } from "../clock.js";
import { toned } from "../tone.js";
import { RAYS } from "./lens.js";

const INK = toned("#120820"), PAPER = toned("#e9fdff");
const ACC = { cyan: toned("#33e6ff"), violet: toned("#e6b8ff") };
const STAY = 7 / 24, V = new Vector3(), CH = new Vector3();
const LENS = RAYS.slice(0, 16).map((r) => [0, 0, -r.a, 1.4, 0.02]);

export default function build(ctx) {
  const group = new Group();
  const cam = () => ctx.player?.camera;
  const hits = (ctx.scene.beats ?? []).filter((b) => b.name === "panel" || b.name === "gather");
  const accent = (b) => (b.accent ? ACC[b.accent] ?? ACC.cyan : Math.abs(b.t - HIT.punch) < 0.05 || Math.abs(b.t - HIT.back) < 0.05 ? ACC.violet : ACC.cyan);

  const centre = (at, A) => {
    const c = cam(), w = at === "hand" ? ctx.seal.named?.()?.handR : at === "seal" ? ctx.seal.chest(CH) : null;
    if (!w || !c) return Array.isArray(at) ? [at[0] * A, at[1]] : [A / 2, 0.5];
    V.copy(w).project(c);
    return [(V.x * 0.5 + 0.5) * A, 0.5 - V.y * 0.5];
  };
  const spikes = (B, cx, cy, n, r0, seed, col, edge, k = 1) => {
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.8 * hash(i, seed)) / n) * Math.PI * 2, r = r0 * (0.7 + 0.7 * hash(i, seed + 1)), w = (0.02 + 0.17 * hash(i, seed + 2) ** 2) * k, dx = Math.cos(a), dy = Math.sin(a);
      for (const [c, g] of edge ? [[edge, 0.014], [col, 0]] : [[col, 0]]) B.tri(cx + dx * (r - g), cy + dy * (r - g), cx + dx * 2.6 - dy * (w / 2 + g), cy + dy * 2.6 + dx * (w / 2 + g), cx + dx * 2.6 + dy * (w / 2 + g), cy + dy * 2.6 - dx * (w / 2 + g), c);
    }
  };
  const stroke = (B, A, hx, hy, ang, len, wid, edge) => {
    const n = 14, pts = [], we = [], wc = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, d = (u - 0.5) * len, w = Math.pow(Math.sin(Math.PI * u), 0.55) * wid * 0.25;
      pts.push([A / 2 + (hx + Math.cos(ang) * d) * 0.5, 0.5 - (hy + Math.sin(ang) * d) * 0.5]);
      we.push(w); wc.push(w * 0.46);
    }
    B.ribbon(pts, we, edge);
    B.ribbon(pts, wc, PAPER);
  };
  const star = (B, cx, cy, r, seed, col) => B.fan(cx, cy, Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * Math.PI * 2 + seed, q = r * (i % 2 ? 0.66 : 1) * (0.92 + 0.16 * hash(i, 31));
    return [cx + Math.cos(a) * q, cy + Math.sin(a) * q];
  }), col);

  const panels = makeCel(ctx.engine, {
    max: 60000, order: 1200, behind: true,
    draw(B, ts, A) {
      const box = ctx.player?.box, bh = box ? box[3] - box[1] : 1, R = box && bh < 0.45 ? 1.25 * Math.max(bh, (box[2] - box[0]) * A) : 0;
      const px = box ? (box[0] + box[2] - 1) * A : 0, py = box ? 1 - box[1] - box[3] + 0.16 * bh : 0;
      for (const b of hits) {
        const age = ts - b.t, panel = b.name === "panel", stay = panel && b.kind !== "last" ? STAY : 0;
        if (age < -1e-6 || age >= b.dur + stay - 1e-6) continue;
        const [cx, cy] = centre(b.at, A), seed = Math.round(b.t * 10), hx = (cx - A / 2) * 2, hy = (0.5 - cy) * 2, acc = accent(b);
        const strokes = b.lens ? LENS : b.strokes ?? [];
        const line = (dx, dy, ang, len, wid, sk) => {
          let x = hx + dx, y = hy + dy;
          if (R) {
            const c = Math.cos(ang), s = Math.sin(ang), along = (px - x) * c + (py - y) * s, side = (py - y) * c - (px - x) * s;
            if (Math.abs(along) < len / 2 + R / 2 && Math.abs(side) < R) { const d = (side < 0 ? 1 : -1) * (R - Math.abs(side)); x -= s * d; y += c * d; }
          }
          stroke(B, A, x, y, ang + sk, len, wid, acc);
        };
        if (age >= b.dur - 1e-6) {
          const k = 1 - (age - b.dur) / stay;
          for (const [dx, dy, ang, len, wid] of strokes) line(dx, dy, ang, len, wid * (0.25 + 0.3 * k), 0.02);
          continue;
        }
        if (!panel) {
          const k = b.rev ? 1 - age / b.dur : age / b.dur, f = Math.floor(age * 12 + 1e-6);
          spikes(B, cx, cy, Math.round(12 + 44 * k * k), 0.62 - 0.36 * k, seed + f * 13, PAPER, INK, 0.18 + 0.45 * k);
          continue;
        }
        const f = Math.floor(age * 24 + 1e-6), dark = f === 0, field = dark ? INK : PAPER, ink = dark ? PAPER : INK;
        B.rect(0, 0, A, 1, field);
        spikes(B, cx, cy, 44, 0.24 + 0.05 * f, seed + f * 7, ink, null);
        for (const [dx, dy, ang, len, wid] of strokes) line(dx, dy, ang, len * (dark ? 0.8 : 1), wid * (dark ? 0.7 : 1), (f - 1) * 0.02);
      }
    },
  });

  const poof = makeCel(ctx.engine, {
    max: 400, order: 1260,
    draw(B, ts, A) {
      const box = ctx.player?.box;
      if (!box) return;
      const bh = box[3] - box[1], cx = ((box[0] + box[2]) / 2) * A, cy = (box[1] + box[3]) / 2 - 0.1 * bh;
      for (const [t0, col] of [[HIT.turn, ACC.cyan], [HIT.back, ACC.violet]]) {
        const f = Math.floor((ts - t0) * 24 + 1e-6), r = 0.86 * bh * (1 + 0.14 * f);
        if (f < 0 || f > 5) continue;
        if (f < 2) { for (const [k, c] of [[1, INK], [0.965, PAPER], [0.6, INK], [0.56, PAPER]]) star(B, cx, cy, r * k, f * 0.4 + (k < 0.7 ? 0.14 : 0), c); continue; }
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + hash(i, 5), q = r * (0.8 + 0.3 * hash(i, 6)), w = (0.03 * (6 - f)) / 4, x = cx + Math.cos(a) * q, y = cy + Math.sin(a) * q;
          B.tri(x - w, y, x + w, y - w * 0.4, x + Math.cos(a) * w * 3, y + Math.sin(a) * w * 3, col);
        }
      }
    },
  });
  group.add(panels.group, poof.group);

  return {
    group,
    update(t, cue) {
      panels.update(t, cue);
      poof.update(t, cue);
    },
    dispose() { panels.dispose(); poof.dispose(); },
  };
}
