// node lib/anime/cutscenes/p-asmodeus/cams.check.mjs : the shots tile 0 to 12 with no gap or overlap, and pins are finite
import assert from "node:assert/strict";
import { K } from "./clock.js";
import { SHOTS, depthFor, pin, shotAt, shotData } from "./cams.js";

assert.equal(SHOTS[0].t[0], 0);
for (let i = 1; i < SHOTS.length; i++) assert.ok(Math.abs(SHOTS[i].t[0] - SHOTS[i - 1].t[1]) < 1e-9, `shot ${i + 1} gap or overlap`);
assert.ok(Math.abs(SHOTS.at(-1).t[1] - 12) < 1e-9, "shots end at 12");
for (const s of SHOTS) assert.ok(s.t[1] - s.t[0] <= 5, `shot ${s.n} longer than 5 s`);
assert.equal(shotData().length, SHOTS.length);
assert.equal(shotAt(K(8)).n, 9);
assert.equal(shotAt(5.5 + 2 / 12).n, 6);
for (let t = 0; t < 12; t += 0.05) {
  const s = shotAt(t), p = pin(s, t, 2.39, 0.5, 0.9, depthFor(s, t, 2.39, 0.85, 0.24));
  assert.ok(Number.isFinite(p.x + p.y + p.z), `pin finite at ${t.toFixed(2)}`);
}
console.log("cams.check: ok,", SHOTS.length, "shots");
