// The hits in the picture's own inks (deployed palette, PAL in ink.js): each impact panel (a flat field, radial hatch, cracks), the footfall rings,
// the bolt, the Wall's gap edges and the burn's ember flecks, behind the seal by depth; the return star in front of it (order 1260).
import { Group, Vector3 } from "three";
import { makeCel } from "../../../kit/fx/cel.js";
import { PAL } from "../ink.js";
import { toned } from "../tone.js";
import { DOCK, FACE_MOUTH, FOOT, R, smooth } from "../clock.js";

const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;
const colours = new Map();
const C = (hex) => { if (!colours.has(hex)) colours.set(hex, toned(hex)); return colours.get(hex); };
const FIELD = { turn: PAL.cream, bolt: PAL.ink, stomp: PAL.vermilion, gap: PAL.ink, return: PAL.ember };
const LINE = { bolt: PAL.bolt, gap: PAL.gold };
const GAP_X = 6, WALL_H = 20, wallZ = (x) => -30 - (x * x) / 900;
const V = new Vector3();

// a world point in frame units (x 0..A, y 0..1 down), or null when it is behind the lens
const proj = (cam, A, x, y, z) => {
  if (!cam) return null;
  V.set(x, y, z).project(cam);
  return V.z > 1 ? null : [(V.x * 0.5 + 0.5) * A, 0.5 - V.y * 0.5];
};

// a panel's centre: the seal's head top ("top"), the chest, the crowned face's mouth (rig frame + DOCK), or a frame point [u, v]
function centre(ctx, at, A) {
  if (Array.isArray(at)) return [at[0] * A, at[1]];
  if (at === "face") return proj(ctx.player?.camera, A, FACE_MOUTH[0] + DOCK[0], FACE_MOUTH[1] + DOCK[1], FACE_MOUTH[2] + DOCK[2]) ?? [A / 2, 0.5];
  const top = at === "top" ? ctx.seal.named?.()?.top : null;
  if (top) { const p = proj(ctx.player?.camera, A, top.x, top.y, top.z); if (p) return p; }
  const c = ctx.seal.chest(new Vector3());
  return proj(ctx.player?.camera, A, c.x, c.y, c.z) ?? [A / 2, 0.5];
}

// one drawing of a panel: drawing 0 is the dark one (ink field, cream lines); the rest take the kind's field and line on ones, and a bolt's halo veins on drawing 2
function drawPanel(B, ts, A, b, ctx) {
  const age = ts - b.t;
  if (age < 0 || age >= b.dur - 1e-6) return;
  const f = Math.floor(age * 24 + 1e-6), dark = f === 0;
  const field = C(dark ? PAL.ink : FIELD[b.kind] ?? PAL.cream), line = C(dark ? PAL.bolt : LINE[b.kind] ?? PAL.ink);
  const [cx, cy] = centre(ctx, b.at, A), seed = Math.round(b.t * 100) + f * 17;
  B.rect(0, 0, A, 1, field);
  for (const [a, fam] of [[0.95, 1], [-0.7, 2]]) {
    const c = Math.cos(a), s = Math.sin(a), L = 1.6;
    for (let i = -28; i < 28; i++) {
      if (hash(i, seed + fam * 101) > 0.62) continue;
      const off = i * (8 / 720);
      B.ribbon([[cx - L * c - off * s, cy - L * s + off * c], [cx + L * c - off * s, cy + L * s + off * c]], [0.0035, 0.0035], line);
    }
  }
  const rays = (col, w) => {
    for (let k = 0; k < 7; k++) {
      let x = cx, y = cy, a = (k / 7) * Math.PI * 2 + hash(k, seed) * 0.6;
      const pts = [[x, y]], ws = [w];
      for (let j = 1; j <= 4; j++) {
        a += (hash(k * 8 + j, seed) - 0.5) * 0.7;
        x += Math.cos(a) * 0.22;
        y += Math.sin(a) * 0.22;
        pts.push([x, y]);
        ws.push(w - (0.75 * w * j) / 4);
      }
      B.ribbon(pts, ws, col);
    }
  };
  const zig = (col, w) => {
    let x = cx - 0.25, y = cy - 0.9;
    const pts = [[x, y]], ws = [w];
    for (let j = 1; j <= 8; j++) {
      x = cx + (j % 2 ? 0.07 : -0.07) * (0.5 + hash(j, seed));
      y += 0.11;
      pts.push([x, y]);
      ws.push(w * (1 - j / 10));
    }
    B.ribbon(pts, ws, col);
  };
  if (b.kind === "bolt") zig(line, 0.012);
  else rays(line, 0.012);
  if (b.kind === "bolt" && f === 2) zig(C(PAL.boltHalo), 0.006);
}

