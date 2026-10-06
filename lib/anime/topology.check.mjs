// node lib/anime/topology.check.mjs : the Yuddh-Niti H0 tests, ported, plus the T1 bake on a bumpy sphere.
import assert from "node:assert/strict";
import { IcosahedronGeometry, Vector3 } from "three";
import { bakeShadowBias, csrFromTriangles, csrGrid, h0Superlevel, significantBetti, TopologicalConvergence } from "./topology.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const bc = (row) => h0Superlevel(Float64Array.from(row), csrGrid(row.length, 1));
assert.equal(bc([0, 1, 0]).pairs.length, 0, "single peak: essential only");
assert.equal(bc([0, 3, 0, 2, 0]).pairs.length, 1, "two peaks: one finite bar");
assert.equal(bc([0, 3, 0, 2, 0]).pairs[0].birth, 2, "elder rule kills the lower peak");
assert.equal(bc([5, 0, 4, 0, 3, 0, 2]).pairs.length, 3, "four peaks: three bars");
assert.equal(significantBetti(bc([0, 10, 0, 9, 0, 0.1, 0.05, 0])), 2, "tau 0.1 drops the 0.05 speck");
const tc = new TopologicalConvergence();
const b = bc([0, 3, 0, 2, 0]);
assert.equal(tc.update(b), false); assert.equal(tc.update(b), false); assert.equal(tc.update(b), true, "converges after 2 stable rounds");

// T1: a lumpy sphere (Lambert + noise bias) loses its specks, keeps its terminator
let geo = mergeVertices(new IcosahedronGeometry(1, 24).deleteAttribute("uv"));
geo.computeVertexNormals();
const n = geo.attributes.position.count, X = new Float32Array(n * 3);
const P = geo.attributes.position.array;
for (let v = 0; v < n; v++) X[3 * v] = 0.5 + 0.18 * Math.sin(9 * P[3 * v]) * Math.sin(11 * P[3 * v + 1]) * Math.sin(7 * P[3 * v + 2]);
geo.setAttribute("aXrd", { array: X, count: n, itemSize: 3 });
const L = new Vector3(0.3, 0.8, 0.5).normalize();
const islands = (R) => {
  const N = geo.attributes.normal.array, g = csrFromTriangles(n, geo.index.array);
  const sh = new Uint8Array(n);
  for (let v = 0; v < n; v++) sh[v] = 0.5 * (N[3 * v] * L.x + N[3 * v + 1] * L.y + N[3 * v + 2] * L.z) + 0.5 + 2 * (R[v] - 0.5) < 0.5 ? 1 : 0;
  const seen = new Uint8Array(n); let c = 0;
  for (let v = 0; v < n; v++) for (const want of [0, 1]) if (sh[v] === want && !seen[v]) { c++; const st = [v]; seen[v] = 1; while (st.length) { const u = st.pop(); for (let k = g.off[u]; k < g.off[u + 1]; k++) { const w = g.adj[k]; if (!seen[w] && sh[w] === want) { seen[w] = 1; st.push(w); } } } }
  return c;
};
const before = islands(Array.from({ length: n }, (_, v) => X[3 * v]));
const t0 = performance.now();
const { R } = bakeShadowBias(geo, L, 0.1);
const ms = performance.now() - t0;
const after = islands(R);
console.log(`T1 lumpy sphere: ${n} verts, lit+shadow regions ${before} -> ${after}, bake ${ms.toFixed(1)} ms`);
assert.ok(after <= 4, "T1 gate: at most 4 regions left (the long bars)");
assert.ok(before > after);
console.log("topology.check ok");
