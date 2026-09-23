/* global console */
// node components/world/land/parts/floes-layout.check.mjs
// The pyrefly floes keep their story and their place: all 208 components,
// none touching another, every floe hanging clear of the ground and the
// water, the pin standing in the water off the river's fast middle, the
// funnel clear of the reading point, the stranded floes afloat by a bank.

import assert from "node:assert/strict";
import { PLACE_BY_ID } from "../../../../lib/world/places.js";
import { RIVER, riverAt } from "../../../../lib/world/river.js";
import { heightAt, WATER_Y } from "../../../../lib/world/terrain.js";
import { COMMIT, DOOR, FLOE, FLOES, N, PIN, PIN_R, STRANDED, THREADS } from "./floes-layout.js";

assert.equal(N, 208);
assert.equal(DOOR, 100);
assert.equal(FLOES.length, 208);
assert.equal(THREADS.length, 208);
assert.deepEqual(THREADS.at(-1)[1], COMMIT, "the chain does not end on the pin");

const place = PLACE_BY_ID["pr-pyrefly-4180"];
let lowest = Infinity;
for (const [i, f] of FLOES.entries()) {
  const wx = PIN.x + f.c[0];
  const wz = PIN.z + f.c[2];
  const clear = f.c[1] - Math.max(heightAt(wx, wz), WATER_Y);
  lowest = Math.min(lowest, clear);
  assert.ok(clear > 0.9, `floe ${i} hangs only ${clear.toFixed(2)} m over the ground at ${wx.toFixed(1)}, ${wz.toFixed(1)}`);
  assert.ok(Math.hypot(wx - place.x, wz - place.z) > place.radius + 2.5, `floe ${i} hangs over the reading point`);
  if (i < N - 1) {
    const [t, h] = THREADS[i];
    assert.ok(Math.hypot(h[0] - t[0], h[1] - t[1], h[2] - t[2]) > 0.06, `floes ${i} and ${i + 1} touch`);
  }
}
// arms of the coil never collide: floes more than two apart stay a floe's width apart
const width = 2 * FLOE.lobeZ * 1.1;
let tightest = Infinity;
for (let i = 0; i < N; i++) {
  for (let j = i + 3; j < N; j++) {
    const a = FLOES[i].c;
    const b = FLOES[j].c;
    tightest = Math.min(tightest, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
  }
}
assert.ok(tightest > width, `two arms of the coil touch (${tightest.toFixed(2)} m apart)`);

// the pin stands in the water, off the fast middle a rider follows
const at = riverAt(PIN.x, PIN.z);
assert.ok(at.inside, "the pin stands on dry land");
const offCentre = (1 - at.depth) * at.half;
assert.ok(offCentre > 0.9 + PIN_R + 1.2, `the pin is only ${offCentre.toFixed(2)} m off the river's centre line`);

// the stranded floes are afloat, by a bank, off the bridge
for (const s of STRANDED) {
  const w = riverAt(s.x, s.z);
  assert.ok(w.inside && w.depth < 0.3, `a stranded floe at ${s.x}, ${s.z.toFixed(1)} is not in the shallows`);
  for (const b of RIVER.bridges) assert.ok(Math.hypot(s.x - b.x, s.z - b.z) > 3, `a stranded floe sits under ${b.name}`);
}

console.log(`floes ok: ${N} components, lowest floe ${lowest.toFixed(2)} m clear, arms ${tightest.toFixed(2)} m apart, pin ${offCentre.toFixed(2)} m off centre`);
