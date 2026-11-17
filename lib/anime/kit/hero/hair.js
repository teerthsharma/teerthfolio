// HERO HAIR: anime hair as a few large designed locks, not shards. Each lock is a smooth tapered ribbon (a flattened
// ellipse section, a leaf profile that ends in a clean point) swept along a flow curve that is pushed off the head
// and torso fields, so locks lie on the sculpt without gaps. One hard shadow tone sits on the under side (baked as
// the Xrd bias plus the authored shade colour), one lens-shaped highlight band crosses the lit side, a cap fills the
// scalp under the locks. Mesh density follows o.tier (default 3). Exports: HAIR_PRESETS, defineHair, hairGeometry(spec, o) -> merge-ready BufferGeometry,
// buildHair(engine, spec, head) -> { group, set(patch), dispose() }. set takes sway, blend, col/shade/hi.
import { BufferAttribute, BufferGeometry, Color, Group, Vector3 } from "three";
import { rng } from "../../kit3d.js";
import { DOME, HEAD_AT, TORSO, darker, fieldOf, headPrims, torsoRow } from "./body.js";

const HF = fieldOf(headPrims({ coat: "#888888", shade: "#444444" }));
const TF = fieldOf(Object.keys(TORSO).map((n) => torsoRow(n, null)));
const TFh = (x, y, z) => TF(x, y + HEAD_AT[1], z);
const KEY = new Vector3(0.5, 0.72, 0.48).normalize();
const V = (a) => new Vector3(...a);
const lin = (a, b, n, i) => (n < 2 ? (a + b) / 2 : a + ((b - a) * i) / (n - 1));
const grad = (F, p, e = 0.002) => new Vector3(F(p.x + e, p.y, p.z) - F(p.x - e, p.y, p.z), F(p.x, p.y + e, p.z) - F(p.x, p.y - e, p.z), F(p.x, p.y, p.z + e) - F(p.x, p.y, p.z - e)).normalize();
function push(p, clr) { // out of the head along its gradient, out of the torso sideways so back hair never wraps to the chest
  for (let k = 0; k < 3; k++) { const d = HF(p.x, p.y, p.z) - clr; if (d < 0) p.addScaledVector(grad(HF, p), -d); }
  for (let k = 0; k < 40 && TFh(p.x, p.y, p.z) < clr; k++) { const dz = p.z + 0.01, r = Math.hypot(p.x, dz) || 1; p.x += (p.x / r) * 0.006; p.z += (dz / r) * 0.006; }
}
const inFace = (p) => p.z > 0.09 && p.y < 0.262 && p.y > -0.02 && Math.abs(p.x) < 0.19;
const TQ = [{ nc: 5, sm: 5, sd: 0.045, sx: 8, ct: 32, cp: 10, sn: 3 }, { nc: 5, sm: 5, sd: 0.045, sx: 8, ct: 32, cp: 10, sn: 3 }, { nc: 6, sm: 7, sd: 0.028, sx: 12, ct: 48, cp: 16, sn: 4 }, { nc: 8, sm: 9, sd: 0.018, sx: 16, ct: 72, cp: 26, sn: 5 }];
let Q = TQ[3];
const SC = new Map();
function scalp(phi, th) {
  const key = `${phi.toFixed(3)}|${th.toFixed(3)}`;
  if (!SC.has(key)) {
    const d = new Vector3(Math.sin(phi) * Math.sin(th) * DOME.r[0], Math.cos(phi) * DOME.r[1], Math.sin(phi) * Math.cos(th) * DOME.r[2]).normalize(), c = V(DOME.c);
    let a = 0.02, b = 0.6;
    for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (HF(c.x + d.x * m, c.y + d.y * m, c.z + d.z * m) < 0) a = m; else b = m; }
    const p = c.addScaledVector(d, a);
    SC.set(key, { p, n: grad(HF, p) });
  }
  const s = SC.get(key);
  return { p: s.p.clone(), n: s.n.clone() };
}

// the old option set (band/sector/count/layers/sweep/droop/fringe/tail/ridge) keeps its meaning for every cutscene that uses it
export const LEGACY = {
  spiky: { band: [0.05, 1.15], sector: [-Math.PI, Math.PI], count: 16, layers: 2, length: [0.12, 0.26], width: 0.07, lift: 0.8, sweep: [0, 0.05, 0], droop: 0, spike: 0.8, curl: 0.02 },
  swept: { band: [0.1, 1.2], sector: [-Math.PI, Math.PI], count: 20, layers: 2, length: [0.14, 0.24], width: 0.06, lift: 0.35, sweep: [0, 0.05, -0.55], droop: 0.1, spike: 0.35, curl: 0 },
  long: { band: [0.1, 1.35], sector: [-Math.PI, Math.PI], count: 22, layers: 2, length: [0.34, 0.62], width: 0.075, lift: 0.25, sweep: [0, -0.1, -0.1], droop: 0.55, spike: 0.25, curl: 0.04 },
  bob: { band: [0.1, 1.3], sector: [-Math.PI, Math.PI], count: 22, layers: 2, length: [0.16, 0.26], width: 0.075, lift: 0.3, sweep: [0, -0.2, 0], droop: 0.3, spike: 0.1, curl: 0 },
  ponytail: { band: [0.1, 1.2], sector: [-Math.PI, Math.PI], count: 18, layers: 2, length: [0.12, 0.2], width: 0.07, lift: 0.3, sweep: [0, 0, -0.6], droop: 0.15, spike: 0.2, curl: 0, tail: { n: 7, length: 0.52, width: 0.07, at: [0, 0.74, -0.2] } },
  twintail: { band: [0.1, 1.2], sector: [-Math.PI, Math.PI], count: 16, layers: 2, length: [0.1, 0.18], width: 0.07, lift: 0.3, sweep: [0, 0, 0], droop: 0.1, spike: 0.2, curl: 0, tail: { n: 6, length: 0.6, width: 0.075, at: [0.2, 0.7, -0.05], mirror: true } },
  forelock: { band: [0.1, 1.2], sector: [-Math.PI, Math.PI], count: 18, layers: 2, length: [0.14, 0.22], width: 0.06, lift: 0.3, sweep: [0, 0.05, -0.5], droop: 0.1, spike: 0.3, curl: 0, fringe: { n: 2, length: 0.2, at: [0.04, 0.78, 0.2], sweep: [0.2, -0.9, 0.5] } },
  slick: { band: [0.1, 1.2], sector: [-Math.PI, Math.PI], count: 18, layers: 1, length: [0.12, 0.2], width: 0.07, lift: 0.1, sweep: [0, 0, -0.9], droop: 0, spike: 0.2, curl: 0 },
  mohawk: { band: [0.05, 0.6], sector: [-0.5, 0.5], count: 0, layers: 1, length: [0.12, 0.2], width: 0.05, lift: 1, sweep: [0, 0.1, 0], droop: 0, spike: 0.6, curl: 0, ridge: { n: 9, length: 0.2, width: 0.05 } },
};
const LEGACY_KEYS = ["band", "sector", "count", "layers", "parts", "tail", "fringe", "ridge", "sweep", "lift", "droop"];

