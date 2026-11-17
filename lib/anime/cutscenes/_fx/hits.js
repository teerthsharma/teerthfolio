// The three biggest hits of the Sukuna cutscene (the slashes, the Cleave, the shrine rising) restaged with the cel kit, for ?fx=cel&cel=sukuna.
import { Group } from "three";
import { makeAura, makeBurst, makeCel, makeCracks, makeCrescent, makeDebris, makeField, makeFlat, makePlume, makeRing, makeSpeedLines, makeVeins, rgb, veinField } from "../../kit/fx/cel.js";
import { overshoot } from "../../sakuga.js";

const SLASH_AT = 0.5, CLEAVE_AT = 3.2, SHRINE_AT = 5.6;
const RED = "#e0203a", DEEP = "#4a0912", HOT = "#ffd9d0";

// the shrine as flat shapes: two pillars, a double roof with upturned eaves, a hot rim on the lit side, rising on twos with an overshoot
function shrineDraw(B, ts, A) {
  const age = ts - SHRINE_AT; if (age < 0) return;
  const k = overshoot(Math.min(1, Math.floor(age * 12) / 12 / 1.0), 1.2), ink = rgb("#12040c"), rim = rgb(RED, 1.7), hot = rgb("#ff5a3a", 1.4);
  const cx = A * 0.5, gy = 1.18 + (1 - k) * 1.0, w = 0.46;
  const roof = (y, half, th, up) => {
    const pts = [], ws = [];
    for (let i = 0; i <= 20; i++) { const u = i / 20 * 2 - 1; pts.push([cx + u * half, y - up * Math.abs(u) ** 3.2 - 0.02 * (1 - u * u)]); ws.push(th * (0.35 + 0.65 * (1 - Math.abs(u) ** 2))); }
    B.ribbon(pts, ws, ink); B.ribbon(pts.map(([x, yy]) => [x - 0.004, yy - ws[0] * 0.2]), ws.map((x) => x * 0.12), rim);
    return pts;
  };
  for (const s of [-1, 1]) {
    B.rect(cx + s * w * 0.62 - 0.035, gy - 0.62, cx + s * w * 0.62 + 0.035, gy + 0.2, ink);
    B.rect(cx + s * w * 0.62 - 0.035, gy - 0.62, cx + s * w * 0.62 - 0.026, gy + 0.2, rim);
  }
  B.rect(cx - w * 0.62, gy - 0.5, cx + w * 0.62, gy - 0.4, ink);
  for (let i = -4; i <= 4; i++) B.rect(cx + i * 0.05 - 0.012, gy - 0.78, cx + i * 0.05 + 0.012, gy - 0.5, hot);
  roof(gy - 0.62, w * 1.15, 0.06, 0.11); roof(gy - 0.86, w * 0.8, 0.05, 0.09);
  B.rect(cx - 0.02, gy - 1.02, cx + 0.02, gy - 0.9, ink);
}

