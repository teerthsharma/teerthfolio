import { test } from "node:test";
import assert from "node:assert/strict";
import { topoMode } from "../../../components/world/topo/topoFlag.js";
import { topoChunk, lifeJs, aliveJs } from "../../../components/world/topo/uber.glsl.js";

const withSearch = (q) => {
  globalThis.window = { location: { search: q } };
  try {
    return topoMode();
  } finally {
    delete globalThis.window;
  }
};

test("topoMode parses off, neutral, on; default and unknown are off", () => {
  assert.equal(topoMode(), "off");
  assert.equal(withSearch(""), "off");
  assert.equal(withSearch("?topo=neutral"), "neutral");
  assert.equal(withSearch("?look=2&topo=on"), "on");
  assert.equal(withSearch("?topo=off"), "off");
  for (const bad of ["?topo=", "?topo=ON", "?topo=1", "?topo=neutral%20"]) assert.equal(withSearch(bad), "off", bad);
});

test("lifeJs matches the report: LIVE 1, BAKED 0, BAND [xi < 1 - C]", () => {
  const table = [
    [0, 0.9, 0.99, 1],
    [0, 0, 0, 1],
    [1, 0.9, 0.0, 0],
    [1, 0, 0.5, 0],
    [2, 0.75, 0.24, 1],
    [2, 0.75, 0.25, 0],
    [2, 0.75, 0.9, 0],
    [2, 0.25, 0.74, 1],
    [2, 0.25, 0.75, 0],
    [2, 0, 0.99, 1],
    [2, 1, 0, 0],
  ];
  for (const [s, C, xi, want] of table) assert.equal(lifeJs(s, C, xi), want, `s=${s} C=${C} xi=${xi}`);
});

test("chunk declares the uniforms and includes nothing", () => {
  for (const name of ["uTh", "uGridOrigin", "uCell", "uA"]) assert.match(topoChunk, new RegExp(`uniform \\w+ ${name};`));
  assert.match(topoChunk, /uniform sampler2D uTh;/);
  assert.ok(!topoChunk.includes("#include"));
  assert.match(topoChunk, /float topoLife\(float s, float C, float xi\)/);
  assert.match(topoChunk, /vec2\(43\.0, 49\.0\)/);
});

test("uA = 0 makes the alive multiply the identity", () => {
  assert.match(topoChunk, /if \(uA == 0\.0\) return 1\.0;/);
  for (const life of [0, 1]) for (const lam of [0, 0.7]) assert.equal(aliveJs(life, 0, lam, 0.3, 12.5, 0), 1);
  const col = [0.1, 0.5, 0.9];
  assert.deepEqual(col.map((c) => c * aliveJs(0, 0, 0, 0, 1, 0)), col);
  assert.ok(aliveJs(0, 0.5, 1, 0.01, 0, 0) < 1);
  assert.equal(aliveJs(1, 0.5, 1, 0.01, 0, 0), 1);
  assert.equal(aliveJs(0, 0.5, 1, 0.01, 0, 1), 1);
});