export const HAIR_PRESETS = {
  spiky: { gen: "spikes", n: 12, width: 0.14 }, wedge: { gen: "spikes", n: 5, antenna: 2, fringe: 0, lift: 0.9 }, flame: { gen: "spikes", n: 7, up: 1.25, fringe: 1 },
  tuft: { gen: "spikes", n: 5, spike: 0.9, width: 0.05, wisps: 2, fringe: 0 }, ud: { gen: "spikes", n: 7, up: 1.05 },
  swept: { gen: "flow", style: "swept" }, slick: { gen: "flow", style: "slick" }, forelock: { gen: "flow", style: "swept", forelock: 1 },
  mane: { gen: "flow", style: "mane", bangs: 3 }, long: { gen: "flow", style: "long" }, flat: { gen: "flow", style: "flat" }, bob: { gen: "flow", style: "bob" },
  crop: { gen: "flow", style: "crop" }, curls: { gen: "flow", style: "crop", curls: 3, n: 6 },
  ponytail: { gen: "flow", style: "swept", tail: "low" }, bun: { gen: "flow", style: "long", tail: "bun" }, braid: { gen: "flow", style: "swept", tail: "braid" },
  twintail: { gen: "flow", style: "slick", tail: "twin", bangs: 5 }, beard: { gen: "beard" }, mohawk: { gen: "spikes", n: 9, ridge: 1 }, bald: { gen: "none" },
};
export const defineHair = (base, o = {}) => ({ ...(HAIR_PRESETS[base] ?? base), ...o });

const RH = [1, 0.8, 0.94, 0.72, 1.06, 0.84, 0.97];
const mk = (o) => ({ lift: 0.5, sweep: [0, 0, 0], droop: 0, curl: 0, spike: 0.5, thick: 0.26, layer: 0, ...o });

function spikes(o, g) {
  const out = [], Lm = o.L, vol = o.vol, up = g.up ?? 1, sp = g.spike ?? 0.5, W = (g.width ?? 0.09) * vol, n = Math.round((o.n ?? g.n ?? 7) * Math.min(1.8, Math.max(1, W / (0.09 * Lm)))), // wide specs become more locks, not fatter ones
    lift = g.lift ?? 0.82, side = o.dir ?? 0;
  for (let i = 0; i < n; i++) {
    const t = lin(-1, 1, n, i), th = t * 2.15 + side * 0.15, ph = 0.32 + 0.3 * (1 + Math.cos(th)) / 2;
    out.push(mk({ phi: ph, th, L: 0.2 * Lm * up * RH[i % 7] * (1.12 - 0.26 * Math.abs(t)), W, lift, sweep: [t * 0.25, 0.7, -0.5], A: [t * 0.1, -0.05, -0.28], B: [t * 0.06, 0.12, 0], spike: sp }));
  }
  for (let i = 0; i < n - 1; i++) {
    const t = lin(-1, 1, n, i + 0.5), th = t * 2.15;
    out.push(mk({ phi: 0.78 + 0.18 * (1 + Math.cos(th)) / 2, th, L: 0.13 * Lm * RH[(i + 3) % 7], W: W * 1.3, lift: 0.55, sweep: [t * 0.3, 0.15, -0.4], A: [0, -0.1, -0.1], spike: sp, layer: 1 }));
  }
  const nf = o.fringe ?? g.fringe ?? 3;
  for (let i = 0; i < nf; i++) out.push(mk({ phi: 0.7 + 0.06 * (i % 2), th: lin(-0.5, 0.5, nf, i) + (o.part ?? 0) * 0.2, L: 0.12 * Lm * (1 - 0.15 * (i % 2)), W: 0.058 * vol, lift: 0.2, sweep: [lin(-0.4, 0.4, nf, i), -0.6, 0.55], droop: 0.5, spike: 0.45, layer: 2, A: [0, -0.1, 0.06] }));
  for (let i = 0; i < (g.wisps ?? 0); i++) out.push(mk({ phi: 0.5, th: i ? 0.5 : -0.5, L: 0.26 * Lm, W: 0.022 * vol, lift: 0.7, sweep: [i ? 0.5 : -0.5, 0.4, -0.2], A: [i ? 0.2 : -0.2, -0.05, -0.1], spike: 0.95, layer: 2 }));
  for (let i = 0; i < (g.antenna ?? 0); i++) { const s = i ? 1 : -1; out.push(mk({ phi: 0.8, th: s * 0.3, L: 0.24 * Lm, W: 0.034 * vol, lift: 0.7, sweep: [s * 0.25, 0.5, 0.15], A: [s * 0.1, 0, -0.1], B: [s * 0.05, -0.18, 0.1], spike: 0.9, layer: 2 })); }
  if (g.ridge) for (let i = 0; i < 9; i++) out.push(mk({ phi: 0.35 + 0.45 * Math.abs(Math.cos((i / 8) * Math.PI)), th: (i / 8 - 0.5) * 0.5, L: 0.2 * Lm, W: 0.05 * vol, lift: 1, sweep: [0, 0.1, -0.3 + i * 0.05], spike: 0.6 }));
  return out;
}

