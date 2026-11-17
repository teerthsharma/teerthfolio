// FX for pr-anyps5-12609: splash rings and jet-ski spray (particles), the turn and return poof (ink and pink paper stars with flecks), the waterline foam under the boats, the sunglasses glint and the siren glow over the cruiser's lamps.
import { Vector3 } from "three";
import { makeParticles } from "../../../kit/fx/particles.js";
import { makeCel, rgb } from "../../../kit/fx/cel.js";
import { frameUV, bandOf } from "../cams.js";
import { BACK, TURN, swapF } from "../clock.js";
import { ROOF16, layout, zoomOf } from "../layout.js";

const INK = rgb("#0b0a10"), PINK = rgb("#ff3ea0"), CYAN = rgb("#2ae6ff"), CREAM = rgb("#f2f6f6"), GOLD = rgb("#ffd27a"), RED = rgb("#e8303a"), BLUE = rgb("#2a6aff");
const V = new Vector3();
const hash = (i, k) => { let h = Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(k + 7, 0x85ebca6b); h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); return ((h ^ (h >>> 12)) >>> 0) / 4294967296; };
const ring = (cx, cy, rx, ry, n = 24) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
const star = (B, cx, cy, r, seed, col) => B.fan(cx, cy, Array.from({ length: 22 }, (_, i) => { const a = (i / 22) * Math.PI * 2 + seed, q = r * (i % 2 ? 0.66 : 1) * (0.92 + 0.16 * hash(i, 31)); return [cx + Math.cos(a) * q, cy + Math.sin(a) * q]; }), col);
const BOAT = { len: 3.0 * 0.78, dx: 0.25 * 0.78 }, CRUISER = { len: 2.7 * 0.78, dx: 0.225 * 0.78 }; // hull length and centre offset in metres, bow along +x
const proj = (ctx, w) => { const c = ctx.player?.camera; if (!c || !w) return null; V.copy(w).project(c); return V.z > 1 ? null : [V.x * 0.5 + 0.5, 0.5 - V.y * 0.5]; };
// the Vice seal's screen box: feet from the group's world position (fresh), 0.85 m up; ctx.player.box follows seal.at, which the cast leaves at the origin
const seatBox = (ctx) => { const s = ctx.seal, f = s.group.getWorldPosition(new Vector3()), b = proj(ctx, f), t = proj(ctx, f.setY(f.y + 0.85 * s.scale)); return b && t ? { cx: b[0], cy: (b[1] + t[1]) / 2, bh: Math.abs(b[1] - t[1]), eye: t[1] + 0.3 * Math.abs(b[1] - t[1]) } : null; };

