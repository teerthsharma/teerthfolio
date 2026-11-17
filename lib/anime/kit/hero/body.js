// HERO BODY: the chibi anthro seal as SDF parts. Pose frame: metres, +y up, faces +z, 0.85 m tall, about
// 2.3 heads high. The head is modelled finer (voxel 0.0055) in its own frame, origin at the neck joint;
// arms, forearms and the hand shapes are separate closed parts so each rides one bone of the skin.
// "R" is +x (screen right in a front shot), as in costumed-seal-kit's weapon hand.
import { BufferAttribute, Color } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { cone, ell, paint, painted, polygonize } from "../../sdf.js";
import { GRIP, HAND_SHAPES, handParts } from "./hands.js";
import { headPrims } from "./head.js";

export const V2 = !(typeof location !== "undefined" && /[?&]v2=0/.test(location.search));
export const HEAD_AT = [0, 0.5, 0];
export const SHOULDER = [V2 ? 0.31 : 0.235, 0.43, 0.03];
export const UPPER = 0.15, FORE = 0.14;
export const DOME = { c: [0, 0.17, 0], r: [0.2, 0.18, 0.19] };
export { GRIP, HAND_SHAPES };
export const BONE = { body: 0, upperR: 1, foreR: 2, upperL: 3, foreL: 4, handR: 5, handL: 5 + HAND_SHAPES.length, count: 5 + 2 * HAND_SHAPES.length };

