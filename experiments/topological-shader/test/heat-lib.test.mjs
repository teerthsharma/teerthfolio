import { test } from "node:test";
import assert from "node:assert/strict";
import { makeHexGrid as makeLibGrid } from "../../../lib/world/heat/hexgrid.js";
import { makeHeat } from "../../../lib/world/heat/heatfield.js";
import { makeHexGrid as makeExpGrid } from "../../../experiments/topo-field/hexgrid.mjs";
import { GRID, SIGMA, HALF_LIFE, TICK_S, liveSamples } from "../heat.mjs";

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const R = 84;
const H = 4;
const LIB = makeLibGrid(R, H);
const EXP = makeExpGrid(R, H);

function walker(count = 200, seed = 11) {
  const rng = mulberry32(seed);
  return Array.from({ length: count }, () => {
    const r = R * Math.sqrt(rng());
    const a = 2 * Math.PI * rng();
    return { x: r * Math.cos(a), z: r * Math.sin(a) };
  });
}

function nearestCell(g, x0, z0) {
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < g.n; i++) {
    const d = Math.hypot(g.x[i] - x0, g.z[i] - z0);
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return best;
}

function csrOf(g) {
  return g.adj && g.adj.offsets
    ? { offsets: g.adj.offsets, indices: g.adj.indices }
    : { offsets: g.off, indices: g.adj };
}

function eulerCharacteristic(g) {
  const { offsets, indices } = csrOf(g);
  const n = g.n;
  let edges = 0;
  let triangles = 0;
  for (let i = 0; i < n; i++) {
    for (let k = offsets[i]; k < offsets[i + 1]; k++) {
      const j = indices[k];
      if (j <= i) continue;
      edges++;
      for (let m = offsets[j]; m < offsets[j + 1]; m++) {
        const l = indices[m];
        if (l <= j) continue;
        for (let p = offsets[i]; p < offsets[i + 1]; p++) {
          if (indices[p] === l) {
            triangles++;
            break;
          }
        }
      }
    }
  }
  return n - edges + triangles;
}

test("the library grid is the experiment grid: 1615 cells, same centres, same adjacency, same border", () => {
  assert.equal(LIB.n, 1615);
  assert.equal(LIB.n, EXP.n);
  assert.deepEqual(Array.from(LIB.xs), Array.from(EXP.x));
  assert.deepEqual(Array.from(LIB.zs), Array.from(EXP.z));
  const a = csrOf(LIB);
  const b = csrOf(EXP);
  assert.deepEqual(Array.from(a.offsets), Array.from(b.offsets));
  assert.deepEqual(Array.from(a.indices), Array.from(b.indices));
  assert.deepEqual(Array.from(LIB.border), Array.from(EXP.border));
  assert.equal(LIB.cols, 43);
  assert.equal(LIB.rows, 49);
});

test("the cell graph has Euler characteristic 1 in both copies", () => {
  assert.equal(eulerCharacteristic(EXP), 1);
  assert.equal(eulerCharacteristic(LIB), 1);
});

test("cell() is the nearest cell for 200 random points in the disc and -1 outside it", () => {
  const pts = walker();
  let mismatches = 0;
  for (const p of pts) {
    if (LIB.cell(p.x, p.z) !== nearestCell(EXP, p.x, p.z)) mismatches++;
  }
  assert.equal(mismatches, 0);
  assert.equal(LIB.cell(R + 1, 0), -1);
  assert.equal(LIB.cell(0, -R - 5), -1);
});

test("heat values after every 10 ticks equal the experiment copy, rounded to the float32 storage", () => {
  const pts = walker();
  const ticks = { x: Float64Array.from(pts, (p) => p.x), z: Float64Array.from(pts, (p) => p.z) };
  const expected = liveSamples(ticks, { decay: true });
  assert.equal(expected.length, 20);
  const field = makeHeat(LIB, { sigma: SIGMA, halfLifeS: HALF_LIFE });
  let k = 0;
  let mismatches = 0;
  for (let t = 0; t < pts.length; t++) {
    field.tick(pts[t].x, pts[t].z, TICK_S);
    if ((t + 1) % 10 === 0) {
      const e = expected[k++];
      for (let v = 0; v < LIB.n; v++) if (field.hn[v] !== Math.fround(e[v])) mismatches++;
    }
  }
  assert.equal(k, expected.length);
  assert.equal(field.hn.length, LIB.n);
  assert.equal(mismatches, 0);
  assert.equal(GRID.n, LIB.n);
});