// the footfall rings, the bolt, the ground crack, the gap edges and the burn's flecks: all on the world, behind the seal
function drawWorld(B, t, A, ctx) {
  const cam = ctx.player?.camera;
  if (!cam) return;
  const tq = Math.floor(t * 12 + 1e-6) / 12, at = ctx.seal.at;
  for (const f0 of FOOT) {
    const u = (tq - f0) / 0.5;
    if (u < 0 || u >= 1) continue;
    const r = 0.75 + 3.4 * u, pts = [];
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2, p = proj(cam, A, at[0] + Math.cos(a) * r, 0.03, at[2] + Math.sin(a) * r);
      if (p) pts.push(p);
    }
    if (pts.length !== 41) continue;
    B.ribbon(pts, pts.map(() => 0.0024), C(PAL.char), 1 - u);
    B.ribbon(pts, pts.map(() => 0.0012), C(PAL.gold), 1 - u);
  }
  const f = Math.floor(t * 24 + 1e-6);
  if (t >= R.bolt[0] && t < R.bolt[1] && f % 3 !== 1 && ctx.seal.chest) {
    const c = ctx.seal.chest(new Vector3()), head = proj(cam, A, c.x, c.y + 0.5 * (ctx.seal.height ?? 1.2), c.z);
    if (head) {
      const top = [head[0] + (hash(0, 9) - 0.5) * 0.1, -0.02], pts = [];
      for (let i = 0; i <= 9; i++) {
        const u = i / 9, jit = i > 0 && i < 9 ? (hash(i, f + 9) - 0.5) * 0.02 : 0;
        pts.push([top[0] + (head[0] - top[0]) * u + jit, top[1] + (head[1] - top[1]) * u]);
      }
      B.ribbon(pts, pts.map(() => 0.03), C(PAL.boltHalo));
      B.ribbon(pts, pts.map(() => 0.012), C(PAL.bolt));
    }
  }
  const s0 = R.swell[1], feet = proj(cam, A, at[0], 0, at[2]);
  if (feet && t >= s0 && t < s0 + 0.9) for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + hash(k, 12) * 0.5, L = 0.35 + 0.15 * hash(k, 13);
    const mid = [feet[0] + Math.cos(a) * L * 0.5, feet[1] + Math.sin(a) * L * 0.5], tip = [feet[0] + Math.cos(a) * L, feet[1] + Math.sin(a) * L];
    B.ribbon([feet, mid, tip], [0.01, 0.006, 0.002], C(PAL.char), 1 - (t - s0) / 0.9);
  }
  const g0 = R.shrink[0];
  if (t >= g0 && t < g0 + 0.4) for (const sx of [-GAP_X, GAP_X]) {
    const pts = [];
    for (let j = 0; j <= 12; j++) {
      const p = proj(cam, A, sx + DOCK[0], (WALL_H * j) / 12, wallZ(sx) + DOCK[2]);
      if (p) pts.push(p);
    }
    if (pts.length === 13) B.ribbon(pts, pts.map(() => 0.008), C(PAL.gold));
  }
  // the burn's flecks: two per 24 fps drawing, thrown from the ember edge (a ring about the Wall's centre, the live uBurnC), falling 0.25 H/s for 0.8 s, on twos
  if (t >= R.burn[0] && t < R.burn[1] + 0.8) {
    const [cx, cy] = proj(cam, A, DOCK[0], 4.5, DOCK[2] + wallZ(0)) ?? [A / 2, 0.5];
    const kHi = Math.floor(tq * 24 + 1e-6), kLo = Math.max(Math.ceil(R.burn[0] * 24 - 1e-6), Math.floor((tq - 0.8) * 24) + 1);
    for (let k = kLo; k <= kHi; k++) {
      const te = k / 24;
      if (te > R.burn[1]) break;
      const r = Math.max(0, smooth(R.burn[0], R.burn[1], te) * 1.9 - 0.02), age = tq - te;
      for (let j = 0; j < 2; j++) {
        const n = k * 2 + j, a = hash(n, 41) * Math.PI * 2, sz = 0.004 + 0.005 * hash(n, 47);
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r + 0.25 * age;
        B.tri(x, y - sz, x - sz * 0.9, y + sz * 0.6, x + sz * 0.9, y + sz * 0.6, C(n % 2 ? PAL.char : n % 4 ? PAL.ember : PAL.gold));
      }
    }
  }
}

