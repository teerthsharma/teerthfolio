// The two hits as manga panels in the style's own inks: focus lines closing on the hit (`gather`), then impact panels (`panel`) with their
// strokes and gold shards. Drawn flat to the lens over the picture; the seal's box is cut out of every batch so the seal stays whole.
import { Group, Vector3 } from "three";
import { makeCel } from "../../../kit/fx/cel.js";
import { DOCK, HW } from "../clock.js";
import { hash } from "../live/toon.js";
import { toned } from "../tone.js";

const INK = toned("#402c12"), CREAM = toned("#fbfaf7"), GOLD = toned("#f3c04e"), ACC = toned("#e0a043");
const STAY = 7 / 24;
const SHARD_N = 24;

export function hitCel(ctx, hits) {
  const list = hits ?? (ctx.scene.beats ?? []).filter((b) => b.name === "panel" || b.name === "gather");
  const group = new Group(), V = new Vector3(), AT = new Vector3(...DOCK), SCALE = new Vector3(...HW).add(AT);
  const cam = () => ctx.player?.camera;
  const open = (t) => list.some((b) => t >= b.t - 1e-6 && t < b.t + b.dur + (b.name === "panel" ? STAY : 0));

  // a hit's centre in batch units (x 0..A, y 0..1 down): the seal's chest, the scale's palm, or a frame point [u, v]
  const centre = (at, A) => {
    const c = cam(), w = at === "seal" ? ctx.seal.chest(new Vector3()) : at === "scale" ? SCALE : null;
    if (!w || !c) return Array.isArray(at) ? [at[0] * A, at[1]] : [A / 2, 0.5];
    V.copy(w).project(c);
    return [(V.x * 0.5 + 0.5) * A, 0.5 - V.y * 0.5];
  };
  // spikes toward (cx, cy): each a wedge with its point r0 short of the centre (jittered) and its foot past the frame
  const spikes = (B, cx, cy, n, r0, seed, col, edge, k = 1) => {
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.8 * hash(i, seed)) / n) * Math.PI * 2, r = r0 * (0.7 + 0.7 * hash(i, seed + 1)), w = (0.02 + 0.17 * hash(i, seed + 2) ** 2) * k;
      const dx = Math.cos(a), dy = Math.sin(a);
      for (const [c, g] of edge ? [[edge, 0.014], [col, 0]] : [[col, 0]]) {
        B.tri(cx + dx * (r - g), cy + dy * (r - g), cx + dx * 2.6 - dy * (w / 2 + g), cy + dy * 2.6 + dx * (w / 2 + g), cx + dx * 2.6 + dy * (w / 2 + g), cy + dy * 2.6 - dx * (w / 2 + g), c);
      }
    }
  };
  // one stroke: a tapered ribbon of `col` with a cream core (hx, hy in batch units from the centre, y up)
  const stroke = (B, A, hx, hy, ang, len, wid, col) => {
    const n = 14, pts = [], we = [], wc = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, d = (u - 0.5) * len, w = Math.pow(Math.sin(Math.PI * u), 0.55) * wid * 0.25;
      pts.push([A / 2 + (hx + Math.cos(ang) * d) * 0.5, 0.5 - (hy + Math.sin(ang) * d) * 0.5]);
      we.push(w); wc.push(w * 0.46);
    }
    B.ribbon(pts, we, col);
    B.ribbon(pts, wc, CREAM);
  };

  const cel = makeCel(ctx.engine, {
    max: 60000, order: 1200, sealBox: () => ctx.player?.box,
    draw(B, ts, A) {
      for (const b of list) {
        const panel = b.name === "panel", age = ts - b.t, stay = panel ? STAY : 0;
        if (age < -1e-6 || age >= b.dur + stay - 1e-6) continue;
        const [cx, cy] = centre(b.at, A), seed = Math.round(b.t * 10), hx = (cx - A / 2) * 2, hy = (0.5 - cy) * 2;
        if (!panel) {
          const k = b.rev ? 1 - age / b.dur : age / b.dur, f = Math.floor(age * 12 + 1e-6);
          spikes(B, cx, cy, Math.round(12 + 44 * k * k), 0.62 - 0.36 * k, seed + f * 13, CREAM, INK, 0.18 + 0.45 * k);
          continue;
        }
        if (age >= b.dur - 1e-6) {
          const k = 1 - (age - b.dur) / stay;
          for (const [dx, dy, ang, len, wid] of b.strokes ?? []) stroke(B, A, hx + dx, hy + dy, ang + 0.02, len, wid * (0.25 + 0.3 * k), ACC);
          continue;
        }
        const f = Math.floor(age * 24 + 1e-6), neg = f === 0, trim = neg ? GOLD : ACC;
        B.rect(0, 0, A, 1, neg ? INK : GOLD);
        spikes(B, cx, cy, 44, 0.24 + 0.05 * f, seed + f * 7, neg ? CREAM : INK, null);
        if (neg && b.kind === "shatter") { stroke(B, A, hx, hy, -0.75, 1.6, 0.14, CREAM); stroke(B, A, hx + 0.5, hy - 0.2, -0.75, 1.2, 0.1, CREAM); }
        if (neg && b.kind === "release") { stroke(B, A, hx - 0.2, hy, -1.2, 1.1, 0.12, CREAM); stroke(B, A, hx + 0.2, hy, 1.2, 1.1, 0.12, CREAM); }
        for (const [dx, dy, ang, len, wid] of b.strokes ?? []) stroke(B, A, hx + dx, hy + dy, ang + (f - 1) * 0.02, len * (neg ? 0.8 : 1), wid * (neg ? 0.7 : 1), trim);
        if (b.kind === "shatter" && !neg) for (const ang of [-0.7, 0.4, 2.2]) stroke(B, A, hx, hy, ang, 1.8, 0.07, ACC);
        if (b.kind === "shatter" && age < 0.4) for (let i = 0; i < SHARD_N; i++) {
          const a = (i / SHARD_N) * Math.PI * 2 + hash(i, 8), d = 0.6 * age * (0.6 + 0.8 * hash(i, 9)), x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d, w = 0.03;
          B.tri(x, y - w, x + w, y, x - w * 0.5, y + w, trim);
        }
      }
    },
  });
  group.add(cel.group);
  return {
    group,
    update(t, cue) { cel.update(t, cue); group.visible = open(t); },
    dispose() { cel.dispose(); },
  };
}
