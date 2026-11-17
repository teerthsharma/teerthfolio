// The impact layer of pr-topograph-432: four hit panels in ink and gold (violet and cream for the reveal), the focus lines that close on
// them, shock rings, floor fissures, flung shards, gold dust in the hall and island snow. Flat polygons behind the seal (kit/fx/cel.js).
import { Group, Vector3 } from "three";
import { makeCel } from "../../../kit/fx/cel.js";
import { glslFor } from "../../../tools/index.js";
import { loadPack } from "../../../tools/packs.js";
import { T, W } from "../clock.js";
import { toned } from "../tone.js";

const col = { ink: toned("#05020a"), gold: toned("#f0b429"), gold2: toned("#ffd35a"), cream: toned("#fbfaf7"), ring: toned("#fff0b0"), violet: toned("#a23cff"), cyan: toned("#2ec5ff"), snow: toned("#ffffff") };
// the hall's platform top and throne, as world/hall.js lays them out (TOP_Y, THRONE_Z); the skull is the seated Ainz root + head, eyes from villain.js
const TOP_Y = 2.8, THRONE_Z = -11.4;
export const ANCHOR = { throne: [0, TOP_Y + 3, THRONE_Z], foot: [0, 0.05, 0], skull: [0, TOP_Y + 1.15 + 1.7, THRONE_Z + 0.25], fissureA: [0, 2.83, -9.4], fissureB: [0, 0.03, 0] };
const PULLS = { sakuga: ["arakiSpeedPlate", "smearSpeedRib"], jojo: ["mudaInkBurst", "cairoCrack"], gold: ["goldZeroRipple", "goldLeafScatter"] };
export const hash = (i, s) => { let h = Math.imul((i * 374761393 + s * 668265263 + 0x9e3779b9) | 0, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const arr = (w) => (w && w.x !== undefined ? [w.x, w.y, w.z] : w);

export function makeHits(ctx) {
  const group = new Group(), V = new Vector3(), beats = (ctx.scene.beats ?? []).filter((b) => ["panel", "gather", "rings", "shards", "crack"].includes(b.name));
  const cam = () => ctx.player?.camera;
  const proj = (p, A) => { const c = cam(); if (!c) return null; V.set(p[0], p[1], p[2]).project(c); return V.z > 1 ? null : [(V.x * 0.5 + 0.5) * A, 0.5 - V.y * 0.5]; };
  const worldOf = (at) => arr(at === "staff" ? ctx.seal.named?.().handR : at === "seal" ? ctx.seal.chest?.(new Vector3()) : ANCHOR[at] ? W(ANCHOR[at]) : null);
  const spot = (at, A) => { if (Array.isArray(at)) return [at[0] * A, at[1]]; const p = worldOf(at); return (p && proj(p, A)) ?? [A / 2, 0.5]; };

  const wedge = (B, cx, cy, dx, dy, r, w, c, g) => B.tri(cx + dx * (r - g), cy + dy * (r - g), cx + dx * 2.6 - dy * (w / 2 + g), cy + dy * 2.6 + dx * (w / 2 + g), cx + dx * 2.6 + dy * (w / 2 + g), cy + dy * 2.6 - dx * (w / 2 + g), c);
  const spokes = (B, cx, cy, n, r0, seed, c, edge, k = 1) => {
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.8 * hash(i, seed)) / n) * Math.PI * 2, r = r0 * (0.7 + 0.7 * hash(i, seed + 1)), w = (0.02 + 0.17 * hash(i, seed + 2) ** 2) * k, dx = Math.cos(a), dy = Math.sin(a);
      if (edge) wedge(B, cx, cy, dx, dy, r, w, edge, 0.014);
      wedge(B, cx, cy, dx, dy, r, w, c, 0);
    }
  };
  const blot = (B, cx, cy, r, seed) => {
    const ring = [];
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, q = r * (0.8 + 0.35 * hash(i, seed)); ring.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); }
    B.fan(cx, cy, ring, col.ink);
  };
  const ribs = (B, cx, cy, n, seed) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.6 * hash(i, seed), len = 0.45 + 0.5 * hash(i, seed + 1), w0 = 0.012 + 0.02 * hash(i, seed + 2), pts = [], ws = [];
      for (let j = 0; j <= 6; j++) { const u = j / 6, r = 0.2 + len * u; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); ws.push(w0 * (1 - u)); }
      B.ribbon(pts, ws, col.ink);
    }
  };

  const gather = (B, b, age, A) => {
    const k = age / b.dur, [cx, cy] = spot(b.at, A);
    spokes(B, cx, cy, Math.round(14 + 26 * k), 0.62 - 0.36 * k, Math.round(b.t * 10), col.gold, col.ink, 0.5);
  };
  const panel = (B, b, age, A) => {
    const n = Math.max(1, Math.round(b.dur * 24)), f = Math.min(n - 1, Math.floor(age * 24 + 1e-6)), [cx, cy] = spot(b.at, A), seed = Math.round(b.t * 10) + f * 7;
    const reveal = b.kind === "reveal", last = f === n - 1;
    const field = reveal ? (last ? col.gold : col.violet) : f === 0 ? col.ink : col.gold;
    const line = reveal ? (last ? col.ink : col.cream) : f === 0 ? col.gold : col.ink;
    B.rect(0, 0, A, 1, field);
    if (b.kind === "ignite" && f < 2) blot(B, cx, cy, 0.35, seed);
    const r0 = 0.24 + 0.05 * f;
    if (reveal && !last) spokes(B, cx + 0.006, cy, 44, r0, seed, col.cyan, null);
    spokes(B, cx, cy, 44, r0, seed, line, null);
    if (f === 1 || f === 2) ribs(B, cx, cy, 9, seed);
  };
  const rings = (B, b, age, A) => {
    const c = worldOf(b.at), m0 = c && proj(c, A), m1 = c && proj([c[0] + 1, c[1], c[2]], A);
    if (!m0 || !m1) return;
    const per = Math.abs(m1[0] - m0[0]);
    for (let j = 0; j < 3; j++) {
      const u = age - 0.12 * j;
      if (u < 0 || u > 1) continue;
      const r = 0.5 + 7 * u, ws = Math.max(0.0008, 0.5 * 0.05 * (1 - u) * per), pts = [];
      for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2, p = proj([c[0] + Math.cos(a) * r, c[1], c[2] + Math.sin(a) * r], A); if (!p) { pts.length = 0; break; } pts.push(p); }
      if (pts.length) B.ribbon(pts, pts.map(() => ws), j === 2 ? col.gold : col.ring);
    }
  };
  const shards = (B, b, age, A) => {
    const [x0, y0] = spot(b.at, A), mult = ctx.atTier(3) ? 1 : ctx.atTier(2) ? 0.5 : 0.25;
    for (let i = 0; i < Math.round(100 * mult); i++) {
      const ink = i % 5 > 2, s = 0.012 + 0.018 * hash(i, 41), x = x0 + (hash(i, 42) - 0.5) * 1.4 * age, y = y0 - (0.4 + 0.9 * hash(i, 43)) * age + 0.9 * age * age;
      B.fan(x, y, [[x - s, y], [x, y - s * 1.6], [x + s, y], [x, y + s * 1.6]], ink ? col.ink : hash(i, 44) > 0.5 ? col.gold : col.gold2);
    }
  };
  const fissure = (B, b, age, A) => {
    const [cx, cy] = spot(b.set === "A" ? "fissureA" : "fissureB", A), g = Math.min(1, Math.floor(age * 12 + 1e-6) / 3);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.5 * hash(i, 51), L = (0.3 + 0.35 * hash(i, 52)) * g, pts = [];
      for (let j = 0; j <= 4; j++) { const u = (j / 4) * L, jit = 0.02 * (hash(i, 53 + j) - 0.5); pts.push([cx + Math.cos(a) * u + Math.sin(a) * jit, cy + Math.sin(a) * u - Math.cos(a) * jit]); }
      B.ribbon(pts, pts.map((_, j) => 0.012 * (1 - j / 5) * 2.2 + 0.001), col.gold);
      B.ribbon(pts, pts.map((_, j) => 0.012 * (1 - j / 5)), col.ink);
    }
  };
  const dust = (B, ts, A) => {
    for (let i = 0; i < 90; i++) {
      const d = hash(i, 61), s = 0.004 + 0.004 * d, x = hash(i, 63) * A, y = 1 - ((hash(i, 62) + (0.02 + 0.03 * d) * (ts - T.turn)) % 1);
      B.fan(x, y, [[x - s, y], [x, y - s], [x + s, y], [x, y + s]], i % 3 ? col.gold : col.gold2);
    }
  };

  const main = makeCel(ctx.engine, {
    max: 60000, order: 1200, behind: true,
    draw(B, ts, A) {
      for (const b of beats) {
        const age = ts - b.t;
        if (b.name === "gather" && age >= 0 && age < b.dur) gather(B, b, age, A);
        else if (b.name === "panel" && age >= 0 && age < b.dur) panel(B, b, age, A);
        else if (b.name === "rings" && age >= 0 && age < 1.24) rings(B, b, age, A);
        else if (b.name === "shards" && age >= 0 && age < 0.9) shards(B, b, age, A);
        else if (b.name === "crack" && age >= 0 && age < 1.2) fissure(B, b, age, A);
      }
      if (ts >= T.turn && ts < T.back) dust(B, ts, A);
    },
  });
  const snow = makeCel(ctx.engine, {
    max: 2000, order: 1190, behind: true,
    draw(B, ts, A) {
      if (ts >= T.impact && ts < T.back) return;
      for (let i = 0; i < 120; i++) {
        const z = 0.35 + 0.65 * hash(i, 21), fx = hash(i, 22) + ts * 0.011 * z + 0.012 * Math.sin(ts * 0.9 + i), x = (((fx % 1) + 1) % 1) * A, y = (hash(i, 23) + ts * 0.034 * z) % 1, r = 0.0016 + 0.0026 * z * z;
        B.tri(x, y - r, x + r, y, x, y + r, col.snow); B.tri(x, y - r, x, y + r, x - r, y, col.snow);
      }
    },
  });
  group.add(main.group, snow.group);

  // the owner's shader table entries are pulled and resolved here; the drawing stays polygon (the cel layer takes no GLSL)
  const pulled = (async () => {
    const out = {};
    for (const [pack, names] of Object.entries(PULLS)) { await loadPack(pack); for (const n of names) out[n] = glslFor([n]).length; }
    return out;
  })().catch((e) => { console.warn("[pr-topograph-432] shader pulls", e); return null; });

  return {
    group, pulled,
    update(t, dt, cue) { main.update(t, cue); snow.update(t, cue); },
    dispose() { main.dispose(); snow.dispose(); },
  };
}
