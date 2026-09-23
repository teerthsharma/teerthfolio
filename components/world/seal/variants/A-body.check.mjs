/* global console, process */
// Measures seal A's body against the brief (verification/SEAL-brief.md s.4):
//   node components/world/seal/variants/A-body.check.mjs
// Prints the numbers and fails on a broken rule.

import { buildSealBody, SKULL, SKULL_R as HEAD_R } from "./A-body.js";

const { geometry: g, anchors } = buildSealBody();
const p = g.attributes.position;
const c = g.attributes.canonical;
const idx = g.index.array;
const n = p.count;

// Outward winding: the signed volume of a closed mesh is positive.
let vol = 0;
for (let i = 0; i < idx.length; i += 3) {
  const [a, b, d] = [idx[i], idx[i + 1], idx[i + 2]];
  const ax = p.getX(a), ay = p.getY(a), az = p.getZ(a);
  const bx = p.getX(b), by = p.getY(b), bz = p.getZ(b);
  const dx = p.getX(d), dy = p.getY(d), dz = p.getZ(d);
  vol += (ax * (by * dz - bz * dy) - ay * (bx * dz - bz * dx) + az * (bx * dy - by * dx)) / 6;
}

const bb = g.boundingBox;
const isFlipper = (i) => {
  const rad = Math.hypot(c.getX(i), c.getY(i));
  const lat = Math.abs(c.getX(i)) / (rad || 1);
  const fore = Math.exp(-(((c.getZ(i) - 0.04) / 0.24) ** 2)) * lat ** 6 * Math.min(1, Math.max(0, (rad - 0.2) / 0.62));
  return fore > 0.12;
};
// Profile along z: body half-width (no flippers) and top height.
const rows = [];
for (let z = -1.1; z <= 1.1; z += 0.1) {
  let w = 0;
  let top = -1;
  let wy = 0;
  for (let i = 0; i < n; i++) {
    if (Math.abs(p.getZ(i) - z) > 0.05) continue;
    if (!isFlipper(i) && Math.abs(p.getX(i)) > w) {
      w = Math.abs(p.getX(i));
      wy = p.getY(i);
    }
    top = Math.max(top, p.getY(i));
  }
  rows.push({ z: +z.toFixed(1), halfWidth: +w.toFixed(3), atY: +wy.toFixed(2), top: +top.toFixed(3) });
}
let tip = 0;
let tipAt = null;
for (let i = 0; i < n; i++) {
  if (Math.abs(p.getX(i)) > tip) {
    tip = Math.abs(p.getX(i));
    tipAt = [p.getX(i), p.getY(i), p.getZ(i)].map((v) => +v.toFixed(3));
  }
}
// Algebraic sphere fit of the cranium: x2+y2+z2 = 2ax + 2by + 2cz + d.
function fitSphere(pts) {
  const A = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  const B = [0, 0, 0, 0];
  for (const [x, y, z] of pts) {
    const row = [2 * x, 2 * y, 2 * z, 1];
    const rhs = x * x + y * y + z * z;
    for (let i = 0; i < 4; i++) {
      B[i] += row[i] * rhs;
      for (let j = 0; j < 4; j++) A[i][j] += row[i] * row[j];
    }
  }
  for (let i = 0; i < 4; i++) {
    for (let k = i + 1; k < 4; k++) {
      const f = A[k][i] / A[i][i];
      for (let j = i; j < 4; j++) A[k][j] -= f * A[i][j];
      B[k] -= f * B[i];
    }
  }
  const x = [0, 0, 0, 0];
  for (let i = 3; i >= 0; i--) {
    let s = B[i];
    for (let j = i + 1; j < 4; j++) s -= A[i][j] * x[j];
    x[i] = s / A[i][i];
  }
  const r = Math.sqrt(x[3] + x[0] ** 2 + x[1] ** 2 + x[2] ** 2);
  return { centre: x.slice(0, 3).map((v) => +v.toFixed(3)), r: +r.toFixed(3) };
}
const cranium = [];
for (let i = 0; i < n; i++) {
  const ax = c.getZ(i);
  if (ax > 0.4 && ax < 0.8 && p.getY(i) > 0.35) cranium.push([p.getX(i), p.getY(i), p.getZ(i)]);
}
const fit = fitSphere(cranium);
// Skull fit: mean distance of head vertices (canonical axial > 0.45, above
// the chin) from SKULL, and their spread.
const ds = [];
for (let i = 0; i < n; i++) {
  if (c.getZ(i) < 0.45) continue;
  const d = Math.hypot(p.getX(i) - SKULL[0], p.getY(i) - SKULL[1], p.getZ(i) - SKULL[2]);
  if (p.getY(i) > SKULL[1] - 0.2) ds.push(d);
}
const mean = ds.reduce((a, b) => a + b, 0) / ds.length;
const sd = Math.sqrt(ds.reduce((a, b) => a + (b - mean) ** 2, 0) / ds.length);

console.table(rows);
console.log({
  triangles: idx.length / 3,
  volume: +vol.toFixed(3),
  box: { x: [bb.min.x, bb.max.x], y: [bb.min.y, bb.max.y], z: [bb.min.z, bb.max.z] },
  flipperTip: tipAt,
  span: +(tip * 2).toFixed(3),
  skullFit: { mean: +mean.toFixed(3), sd: +sd.toFixed(3), want: HEAD_R },
  sphereFit: fit,
  anchors: JSON.stringify(anchors, (k, v) => (typeof v === "number" ? +v.toFixed(3) : v)),
});
const fail = [];
if (vol <= 0) fail.push("inward winding");
if (idx.length / 3 > 10000) fail.push("over 10k triangles");
if (bb.min.y < -0.021) fail.push("belly below -2 cm");
if (Math.hypot(...fit.centre.map((v, i) => v - SKULL[i])) > 0.02) fail.push("SKULL is not the fitted skull centre");
for (const k of ["nose", "mouth"]) if (anchors[k].t < 0) fail.push(k + " ray missed");
for (const e of anchors.eyes) if (e.t < 0) fail.push("eye ray missed");
if (fail.length) {
  console.error("A-body: " + fail.join(", "));
  process.exit(1);
}
console.log("A-body: ok");
