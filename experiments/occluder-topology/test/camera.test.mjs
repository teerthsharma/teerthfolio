// Follow-camera law (L1): spawn framing, steady state, and the lift over a lab or the igloo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeFollowCamera, pupBox, projectBox } from "../scene.mjs";

const still = (x, z, climb = 0) => ({ x, z, vx: 0, vz: 0, speed: 0, throttle: 0, boost: 0, climb, pupY: climb, heading: Math.PI });

function settle(seal, frames) {
  const cam = makeFollowCamera();
  let c = null;
  for (let i = 0; i < frames; i++) c = cam.step(seal);
  return c;
}

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: got ${a}, want ${b}`);

test("frame 0 at SPAWN: eye (0,14.3007,37.0667), look (0,0.6,6) within 1e-3 (31.5 m = 21 x 1.5)", () => {
  const c = makeFollowCamera().step(still(0, 9));
  near(c.eye[0], 0, 1e-3, "eye x");
  near(c.eye[1], 14.3007, 1e-3, "eye y");
  near(c.eye[2], 37.0667, 1e-3, "eye z");
  near(c.look[0], 0, 1e-3, "look x");
  near(c.look[1], 0.6, 1e-3, "look y");
  near(c.look[2], 6, 1e-3, "look z");
});

test("stationary at (0,30) for 600 frames: eye (0,9.5338,48.7111), look (0,0.6,27) within 1e-2", () => {
  const c = settle(still(0, 30), 600);
  near(c.eye[1], 9.5338, 1e-2, "eye y");
  near(c.eye[2], 48.7111, 1e-2, "eye z");
  near(c.look[2], 27, 1e-2, "look z");
});

test("lift: pup at (0,14) keeps 27 deg (igloo is behind the pup); pup at (31.5,-5) rises to LIFT_MAX 46 deg", () => {
  const north = settle(still(0, 14), 600);
  near(north.elevation, 27 * Math.PI / 180, 1e-6, "igloo behind: elevation");
  const lab = settle(still(31.5, -5), 600);
  near(lab.elevation, 46 * Math.PI / 180, 1e-3, "p-caustic between lens and pup: elevation");
  near(lab.eye[1], 15.1060, 1e-2, "lifted eye y");
  near(lab.eye[2], 9.5879, 1e-2, "lifted eye z");
});

test("projected pup box at steady state: depth 20..22 m and height in the derived band", () => {
  const seal = still(0, 30);
  const c = settle(seal, 600);
  const p = projectBox(c, pupBox(seal));
  assert.ok(p.ok);
  assert.ok(p.depth >= 20 && p.depth <= 22, `depth ${p.depth}`);
  const px = (p.y1 - p.y0) * 400;
  // derived: the body AABB is 1.07 m tall and 1.85 m deep (z); at the 27 deg tilt its screen span is (1.07 cos e + 1.85 sin e) m over depth * tan 14 deg
  const e = (27 * Math.PI) / 180;
  const derived = ((1.07 * Math.cos(e) + 1.85 * Math.sin(e)) / (p.depth * Math.tan((14 * Math.PI) / 180))) * 400;
  assert.ok(Math.abs(px - derived) <= 0.03 * derived, `box height ${px.toFixed(1)} px vs derived ${derived.toFixed(1)} px`);
});