export const darker = (hex, k) => `#${new Color(hex).multiplyScalar(k).getHexString()}`;
const smin = (a, b, k) => { if (k <= 0) return Math.min(a, b); const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
export const fieldOf = (prims) => (x, y, z) => { let d = 1e9; for (const p of prims) d = smin(d, p.f(x, y, z, p), p.k); return d; };

// torso rows: [centre, radii, blend]; the shell outfits reuse them grown by a few millimetres
export const TORSO = {
  neck: [[0, 0.47, -0.01], [0.185, 0.12, 0.165], 0.06],
  trap: [[0, 0.425, -0.02], [V2 ? 0.34 : 0.245, V2 ? 0.09 : 0.075, 0.165], 0.08],
  chest: [[0, 0.34, 0.02], [V2 ? 0.3 : 0.23, 0.14, 0.195], 0.08],
  belly: [[0, 0.19, 0.035], [0.3, 0.19, 0.26], 0.08],
  base: [[0, 0.075, 0], [0.31, 0.085, 0.265], 0.06],
  back: [[0, 0.3, -0.09], [0.25, 0.22, 0.17], 0.1],
};
export const torsoRow = (name, m, grow = 0) => { const [c, r, k] = TORSO[name]; return ell(c, r.map((v) => v + grow), m, k); };

export function torsoPrims(f) {
  const C = paint(f.coat, f.shade), F = paint(darker(f.coat, 0.96), darker(f.shade, 0.95));
  return [...Object.keys(TORSO).map((n) => torsoRow(n, C)),
    ell([0, 0.06, -0.26], [0.13, 0.055, 0.12], C, 0.07),
    ell([0.09, 0.022, -0.4], [0.06, 0.02, 0.1], F, 0.03, [0, 0.55, 0]),
    ell([-0.09, 0.022, -0.4], [0.06, 0.02, 0.1], F, 0.03, [0, -0.55, 0]),
    ell([0.135, 0.02, -0.455], [0.034, 0.015, 0.06], F, 0.02, [0, 1.0, 0]),
    ell([-0.135, 0.02, -0.455], [0.034, 0.015, 0.06], F, 0.02, [0, -1.0, 0])];
}

// head-local; the whole head takes the material's analytic face shadow (id 2): one clean shape, no Lambert blots
export { headPrims };
const sideArr = (v, s) => [v[0] * s, v[1], v[2]];
export function armJoints(s) {
  const S = sideArr(SHOULDER, s), E = [S[0], S[1] - UPPER, S[2]], W = [S[0], E[1] - FORE, S[2]];
  return { S, E, W };
}
const armPrims = (m, s) => {
  const { S, E, W } = armJoints(s), up = (p, y) => [p[0], p[1] + y, p[2]];
  return { upper: [ell(S, [0.068, 0.066, 0.066], m, 0.02), cone(S, E, 0.059, 0.049, m, 0.02)],
    fore: [ell(E, [0.05, 0.05, 0.05], m, 0.02), cone(E, W, 0.051, 0.037, m, 0.02), ell(up(E, -0.03), [0.048, 0.04, 0.048], m, 0.04)] };
};
// the cuff: a short ridge round the wrist, its own part so a crease line marks where the hand starts
const cuffPrims = (m, s) => { const { W } = armJoints(s); return [cone([W[0], W[1] + 0.012, W[2]], [W[0], W[1] - 0.004, W[2]], 0.0415, 0.0405, m, 0.004)]; };

const withBone = (g, bone) => { g.setAttribute("aBone", new BufferAttribute(new Float32Array(g.attributes.position.count).fill(bone), 1)); return g; };
function mirrorX(g) {
  const m = g.clone(), P = m.attributes.position.array, N = m.attributes.normal.array, B = m.attributes.aBlob.array, I = m.index.array;
  for (let i = 0; i < P.length; i += 3) { P[i] = -P[i]; N[i] = -N[i]; }
  for (let i = 0; i < B.length; i += 4) B[i] = -B[i];
  for (let t = 0; t < I.length; t += 3) { const s = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = s; }
  return m;
}
const shift = (prims, d) => prims.map((p) => { const q = { ...p, lo: p.lo.map((v, i) => v + d[i]), hi: p.hi.map((v, i) => v + d[i]) };
  if ("cx" in p) { q.cx += d[0]; q.cy += d[1]; q.cz += d[2]; } else { q.ax += d[0]; q.ay += d[1]; q.az += d[2]; } return q; });

const CACHE = new Map();
const cached = (key, make) => { if (!CACHE.has(key)) CACHE.set(key, make()); return CACHE.get(key); };

// designed shadow shapes, painted as a per-vertex Xrd bias (low = pre-shadowed): the cel threshold then cuts a hard
// edge along the shape. Under the chin on the chest, in each armpit, and a smile-shaped crescent under the belly.
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function shadowZone(x, y, z) {
  const ax = Math.abs(x), chinY = 0.425 - 0.035 * Math.max(0, 1 - (ax / 0.21) ** 2);
  const chin = sstep(chinY - 0.014, chinY + 0.014, y) * sstep(0.03, 0.08, z) * (1 - sstep(0.17, 0.22, ax));
  const pit = Math.hypot((ax - 0.215) / 0.05, (y - 0.355) / 0.085, (z - 0.02) / 0.15), arm = 1 - sstep(0.5, 1, pit);
  const baseY = 0.135 + 0.06 * (ax / 0.3) ** 2, under = 1 - sstep(baseY - 0.014, baseY + 0.014, y);
  return Math.max(chin, arm, under);
}
function designShadow(geo) {
  const P = geo.attributes.position.array, X = geo.attributes.aXrd.array;
  for (let v = 0; v < P.length / 3; v++) X[3 * v] += (0.04 - X[3 * v]) * shadowZone(P[3 * v], P[3 * v + 1], P[3 * v + 2]);
  return geo;
}

// voxel scale by engine.tier (triangles go as 1/h^2): tier 3 full, 2 about a third of the triangles, 0 and 1 about a twelfth
export const tierK = (tier = 3) => (tier >= 3 ? 1 : tier === 2 ? 1.8 : 3.5);
export const torsoGeometry = (f, tier = 3) => cached(`torso2|${f.coat}|${f.shade}|${tierK(tier)}`, () => designShadow(polygonize(torsoPrims(f), 0.009 * tierK(tier))));
export const headGeometry = (f, tier = 3) => cached(`head2|${f.coat}|${f.shade}|${tierK(tier)}`, () => polygonize(headPrims(f), 0.0055 * tierK(tier)));

// arms and every hand shape in ONE geometry; aBone picks the bone (an unused hand shape is scaled to nothing)
export function limbsGeometry(f, hands, tier = 3) {
  const k = tierK(tier);
  return cached(`limbs2|${f.coat}|${f.shade}|${hands.kind}|${hands.skin}|${k}`, () => {
    const arm = paint(f.coat, f.shade), flip = hands.kind === "flipper";
    const skin = flip ? paint(darker(f.coat, 0.96), darker(f.shade, 0.95)) : paint(hands.skin, darker(hands.skin, 0.72));
    const nail = paint(darker(hands.skin, 0.55), darker(hands.skin, 0.4));
    const parts = [], R = armPrims(arm, 1), W = armJoints(1).W;
    const upper = withBone(polygonize(R.upper, 0.006 * k), BONE.upperR);
    const fore = withBone(mergeGeometries([polygonize(R.fore, 0.006 * k), polygonize(cuffPrims(paint(darker(f.coat, 0.9), darker(f.shade, 0.9)), 1), 0.004 * k)]), BONE.foreR);
    parts.push(upper, fore, withBone(mirrorX(upper), BONE.upperL), withBone(mirrorX(fore), BONE.foreL));
    HAND_SHAPES.forEach((shape, i) => {
      if (flip && shape !== "flipper") return;
      const g = withBone(mergeGeometries(handParts(shape, skin, nail).map((pr) => polygonize(shift(pr, W), 0.0044 * Math.min(k, 2)))), BONE.handR + i);
      parts.push(g, withBone(mirrorX(g), BONE.handL + i));
    });
    return mergeGeometries(parts);
  });
}

export function piece(geo, col, shade, o = {}) {
  const g = painted(geo.index ? geo : geo, paint(col, shade ?? darker(col, 0.55), { line: o.line ?? 1, id: o.id ?? 0 }));
  if (g.attributes.uv) g.deleteAttribute("uv");
  if (g.attributes.uv1) g.deleteAttribute("uv1");
  return g;
}
export { withBone, mirrorX, cached, shift };
