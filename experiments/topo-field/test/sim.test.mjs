// L2 tests: field and seal path on a stub lattice grid, no hexgrid import.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PLACES } from "../../../lib/world/places.js";
import { mulberry32, smoothstep, makeField } from "../field.mjs";
import { makePath } from "../path.mjs";

const DT = 1 / 60;
const CLAMPED = ["p-epsilon-hollow", "p-separatrix", "pr-anyps5-12609", "pr-polychrom-79", "pr-tensorflow-128930"];

function lattice(k, step) {
  const x = new Float64Array(k * k);
  const z = new Float64Array(k * k);
  let i = 0;
  for (let j = 0; j < k; j++)
    for (let a = 0; a < k; a++, i++) {
      x[i] = (a - (k - 1) / 2) * step;
      z[i] = (j - (k - 1) / 2) * step;
    }
  return { n: k * k, x, z };
}

function sealAt(t) {
  return [20 * Math.cos(t / 10), 20 * Math.sin(t / 10)];
}

function cSequence(seed) {
  const f = makeField(lattice(21, 4), { N: 20, seed });
  const out = [];
  for (let t = 0; t < 100; t++) {
    const [sx, sz] = sealAt(t);
    f.update(sx, sz);
    out.push(f.c.slice());
  }
  return out;
}

test("mulberry32(1) and mulberry32(2) match the spec values", () => {
  const r = mulberry32(1);
  assert.equal(r(), 0.6270739405881613);
  assert.equal(r(), 0.002735721180215478);
  assert.equal(r(), 0.5274470399599522);
  assert.equal(mulberry32(2)(), 0.7342509443406016);
});

test("smoothstep(6,24,x): 0 at 6, 1 at 24, 0.5 at 15", () => {
  assert.equal(smoothstep(6, 24, 6), 0);
  assert.equal(smoothstep(6, 24, 24), 1);
  assert.equal(smoothstep(6, 24, 15), 0.5);
});

test("field without movers: c is 0 within 6 m of the seal and 1 at 24 m or more", () => {
  const g = lattice(21, 4);
  const f = makeField(g, { N: 0 });
  f.update(0, 0);
  for (let i = 0; i < g.n; i++) {
    const d = Math.hypot(g.x[i], g.z[i]);
    if (d <= 6) assert.equal(f.c[i], 0, `d=${d}`);
    if (d >= 24) assert.equal(f.c[i], 1, `d=${d}`);
  }
});

test("field with one mover: the cell under the mover is 0, a cell 3.5 m away is untouched", () => {
  const g = { n: 2, x: Float64Array.of(-30, -26.5), z: Float64Array.of(0, 0) };
  const f = makeField(g, { N: 1, seed: 1 });
  f.movers.x[0] = -30;
  f.movers.z[0] = 0;
  f.update(0, 0);
  assert.equal(f.c[0], 0);
  assert.equal(f.c[1], 1);
});

test("field water: cells at r >= 76 are 0; water:false leaves them open away from the seal", () => {
  const g = lattice(41, 4);
  const wet = makeField(g, { N: 0 });
  wet.update(0, 0);
  let wetCells = 0;
  for (let i = 0; i < g.n; i++) {
    if (Math.hypot(g.x[i], g.z[i]) >= 76) {
      wetCells++;
      assert.equal(wet.water[i], 1);
      assert.equal(wet.c[i], 0);
    }
  }
  assert.ok(wetCells > 0);
  const dry = makeField(g, { N: 0, water: false });
  dry.update(0, 0);
  let openWater = 0;
  for (let i = 0; i < g.n; i++) if (Math.hypot(g.x[i], g.z[i]) >= 76 && dry.c[i] === 1) openWater++;
  assert.ok(openWater > 0);
  assert.equal(dry.water.reduce((a, b) => a + b, 0), 0);
});

test("field determinism: same seed gives identical c over 100 updates; seed 2 differs", () => {
  assert.deepEqual(cSequence(1), cSequence(1));
  assert.notDeepEqual(cSequence(1), cSequence(2));
});

test("movers: mean step is 1 m/s times DT when not reflecting", () => {
  const f = makeField(lattice(21, 4), { N: 1, seed: 1, rMove: 1e6 });
  f.movers.x[0] = 0;
  f.movers.z[0] = 0;
  f.update(0, 0);
  let total = 0;
  for (let k = 0; k < 600; k++) {
    const x0 = f.movers.x[0];
    const z0 = f.movers.z[0];
    f.update(0, 0);
    total += Math.hypot(f.movers.x[0] - x0, f.movers.z[0] - z0);
  }
  assert.ok(Math.abs(total / 600 - DT) < 1e-9);
});

test("shuffle: movers jump more than 10 m between frames on average", () => {
  const f = makeField(lattice(21, 4), { N: 20, seed: 1, shuffle: true });
  let prev = null;
  let total = 0;
  let count = 0;
  for (let t = 0; t < 50; t++) {
    f.update(0, 0);
    if (prev) {
      for (let i = 0; i < 20; i++) {
        total += Math.hypot(f.movers.x[i] - prev.x[i], f.movers.z[i] - prev.z[i]);
        count++;
      }
    }
    prev = { x: f.movers.x.slice(), z: f.movers.z.slice() };
  }
  assert.ok(total / count > 10);
});

test("path: 26 docks, and the 5 outside r=83 are the clamped ones", () => {
  const p = makePath(1);
  assert.equal(p.docks.length, 26);
  assert.deepEqual(p.docks.filter((d) => d.clamped).map((d) => d.id).sort(), [...CLAMPED].sort());
});

test("path: tour is 3700..3712 frames and the roam adds 3601", () => {
  const p = makePath(1);
  assert.ok(p.tourFrames >= 3700 && p.tourFrames <= 3712, `tourFrames=${p.tourFrames}`);
  assert.equal(p.frames, p.tourFrames + 3601);
  assert.equal(p.x.length, p.frames);
  assert.equal(p.z.length, p.frames);
  assert.equal(p.v.length, p.frames);
});

test("path: speed never above 15 m/s and never outside r=83 m", () => {
  const p = makePath(1);
  let vMax = 0;
  let rMax = 0;
  for (let f = 0; f < p.frames; f++) {
    vMax = Math.max(vMax, p.v[f]);
    rMax = Math.max(rMax, Math.hypot(p.x[f], p.z[f]));
  }
  assert.ok(vMax <= 15 + 1e-9, `vMax=${vMax}`);
  assert.ok(rMax <= 83 + 1e-9, `rMax=${rMax}`);
});

test("path: frames within 1.6 m of a place move at 13 m/s or less", () => {
  const p = makePath(1);
  for (let f = 0; f < p.frames; f++) {
    const near = PLACES.some((q) => Math.hypot(p.x[f] - q.x, p.z[f] - q.z) - q.radius <= 1.6);
    if (near) assert.ok(p.v[f] <= 13, `frame ${f} v=${p.v[f]}`);
  }
});
