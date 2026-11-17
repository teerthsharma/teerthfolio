// The drawn hits in the film's inks (sun-white, hot red, never black): the link as a ring and six glints in turn, the knot as a flare and the hanko tag,
// the impact as a three-frame panel off the loops with shards off the far shore. Flat to the lens and behind the seal.
import { Group, Vector3 } from "three";
import { makeCel } from "../../../kit/fx/cel.js";
import { skyPos } from "../live/fx.js";
import { DOCK, REST, T, smooth, unwarp } from "../clock.js";
import { PAL } from "../palette.js";
import { toned } from "../tone.js";

const FAR = skyPos(-23, 3.6, 215, new Vector3());
const world = (p) => new Vector3(p[0] + DOCK[0], p[1] + DOCK[1], p[2] + DOCK[2]);
const LOOPS_W = world(REST.CL), FAR_W = world([FAR.x, FAR.y, FAR.z]);
const LIFE = 0.45, HANKO = { t: 0.5, card: "#f6efe2", line: "#2a1c30", seal: "#d8362c" };
const inks = new Map();
const ink = (hex) => { let c = inks.get(hex); if (!c) inks.set(hex, (c = toned(hex))); return c; };
const flareSize = (b) => (b.col === PAL.sunHalo ? (b.size ?? 0.12) * 2.2 : (b.size ?? 0.12));

const hash = (i, k) => { let h = Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(k + 7, 0x85ebca6b); h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h = Math.imul(h ^ (h >>> 12), 0x297a2d39); return ((h ^ (h >>> 15)) >>> 0) / 4294967296; };
const spikes = (B, cx, cy, n, r0, seed, col) => {
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.8 * hash(i, seed)) / n) * Math.PI * 2, r = r0 * (0.7 + 0.7 * hash(i, seed + 1)), w = 0.02 + 0.17 * hash(i, seed + 2) ** 2, dx = Math.cos(a), dy = Math.sin(a);
    B.tri(cx + dx * r, cy + dy * r, cx + dx * 2.6 - (dy * w) / 2, cy + dy * 2.6 + (dx * w) / 2, cx + dx * 2.6 + (dy * w) / 2, cy + dy * 2.6 - (dx * w) / 2, col);
  }
};
const ring = (B, cx, cy, r, w, col) => {
  const L = [], R = [];
  for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2, x = Math.cos(a), y = Math.sin(a); L.push([cx + x * (r - w), cy + y * (r - w)]); R.push([cx + x * (r + w), cy + y * (r + w)]); }
  B.strip(L, R, col);
};
const shard = (B, x, y, dx, dy, L, w, col) => B.tri(x - dy * w, y + dx * w, x + dy * w, y - dx * w, x + dx * L, y + dy * L, col);
const hanko = (B, s, A, age) => {
  const k = 1.8 - 0.8 * smooth(0, HANKO.t, age), cx = s[0] * A, cy = s[1], hw = 0.025 * A * k, hh = 0.045 * k, e = 0.0025 * k;
  B.rect(cx - hw - e, cy - hh - e, cx + hw + e, cy + hh + e, ink(HANKO.line));
  B.rect(cx - hw, cy - hh, cx + hw, cy + hh, ink(HANKO.card));
  const sx = cx + hw * 0.5, sy = cy + hh * 0.45, dot = Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return [sx + Math.cos(a) * 0.012 * k, sy + Math.sin(a) * 0.012 * k]; });
  B.fan(sx, sy, dot, ink(HANKO.seal));
};

