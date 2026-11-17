// The home dock's pigment events: the orca's rise and the bloop as ink impact panels in the dock's own pigments, the wet rings, the eleven
// beacons catching and the two transforms. Each is a pure function of the clock; nothing is lit or flashed.
import { Vector3 } from "three";
import { makeCel } from "../../../kit/fx/cel.js";
import { BACK, DOCK, THORS_AT, hash, onTwos, orcaAt } from "../clock.js";
import { beaconSpots } from "../live/farm.js";
import { WATER_Y } from "../live/land.js";
import { ACCENT, INDIGO, LILAC, ORANGE, PAPER, toned } from "../tone.js";

const TAU = Math.PI * 2, STAY = 6 / 24;
const C = { paper: toned(PAPER), lilac: toned(LILAC), indigo: toned(INDIGO), orange: toned(ORANGE), rust: toned("#c9783a"), white: toned("#fff9eb"), accent: toned(ACCENT) };
const BLOOP = [3.55, WATER_Y + 0.05, 0.55];
const ELEVENTH = 10;
// the rise's two strokes off the fin: centre offset (batch units, y down), direction (y up), length and width in SUK's stroke units
const RISE_STROKES = [[0.02, -0.08, 1.2, 0.5, 0.03], [-0.03, -0.1, 1.95, 0.5, 0.03]];
const V = new Vector3(), Q = new Vector3(), CH = new Vector3();

// a rig point (the pup at the origin, moved by DOCK) to [x, y] batch units (x 0..A, y 0..1 down); null behind the lens
const onFrame = (c, A, x, y, z) => {
  Q.set(x, y, z).applyMatrix4(c.matrixWorldInverse);
  if (Q.z > -0.05) return null;
  V.set(x, y, z).project(c);
  return [(V.x * 0.5 + 0.5) * A, 0.5 - V.y * 0.5];
};
const rigAt = (c, A, p) => onFrame(c, A, p[0] + DOCK[0], p[1] + DOCK[1], p[2] + DOCK[2]);
const ringPts = (cx, cy, r, n, wob, ph) => {
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = (i / n) * TAU, k = r * (1 + wob * Math.sin(3 * a + ph)); pts.push([cx + Math.cos(a) * k, cy + Math.sin(a) * k]); }
  return pts;
};
const line = (B, pts, w, col, a) => B.ribbon(pts, pts.map(() => w / 2), col, a);
// the bloop's ring on the water, projected point by point; null if any point is behind the lens
const waterRing = (c, A, r) => {
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * TAU, p = rigAt(c, A, [BLOOP[0] + Math.cos(a) * r, BLOOP[1], BLOOP[2] + Math.sin(a) * r]);
    if (!p) return null;
    pts.push(p);
  }
  return pts;
};
// SUK's spikes (fx/index.js) with an alpha: n wedges from r0 short of the centre, out past the frame; k scales the weight
const spikes = (B, cx, cy, n, r0, seed, col, edge, k = 1, a = 1) => {
  for (let i = 0; i < n; i++) {
    const ang = ((i + 0.8 * hash(i, seed)) / n) * TAU, r = r0 * (0.7 + 0.7 * hash(i, seed + 1)), w = (0.02 + 0.17 * hash(i, seed + 2) ** 2) * k, dx = Math.cos(ang), dy = Math.sin(ang);
    for (const [c, g] of edge ? [[edge, 0.014], [col, 0]] : [[col, 0]]) B.tri(cx + dx * (r - g), cy + dy * (r - g), cx + dx * 2.6 - dy * (w / 2 + g), cy + dy * 2.6 + dx * (w / 2 + g), cx + dx * 2.6 + dy * (w / 2 + g), cy + dy * 2.6 - dx * (w / 2 + g), c, a);
  }
};
// a wet blob of n points; its rim wobbles with f
const wetBlob = (cx, cy, r, n, f) => Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU, k = r * (1 + 0.12 * Math.sin(5 * a + f)); return [cx + Math.cos(a) * k, cy + Math.sin(a) * k]; });
// SUK's tapered stroke without its core, in this dock's ink: centre (cx, cy), direction ang (y up), length and width in SUK's units
const brush = (B, cx, cy, ang, len, wid) => {
  const pts = [], ws = [];
  for (let i = 0; i <= 14; i++) { const u = i / 14, d = (u - 0.5) * len; pts.push([cx + Math.cos(ang) * d * 0.5, cy - Math.sin(ang) * d * 0.5]); ws.push(Math.pow(Math.sin(Math.PI * u), 0.55) * wid * 0.25); }
  B.ribbon(pts, ws, C.indigo);
};

