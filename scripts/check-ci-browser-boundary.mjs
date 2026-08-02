import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
const build = packageJson.scripts.build;

assert.ok(
  !/check:publication-packaging|check:ci-browser-boundary|check:release-boundaries/i.test(build),
  "production build must not depend on repository metadata gates",
);
// Script path, not npm key - the build chains node calls directly.
assert.ok(build.includes("check-browser-diagnostic-contracts.mjs"));
assert.ok(!/playwright|verify:biome-shaders|verify:ci-browser/i.test(build), "build must not launch a browser");
assert.equal(
  packageJson.scripts["check:release-boundaries"],
  "npm run check:publication-packaging && npm run check:ci-browser-boundary",
);
// The browser-side proof now has two halves: the biome shaders compile, and the
// world they compile into still renders. The second exists because two
// consecutive optimisations in this branch measured large wins on a silently
// broken scene — checkShaderErrors is off by design, so a damaged shader renders
// wrong rather than throwing, and every source-pattern contract in the build
// chain missed it.
assert.equal(
  packageJson.scripts["verify:ci-browser"],
  "npm run verify:biome-shaders && npm run verify:render-frame",
);
assert.ok(
  packageJson.scripts["verify:render-frame"],
  "the render-frame proof must stay runnable on its own",
);

const dependencyInstall = workflow.indexOf("run: npm ci");
const releaseBoundaries = workflow.indexOf("run: npm run check:release-boundaries");
const browserInstall = workflow.indexOf("run: npx playwright install --with-deps chromium");
const buildStep = workflow.indexOf("run: npm run build");
const browserProof = workflow.indexOf("run: npm run verify:ci-browser");
assert.ok(dependencyInstall >= 0, "CI must install locked dependencies");
assert.ok(releaseBoundaries > dependencyInstall, "CI must check release boundaries after npm ci");
assert.ok(buildStep > releaseBoundaries, "CI must check release boundaries before the production build");
assert.ok(browserProof > releaseBoundaries, "CI must check release boundaries before browser proof");
assert.ok(browserInstall > dependencyInstall, "CI must provision Chromium after npm ci");
assert.ok(browserProof > browserInstall, "CI must run the browser proof after provisioning Chromium");

console.log("CI browser boundary contract passed: repository gates precede browser-free build and explicit proof.");
