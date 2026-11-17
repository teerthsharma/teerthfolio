// hits: ignition, the nine orb passes, the crack, the collapse, the island snow, and the turn (veil, paper star, flecks, hair flicks), all flat cel drawings.
import { Group, Vector3 } from "three";
import { makeBurst, makeCel, makeCracks, makeDebris, makeRing, makeSpeedLines, rgb } from "../../../kit/fx/cel.js";
import { BACK, DOCK, LINE, ORB, PAL, PASSY, PASSZ, R, passReal } from "../clock.js";
import { STAND } from "../lens.js";
import { toned } from "../tone.js";
import { hash } from "../util.js";

const tent = (x, c, w) => Math.max(0, 1 - Math.abs(x - c) / w);
const INK = rgb(PAL.ink), FLASH = toned(PAL.flash), SNOW = rgb("#ffffff");
const wedge = (i) => (i === 3 || i === 8 ? PAL.hitGold : [0, 6].includes(i) ? PAL.hitRed : ORB.colors[i % 6]);
const paperStar = (B, cx, cy, r, seed, col) => B.fan(cx, cy, Array.from({ length: 22 }, (_, i) => {
  const a = (i / 22) * Math.PI * 2 + seed, q = r * (i % 2 ? 0.66 : 1) * (0.92 + 0.16 * hash(i, 31));
  return [cx + Math.cos(a) * q, cy + Math.sin(a) * q];
}), col);
const hairFlick = (B, A, ts, box) => {
  if (!box) return;
  for (const t0 of [2.85, 3.0]) {
    const a = ts - t0;
    if (a < 0 || a >= 0.2) continue;
    const bh = box[3] - box[1], cx = ((box[0] + box[2]) / 2) * A, top = box[1] + 0.12 * bh, w = 0.0022 * (1 - a / 0.2) + 0.0008;
    for (let i = 0; i < 8; i++) { const x = cx + (i - 3.5) * 0.025 * bh, h = bh * (0.2 + 0.1 * hash(i, 40)); B.tri(x - w, top, x + w, top, x + w * 0.2, top - h, INK); }
  }
};

