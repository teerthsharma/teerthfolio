/* global console */
// node components/world/seal/drive.check.mjs
// The drive's signs and schedules: the part a variant cannot see is wrong.

import assert from "node:assert/strict";
import { PLACE_BY_ID, dockPoint } from "../../../lib/world/places.js";
import { createDrive, stepDrive } from "./drive.js";

const dt = 1 / 60;
const run = (d, seal, near, seconds, t0 = d.t, each) => {
  for (let i = 1; i <= Math.round(seconds / dt); i++) {
    each?.(seal, dt);
    stepDrive(d, seal, near, t0 + i * dt, dt);
  }
  return d;
};

// Left turn (heading increasing) at speed leans left: negative roll.
{
  const d = createDrive();
  const seal = { x: 0, z: 0, heading: 0, speed: 8, impact: 0 };
  run(d, seal, null, 0.5, 0, (s) => (s.heading += 2 * dt));
  assert.ok(d.turn > 1.5, `turn ${d.turn}`);
  assert.ok(d.lean < -0.15, `lean ${d.lean}`);
  assert.ok(d.lookYaw > 0.2, "head leads into the turn");
  assert.ok(d.gait > 0.9 && d.stepping === 1 && d.stride > 1, "galumphing");
}

// A bump squashes, then springs back through stretch and settles.
{
  const d = createDrive();
  const seal = { x: 0, z: 0, heading: 0, speed: 0, impact: 0 };
  run(d, seal, null, 0.2);
  seal.impact = 1;
  let peak = 0;
  let trough = 0;
  run(d, seal, null, 1.5, d.t, (s) => {
    s.impact = Math.max(0, s.impact - dt * 3);
    peak = Math.max(peak, d.squash);
    trough = Math.min(trough, d.squash);
  });
  assert.ok(peak > 0.4 && trough < -0.05 && Math.abs(d.squash) < 0.05, `squash ${peak} ${trough} ${d.squash}`);
}

// Resting facing away (heading PI): body turns toward the visitor, head
// turns the same way, and it blinks within a few seconds.
{
  const d = createDrive();
  const seal = { x: 0, z: 9, heading: Math.PI, speed: 0, impact: 0 };
  let blinked = false;
  let sameSide = true;
  run(d, seal, null, 4, 0, () => {
    blinked ||= d.blink > 0.5;
    // (until the first glance, which may look either way on purpose)
    if (!d.glances && Math.abs(d.bodyYaw) > 0.3 && Math.abs(d.lookYaw) > 0.1) sameSide &&= Math.sign(d.bodyYaw) === Math.sign(d.lookYaw);
  });
  assert.ok(Math.abs(d.bodyYaw) > 2.2, `bodyYaw ${d.bodyYaw}`);
  assert.ok(sameSide, "head and body turn the same way");
  assert.ok(blinked, "blinks");
}

// Arriving at a place: happy, studies the building (it is dead ahead of the
// dock), then turns to the visitor and waves.
{
  const d = createDrive();
  const place = PLACE_BY_ID.aether;
  const dock = dockPoint(place);
  const seal = { x: dock.x, z: dock.z, heading: Math.PI, speed: 0, impact: 0 };
  run(d, seal, null, 0.5);
  run(d, seal, "aether", 0.1);
  assert.ok(d.happy > 0.9);
  run(d, seal, "aether", 1.2);
  assert.ok(Math.abs(d.bodyYaw) < 0.05 && Math.abs(d.lookYaw) < 0.1 && d.lookPitch > 0.2, "studies the building");
  let waved = false;
  run(d, seal, "aether", 3, d.t, () => (waved ||= d.wave > 0.9));
  assert.ok(waved && Math.abs(d.bodyYaw) > 1.5, `waves at the visitor ${d.bodyYaw}`);
}

console.log("drive: ok");
