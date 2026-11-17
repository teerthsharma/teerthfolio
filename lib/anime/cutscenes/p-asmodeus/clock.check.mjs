// node lib/anime/cutscenes/p-asmodeus/clock.check.mjs : mote landing mirror and lit-window count
import assert from "node:assert/strict";
import { moteQ, windows } from "./clock.js";

const q = [5.5, 5.917, 6.5].map(moteQ);
console.log("moteQ(5.5), moteQ(5.917), moteQ(6.5):", q.map((x) => x.toFixed(3)).join(" "));
assert.ok(q[0] <= q[1] && q[1] <= q[2], "moteQ is non-decreasing");
assert.ok(q[2] >= 0.85, "moteQ(6.5) >= 0.85");
for (let t = 4.5; t < 6.5; t += 1 / 12) assert.ok(moteQ(t) <= moteQ(t + 1 / 12), `moteQ monotone at ${t.toFixed(3)}`);
const n = windows().length;
console.log("lit windows:", n);
assert.ok(n >= 90 && n <= 102, "lit windows in 90..102");
console.log("clock.check: ok");
