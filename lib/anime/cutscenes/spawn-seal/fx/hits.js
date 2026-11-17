// THE DRAWN HITS: each panel as a comic page draws it (negative, CORE panel, spikes, strokes), the cracked lens and its shatter, the glass rings and
// focus lines, Veldora's lightning and the devour's star. Flat to the lens, in INK, CORE, CYAN and HOT (the Megiddo gold); never red.
import { Group, Vector3 } from "three";
import { makeCel, makeVeins } from "../../../kit/fx/cel.js";
import { BACK, BREAK, DOCK, F, SEAL_AT, smooth } from "../clock.js";
import { toned } from "../tone.js";

const INK = toned("#06101c"), CORE = toned("#e9fdff"), CYAN = toned("#37e8ff"), HOT = toned("#ffd37a");
const SHATTER = [13.9, 14.7], AT = new Vector3(...DOCK), SPHERE = new Vector3(...SEAL_AT).add(AT), V = new Vector3(), C3 = new Vector3();
const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;
const FRACT = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2 + (hash(i, 1) - 0.5) * 0.3;
  return Array.from({ length: 6 }, (_, k) => {
    const r = (6 + 8 * k + 5 * hash(i * 7 + k, 2)) / 100, j = a + (hash(i * 5 + k, 3) - 0.5) * 0.35;
    return [r * Math.cos(j) * 1.4, r * Math.sin(j)];
  });
});
const STROKES = { turn: [[Math.PI / 2 + 0.05, 1.9, 0.14, CYAN]], punch: [[0.35, 3.6, 0.08, HOT], [-0.5, 3.6, 0.08, HOT]], devour: [[0, 2.4, 0.1, CYAN]] };
const SHATTERS = [[BREAK + 1 / 24, [0.52, 0.46], 14], [BREAK + 3 / 24, [0.44, 0.58], 9]];

const spikes = (B, cx, cy, n, r0, seed, col, edge, k = 1) => {
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.8 * hash(i, seed)) / n) * Math.PI * 2, r = r0 * (0.7 + 0.7 * hash(i, seed + 1)), w = (0.02 + 0.17 * hash(i, seed + 2) ** 2) * k, dx = Math.cos(a), dy = Math.sin(a);
    for (const [c, g] of edge ? [[edge, 0.014], [col, 0]] : [[col, 0]]) B.tri(cx + dx * (r - g), cy + dy * (r - g), cx + dx * 2.6 - dy * (w / 2 + g), cy + dy * 2.6 + dx * (w / 2 + g), cx + dx * 2.6 + dy * (w / 2 + g), cy + dy * 2.6 - dx * (w / 2 + g), c);
  }
};
const stroke = (B, A, hx, hy, ang, len, wid, col) => {
  const n = 14, pts = [], we = [], wc = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, d = (u - 0.5) * len, w = Math.pow(Math.sin(Math.PI * u), 0.55) * wid * 0.25;
    pts.push([A / 2 + (hx + Math.cos(ang) * d) * 0.5, 0.5 - (hy + Math.sin(ang) * d) * 0.5]);
    we.push(w); wc.push(w * 0.46);
  }
  B.ribbon(pts, we, col); B.ribbon(pts, wc, CORE);
};
const clearOf = (box, A, hx, hy, ang, len) => {
  const bh = box[3] - box[1], R = 1.25 * Math.max(bh, (box[2] - box[0]) * A);
  const px = (box[0] + box[2] - 1) * A, py = 1 - box[1] - box[3] + 0.16 * bh;
  const c = Math.cos(ang), s = Math.sin(ang), along = (px - hx) * c + (py - hy) * s, side = (py - hy) * c - (px - hx) * s;
  if (Math.abs(along) < len / 2 + R / 2 && Math.abs(side) < R) { const d = (side < 0 ? 1 : -1) * (R - Math.abs(side)); return [hx - s * d, hy + c * d]; }
  return [hx, hy];
};
const starFan = (B, cx, cy, r, seed, col) => B.fan(cx, cy, Array.from({ length: 22 }, (_, i) => { const a = (i / 22) * Math.PI * 2 + seed, q = r * (i % 2 ? 0.66 : 1) * (0.92 + 0.16 * hash(i, 31)); return [cx + Math.cos(a) * q, cy + Math.sin(a) * q]; }), col);

