// node lib/anime/cutscenes/p-asmodeus/clock.check.mjs : mote landing mirror, lit-window count, form and lamp timing, packet mote loop
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MOTES, formAt, lampOn, moteQ, windows } from "./clock.js";

const q = [5.5, 5.917, 6.5].map(moteQ);
console.log("moteQ(5.5), moteQ(5.917), moteQ(6.5):", q.map((x) => x.toFixed(3)).join(" "));
assert.ok(q[0] <= q[1] && q[1] <= q[2], "moteQ is non-decreasing");
assert.ok(q[2] >= 0.85, "moteQ(6.5) >= 0.85");
for (let t = 4.5; t < 6.5; t += 1 / 12) assert.ok(moteQ(t) <= moteQ(t + 1 / 12), `moteQ monotone at ${t.toFixed(3)}`);
const n = windows().length;
console.log("lit windows:", n);
assert.ok(n >= 90 && n <= 102, "lit windows in 90..102");
assert.equal(formAt(0.5), "pup");
assert.equal(formAt(2.5), "base");
assert.equal(formAt(7.6), "satan");
assert.equal(formAt(11.3), "pup");
assert.equal(lampOn(5), 0);
assert.equal(lampOn(10), 1);
const packet = readFileSync(new URL("../../tools/cuts/p-asmodeus/packet.js", import.meta.url), "utf8");
const fear = packet.slice(packet.indexOf("export const asmFearMotes"));
const bound = Number(/for \(int j = 0; j < (\d+); j\+\+\)/.exec(fear)?.[1]);
assert.equal(bound, MOTES, `packet.js asmFearMotes mote loop is ${bound}, clock.js MOTES is ${MOTES} (lane C ticket 14)`);
console.log("clock.check: ok");