const STYLES = {
  swept: [[-1.15, 1.15, 11, 0.85, 1.0, 0.2, 0.24, -0.5, 0.3, [0, 0.1, -0.9], 0.3, 0.45, 0.066], [1.25, 2.3, 4, 1.15, 1.35, 0.22, 0.28, 0.2, 0.2, [0, -0.2, -0.4], 0.5, 0.4, 0.08], [-2.3, -1.25, 4, 1.15, 1.35, 0.22, 0.28, 0.2, 0.2, [0, -0.2, -0.4], 0.5, 0.4, 0.08], [2.4, 3.9, 6, 1.3, 1.55, 0.2, 0.26, 1, 0.1, [0, -0.5, 0], 0.5, 0.35, 0.09]],
  slick: [[-1.2, 1.2, 12, 0.9, 1.05, 0.2, 0.24, -0.6, 0.15, [0, 0.05, -1], 0.2, 0.3, 0.062], [1.3, 2.5, 4, 1.2, 1.4, 0.18, 0.22, 0.4, 0.1, [0, -0.2, -0.6], 0.3, 0.3, 0.08], [-2.5, -1.3, 4, 1.2, 1.4, 0.18, 0.22, 0.4, 0.1, [0, -0.2, -0.6], 0.3, 0.3, 0.08]],
  mane: [[-1.2, 1.2, 13, 0.85, 1.0, 0.36, 0.44, -0.6, 0.25, [0, 0.15, -1], 0.9, 0.4, 0.07], [1.3, 2.4, 5, 1.15, 1.4, 0.34, 0.42, 0.5, 0.15, [0, -0.1, -0.7], 0.9, 0.3, 0.075], [-2.4, -1.3, 5, 1.15, 1.4, 0.34, 0.42, 0.5, 0.15, [0, -0.1, -0.7], 0.9, 0.3, 0.075], [2.5, 3.8, 9, 1.35, 1.6, 0.4, 0.5, 1, 0.1, [0, -0.6, 0], 1, 0.3, 0.085]],
  long: [[-1.0, 1.0, 10, 0.75, 0.95, 0.24, 0.3, -0.25, 0.25, [0, 0.05, -0.5], 0.5, 0.2, 0.11], [0.95, 1.35, 3, 1.0, 1.1, 0.38, 0.46, 1, 0.2, [0, -0.7, 0.2], 0.6, 0.2, 0.12], [-1.35, -0.95, 3, 1.0, 1.1, 0.38, 0.46, 1, 0.2, [0, -0.7, 0.2], 0.6, 0.2, 0.12], [1.5, 4.8, 14, 1.0, 1.4, 0.42, 0.52, 1, 0.1, [0, -0.6, 0], 0.6, 0.2, 0.12]],
  flat: [[-3.0, 3.0, 14, 0.8, 1.25, 0.36, 0.44, 1, 0.12, [0, -0.3, 0], 0.8, 0.3, 0.1]],
  bob: [[-3.0, 3.0, 12, 0.9, 1.3, 0.2, 0.26, 1, 0.1, [0, -0.2, 0], 0.5, 0.2, 0.1], [-0.9, 0.9, 5, 0.6, 0.8, 0.16, 0.2, -0.1, 0.2, [0, 0, 0.1], 0.4, 0.3, 0.09]],
  crop: [[-2.9, 2.9, 10, 0.4, 0.95, 0.1, 0.16, 0.15, 0.6, [0, 0.2, -0.1], 0.3, 0.38, 0.105], [-0.9, 0.9, 4, 0.8, 0.9, 0.14, 0.18, 0.2, 0.2, [0, -0.5, 0.5], 0.5, 0.5, 0.06]],
};
const HUG = { swept: 0.6, slick: 0.8, mane: 0.75, long: 0.5, flat: 0.5, bob: 0.8 };
function flow(o, g) {
  const out = [], R = rng(o.seed ?? 11), rows = STYLES[g.style ?? "swept"], hug = HUG[g.style ?? "swept"];
  for (const [a, b, n, pa, pb, la, lb, tw, lift, sweep, droop, spike, W] of rows) for (let i = 0; i < n; i++) {
    const t = n < 2 ? 0.5 : i / (n - 1), th = lin(a, b, n, i) + (R() - 0.5) * 0.12 + (o.part ?? 0) * 0.15 * Math.sign(a), r = RH[i % 7], bang = tw >= 0.8 && Math.abs(th) < 0.9 ? 0.3 + 0.7 * Math.abs(th) / 0.9 : 1;
    out.push(mk({ phi: pa + (pb - pa) * ((i % 2) * 0.5 + t * 0.5), th, L: (la + (lb - la) * r) * o.L * bang, W: W * o.vol, tw, lift, sweep: [sweep[0] + (R() - 0.5) * 0.2 + (o.dir ?? 0) * 0.3, sweep[1], sweep[2]], droop, spike, hug, curl: 0.02 * (R() - 0.5), layer: i % 2 }));
  }
  for (let i = 0; i < (g.bangs ?? 0); i++) out.push(mk({ phi: 0.8, th: lin(-0.6, 0.6, g.bangs, i) + (o.part ?? 0) * 0.2, L: 0.1 * o.L * (1 + 0.25 * (i % 2)), W: 0.065 * o.vol, tw: 0.4, lift: 0.2, sweep: [lin(-0.5, 0.5, g.bangs, i), -0.7, 0.45], droop: 0.5, spike: 0.45, layer: 3 }));
  if (g.forelock) out.push(mk({ phi: 0.75, th: 0.12, L: 0.24 * o.L, W: 0.07 * o.vol, tw: 0.3, lift: 0.2, sweep: [0.2, -0.9, 0.6], droop: 0.6, spike: 0.5, curl: 0.04, layer: 3 }));
  const nc = g.curls ?? 0;
  for (let i = 0; i < nc; i++) out.push(mk({ phi: 0.8, th: lin(-0.5, 0.5, nc, i), L: 0.17 * o.L, W: 0.05 * o.vol, thick: 0.6, tw: 0.3, lift: 0.15, sweep: [0, -0.5, 0.5], droop: 0.2, spike: 0.15, spiral: (i % 2 ? 1 : -1) * 5, layer: 3 }));
  if (g.tail === "low") tail(out, o, [0, 0.12, -0.2], [0, -0.85, -0.35], 7, 0.4, 0.05);
  if (g.tail === "twin") for (const s of [1, -1]) tail(out, o, [0.19 * s, 0.25, -0.03], [0.3 * s, -0.95, -0.12], 7, 0.5, 0.045);
  if (g.tail === "braid") braid(out, o);
  if (g.tail === "bun") { tail(out, o, [0, 0.12, -0.2], [0, -0.85, -0.35], 7, 0.36, 0.045); bun(out, o); }
  return out;
}
function tail(out, o, at, dir, n, L, W) {
  for (let i = 0; i < n; i++) { const a = (i / (n - 1) - 0.5) * 0.9, d = V(dir).add(new Vector3(Math.sin(a) * 0.45, 0, 0)).normalize(); out.push(mk({ p0: [at[0] + Math.sin(a) * 0.03, at[1], at[2]], n: [0, 0.3, -1], d0: d.toArray(), L: L * o.L * (0.88 + 0.2 * RH[i % 7]), W: W * o.vol * 1.05, spike: 0.35, droop: 0.15, curl: 0.03 * (i % 2 ? 1 : -1), pivot: at, layer: 1 + (i % 2) })); }
}
function braid(out, o) {
  for (let i = 0; i < 5; i++) out.push(mk({ p0: [(i % 2 ? 0.014 : -0.014), 0.1 - i * 0.065, -0.2 - i * 0.03], n: [0, 0.1, -1], d0: [(i % 2 ? -0.1 : 0.1), -1, -0.18], L: 0.1 * o.L, W: 0.05 * o.vol, spike: 0.15, thick: 0.6, pivot: [0, 0.1, -0.2], layer: 2 }));
}
function bun(out, o) {
  for (let i = 0; i < 3; i++) { const pts = []; for (let k = 0; k <= 12; k++) { const a = (k / 12) * Math.PI * 2 + i * 2.1; pts.push([Math.sin(a) * 0.012 * (i - 1), 0.35 + Math.sin(a) * 0.05, -0.09 + Math.cos(a) * 0.05]); } out.push(mk({ pts, n: [0, 1, 0], L: 0.3, W: 0.04 * o.vol, spike: 0.1, thick: 0.7, layer: 3 })); }
}
function beard(o, g = {}) { // roots on the jaw line (marched onto the head field), locks fall from there
  const out = [], n = g.n ?? 9;
  for (let i = 0; i < n; i++) {
    const u = lin(-1, 1, n, i), x = u * 0.15, y = 0.075 - 0.03 * Math.abs(u);
    let z = 0.32; while (z > 0 && HF(x, y, z) > 0) z -= 0.004;
    const p = new Vector3(x, y, z + 0.004), nn = grad(HF, p);
    out.push(mk({ p0: p.toArray(), n: nn.toArray(), d0: [u * 0.25, -1, 0.2], L: (0.12 - 0.03 * Math.abs(u) + 0.01 * (i % 2)) * (o.L ?? 1), W: (0.038 - 0.006 * Math.abs(u)) * (o.vol ?? 1), spike: 0.5, droop: 1.2, thick: 0.5, layer: 1, free: true }));
  }
  return out;
}
const GEN = { spikes, flow, beard, none: () => [] };