export function buildHits(ctx, glass) {
  const group = new Group();
  const cam = () => ctx.player?.camera;
  const uv = (p) => { const c = cam(); if (!c) return null; V.copy(p).project(c); return V.z > 1 ? null : [V.x * 0.5 + 0.5, 0.5 - V.y * 0.5]; };
  const sealUV = () => uv(ctx.seal.chest(C3)) ?? [0.5, 0.5];
  const at = (a) => (a === "seal" ? sealUV() : Array.isArray(a) ? a : [0.5, 0.5]);
  const beats = ctx.scene.beats ?? [];
  const panels = beats.filter((b) => b.name === "panel"), gathers = beats.filter((b) => b.name === "gather");

  // the panel: the negative on its first frame (INK field, CORE spikes), then a CORE page with INK spikes; the seal's box is cut out, so it stands in front
  const pan = makeCel(ctx.engine, { max: 12000, order: 1200, sealBox: () => ctx.player?.box, draw(B, ts, A) {
    const box = ctx.player?.box;
    for (const b of panels) {
      const age = ts - b.t;
      if (age < -1e-6 || age >= b.dur - 1e-6) continue;
      const [u, v] = at(b.at), cx = u * A, cy = v, seed = Math.round(b.t * 10), f = Math.floor(age * 24 + 1e-6), dark = f === 0, line = dark ? CORE : INK;
      B.rect(0, 0, A, 1, dark ? INK : CORE);
      if (b.kind === "devour") spikes(B, cx, cy, 36, 0.9 - 0.2 * f, seed + f * 7, line, null);
      else spikes(B, cx, cy, 44, 0.24 + 0.05 * f, seed + f * 7, line, null);
      if (b.kind === "turn") spikes(B, cx, cy, 18, 0.34, seed, CYAN, null);
      const hx = (cx - A / 2) * 2, hy = (0.5 - cy) * 2;
      for (const [ang, len, wid, col] of STROKES[b.kind] ?? []) {
        const [sx, sy] = box && box[3] - box[1] < 0.45 ? clearOf(box, A, hx, hy, ang, len) : [hx, hy];
        stroke(B, A, sx, sy, ang, len * (dark ? 0.8 : 1), wid * (dark ? 0.7 : 1), col);
      }
    }
  } });

  const top = makeCel(ctx.engine, { max: 2000, order: 1215, draw(B, ts, A) {
    if (ts < BREAK || ts >= SHATTER[1]) return;
    const k = smooth(SHATTER[0], SHATTER[1], ts), s = 1 + 0.5 * k, r = 0.0698 * k, co = Math.cos(r), si = Math.sin(r), cx = A / 2, cy = 0.5;
    for (const pts of FRACT) {
      const q = pts.map(([x, y]) => [cx + (x * co - y * si) * s, cy + (x * si + y * co) * s]);
      B.ribbon(q, q.map(() => 0.0055), INK);
      B.ribbon(q, q.map(() => 0.0025), CORE);
    }
  } });

  const star = makeCel(ctx.engine, { max: 400, order: 1260, draw(B, ts, A) {
    const f = Math.floor((ts - (BACK + F(3))) * 24 + 1e-6), box = ctx.player?.box;
    if (f < 0 || f > 5 || !box) return;
    const bh = box[3] - box[1], cx = ((box[0] + box[2]) / 2) * A, cy = (box[1] + box[3]) / 2 - 0.1 * bh, r = 0.86 * bh * (1 + 0.14 * f);
    if (f < 2) { for (const [k, c] of [[1, INK], [0.965, CORE], [0.6, INK], [0.56, CORE]]) starFan(B, cx, cy, r * k, f * 0.4 + (k < 0.7 ? 0.14 : 0), c); return; }
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + hash(i, 5), q = r * (0.8 + 0.3 * hash(i, 6)), w = (0.03 * (6 - f)) / 4, x = cx + Math.cos(a) * q, y = cy + Math.sin(a) * q;
      B.tri(x - w, y, x + w, y - w * 0.4, x + Math.cos(a) * w * 3, y + Math.sin(a) * w * 3, i % 3 ? INK : CYAN);
    }
  } });

  const veins = makeVeins(ctx.engine, { core: "#e9fdff", body: "#37e8ff", far: "#06101c", ink: "#06101c", width: 0.006, draw: F(3), order: 1230, events: [] });
  const lightning = () => { const from = uv(SPHERE); return from ? [{ at: 4, from, to: sealUV() }, { at: 6, from, to: sealUV() }] : []; };

  group.add(pan.group, top.group, star.group, veins.group);
  return {
    group,
    update(t, dt, cue) {
      pan.update(t, cue); top.update(t, cue); star.update(t, cue);
      veins.set({ events: lightning() }); veins.update(t, cue);
      let req = null;
      for (const b of gathers) if (t >= b.t && t < b.t + b.dur) req = [1, at(b.at), (t - b.t) / b.dur, Math.round(b.t * 10)];
      for (const b of panels) if ((b.kind === "turn" || b.kind === "devour") && t >= b.t && t < b.t + b.dur) req = [2, at(b.at), 0.1 + 0.3 * ((t - b.t) / b.dur), 0];
      for (const [t0, c, n] of SHATTERS) if (t >= t0 && t < t0 + 1 / 24) req = [0, c, 0, n];
      if (req) glass.set(...req); else glass.set(-1, [0, 0], 0, 0);
    },
    dispose() { pan.dispose(); top.dispose(); star.dispose(); veins.dispose(); },
  };
}
