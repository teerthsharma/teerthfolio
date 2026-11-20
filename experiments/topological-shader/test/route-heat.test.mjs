import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { makeHexGrid } from "../../../lib/world/heat/hexgrid.js";
import { CUT_SIGMAS, SIGMA, routeHeat, ticksAlong } from "../../../lib/world/heat/route-heat.js";
import { bakeRoutePlates } from "../../../scripts/bake-route-heat.mjs";
import { bakePlate } from "../heat.mjs";
import { buildL8, ticksOf, walkLeg } from "../library.mjs";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..", "..", "..");
const SCRIPT = join(ROOT, "scripts", "bake-route-heat.mjs");
const PLATES = join(ROOT, "public", "topo", "route-plates.json");
const GRID = makeHexGrid(84, 4);

const segDist = (x, z, ax, az, bx, bz) => {
  const dx = bx - ax;
  const dz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - (ax + t * dx), z - (az + t * dz));
};

test("a straight 8 m leg from the centre peaks on the segment, is warm within 6 m and exactly zero past the cut", () => {
  const ticks = ticksAlong([{ x: 0, z: 0 }, { x: 8, z: 0 }], 8);
  assert.equal(ticks.x.length, 11);
  const H = routeHeat(GRID, ticks);
  assert.equal(Math.max(...H), 1);
  const arg = H.indexOf(1);
  assert.ok(segDist(GRID.xs[arg], GRID.zs[arg], 0, 0, 8, 0) < 2.5);
  let warm = 0;
  let rim = 0;
  for (let v = 0; v < GRID.n; v++) {
    const d = segDist(GRID.xs[v], GRID.zs[v], 0, 0, 8, 0);
    if (d > 18 && d < 20 && H[v] > 0) rim++;
    if (d <= 6) {
      assert.ok(H[v] >= 0.2, `cell ${v} at ${d} m has heat ${H[v]}`);
      warm++;
    }
    if (d > CUT_SIGMAS * SIGMA) assert.equal(H[v], 0);
    if (d > 4 * SIGMA) assert.equal(H[v], 0);
  }
  assert.ok(warm > 10);
  assert.ok(rim > 0, "heat reaches the 3.5 sigma rim (18 to 20 m)");
});

test("routeHeat equals the experiment's bakePlate on a walked L8 leg", () => {
  const leg = buildL8()[4];
  const ticks = ticksOf(walkLeg(leg.start, leg.end));
  const a = routeHeat(GRID, ticks);
  const b = bakePlate(ticks);
  assert.equal(a.length, b.length);
  for (let v = 0; v < a.length; v++) assert.ok(Math.abs(a[v] - b[v]) < 1e-12, `cell ${v}`);
});

test("a bake is deterministic and matches the committed file byte for byte", () => {
  const a = bakeRoutePlates();
  assert.equal(a, bakeRoutePlates());
  assert.equal(a, readFileSync(PLATES, "utf8"));
});

test("the plates file has the pinned schema and the 8 legs of L8 totalling 182.2 m", () => {
  const j = JSON.parse(readFileSync(PLATES, "utf8"));
  assert.deepEqual(Object.keys(j), ["version", "grid", "legs"]);
  assert.equal(j.version, 1);
  assert.deepEqual(j.grid, { R: 84, h: 4, n: 1615 });
  assert.equal(j.legs.length, 8);
  let total = 0;
  const ids = new Set();
  for (const leg of j.legs) {
    assert.deepEqual(Object.keys(leg), ["id", "from", "to", "lengthM", "heat"]);
    assert.equal(leg.id, `${leg.from}-to-${leg.to}`);
    ids.add(leg.id);
    assert.equal(leg.heat.length, 1615);
    assert.equal(Math.max(...leg.heat), 1);
    for (const v of leg.heat) assert.ok(v >= 0 && v <= 1 && Math.round(v * 1e4) / 1e4 === v);
    total += leg.lengthM;
  }
  assert.equal(ids.size, 8);
  assert.ok(Math.abs(total - 182.2) <= 0.05, `total ${total}`);
});

test("--check passes on the committed file and exits 1 on a changed one", () => {
  const run = (args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
  assert.equal(run(["--check"]).status, 0);
  const bad = join(mkdtempSync(join(tmpdir(), "plates-")), "route-plates.json");
  writeFileSync(bad, readFileSync(PLATES, "utf8").replace("0.", "0.0"));
  assert.equal(run(["--check", "--file", bad]).status, 1);
});