function legacy(o, base, s) {
  const out = [], R = rng(o.seed ?? 11), count = o.count ?? 16, layers = o.layers ?? 2, [p0a, p1a] = o.band ?? [0.1, 1.2], [t0, t1] = o.sector ?? [-Math.PI, Math.PI], len = o.length ?? [0.14, 0.24];
  for (let l = 0; l < layers; l++) for (let i = 0; i < count; i++) {
    const phi = p0a + (p1a - p0a) * ((i * 0.618 + l * 0.31 + R() * 0.15) % 1), th = t0 + (t1 - t0) * ((i * 0.7548 + l * 0.17 + R() * 0.12) % 1);
    out.push(mk({ phi, th, L: (len[0] + R() * (len[1] - len[0])) * s * (1 - l * 0.28), W: (o.width ?? 0.07) * s * 0.62, bow: (R() < 0.5 ? -1 : 1) * (0.06 + 0.1 * R()), lift: o.lift ?? 0.4, sweep: o.sweep ?? [0, 0, 0], droop: o.droop ?? 0.2, curl: (o.curl ?? 0) * (R() < 0.5 ? -1 : 1), spike: o.spike ?? 0.3, layer: l, legacy: true }));
  }
  const fan = (cfg, mirror) => { for (const sx of mirror ? [1, -1] : [1]) for (let i = 0; i < (cfg.n ?? 6); i++) {
    const a = (i / Math.max(1, (cfg.n ?? 6) - 1) - 0.5) * 0.9, d0 = new Vector3(0.55 * sx + Math.sin(a) * 0.4, -0.55, -0.35 + Math.cos(a) * 0.2).add(V(cfg.sweep ?? [0, 0, 0]).multiplyScalar(0.5)).normalize();
    out.push(mk({ p0: [cfg.at[0] * sx + Math.sin(a) * 0.03, cfg.at[1] + R() * 0.02, cfg.at[2]], n: [0, 0.3, -1], d0: d0.toArray(), L: (cfg.length ?? 0.5) * s * (0.85 + R() * 0.3), W: cfg.width ?? 0.07, spike: 0.25, droop: 0.4, curl: 0.05 * (R() < 0.5 ? -1 : 1), layer: 1, pivot: [cfg.at[0] * sx, cfg.at[1], cfg.at[2]] }));
  } };
  if (o.tail) fan(o.tail, !!o.tail.mirror);
  if (o.fringe) for (let i = 0; i < o.fringe.n; i++) out.push(mk({ p0: [o.fringe.at[0] + (i - 0.5) * 0.05, o.fringe.at[1], o.fringe.at[2]], n: [0, 0.6, 0.8], d0: V(o.fringe.sweep).add(new Vector3((R() - 0.5) * 0.3, 0, 0)).normalize().toArray(), L: o.fringe.length * s, W: 0.05, spike: 0.5, droop: 0.35, curl: 0.02, layer: 2 }));
  if (o.ridge) for (let i = 0; i < o.ridge.n; i++) { const th = Math.PI * (i / (o.ridge.n - 1)); out.push(mk({ phi: 0.5 + 0.4 * Math.cos(th), th: (i / o.ridge.n - 0.5) * 0.3, L: o.ridge.length * s, W: o.ridge.width, lift: 1, sweep: [0, 0.1, -0.3 + i * 0.07], spike: 0.7, legacy: true })); }
  return out;
}