export function buildHits(ctx) {
  const e = ctx.engine, seal = ctx.seal, group = new Group(), hole = [seal.at[0], seal.at[1] + 0.42, seal.at[2], 0.4], fx = [];
  const add = (f, order) => { f.set({ behind: true, hole: null }); f.mesh.renderOrder = order; group.add(f.group); fx.push(f); return f; };
  const veinOpts = { events: veinField({ count: 11, seed: 11, loop: 0.8, width: [0.0025, 0.011] }), hole, body: RED, far: DEEP, core: HOT, halo: 0.06 };
  add(makeCel(e, { draw(B, ts, A) {
    const k = Math.min(1, ts / 0.3), c = rgb("#14030a"), N = 6;
    for (let i = 0; i < N; i++) { const r = 0.3 + i * 0.16, a = (0.16 + 0.1 * i) * k; for (const [x0, x1, y0, y1] of [[0, A, 0, 0.5 - r], [0, A, 0.5 + r, 1], [0, A / 2 - r * 1.3, 0.5 - r, 0.5 + r], [A / 2 + r * 1.3, A, 0.5 - r, 0.5 + r]]) if (x1 > x0 && y1 > y0) B.rect(x0, y0, x1, y1, c, a); }
  } }), 1000);
  add(makeField(e, { behind: true, at: 0, grow: 0.4, seed: 5, streams: 20 }), 1000);
  add(makeVeins(e, veinOpts), 1001);
  const sl = [[[0.05, 0.2], [0.7, 0.55], 0.18], [[0.95, 0.15], [0.3, 0.7], -0.2], [[0.1, 0.8], [0.9, 0.3], 0.25], [[0.3, 0.05], [0.8, 0.95], -0.22], [[0.0, 0.5], [1.0, 0.45], 0.12], [[0.7, 0.05], [0.2, 0.9], 0.2]];
  add(makeCrescent(e, { hole, events: sl.map(([from, to, bend], i) => ({ from, to, bend, at: SLASH_AT + i * 0.34 })), thick: 0.05 }), 1004);
  add(makeBurst(e, { hole, size: 0.14, frames: 8, events: sl.map(([, to], i) => ({ where: to, at: SLASH_AT + i * 0.34 + 1 / 24 })) }), 1005);
  add(makeDebris(e, { hole, count: 10, events: sl.map(([, to], i) => ({ where: to, at: SLASH_AT + i * 0.34 + 1 / 24, seed: i + 3 })) }), 1003);
  const C = CLEAVE_AT;
  add(makeSpeedLines(e, { at: C - 0.5, dur: 0.5, count: 90, inner: 0.3 }), 1002);
  add(makeFlat(e, { at: C, col: "#fff7ee", dur: 1 / 24 }), 1010);
  add(makeBurst(e, { hole, at: C + 1 / 24, where: [0.5, 0.5], size: 0.55, frames: 12, bgFrames: 3, spikes: 22, lines: 30 }), 1009);
  add(makeCrescent(e, { hole, thick: 0.13, hold: 1.1, tau: 0.5, events: [{ from: [-0.06, 0.1], to: [1.06, 0.9], bend: 0.05, at: C + 2 / 24 }, { from: [0.02, 0.98], to: [0.96, 0.1], bend: -0.04, at: C + 4 / 24, thick: 0.05 }] }), 1008);
  add(makeRing(e, { hole, at: C + 3 / 24, where: [0.5, 0.7], radius: 0.8, thick: 0.07 }), 1006);
  add(makeDebris(e, { hole, at: C + 3 / 24, where: [0.5, 0.5], count: 26, speed: 1.6, cone: 3.4, size: [0.015, 0.1] }), 1007);
  const S = SHRINE_AT;
  add(makeCel(e, { hole, draw: shrineDraw }), 1003);
  add(makeCracks(e, { hole, at: S, where: [0.5, 0.86], count: 9, len: 1.2, hold: 2.5, width: 0.02 }), 1004);
  add(makeRing(e, { hole, at: S, where: [0.5, 0.88], radius: 0.9, thick: 0.08, rings: 3 }), 1005);
  add(makePlume(e, { hole, events: [0.12, 0.3, 0.5, 0.7, 0.88].map((u, i) => ({ where: [u, 0.95], at: S + 0.1 + i * 0.06, seed: i + 2, size: 0.16 })) }), 1006);
  add(makeDebris(e, { hole, at: S, where: [0.5, 0.9], count: 24, speed: 1.4, cone: 2, size: [0.01, 0.09] }), 1007);
  add(makeAura(e, { hole, at: S - 0.4, where: [0.5, 0.62], size: [0.2, 0.34], len: 0.28, emit: 1.1 }), 1002);
  add(makeBurst(e, { hole, at: S, where: [0.5, 0.82], size: 0.3, frames: 8 }), 1008);
  return { group, update(t, cue) { for (const f of fx) f.update(t, cue); }, dispose() { fx.forEach((f) => f.dispose()); } };
}