// a hit as the page draws it: the focus lines close on the fin (one drawing per 12 fps frame), then the impact panel (its negative first)
const hitDraw = (B, c, A, b, ts, at) => {
  const panel = b.name === "panel", age = ts - b.t, stay = panel && b.kind === "rise" ? STAY : 0;
  if (age < -1e-6 || age >= b.dur + stay - 1e-6) return;
  const p = rigAt(c, A, at);
  if (!p) return;
  const seed = Math.round(b.t * 10), f = Math.floor(age * 24 + 1e-6);
  if (!panel) {
    const k = age / b.dur;
    spikes(B, p[0], p[1], Math.round(12 + 30 * k * k), 0.62 - 0.36 * k, seed + Math.floor(age * 12 + 1e-6) * 13, C.indigo, null, 0.02 + 0.06 * k, 0.5);
    return;
  }
  if (age < b.dur - 1e-6 && b.kind === "bloop") {
    B.rect(0, 0, A, 1, f === 0 ? C.indigo : C.paper);
    for (const r of [0.25, 0.9, 1.6]) { const pts = waterRing(c, A, r); if (pts) line(B, pts, 0.014, f === 0 ? C.paper : C.indigo); }
    if (f === 1) { const pts = waterRing(c, A, 1.0); if (pts) line(B, pts, 0.01, C.accent); }
    return;
  }
  if (age < b.dur - 1e-6) {
    const ink = f === 0 ? C.paper : C.indigo;
    B.rect(0, 0, A, 1, f === 0 ? C.indigo : C.paper);
    spikes(B, p[0], p[1], 36, 0.24 + 0.05 * f, seed + f * 7, ink, null);
    B.fan(p[0], p[1], wetBlob(p[0], p[1], 0.1 + 0.04 * f, 28, f), ink);
    if (f === 0) for (let i = 0; i < 5; i++) { const x = p[0] + (hash(i, 50) - 0.5) * 0.12, y = p[1] + 0.06 + 0.04 * hash(i, 51), L = 0.06 + 0.08 * hash(i, 52); B.ribbon([[x, y], [x, y + L / 2], [x, y + L]], [0.006, 0.004, 0], ink); }
    else { line(B, ringPts(p[0], p[1], 0.16 + 0.06 * f, 40, 0, 0), 0.006, C.accent); line(B, ringPts(p[0], p[1], 1.25 * (0.16 + 0.06 * f), 40, 0, 0), 0.012, C.indigo, 0.5); }
  }
  if (f >= 1 && b.kind === "rise") for (const [dx, dy, ang, len, wid] of RISE_STROKES) brush(B, p[0] + dx, p[1] + dy, ang, len, age < b.dur ? wid : wid * (0.25 + 0.3 * (1 - (age - b.dur) / stay)));
};

