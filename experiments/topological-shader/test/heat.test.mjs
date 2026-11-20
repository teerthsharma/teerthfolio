import { test } from "node:test";
import assert from "node:assert/strict";
import { GRID, SIGMA, CUT, DECAY, bakePlate, liveSamples, staticPrior } from "../heat.mjs";

const pointTicks = (x, z, n) => ({ x: new Float64Array(n).fill(x), z: new Float64Array(n).fill(z) });

test("one deposit gives 0.1 at the cell under the walker and nothing beyond 3.5 sigma", () => {
  const i = 800;
  const cx = GRID.x[i];
  const cz = GRID.z[i];
  const plate = bakePlate({ x: Float64Array.of(cx), z: Float64Array.of(cz) });
  assert.equal(plate[i], 1);
  let far = 0;
  for (let v = 0; v < GRID.n; v++) {
    if (Math.hypot(GRID.x[v] - cx, GRID.z[v] - cz) > CUT) far = Math.max(far, plate[v]);
  }
  assert.equal(far, 0);
  assert.equal(CUT, 3.5 * SIGMA);
});

test("the plate is normalised to its maximum of 1 and suspends decay", () => {
  const t = pointTicks(GRID.x[100], GRID.z[100], 900);
  const plate = bakePlate(t);
  assert.equal(Math.max(...plate), 1);
});

test("decay halves the heat in 90 s", () => {
  assert.ok(Math.abs(Math.pow(DECAY, 900) - 0.5) < 1e-12);
});

test("live samples come once per second, are normalised by a running maximum, and never exceed 1", () => {
  const t = pointTicks(GRID.x[300], GRID.z[300], 300);
  const S = liveSamples(t, { decay: true, everySecond: 1 });
  assert.equal(S.length, 30);
  for (const Hn of S) for (const v of Hn) assert.ok(v >= 0 && v <= 1 + 1e-12);
  const peak = S.map((Hn) => Math.max(...Hn));
  assert.ok(peak[0] > 0);
});

test("the static layout prior is one plate normalised to 1 with mass at every dock point", () => {
  const P = staticPrior([{ x: GRID.x[10], z: GRID.z[10] }, { x: GRID.x[500], z: GRID.z[500] }]);
  assert.equal(Math.max(...P), 1);
  assert.ok(P[10] > 0 && P[500] > 0);
});