const seg = (L) => Math.max(Q.sm, Math.min(Q.sx, Math.round(L / Q.sd)));
const thOf = (l) => Math.min(0.03, l.W * l.thick);
// a lock that lies on the head for the first `hug` of its length (steered by sweep and gravity along the surface), then falls free
function hugPath(l, p0, n, d0, base) {
  const m = l.segs ?? seg(l.L), ds = l.L / m, clr = base + l.layer * 0.005 + thOf(l) * 0.4, sw = V(l.sweep), P = [p0.clone()], d = d0.addScaledVector(n, -n.dot(d0)).normalize(), p = p0.clone();
  for (let i = 1; i <= m; i++) {
    const s = i / m;
    if (s <= l.hug) {
      const nn = grad(HF, p), st = sw.clone().addScaledVector(nn, -nn.dot(sw)).add(new Vector3(0, -l.droop * 0.6, 0).addScaledVector(nn, l.droop * 0.6 * nn.y));
      d.addScaledVector(st, 2.2 * ds).normalize();
      p.addScaledVector(d, ds);
      for (let k = 0; k < 3; k++) { const e = HF(p.x, p.y, p.z) - clr; p.addScaledVector(grad(HF, p), -e); }
      d.copy(p).sub(P[i - 1]).normalize();
    } else {
      d.y -= l.droop * 2.2 * ds; d.normalize(); p.addScaledVector(d, ds);
      push(p, clr - 0.001);
    }
    P.push(p.clone());
  }
  return P;
}
const faceTrim = (P, l) => { if (!l.free) { const i = P.findIndex((q, k) => k > 0 && inFace(q)); if (i > 0) P.length = Math.max(3, i); } return P; };
function path(l, base) {
  let p0, n, d0;
  if (l.pts) return { P: l.pts.map(V), out: V(l.n) };
  if (l.p0) { p0 = V(l.p0); n = V(l.n).normalize(); d0 = V(l.d0).normalize(); } else {
    const s = scalp(l.phi, l.th); p0 = s.p; n = s.n;
    const tg = new Vector3(Math.cos(l.phi) * Math.sin(l.th), -Math.sin(l.phi), Math.cos(l.phi) * Math.cos(l.th)).normalize();
    d0 = tg.multiplyScalar(l.tw ?? 1 - l.lift).addScaledVector(n, l.lift).add(V(l.sweep).multiplyScalar(0.6)).normalize();
  }
  p0.addScaledVector(n, l.p0 ? 0 : base + l.layer * 0.005);
  const out = n.clone().addScaledVector(d0, -n.dot(d0));
  if (out.lengthSq() < 1e-4) out.crossVectors(d0, new Vector3(0, 1, 0));
  if (out.lengthSq() < 1e-4) out.set(0, 0, 1);
  out.normalize();
  if (l.hug) return { P: faceTrim(hugPath(l, p0, n, d0, base), l), out };
  const side = new Vector3().crossVectors(d0, out).normalize(), m = l.segs ?? seg(l.L), P = [], A = l.A ? V(l.A) : null, B = l.B ? V(l.B) : null;
  for (let i = 0; i <= m; i++) {
    const s = i / m, p = p0.clone().addScaledVector(d0, l.L * s).add(new Vector3(0, -l.droop * l.L * l.L * s * s, 0)).addScaledVector(side, (l.curl * s * s * s + (l.bow ?? 0) * s * s + (l.sb ?? 0) * Math.sin(Math.PI * 2 * s)) * l.L);
    if (A) p.addScaledVector(A, l.L * s * s);
    if (B) p.addScaledVector(B, l.L * s * s * s);
    if (l.spiral) { const q = P[i - 1]; if (q) { const ang = l.spiral * s * s, dd = d0.clone().multiplyScalar(Math.cos(ang)).addScaledVector(side, Math.sin(ang)); p.copy(q).addScaledVector(dd, l.L / m); } }
    P.push(p);
  }
  for (let i = 1; i <= m; i++) push(P[i], base + l.layer * 0.005 - 0.001 + thOf(l) * 0.4);
  for (let i = 1; i < m; i++) P[i].lerp(P[i - 1].clone().add(P[i + 1]).multiplyScalar(0.5), 0.5);
  return { P: faceTrim(P, l), out };
}
const prof = (u, sp) => Math.pow(Math.max(0, 1 - Math.pow(u, 2.2 - 0.8 * sp)), 0.55 + 0.7 * sp); // keeps width to mid length, tapers late
const cup = (x, u) => x * x * 2.4 * Math.max(0, 1 - 0.8 * u); // the section wraps the head near the root

