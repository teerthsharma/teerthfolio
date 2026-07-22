import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
const build = packageJson.scripts.build;

assert.ok(build.includes("npm run check:ci-browser-boundary"));
assert.ok(build.includes("npm run check:publication-packaging"));
assert.ok(!/playwright|verify:biome-shaders|verify:ci-browser/i.test(build), "build must not launch a browser");
assert.equal(packageJson.scripts["verify:ci-browser"], "npm run verify:biome-shaders");

const dependencyInstall = workflow.indexOf("run: npm ci");
const browserInstall = workflow.indexOf("run: npx playwright install --with-deps chromium");
const browserProof = workflow.indexOf("run: npm run verify:ci-browser");
assert.ok(dependencyInstall >= 0, "CI must install locked dependencies");
assert.ok(browserInstall > dependencyInstall, "CI must provision Chromium after npm ci");
assert.ok(browserProof > browserInstall, "CI must run the browser proof after provisioning Chromium");

console.log("CI browser boundary contract passed: build is browser-free and CI provisions explicit proof.");
