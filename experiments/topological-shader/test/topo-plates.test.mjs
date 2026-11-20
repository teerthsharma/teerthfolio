import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadRoutePlates } from "../../../components/world/topo/plates.js";
import { createTopo } from "../../../components/world/topo/core.js";
import { makeHeat } from "../../../lib/world/heat/heatfield.js";
import { unpackTh } from "../../../lib/world/heat/harness.js";

const N = 1615;
const read = (p) => readFileSync(new URL(`../../../${p}`, import.meta.url), "utf8");
const real = JSON.parse(read("public/topo/route-plates.json"));
const okFetch = (body) => async () => ({ ok: true, json: async () => body });
const load = (body) => loadRoutePlates(okFetch(body));
const clone = () => structuredClone(real);

test("the loader returns the shipped plates", async () => {
  const p = await load(real);
  assert.equal(p.legs.length, 8);
  assert.equal(p.grid.n, N);
});

test("the loader returns null on a bad version, an n mismatch, 7 legs, a short heat array", async () => {
  const v = clone(); v.version = 2;
  const n = clone(); n.grid.n = N - 1;
  const l = clone(); l.legs.pop();
  const h = clone(); h.legs[3].heat.pop();
  for (const bad of [v, n, l, h, null, {}]) assert.equal(await load(bad), null);
});

test("the loader returns null, without throwing or logging, on a rejected fetch, a non-ok response, bad JSON and no fetch", async () => {
  const logged = [];
  const { error, warn } = console;
  console.error = console.warn = (...a) => logged.push(a);
  try {
    assert.equal(await loadRoutePlates(async () => { throw new Error("offline"); }), null);
    assert.equal(await loadRoutePlates(async () => ({ ok: false, json: async () => real })), null);
    assert.equal(await loadRoutePlates(async () => ({ ok: true, json: async () => { throw new SyntaxError("x"); } })), null);
    assert.equal(await loadRoutePlates(async () => { throw "not an Error"; }), null);
  } finally {
    console.error = error;
    console.warn = warn;
  }
  assert.deepEqual(logged, []);
});

test("the loader fetches once per fetch function", async () => {
  let calls = 0;
  const f = async () => { calls++; return { ok: true, json: async () => real }; };
  const [a, b] = [await loadRoutePlates(f), await loadRoutePlates(f)];
  assert.equal(calls, 1);
  assert.equal(a, b);
});

// A plate is the heat of standing at (x, 0) for 100 ticks, normalised the way the live field is.
function plateAt(grid, x) {
  const h = makeHeat(grid);
  for (let i = 0; i < 100; i++) h.tick(x, 0, 0.1);
  return Array.from(h.hn);
}
function synthetic(grid) {
  const at = [-2, 2, -60, 60, -40, 40, -30, 30];
  return { version: 1, grid: { R: 84, h: 4, n: grid.n }, legs: at.map((x, k) => ({ id: `s${k}`, from: "a", to: "b", lengthM: 1, heat: plateAt(grid, x) })) };
}
function texelOf(topo, c) {
  const o = topo.uniforms.uGridOrigin.value;
  const q = topo.uniforms.uCell.value;
  const row = Math.floor((topo.grid.zs[c] - o.y) / q.y + 0.5);
  const col = Math.floor((topo.grid.xs[c] - o.x - (row % 2) * 0.5 * q.x) / q.x + 0.5);
  return unpackTh(topo.th, col, row);
}
function run(topo, seconds, t0 = 0) {
  let t = t0;
  for (let i = 0; i < seconds * 60; i++) topo.step(0, 0, (t += 1 / 60), 8);
  return t;
}
const types = (topo) => {
  const s = new Set();
  for (let c = 0; c < topo.grid.n; c++) s.add(texelOf(topo, c).s);
  return s;
};

test("on with plates: all cells stay LIVE through the first 80 samples, then two distinct plates are picked", async () => {
  const topo = createTopo("on");
  const plates = synthetic(topo.grid);
  assert.equal(await topo.loadPlates(async () => plates), plates);
  assert.deepEqual(topo.plug.pick(), [-1, -1]);
  const t = run(topo, 7);
  assert.deepEqual([...types(topo)], [0]);
  assert.equal(topo.uniforms.uA.value, 0);
  run(topo, 20, t);
  const [a, b] = topo.plug.pick();
  assert.ok(a >= 0 && b >= 0 && a !== b);
  assert.deepEqual([a, b].sort(), [0, 1]);
  assert.ok(types(topo).has(1), "after the gate the explained hot centre latches BAKED");
});

test("on after a failed load: every cell stays LIVE, a = 0, nothing throws", async () => {
  const topo = createTopo("on");
  assert.equal(await topo.loadPlates(async () => null), null);
  run(topo, 40);
  assert.deepEqual([...types(topo)], [0]);
  assert.equal(topo.uniforms.uA.value, 0);
  assert.deepEqual(topo.plug.pick(), [-1, -1]);
  const bad = createTopo("on");
  const p = synthetic(bad.grid);
  p.grid.n = 5;
  await bad.loadPlates(async () => p);
  run(bad, 20);
  assert.deepEqual([...types(bad)], [0]);
});

test("neutral never fetches and never loads plates; it packs the same texture with or without the call", async () => {
  const seen = [];
  const prev = globalThis.fetch;
  globalThis.fetch = (...a) => { seen.push(a); throw new Error("fetch called"); };
  try {
    const a = createTopo("neutral");
    const b = createTopo("neutral");
    assert.equal(await a.loadPlates(), null);
    assert.equal(await a.loadPlates(async () => { throw new Error("loader called"); }), null);
    run(a, 40);
    run(b, 40);
    assert.deepEqual(seen, []);
    assert.deepEqual([...a.th], [...b.th]);
    assert.deepEqual([...types(a)], [0]);
    assert.deepEqual(a.plug.pick(), [-1, -1]);
  } finally {
    globalThis.fetch = prev;
  }
});

test("off imports nothing: the flag file has no imports, Scene.jsx reaches the driver only through a lazy import, and only core.js imports the loader", () => {
  assert.ok(!/^\s*import\s/m.test(read("components/world/topo/topoFlag.js")));
  const scene = read("components/world/Scene.jsx");
  assert.ok(!/^\s*import\b[^\n]*topo\/(TopoDriver|core|plates)/m.test(scene));
  assert.ok(/lazy\(\(\) => import\("\.\/topo\/TopoDriver"\)\)/.test(scene));
  assert.ok(/from "\.\/plates\.js"/.test(read("components/world/topo/core.js")));
  assert.ok(!/plates\.js/.test(read("components/world/topo/TopoDriver.jsx")));
});