export default function build(ctx) {
  const { engine, THREE } = ctx, group = new THREE.Group();
  const rain = makeParticles(engine, { mode: "rain", splash: 1, splashSize: [0.04, 0.12], count: 360, motion: { speed: 14, slant: 0.35 }, colours: ["#d7dde1"], alpha: 0.3, fps: 12, volume: { shape: "box", size: [10, 6, 6], at: [0, 3, 0] }, blend: "normal" });
  const spray = makeParticles(engine, { mode: "burst", count: 60, kind: "disc", size: 6, sizeMode: "px", colours: ["#f2f6f6"], motion: { speed: 3, spread: 1, gravity: -6, dir: [0, 1, 0] }, life: 0.1667, once: false, loop: 0.1667, fps: 12, depth: false });

  const poof = makeCel(engine, { max: 400, order: 1260, draw(B, ts, A) {
    const sb = seatBox(ctx);
    if (!sb) return;
    for (const T0 of [TURN, BACK]) {
      const f = swapF(ts, T0);
      if (f < 0 || f > 5) continue;
      const cx = sb.cx * A, cy = sb.cy, r = 0.86 * sb.bh * (1 + 0.14 * f);
      if (f < 2) { for (const [k, c] of [[1, INK], [0.965, PINK], [0.6, INK], [0.56, CYAN]]) star(B, cx, cy, r * k, f * 0.4 + (k < 0.7 ? 0.14 : 0), c); continue; }
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2 + hash(i, 5), q = r * (0.8 + 0.3 * hash(i, 6)), w = (0.03 * (6 - f)) / 4, x = cx + Math.cos(a) * q, y = cy + Math.sin(a) * q; B.tri(x - w, y, x + w, y - w * 0.4, x + Math.cos(a) * w * 3, y + Math.sin(a) * w * 3, i % 3 ? INK : PINK); }
    }
  } });

  // behind: the hull hides the ring where it stands in front of it
  const foam = makeCel(engine, { max: 512, order: 1230, behind: true, draw(B, ts, A) {
    const L = layout(ts), h = bandOf(A).h, metres = (m, hh) => (m / 0.85) * hh * h;
    const water = (o, hull) => {
      const [fu, fv] = frameUV(A, o.u, o.v), cx = fu * A + metres(hull.dx, o.hh), cy = fv;
      for (const k of [1.3, 0.9]) {
        const rx = metres(k * hull.len, o.hh) / 2, ry = rx * 0.09, e = 0.0028;
        B.fan(cx, cy, ring(cx, cy, rx + e, ry + e), INK);
        B.fan(cx, cy, ring(cx, cy, rx, ry), CREAM);
      }
    };
    if (ts < 5.5) return;
    if (L.boat && L.boat.v < 0.8) water(L.boat, BOAT);
    if (L.cruiser && L.cruiser.u < 1.1 && L.cruiser.v < (ROOF16 - 0.8) * zoomOf(ts) + 0.8 - 1e-6) water(L.cruiser, CRUISER);
  } });

  const siren = makeCel(engine, { max: 256, order: 1240, draw(B, ts, A) {
    const L = layout(ts);
    if (!ctx.atTier(2) || !L.cruiser || L.cruiser.u >= 1.1 || ts < 2 || ts >= 8.5) return;
    const h = bandOf(A).h, hh = L.cruiser.hh, sc = ts < 5.5 ? 1 : 0.78, metres = (m) => (m / 0.85) * hh * h;
    const [fu, fv] = frameUV(A, L.cruiser.u, L.cruiser.v), alt = Math.floor(ts * 12 + 0.02) % 2;
    const [lx, col] = alt === 0 ? [-0.55, RED] : [-0.05, BLUE];
    const cx = fu * A + metres(lx * sc), cy = fv - metres(1.52 * sc), r = metres(0.25);
    for (const [s, a] of [[1, 0.3], [0.7, 0.5], [0.4, 0.85]]) B.fan(cx, cy, ring(cx, cy, r * s, r * s), col, a);
  } });

  const glint = makeCel(engine, { max: 64, order: 1270, draw(B, ts, A) {
    const f = Math.floor((ts - 4.5) * 24 + 0.02), sb = f >= 0 && f <= 2 ? seatBox(ctx) : null;
    if (!sb) return;
    const cx = sb.cx * A, cy = sb.eye, r = 0.05 * sb.bh;
    B.fan(cx, cy, Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2 - Math.PI / 2, q = i % 2 ? r * 0.3 : r; return [cx + Math.cos(a) * q, cy + Math.sin(a) * q]; }), GOLD);
  } });

  group.add(rain.group, spray.group, poof.group, foam.group, siren.group, glint.group);
  return {
    group,
    update(ts, cue) {
      const g = ctx.seal.group.userData, storm = ts >= 1 && ts < 5.5;
      // always visible (shrunk when off) so the particle program links at build time, never mid-play
      rain.group.visible = spray.group.visible = true;
      rain.group.scale.setScalar(ctx.atTier(3) && storm ? 1 : 1e-5); spray.group.scale.setScalar(ctx.atTier(3) && g.ski ? 1 : 1e-5);
      if (g.floor) rain.group.position.copy(g.floor);
      if (g.ski) spray.group.position.copy(g.ski);
      rain.update(ts); spray.update(ts);
      poof.update(ts, cue); foam.update(ts, cue); siren.update(ts, cue); glint.update(ts, cue);
    },
    dispose() { rain.dispose(); spray.dispose(); poof.dispose(); foam.dispose(); siren.dispose(); glint.dispose(); },
  };
}
