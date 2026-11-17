// node lib/anime/step.check.mjs : step(t, fps) lands on frame floor(t fps) / fps, even when t sits exactly on a frame.
import assert from "node:assert/strict";
import { step } from "./sakuga.js";

assert.equal(step(11 / 12, 12), 11 / 12);
assert.equal(step(0, 12), 0);
assert.equal(step(0.999, 12), 11 / 12);
assert.equal(step(1 / 24, 24), 1 / 24);
assert.equal(step(5.0, 8), 5.0);
assert.equal(step(29 / 100, 100), 29 / 100, "frame 29 at 100 fps: 0.29 * 100 is 28.999... in doubles");
console.log("step.check: ok");