export function buildHits(ctx) {
  const group = new Group(), V = new Vector3(), AT = new Vector3(...DOCK), FEET = new Vector3(STAND[0], 0, STAND[2]), W = new Vector3();
  const cam = () => ctx.player?.camera;
  const box = () => ctx.player?.box;
  const uv = (p, rig = true) => { const c = cam(); if (!c) return null; V.copy(p); if (rig) V.add(AT); V.project(c); return V.z > 1 ? null : [V.x * 0.5 + 0.5, 0.5 - V.y * 0.5]; };
  const centre = () => { const b = box(); return b ? [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2] : [0.5, 0.45]; };
  const chest = () => { const c = ctx.seal.chest?.(W); return c ? uv(c, false) ?? centre() : centre(); };
  const feet = () => uv(FEET) ?? [0.5, 0.9];
  const passAtUV = (i) => { const p = uv(new Vector3(0, PASSY[i], PASSZ[i])) ?? [0.5, 0.5]; return [Math.min(0.9, Math.max(0.1, p[0])), p[1]]; };

  const burst = makeBurst(ctx.engine, { order: 1210, events: [] });
  const lines = makeSpeedLines(ctx.engine, { order: 1205, events: [] });
  const ring = makeRing(ctx.engine, { order: 1208, events: [] });
  const debris = makeDebris(ctx.engine, { order: 1209, events: [] });
  const cracks = makeCracks(ctx.engine, { order: 1206, events: [] });
  const snow = makeCel(ctx.engine, { max: 260, order: 1190, behind: true, draw(B, ts, A) {
    for (let i = 0; i < 120; i++) {
      const z = 0.35 + 0.65 * hash(i, 21), x = ((((hash(i, 22) + ts * 0.011 * z + 0.012 * Math.sin(ts * 0.9 + i)) % 1) + 1) % 1) * A, y = (hash(i, 23) + ts * 0.034 * z) % 1, r = 0.0016 + 0.0026 * z * z;
      B.tri(x, y - r, x + r, y, x, y + r, SNOW); B.tri(x, y - r, x, y + r, x - r, y, SNOW);
    }
  } });
  const veil = makeCel(ctx.engine, { max: 4, order: 1250, draw(B, ts, A) {
    const a = 0.3 * tent(ts, R.flash, 0.12) + 0.18 * tent(ts, R.crack, 0.1) + 0.14 * tent(ts, BACK, 0.1);
    if (a > 0.003) B.rect(0, 0, A, 1, FLASH, Math.min(1, a));
  } });
  const poofBox = (ts, A) => { const f = Math.floor((ts - BACK) * 24 + 1e-6), b = box(); return b ? { f, cx: ((b[0] + b[2]) / 2) * A, cy: (b[1] + b[3]) / 2 - 0.1 * (b[3] - b[1]), r: 0.86 * (b[3] - b[1]) * (1 + 0.14 * f) } : null; };
  const star = makeCel(ctx.engine, { max: 400, order: 1260, draw(B, ts, A) {
    const p = poofBox(ts, A);
    if (!p || p.f < 0 || p.f > 1) return;
    for (const [k, c] of [[1, INK], [0.965, FLASH], [0.6, INK], [0.56, FLASH]]) paperStar(B, p.cx, p.cy, p.r * k, p.f * 0.4 + (k < 0.7 ? 0.14 : 0), c);
  } });
  const flecks = makeCel(ctx.engine, { max: 400, order: 1261, draw(B, ts, A) {
    const p = poofBox(ts, A);
    if (!p || p.f < 2 || p.f > 5) return;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + hash(i, 5), q = p.r * (0.8 + 0.3 * hash(i, 6)), w = 0.03 * (6 - p.f) / 4, x = p.cx + Math.cos(a) * q, y = p.cy + Math.sin(a) * q;
      B.tri(x - w, y, x + w, y - w * 0.4, x + Math.cos(a) * w * 3, y + Math.sin(a) * w * 3, i % 3 ? INK : FLASH);
    }
  } });
  const flicks = makeCel(ctx.engine, { max: 200, order: 1262, draw(B, ts, A) { hairFlick(B, A, ts, box()); } });
  star.group.userData.tier = 0;
  flecks.group.userData.tier = 2;
  const cels = [burst, lines, ring, debris, cracks, snow, veil, star, flecks, flicks];
  group.add(...cels.map((c) => c.group));

  const ignition = (E) => {
    E.burst.push({ at: R.ignite[0], where: chest(), size: 0.5, spikes: 22, frames: 10, bgFrames: 3, edge: "#a58cf0", body: "#e6ecff", core: "#ffffff", ink: PAL.ink });
    E.lines.push({ at: R.ignite[0], focus: [0.5, 0.5], col: "#f7f5ff", count: 90, dur: 0.6, in: false });
    E.ring.push({ at: R.ignite[0], where: feet(), radius: 0.7, rings: 3, edge: "#a58cf0", body: "#e6ecff", ink: PAL.ink });
    E.debris.push({ at: R.ignite[0], where: feet(), count: 40, tone: "#8c7a66", lit: "#e1d6bd", ink: PAL.ink });
  };
  const passes = (E) => {
    for (let i = 0; i < ORB.n; i++) {
      const at = passReal(i);
      E.burst.push({ at, where: passAtUV(i), size: 0.22 + 0.01 * i, spikes: 14, frames: 6, bgFrames: 0, edge: ORB.colors[i % 6], body: "#fffff2", core: "#ffffff", ink: PAL.ink });
      E.lines.push({ at, focus: chest(), col: wedge(i), count: 40, dur: 0.25, in: true });
      E.ring.push({ at, where: feet(), rings: 1, edge: ORB.colors[i % 6], body: "#fffff2", ink: PAL.ink });
      if (i === 2 || i === 5 || i === 8) E.debris.push({ at, where: feet(), count: 18, ink: PAL.ink });
    }
  };
  const crack = (E) => {
    E.burst.push({ at: R.crack, where: [0.5, 0.5], size: 0.55, bgFrames: 3, edge: PAL.krrrk, body: PAL.cream, core: "#ffffff", ink: PAL.ink });
    E.cracks.push({ at: R.crack, where: [0.5, 0.86], count: 9, len: 1.2, seam: PAL.ink, ink: PAL.ink, hold: 0.6 });
    E.debris.push({ at: R.crack, where: [0.5, 0.86], count: 50, tone: "#8c7a66", lit: "#e1d6bd", ink: PAL.ink });
  };
  const collapse = (E) => {
    E.ring.push({ at: LINE.collapse[0], where: [0.5, 0.82], rings: 3, edge: "#cfe6ff", body: PAL.flash, ink: PAL.ink });
    E.debris.push({ at: LINE.collapse[0], where: [0.5, 0.82], count: 20, ink: PAL.ink });
  };

  return {
    group,
    update(t, cue) {
      const E = { burst: [], lines: [], ring: [], debris: [], cracks: [] };
      if (t >= 2.6 && t < 4.4) ignition(E);
      if (t >= 4.9 && t < 16.4) passes(E);
      if (t >= 20.7 && t < 23.5) crack(E);
      if (t >= 24.9 && t < 26.7) collapse(E);
      burst.set({ events: E.burst }); lines.set({ events: E.lines }); ring.set({ events: E.ring });
      debris.set({ events: E.debris }); cracks.set({ events: E.cracks });
      snow.group.visible = t < R.impact || t >= R.reveal;
      for (const c of cels) c.update(t, cue);
    },
    dispose() { for (const c of cels) c.dispose(); },
  };
}