function lockMesh(l0, base, R, B) {
  const l = { ...l0, W: Math.min(l0.W, l0.L * 0.5) }; // a lock is at least twice as long as wide, or it reads as a petal
  const { P, out } = path(l, base), NC = Q.nc;
  if (P.length < 3) return;
  const m = P.length - 1, T = P.map((_, i) => P[Math.min(m, i + 1)].clone().sub(P[Math.max(0, i - 1)]).normalize());
  const rings = [], fr = [], O = out.clone(), dark = l.dark ?? (l.layer === 0 ? 0.05 : 0), piv = l.pivot ? V(l.pivot) : P[0], pal = l.pid ?? 0, y0 = l.layer === 0 ? 0.6 : 0.4;
  const swOf = (p, u) => (l.pivot ? Math.min(1, Math.hypot(p.x - piv.x, p.y - piv.y, p.z - piv.z) / (l.L || 0.3)) ** 1.5 : u ** 1.6);
  const vtx = (p, n, x, y, id, role, u) => { B.pos.push(p.x, p.y, p.z); B.nor.push(n.x, n.y, n.z); B.xrd.push(x, y, id); B.role.push(role + 5 * pal); B.sw.push(piv.x, piv.y, piv.z, swOf(p, u)); };
  const tone = (n, u) => Math.min(0.97, Math.max(0.03, 0.5 + 0.07 * n.dot(KEY) - 0.12 * Math.exp(-u * 10) - dark));
  for (let i = 0; i <= m; i++) {
    const u = i / m, w = l.W * prof(u, l.spike), th = Math.max(Math.min(0.03, w * l.thick), 0.003 * (1 - u)), sink = i === 0 ? 0.004 : i === 1 ? 0.0015 : 0;
    O.addScaledVector(T[i], -O.dot(T[i]));
    if (O.lengthSq() < 1e-6) O.set(0, 1, 0).addScaledVector(T[i], -T[i].y);
    O.normalize();
    const S = new Vector3().crossVectors(T[i], O), ring = [];
    fr.push({ S, O: O.clone(), w, th, u });
    for (let k = 0; k < NC; k++) {
      const a = (k * Math.PI * 2) / NC, sa = Math.sin(a), ca = Math.cos(a);
      const nm = S.clone().multiplyScalar(sa / Math.max(w / 2, 0.0015)).addScaledVector(O, ca / Math.max(th / 2, 0.0006)).normalize().addScaledVector(T[i], u > 0.8 ? 0.45 * (u - 0.8) / 0.2 : 0).normalize();
      ring.push({ p: P[i].clone().addScaledVector(S, sa * w * 0.5).addScaledVector(O, ca * th * 0.5 - cup(sa * w * 0.5, u) - sink), n: nm, x: tone(nm, u), y: y0 + 0.4 * Math.sqrt(1 - u) });
    }
    rings.push(ring);
  }
  for (let i = 0; i < m; i++) for (let k = 0; k < NC; k++) {
    const k2 = (k + 1) % NC, c = [rings[i][k], rings[i][k2], rings[i + 1][k], rings[i + 1][k2]], role = Math.cos(((k + 0.5) * Math.PI * 2) / NC) < -0.25 ? 2 : 0;
    for (const j of [0, 1, 2, 1, 3, 2]) vtx(c[j].p, c[j].n, c[j].x, c[j].y, 0, role, (i + (j > 1 ? 1 : 0)) / m);
  }
  // drawn shapes on the top face: a thin lens of highlight on some locks, a lens of shadow tone on the far edge
  const strip = (role, f, nc = Q.sn) => {
    const rows = fr.map((q, i) => {
      const lit = Math.min(1, Math.max(0, (q.O.dot(KEY) + 0.05) / 0.4)), lat = Math.max(-0.6, Math.min(0.6, q.S.dot(KEY) * 1.6)), g = f(q.u, lat, lit);
      if (!g || g.h < 0.0006) return null;
      const a = q.w / 2, ep = 0.0013 + 0.0004 * (l.layer ?? 0);
      return Array.from({ length: nc }, (_, j) => {
        const x = Math.max(-0.97 * a, Math.min(0.97 * a, g.c * a + ((j - (nc - 1) / 2) / ((nc - 1) / 2)) * g.h)), hh = (q.th / 2) * Math.sqrt(Math.max(0, 1 - (x / a) ** 2));
        const n = q.S.clone().multiplyScalar(x / (a * a)).addScaledVector(q.O, hh / Math.max((q.th / 2) ** 2, 1e-8)).normalize();
        return { p: P[i].clone().addScaledVector(q.S, x).addScaledVector(q.O, hh + ep - cup(x, q.u)), n, x: tone(n, q.u), u: q.u };
      });
    });
    for (let i = 0; i < m; i++) if (rows[i] && rows[i + 1]) for (let j = 0; j < nc - 1; j++) {
      const c = [rows[i][j], rows[i][j + 1], rows[i + 1][j], rows[i + 1][j + 1]];
      for (const t of [0, 1, 2, 1, 3, 2]) vtx(c[t].p, c[t].n, c[t].x, 0, 0, role, c[t].u);
    }
  };
  if (l.hi !== false && R() < (l.hiRate ?? 0.15)) { const u0 = 0.18 + (R() - 0.5) * 0.12, u1 = 0.7 + (R() - 0.5) * 0.1, wf = 0.16 + R() * 0.1; strip(1, (u, lat, lit) => { const xb = (u - u0) / (u1 - u0); return xb > 0 && xb < 1 ? { c: lat * 0.9, h: (l.W * wf * Math.pow(Math.sin(Math.PI * xb), 0.75) * prof(u, l.spike) * lit) / 2 } : null; }); }
  if (l.shade !== false) strip(3, (u, lat) => (u > 0.05 && u < 0.9 ? { c: -lat * 1.3, h: (l.W * 0.3 * Math.pow(Math.sin(Math.PI * Math.min(1, (u - 0.05) / 0.85)), 0.6) * prof(u, l.spike)) / 2 } : null));
}