export function buildEvents(ctx) {
  const cam = () => ctx.player?.camera;
  const beacons = beaconSpots();
  const orca = orcaAt(5.0, { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, vis: 0, surf: 0 });
  const hits = (ctx.scene?.beats ?? []).filter((b) => b.name === "panel" || b.name === "gather");
  const spot = (b) => (b.at === "bloop" ? BLOOP : [orca.x, WATER_Y, orca.z]);

  // behind the seal: the hits, Thors's step-out ring, the orca's spray, the bloop's rings and the eleven beacons catching
  const pig = makeCel(ctx.engine, { max: 8000, order: 1205, behind: true, draw(B, ts, A) {
    const c = cam();
    if (!c) return;
    for (const b of hits) hitDraw(B, c, A, b, ts, spot(b));
    if (ts >= 1.95 && ts < 2.45) {
      const p = (ts - 1.95) / 0.5, o = rigAt(c, A, THORS_AT);
      if (o && p < 1) {
        line(B, ringPts(o[0], o[1], 0.22 * p, 40, 0.04, 0), 0.006, C.lilac, 1 - p);
        line(B, ringPts(o[0], o[1], 0.154 * p, 40, 0.04, 1), 0.003, C.lilac, 1 - p);
      }
    }
    const f = Math.floor((ts - 5.0) * 24 + 1e-6), o = f >= 0 && f < 8 ? rigAt(c, A, [orca.x, WATER_Y, orca.z]) : null;
    if (o) for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU + 0.6 * hash(i, 44), d = (0.04 + 0.06 * hash(i, 45)) * Math.min(1, (f + 1) / 6), s = 0.012 + 0.006 * hash(i, 46);
      const x = o[0] + Math.cos(a) * d, y = o[1] + Math.sin(a) * d;
      B.tri(x + Math.cos(a) * s * 1.6, y + Math.sin(a) * s * 1.6, x + Math.cos(a + 2.1) * s, y + Math.sin(a + 2.1) * s, x + Math.cos(a - 2.1) * s, y + Math.sin(a - 2.1) * s, i % 2 ? C.paper : C.lilac, 1 - f / 9);
    }
    for (let j = 0; j < 3; j++) {
      const age = (ts - (12.0 + 0.26 * j)) / 1.7;
      if (age < 0 || age >= 1) continue;
      const pts = waterRing(c, A, 0.25 + 1.8 * age);
      if (!pts) continue;
      line(B, pts, 0.004, C.white, 0.85 * (1 - age));
      if (j === 2) line(B, pts, 0.012, C.indigo, 0.35 * (1 - age));
    }
    beacons.forEach((base, i) => {
      const age = ts - (19.0 + 0.5 * i);
      if (age < 0) return;
      const last = i === ELEVENTH, f = Math.floor(age * 24 + 1e-6);
      if (last ? age >= 0.4 : f >= 8) return;
      const p = rigAt(c, A, base);
      if (!p || p[0] < 0 || p[0] > A || p[1] < 0.1 || p[1] > 0.95) return;
      const r = last ? 0.025 + 0.095 * (age / 0.4) : 0.025 + 0.012 * f, a = 0.7 * (1 - (last ? age / 0.4 : f / 8));
      B.fan(p[0], p[1], ringPts(p[0], p[1], r, 24, 0, 0), C.orange, a);
      line(B, ringPts(p[0], p[1], r * 1.4, 24, 0, 0), 0.004, C.rust, a);
    });
  } });

  // over the seal at the turn into the character (1.333): a lilac wash edge spreads from the chest, then the cream veil covers the swap
  const wet = makeCel(ctx.engine, { max: 600, order: 1250, draw(B, ts, A) {
    const c = cam(), q = onTwos(ts);
    if (c && ts >= 1.15 && ts < 1.3) {
      const ch = ctx.seal?.chest?.(CH), o = ch && onFrame(c, A, ch.x, ch.y, ch.z);
      if (o) line(B, ringPts(o[0], o[1], (1.2 * (ts - 1.15)) / 0.15, 48, 0.05, ts * 11), 0.012, C.lilac, 1);
    }
    const va = q < 1.18 ? 0 : q < 1.3 ? (0.95 * (q - 1.18)) / 0.12 : q < 1.36 ? 0.95 : q < 1.48 ? 0.95 * (1 - (q - 1.36) / 0.12) : 0;
    if (va > 0.003) B.rect(0, 0, A, 1, C.paper, va);
  } });

  // the turn back (24.75): two drawings of a wet cream disc over the seal, then fourteen flecks fly off it
  const poof = makeCel(ctx.engine, { max: 400, order: 1260, draw(B, ts, A) {
    const f = Math.floor((ts - BACK) * 24 + 1e-6), box = ctx.player?.box;
    if (f < 0 || f > 5 || !box) return;
    const bh = box[3] - box[1], cx = ((box[0] + box[2]) / 2) * A, cy = (box[1] + box[3]) / 2 - 0.1 * bh, r = 0.86 * bh * (1 + 0.14 * f);
    if (f < 2) {
      B.fan(cx, cy, ringPts(cx, cy, r, 36, 0.04, f * 2.1), C.paper);
      line(B, ringPts(cx, cy, r * 0.99, 36, 0.04, f * 2.1), 0.01, C.lilac);
      return;
    }
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU + hash(i, 5), q = r * (0.8 + 0.3 * hash(i, 6)) * (1 + 0.12 * (f - 2)), w = (0.03 * (6 - f)) / 4, x = cx + Math.cos(a) * q, y = cy + Math.sin(a) * q;
      B.tri(x - w, y, x + w, y - w * 0.4, x + Math.cos(a) * w * 3, y + Math.sin(a) * w * 3, i % 2 ? C.paper : C.lilac);
    }
  } });

  return {
    groups: [pig.group, wet.group, poof.group],
    update(t, cue) { pig.update(t, cue); wet.update(t, cue); poof.update(t, cue); },
    dispose() { pig.dispose(); wet.dispose(); poof.dispose(); },
  };
}