// the return star: two drawings of a 22-point paper star over the seal (the swap is under it), then 14 flecks for four drawings
function drawStar(B, t, A, ctx) {
  const f = Math.floor((t - R.turnBack) * 24 + 1e-6), box = ctx.player?.box;
  if (f < 0 || f > 5 || !box) return;
  const bh = box[3] - box[1], cx = ((box[0] + box[2]) / 2) * A, cy = (box[1] + box[3]) / 2 - 0.1 * bh, r = 0.86 * bh * (1 + 0.14 * f);
  if (f < 2) {
    for (const [k, col] of [[1, PAL.char], [0.965, PAL.ember], [0.6, PAL.char], [0.56, "#FFF2CC"]]) {
      const ring = Array.from({ length: 22 }, (_, i) => {
        const a = (i / 22) * Math.PI * 2 + (f * 0.4 + (k < 0.7 ? 0.14 : 0)), q = r * k * (i % 2 ? 0.66 : 1) * (0.92 + 0.16 * hash(i, 31));
        return [cx + Math.cos(a) * q, cy + Math.sin(a) * q];
      });
      B.fan(cx, cy, ring, C(col));
    }
    return;
  }
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + hash(i, 5), q = r * (0.8 + 0.3 * hash(i, 6)), w = (0.03 * (6 - f)) / 4, x = cx + Math.cos(a) * q, y = cy + Math.sin(a) * q;
    B.tri(x - w, y, x + w, y - w * 0.4, x + Math.cos(a) * w * 3, y + Math.sin(a) * w * 3, C(i % 3 ? PAL.char : "#FFF2CC"));
  }
}

export function makeHits(ctx) {
  const group = new Group();
  const panels = (ctx.scene?.beats ?? []).filter((b) => b.name === "panel");
  const panelCel = makeCel(ctx.engine, { max: 60000, order: 1200, behind: true, draw(B, ts, A) { for (const b of panels) drawPanel(B, ts, A, b, ctx); } });
  const worldCel = makeCel(ctx.engine, { max: 40000, order: 1195, behind: true, draw(B, t, A) { drawWorld(B, t, A, ctx); } });
  const starCel = makeCel(ctx.engine, { max: 800, order: 1260, draw(B, t, A) { drawStar(B, t, A, ctx); } });
  group.add(panelCel.group, worldCel.group, starCel.group);
  return {
    group,
    update(t, cue) { panelCel.update(t, cue); worldCel.update(t, cue); starCel.update(t, cue); },
    dispose() { panelCel.dispose(); worldCel.dispose(); starCel.dispose(); },
  };
}
