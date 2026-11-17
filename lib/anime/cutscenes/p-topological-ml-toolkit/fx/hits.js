// Each hit drawn as a manga page draws it: focus lines closing on it (`gather`), then one panel a drawing (`panel`): a negative, a pale field with ink
// spikes, and the hit as a vector arrow or two rings. Glass and steel debris leave each hit. Units: x in 0..A, y 0..1 down; colours from PAL.
import { Vector3 } from "three";
import { makeCel } from "../../../kit/fx/cel.js";
import { hash } from "../live/city.js";
import { HIT } from "../clock.js";
import { PAL, toned } from "../tone.js";

const COL = { deep: toned(PAL.deep), white: toned(PAL.white), pale: toned(PAL.pale), ink: toned(PAL.ink), red: toned(PAL.red), glass: toned(PAL.glass), steel: toned(PAL.steel) };
const ndcAt = (c, d) => (c.projectionMatrix.elements[10] * -d + c.projectionMatrix.elements[14]) / d;
const STAY = 7 / 24, DIR = { train: [-0.9, -0.4], ray: [0.8, -0.6] };
const DEBRIS = [[HIT.train, 26, "seal"], ...HIT.beams.map((t) => [t, 10, "seal"]), [HIT.pop, 40, [0.5, 0.04]]];

const spikes = (B, cx, cy, n, r0, seed, col, k = 1) => {
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.8 * hash(i, seed)) / n) * Math.PI * 2, r = r0 * (0.7 + 0.7 * hash(i, seed + 1)), w = (0.02 + 0.17 * hash(i, seed + 2) ** 2) * k, dx = Math.cos(a), dy = Math.sin(a);
    B.tri(cx + dx * r, cy + dy * r, cx + dx * 2.6 - dy * w / 2, cy + dy * 2.6 + dx * w / 2, cx + dx * 2.6 + dy * w / 2, cy + dy * 2.6 - dx * w / 2, col);
  }
};

const arrow = (B, a, b, w, fill, hull) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, nx = -uy, ny = ux, hl = 3.2 * w;
  const part = (kw, kh, col) => {
    const s = [b[0] - ux * hl * kh, b[1] - uy * hl * kh], hw = 2 * w * kh;
    B.ribbon([a, s], [w * kw, w * kw], col);
    B.tri(b[0], b[1], s[0] + nx * hw, s[1] + ny * hw, s[0] - nx * hw, s[1] - ny * hw, col);
  };
  part(1.7, 1.38, hull); part(1, 1, fill);
};

const ring = (B, cx, cy, r, w, col) => {
  const L = [], R = [];
  for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2, x = Math.cos(a), y = Math.sin(a); L.push([cx + x * (r - w), cy + y * (r - w)]); R.push([cx + x * (r + w), cy + y * (r + w)]); }
  B.strip(L, R, col);
};

// the hit's arrow: frame 1 red, aimed in at the hit; frame 2 white with a red hull, aimed out and half again as long; release: one thin white arrow up from the hand
const hitArrow = (B, c, kind, f, s) => {
  if (kind === "release") return arrow(B, c, [c[0], c[1] - 0.5], 0.005 * s, COL.white, COL.ink);
  const d = DIR[kind], l = Math.hypot(d[0], d[1]), ux = d[0] / l, uy = d[1] / l, r0 = 0.12, L = 0.5;
  const p = (r) => [c[0] + ux * r, c[1] + uy * r];
  if (f === 1) arrow(B, p(r0 + L), p(r0), 0.012 * s, COL.red, COL.ink);
  else arrow(B, p(r0), p(r0 + 1.5 * L), 0.012 * s, COL.white, COL.red);
};

export default function hitCel(ctx, beats) {
  const W = new Vector3(), V = new Vector3();
  const centre = (at, A) => {
    const c = ctx.player?.camera, w = at === "hand" ? ctx.seal.named?.()?.handR : at === "seal" ? ctx.seal.chest(W) : null;
    if (!w || !c) return Array.isArray(at) ? [at[0] * A, at[1]] : [A / 2, 0.5];
    V.copy(w).project(c);
    return [(V.x * 0.5 + 0.5) * A, 0.5 - V.y * 0.5];
  };
  const panel = (B, A, b, f, c, seed) => {
    if (f === 0) { B.rect(0, 0, A, 1, COL.deep); spikes(B, c[0], c[1], 44, 0.24, seed, COL.white); return; }
    B.rect(0, 0, A, 1, COL.pale);
    spikes(B, c[0], c[1], 44, 0.24 + 0.05 * f, seed + f * 7, COL.ink);
    if (b.kind === "pop") { if (f === 3) for (const r of [0.35, 0.6]) { ring(B, c[0], c[1], r, 0.014, COL.ink); ring(B, c[0], c[1], r, 0.008, COL.white); } }
    else hitArrow(B, c, b.kind, f, 1);
  };
  const debris = (B, A, ts, t0, n, at) => {
    const age = ts - t0;
    if (age < 0 || age >= 0.5) return;
    const c = centre(at, A);
    for (let i = 0; i < n; i++) {
      const a = hash(i, 41) * Math.PI * 2, d = (0.6 + hash(i, 42)) * age, x = c[0] + Math.cos(a) * d, y = c[1] + Math.sin(a) * d, s = 0.012 + 0.018 * hash(i, 43), th = hash(i, 44) * Math.PI * 2;
      B.tri(x + Math.cos(th) * s, y + Math.sin(th) * s, x + Math.cos(th + 2.1) * s * 0.7, y + Math.sin(th + 2.1) * s * 0.7, x + Math.cos(th + 4.2) * s * 0.7, y + Math.sin(th + 4.2) * s * 0.7, [COL.glass, COL.steel, COL.white][i % 3]);
    }
  };
  const cel = makeCel(ctx.engine, {
    max: 60000, order: 1200, behind: true,
    draw(B, ts, A) {
      const box = ctx.player?.box, bh = box ? box[3] - box[1] : 1, clear = box && bh < 0.45 ? 0.75 * bh : 0;
      for (const b of beats) {
        const age = ts - b.t;
        if (b.name === "gather") {
          if (age < 0 || age >= b.dur) continue;
          const k = age / b.dur, c = centre(b.at, A);
          spikes(B, c[0], c[1], Math.round(12 + 44 * k * k), Math.max(0.62 - 0.36 * k, clear), Math.round(b.t * 10) + Math.floor(age * 24) * 13, COL.white, 0.18 + 0.45 * k);
          continue;
        }
        if (age < -1e-6) continue;
        const c = centre(b.at, A), seed = Math.round(b.t * 10);
        if (age < b.dur - 1e-6) panel(B, A, b, Math.floor(age * 24 + 0.02), c, seed);
        else if (age < b.dur + STAY && b.kind !== "pop") hitArrow(B, c, b.kind, 2, 1 - (age - b.dur) / STAY);
      }
      for (const [t0, n, at] of DEBRIS) debris(B, A, ts, t0, n, at);
    },
  });
  return {
    group: cel.group,
    update(t, cue) {
      const c = ctx.player?.camera;
      if (c) cel.mesh.material.uniforms.uZ.value = ndcAt(c, c.position.distanceTo(ctx.seal.chest(W)) + 1);
      cel.update(cue?.t ?? t, cue);
    },
    dispose: () => cel.dispose(),
  };
}
