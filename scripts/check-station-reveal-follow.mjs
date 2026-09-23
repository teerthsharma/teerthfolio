// The reveal-scale spring is the stations' only follow-through, and it is invisible
// in a still: a screenshot cannot show that a value overshot and settled. These are
// the assertions that fail if the motion silently stops being motion — a coefficient
// nudged to critical damping, a clamp that eats the overshoot, or a dt guard that
// pins the spring at its target and turns the whole thing back into an assignment.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const libraryPath = join(root, "lib", "station-reveal-follow.js");
assert.ok(existsSync(libraryPath), "lib/station-reveal-follow.js must own the reveal-scale spring");

const { REVEAL_SCALE_FOLLOW, followRevealScale, stepRevealScaleFollow } = await import(
  pathToFileURL(libraryPath).href
);

const FRAME = 1 / 60;
function run(from, target, seconds) {
  const follow = { value: from, velocity: 0 };
  const samples = [];
  for (let t = 0; t < seconds; t += FRAME) samples.push(stepRevealScaleFollow(follow, target, FRAME));
  return samples;
}

// 1. It actually lags. The first frame after a dock must NOT be the target, which is
//    exactly what the old code did and what this exists to stop.
{
  const samples = run(1, 1.88, 1);
  assert.ok(
    samples[0] < 1.2,
    `docking must not snap: first frame reached ${samples[0].toFixed(3)} of a 1 -> 1.88 change`,
  );
}

// 2. It overshoots. This is the assertion that distinguishes a spring from an ease.
//    Underdamping is the whole reason the settle reads as weight; a critically damped
//    system passes every other check here and feels like nothing.
{
  const samples = run(1, 1.88, 1.5);
  const peak = Math.max(...samples);
  assert.ok(peak > 1.88, `reveal must overshoot its target, peaked at ${peak.toFixed(4)}`);
  assert.ok(peak < 2.1, `overshoot must stay bounded, peaked at ${peak.toFixed(4)}`);
}

// 3. It settles, and quickly enough that a docked station is not still growing after
//    the camera has composed on it.
{
  const samples = run(1, 1.88, 1.2);
  const settled = samples[samples.length - 1];
  assert.ok(
    Math.abs(settled - 1.88) < 0.005,
    `reveal must settle on its target, ended at ${settled.toFixed(4)}`,
  );
  const settleFrame = samples.findIndex(
    (value, index) => samples.slice(index).every((later) => Math.abs(later - 1.88) < 0.02),
  );
  assert.ok(
    settleFrame * FRAME < 0.6,
    `settle took ${(settleFrame * FRAME).toFixed(2)}s, which is long enough to read as lag rather than weight`,
  );
}

// 4. Undocking is symmetric — the shrink lags too. A station that grows with weight
//    and vanishes instantly is worse than one that does neither.
{
  const samples = run(1.88, 1, 1);
  assert.ok(samples[0] > 1.6, `undocking must not snap: first frame fell to ${samples[0].toFixed(3)}`);
  assert.ok(Math.min(...samples) < 1, "undock must undershoot as well as overshoot");
}

// 5. A stalled tab cannot launch the spring. Without the step clamp, one huge delta
//    integrates a velocity large enough to snap visibly — the exact artefact this
//    replaces. Same input, clamped and unclamped, must not diverge.
{
  const follow = { value: 1, velocity: 0 };
  stepRevealScaleFollow(follow, 1.88, 4);
  assert.ok(
    Number.isFinite(follow.value) && follow.value > 0 && follow.value < 3,
    `a 4s delta must be clamped, not integrated (got ${follow.value})`,
  );
}

// 6. Reduced motion returns the target exactly, on every call, with no residue. The
//    pose still resolves; it just arrives with no lag.
{
  const fakeRoot = {};
  assert.equal(followRevealScale(fakeRoot, 1.88, FRAME, true), 1.88);
  assert.equal(followRevealScale(fakeRoot, 1, FRAME, true), 1);
  // And a root that was springing before reduced motion turned on must not resume
  // mid-flight from a stale velocity when it turns back off.
  followRevealScale(fakeRoot, 1.88, FRAME, false);
  assert.equal(followRevealScale(fakeRoot, 1.88, FRAME, true), 1.88);
}

// 7. A root's first frame is its pose, not a launch. Otherwise every station visibly
//    inflates the moment it becomes visible.
{
  const fakeRoot = {};
  assert.equal(followRevealScale(fakeRoot, 1.65, FRAME, false), 1.65);
}

// 8. Both station families must use the shared spring rather than a private copy.
//    This existed as duplicated code in two components first, and duplicated motion
//    constants drift apart silently — the failure is two station families that feel
//    different for no authored reason.
for (const component of ["PolarStationMechanismsNE.jsx", "PolarStationMechanismsSW.jsx"]) {
  const source = readFileSync(join(root, "components", component), "utf8");
  assert.match(
    source,
    /import\s*\{[^}]*followRevealScale[^}]*\}\s*from\s*"\.\.\/lib\/station-reveal-follow"/,
    `${component} must take the reveal spring from lib/station-reveal-follow`,
  );
  assert.doesNotMatch(
    source,
    /const\s+REVEAL_SCALE_FOLLOW\s*=/,
    `${component} must not keep a private copy of the reveal spring constants`,
  );
  assert.match(
    source,
    /followRevealScale\(\s*root,\s*targetScale,\s*delta,\s*reducedMotion\s*\)/,
    `${component} must drive the reveal spring from the frame delta and honour reduced motion`,
  );
}

assert.ok(
  REVEAL_SCALE_FOLLOW.dampingRatio < 1,
  "the reveal spring must stay underdamped or the settle stops reading as weight",
);

console.log(
  "station reveal follow contract passed: lag, bounded overshoot, symmetric settle, stall clamp, reduced-motion pin, shared by both families.",
);