export function makeHits(ctx) {
  const beats = ctx.scene.beats ?? [];
  const flares = beats.filter((b) => b.name === "flare"), panels = beats.filter((b) => b.name === "panel"), shards = beats.filter((b) => b.name === "shards");
  const V = new Vector3();
  const frame = (w) => { const c = ctx.player?.camera; if (!c) return null; V.copy(w).project(c); return V.z > 1 ? null : [V.x * 0.5 + 0.5, 0.5 - V.y * 0.5]; };
  const spot = (at) => (at === "loops" ? frame(LOOPS_W) : at === "far" ? frame(FAR_W) : Array.isArray(at) ? at : null);
  const cel = makeCel(ctx.engine, {
    max: 20000, order: 1200, behind: true,
    draw(B, ts, A) {
      for (const b of flares) {
        const age = ts - b.t, s = spot(b.at), life = Math.max(b.dur, LIFE);
        if (!s) continue;
        if (age >= -1e-6 && age < life - 1e-6) {
          const n = Math.max(2, Math.round(life * 24)), f = Math.floor(age * 24 + 1e-6);
          ring(B, s[0] * A, s[1], flareSize(b) * (1 + 1.5 * (f / (n - 1))), 0.003, ink(b.col ?? PAL.sunWhite));
        }
        if (b.col === PAL.sunHalo && age >= -1e-6 && age < HANKO.t) hanko(B, s, A, age);
      }
      for (const b of panels) {
        const age = ts - b.t, s = age >= -1e-6 && age < b.dur - 1e-6 ? spot(b.kind === "impact" ? "loops" : b.at) : null;
        if (!s) continue;
        const f = Math.floor(age * 24 + 1e-6), cx = s[0] * A, cy = s[1], seed = Math.round(b.t * 10) + f * 7;
        if (f === 0) { B.rect(0, 0, A, 1, ink(PAL.sunWhite)); spikes(B, cx, cy, 40, 0.22, seed, ink(PAL.hot)); continue; }
        B.rect(0, 0, A, 1, ink(PAL.hot), 0.85);
        spikes(B, cx, cy, 40, 0.22 + 0.05 * f, seed, ink(PAL.sunWhite));
        ring(B, cx, cy, 0.26 + 0.08 * f, 0.006, ink(PAL.sunWhite));
      }
      for (const b of shards) {
        const age = ts - b.t, s = spot("far");
        if (!s || age < -1e-6 || age >= b.dur) continue;
        const q = Math.floor(age * 12 + 1e-6) / 12;
        for (let i = 0; i < 14; i++) {
          const a = Math.PI * (0.1 + 0.8 * hash(i, 41)), dx = Math.cos(a), dy = Math.sin(a), r = (0.2 + 0.4 * hash(i, 42)) * q + 0.02;
          shard(B, s[0] * A + dx * r, s[1] + dy * r, dx, dy, 0.05 + 0.09 * hash(i, 43), 0.006, ink(i % 2 ? PAL.sunWhite : PAL.hot));
        }
      }
      const k = (ts - unwarp(T.pull[0])) / 0.9, s = k >= 0 && k < 1 ? spot("loops") : null;
      if (s) for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2, c = Math.cos(a), d = Math.sin(a), far = 0.5 * (1 - k) + 0.08, near = far * 0.7;
        B.ribbon([[s[0] * A + c * near, s[1] + d * near], [s[0] * A + c * far, s[1] + d * far]], [0.0012, 0.0012], ink(PAL.sunWhite), 0.5);
      }
    },
  });
  const group = new Group();
  group.add(cel.group);
  return {
    group,
    update(t, dt, cue) {
      let on = null;
      for (const b of flares) if (t >= b.t - 1e-6 && t < b.t + Math.max(b.dur, LIFE) - 1e-6) { on = b; break; }
      const s = on ? spot(on.at) : null, g = s ?? [0.5, 0.5], A = ctx.player?.camera?.aspect || 16 / 9;
      if (!on || !s) ctx.tg?.flare?.(0.5, 0.5, 0.12, PAL.sunWhite, 0);
      else if (on.col === PAL.sunHalo) ctx.tg?.flare?.(g[0], g[1], flareSize(on), on.col, 1);
      else { const a = ((Math.floor((t - on.t) * 24 + 1e-6) % 6) / 6) * Math.PI * 2; ctx.tg?.flare?.(g[0] + (0.1 * Math.cos(a)) / A, g[1] + 0.1 * Math.sin(a), 0.03, on.col, 1); }
      cel.update(t, cue);
    },
    dispose() { cel.dispose(); },
  };
}