// the scalp cap: the head sculpt grown by t (more at the crown), cut along a zigzag hairline from `front` at the brow to `back` at the nape
function capMesh(c, B) {
  const front = c.front ?? 0.95, back = c.back ?? 1.7, t = c.t ?? 0.008, crown = c.crown ?? 0.02, zig = c.zig ?? 0.08, n = c.n ?? 9, NT = Q.ct, NP = Q.cp, grid = [];
  for (let i = 0; i < NT; i++) {
    const th = (i / NT) * Math.PI * 2 - Math.PI, hl = front + (back - front) * Math.pow((1 - Math.cos(th)) / 2, 0.6) + zig * (0.6 * Math.sin(th * n * 0.5 + 0.7) + 0.4 * Math.sin(th * n * 0.95 + 2.1));
    for (let j = 0; j <= NP; j++) { const phi = Math.max(0.001, (hl * j) / NP), s = scalp(phi, th); grid.push(s.p.addScaledVector(s.n, t + crown * Math.max(0, Math.cos(phi)))); }
  }
  const g = new BufferGeometry(), idx = [], at = (i, j) => (i % NT) * (NP + 1) + j;
  g.setAttribute("position", new BufferAttribute(new Float32Array(grid.flatMap((p) => p.toArray())), 3));
  for (let i = 0; i < NT; i++) for (let j = 0; j < NP; j++) idx.push(at(i, j), at(i, j + 1), at(i + 1, j), at(i + 1, j), at(i, j + 1), at(i + 1, j + 1));
  g.setIndex(idx); g.computeVertexNormals();
  const ni = g.toNonIndexed(), pa = ni.attributes.position, na = ni.attributes.normal, ctr = V(DOME.c);
  for (let i = 0; i < pa.count; i++) {
    const p = V([pa.getX(i), pa.getY(i), pa.getZ(i)]), nn = V([na.getX(i), na.getY(i), na.getZ(i)]);
    if (nn.dot(p.sub(ctr)) < 0) nn.negate();
    B.pos.push(pa.getX(i), pa.getY(i), pa.getZ(i)); B.nor.push(nn.x, nn.y, nn.z); B.xrd.push(0.4 + 0.1 * nn.dot(KEY), 0.9, 0); B.role.push(0); B.sw.push(0, 0, 0, 0);
  }
}

const col = (s, d) => new Color(s ?? d);
function palette(h) {
  const base = h.col ?? h.color?.base ?? "#3a2c26", shade = h.shade ?? h.color?.shade ?? darker(base, 0.55), hi = h.hi ?? h.color?.hi ?? new Color(base).lerp(new Color("#ffffff"), 0.45).getStyle();
  return { base: col(base), shade: col(shade), hi: col(hi) };
}
const roleCol = (p, r) => (r === 1 ? p.base.clone().lerp(p.hi, 0.8) : r === 2 ? p.base.clone().lerp(p.shade, 0.6) : r === 3 ? p.shade.clone().lerp(p.base, 0.25) : r === 4 ? p.shade.clone().multiplyScalar(0.42) : p.base);

function resolve(h) {
  const { parts, cap, ...top } = h, Rb = rng((h.seed ?? 11) + 5), groups = parts ?? [{}], name = top.preset ?? "spiky", pals = [], locks = [], isLegacy = LEGACY_KEYS.some((k) => k in top) || groups.some((g) => Object.keys(g).some((k) => LEGACY_KEYS.includes(k)));
  groups.forEach((part, gi) => {
    const o = { ...top, ...part, seed: (part.seed ?? top.seed ?? 11) + gi * 13 };
    const useLegacy = isLegacy && (LEGACY[name] || o.count !== undefined || o.band), preset = HAIR_PRESETS[name] ?? HAIR_PRESETS.spiky;
    if (preset.gen === "none" && !useLegacy) return;
    let L = o.length ?? 1, list;
    if (useLegacy) {
      const b = LEGACY[name] ?? LEGACY.spiky;
      if (!Array.isArray(L)) L = (b.length ?? [0.14, 0.24]).map((v) => v * L);
      list = legacy({ ...b, ...o, length: L }, b, o.s ?? 0.8);
    } else {
      const Lm = Array.isArray(L) ? (L[0] + L[1]) / 0.4 : L, g = { ...preset, ...o };
      list = (GEN[preset.gen] ?? flow)({ ...o, L: Lm, vol: o.volume ?? 1 }, g);
    }
    const pid = part.col || part.shade || part.hi ? pals.push(palette({ ...top, ...part })) : 0;
    for (const l of list) locks.push({ ...l, pid, free: l.free ?? part.free, sb: l.sb ?? (Rb() - 0.5) * 0.16 });
  });
  const bd = top.beard ?? (top.beardCol ? {} : null);
  if (bd) { const pid = pals.push(palette({ col: bd.col ?? top.beardCol ?? top.col, shade: bd.shade ?? top.beardShade ?? top.shade, hi: bd.hi ?? top.beardHi ?? top.hi })); for (const l of beard({ L: bd.length ?? 1, vol: top.volume ?? 1 }, bd)) locks.push({ ...l, pid, sb: 0 }); }
  return { locks, cap: cap ?? (HAIR_PRESETS[name]?.gen === "beard" ? false : undefined), pals: [palette(top), ...pals], vol: top.volume ?? 1 };
}

