import { test } from "node:test";
import assert from "node:assert/strict";
import { L8_TABLE, buildL8, criticalIds, tourLegs, walkLeg, ticksOf } from "../library.mjs";

test("the 8 legs carry the table's names and lengths within 0.1 m", () => {
  const legs = buildL8();
  assert.equal(legs.length, 8);
  legs.forEach((leg, i) => {
    assert.equal(leg.name, L8_TABLE[i].name);
    assert.ok(Math.abs(leg.length - L8_TABLE[i].length) <= 0.1, `${leg.name}: ${leg.length} vs ${L8_TABLE[i].length}`);
  });
  const total = legs.reduce((s, l) => s + l.length, 0);
  assert.ok(Math.abs(total - 182.2) <= 0.1, `total ${total}`);
});

test("the critical set from spawn is the statue and the four docks with deadline under 1.6 s", () => {
  assert.deepEqual([...criticalIds()].sort(), ["home", "p-caustic", "p-resolvent", "pr-tensorflow-124410", "spawn-seal"].sort());
});

test("the tour's first legs include the library legs spawn-home and tensorflow-openxla", () => {
  const legs = tourLegs();
  assert.equal(legs[0].to, "home");
  assert.equal(legs[1].to, "pr-tensorflow-124410");
  assert.equal(legs[2].to, "pr-openxla-46539");
  assert.equal(legs.length >= 8, true);
});

test("a leg walk starts at its start, ends within half a metre of its end, and accelerates from rest", () => {
  const leg = buildL8()[0];
  const w = walkLeg(leg.start, leg.end);
  assert.equal(w.x[0], leg.start.x);
  assert.equal(w.z[0], leg.start.z);
  const last = w.x.length - 1;
  assert.ok(Math.hypot(w.x[last] - leg.end.x, w.z[last] - leg.end.z) < 0.5);
  const step0 = Math.hypot(w.x[1] - w.x[0], w.z[1] - w.z[0]);
  assert.ok(step0 < 10 / 60, `first step ${step0} m is not an acceleration from rest`);
});

test("ticks are every sixth 60 Hz frame, starting at frame 0", () => {
  const w = walkLeg(buildL8()[0].start, buildL8()[0].end);
  const t = ticksOf(w);
  assert.equal(t.x[0], w.x[0]);
  assert.equal(t.x[1], w.x[6]);
  assert.equal(t.x.length, Math.ceil(w.x.length / 6));
});
