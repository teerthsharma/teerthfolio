// Every contract must be reachable, or it rots.
//
// Six of this repo's check scripts were orphans: not in `npm run build` and with no npm
// alias, so the only way to run them was to type the path by hand, which nobody does.
// Three of the six had gone stale, and every one of those three was reporting a
// DELIBERATE improvement as a failure:
//
//   check-igloo-reference-effects  medium geographyInstances 24 -> 32, documented in code
//   check-polar-travel-debris      static import -> next/dynamic, commit e4f3397
//   check-polar-gate               an entire splash design replaced by commit a74e08b
//
// None found a real defect. That is the whole problem: an unreachable gate does not stay
// neutral, it drifts until it lies, and then it trains whoever finally runs it to dismiss
// the output — which is how a real regression gets waved through.
//
// The clearest evidence sits in a74e08b's own commit body: "Gates: all 21 build gates
// green." That was true and incomplete. check-polar-gate was not one of the 21, so a
// deliberate shader rewrite silently invalidated it in the same commit that reported
// everything green.
//
// So this asserts the property that would have prevented all of it: a check script is
// either wired into `npm run build`, or it is explicitly listed below with a reason.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const build = pkg.scripts.build;

// Contracts that legitimately cannot run in `npm run build`, each with the reason it is
// excluded. Adding a name here is a deliberate act that needs a justification next to it;
// that is the point. Anything NOT here must be in the build.
const EXCLUDED = new Map([
  [
    "check-polar-color-continuity.mjs",
    "needs a live production server plus a full capture sweep (npm run verify:biome-visuals)",
  ],
  [
    "check-ci-browser-boundary.mjs",
    "guards the CI/browser split itself; runs via npm run check:release-boundaries",
  ],
  [
    "check-publication-packaging.mjs",
    "release-time packaging check; runs via npm run check:release-boundaries",
  ],
  // This script cannot police itself from inside the build it is checking.
  ["check-contracts-reachable.mjs", "this script"],
]);

const scripts = readdirSync("scripts").filter(
  (file) => file.startsWith("check-") && file.endsWith(".mjs"),
);

const unreachable = [];
for (const file of scripts) {
  if (EXCLUDED.has(file)) continue;
  if (!build.includes(file)) unreachable.push(file);
}

assert.deepEqual(
  unreachable,
  [],
  `these contracts are unreachable — wire them into "build", or add them to EXCLUDED with a reason:\n` +
    unreachable.map((file) => `  - ${file}`).join("\n"),
);

// The exclusion list must not rot either: a name left here after its script is deleted
// makes the list read as coverage it no longer provides.
const missing = [...EXCLUDED.keys()].filter(
  (file) => file !== "check-contracts-reachable.mjs" && !scripts.includes(file),
);
assert.deepEqual(
  missing,
  [],
  `EXCLUDED names scripts that no longer exist: ${missing.join(", ")}`,
);

console.log(
  `contracts reachable: ${scripts.length - EXCLUDED.size + 1}/${scripts.length} wired into the build, ` +
    `${EXCLUDED.size - 1} excluded with reasons, 0 orphans.`,
);