const GC = new Map();
export function hairGeometry(h, o = {}) {
  if (!h || h.preset === "none" || h.preset === "bald") return null;
  const tier = Math.max(0, Math.min(3, o.tier ?? h.tier ?? 3)), key = `${tier}|${o.sway ? 1 : 0}|${JSON.stringify(h)}`;
  if (!GC.has(key)) GC.set(key, buildArrays(h, tier));
  const c = GC.get(key);
  if (!c) return null;
  const N = c.pos.length / 3, F = (a) => new BufferAttribute(Float32Array.from(a), a.length === N * 3 ? 3 : 4), g = new BufferGeometry();
  g.setAttribute("position", F(c.pos)); g.setAttribute("normal", F(c.nor)); g.setAttribute("aXrd", F(c.xrd));
  g.setAttribute("aCol", new BufferAttribute(new Float32Array(N * 3), 3)); g.setAttribute("aShade", new BufferAttribute(new Float32Array(N * 3), 3));
  g.setAttribute("aBlob", new BufferAttribute(new Float32Array(N * 4), 4));
  const bn = new Float32Array(N * 3); for (let i = 0; i < N; i++) bn[3 * i + 1] = 1;
  g.setAttribute("aBlobN", new BufferAttribute(bn, 3));
  if (o.sway) g.setAttribute("aSw", F(c.sw));
  g.userData = { role: Uint8Array.from(c.role), pals: c.pals.map((p) => ({ base: p.base.clone(), shade: p.shade.clone(), hi: p.hi.clone() })) };
  recolor(g, null, 0);
  return g;
}

function buildArrays(h, tier) {
  Q = TQ[tier];
  const { locks, cap, pals, vol } = resolve(h), B = { pos: [], nor: [], xrd: [], role: [], sw: [] }, R = rng(h.seed ?? 11), base = 0.012 * vol;
  if (cap !== false) capMesh({ ...(cap ?? {}), t: (cap?.t ?? 0.008) * vol }, B);
  for (const l of locks) lockMesh(l, base, R, B);
  return B.pos.length ? { ...B, pals } : null;
}

function recolor(g, to, k) {
  const { role, pals } = g.userData, ca = g.attributes.aCol.array, sa = g.attributes.aShade.array, mix = (a, b) => a.clone().lerp(b, k), tmp = [];
  pals.forEach((p, i) => { const q = i === 0 && to && k > 0 ? { base: mix(p.base, to.base), shade: mix(p.shade, to.shade), hi: mix(p.hi, to.hi) } : p; tmp.push(q); });
  for (let i = 0; i < role.length; i++) {
    const p = tmp[Math.floor(role[i] / 5)], c = roleCol(p, role[i] % 5);
    ca[3 * i] = c.r; ca[3 * i + 1] = c.g; ca[3 * i + 2] = c.b; sa[3 * i] = p.shade.r; sa[3 * i + 1] = p.shade.g; sa[3 * i + 2] = p.shade.b;
  }
  g.attributes.aCol.needsUpdate = g.attributes.aShade.needsUpdate = true;
}

const SWAY = /* glsl */ `
  attribute vec4 aSw; uniform vec3 uSway;
  vec3 hairR(vec3 r, float w) {
    float ax = uSway.x * w, az = uSway.z * w, cx = cos(ax), sx = sin(ax), cz = cos(az), sz = sin(az);
    r = vec3(r.x, cx * r.y - sx * r.z, sx * r.y + cx * r.z);
    return vec3(cz * r.x - sz * r.y, sz * r.x + cz * r.y, r.z);
  }
  vec3 hairP() { return aSw.xyz + hairR(position - aSw.xyz, aSw.w); }
  vec3 hairN() { return hairR(normal, aSw.w); }
  #define position hairP()
  #define normal hairN()
`;

export function buildHair(engine, spec, head) {
  const geo = hairGeometry(spec, { sway: true, tier: engine.tier });
  if (!geo) return { group: new Group(), set() {}, dispose() {} };
  const hd = head ?? { pos: DOME.c, fwd: [0, 0, 1], right: [1, 0, 0], r: DOME.r[0] + 0.03 }, fig = engine.figure(geo, { head: hd, lineMul: spec.lineMul ?? 0.9, ink: spec.ink, constant: true }), sway = { value: new Vector3() };
  for (const m of [fig.userData.mat, fig.userData.hull]) { m.vertexShader = SWAY + m.vertexShader; m.uniforms.uSway = sway; }
  fig.userData.hull.uniforms.uConst.value = 1;
  for (const x of [fig.userData.mesh, fig.userData.hullMesh]) x.frustumCulled = false;
  fig.name = "hair";
  const st = { blend: null, k: 0 };
  return {
    group: fig, geo,
    set(p = {}) {
      if (p.sway !== undefined) { const s = p.sway; sway.value.set(typeof s === "number" ? 0 : s.x ?? 0, 0, typeof s === "number" ? s : s.z ?? 0); }
      if (p.blend !== undefined) { const b = p.blend; st.blend = b?.to ? palette(typeof b.to === "string" ? { col: b.to } : b.to) : null; st.k = b?.k ?? 0; recolor(geo, st.blend, st.k); }
      if (p.col || p.shade || p.hi) { geo.userData.pals[0] = palette({ ...spec, ...p }); recolor(geo, st.blend, st.k); }
    },
    dispose() { fig.removeFromParent(); fig.userData.mat.dispose(); fig.userData.hull.dispose(); geo.dispose(); },
  };
}
