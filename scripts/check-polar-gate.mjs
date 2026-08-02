import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const splash = readFileSync("components/SdfSealSplash.jsx", "utf8");
const shader = readFileSync("components/AntarcticSplashShader.jsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");

function contract(name, check) {
  try {
    check();
    console.log(`polar-gate contract passed: ${name}`);
  } catch (error) {
    console.error(`polar-gate contract failed: ${name}`);
    console.error(error.message);
    process.exitCode = 1;
  }
}

contract("safe gate preserves its public callback contract", () => {
  for (const token of [
    "active = true",
    "activeArtifact",
    "diagnosticEvents = []",
    "guideState = \"idle\"",
    "onEnable",
    "safeMode = false",
    "onEnable?.()",
  ]) {
    assert.ok(splash.includes(token), `missing public gate token: ${token}`);
  }
  assert.match(splash, /data-safe-mode=\{safeMode \? "true" : "false"\}/);
});

contract("one native primary action supports keyboard activation", () => {
  assert.equal((splash.match(/className="sdf-render-button"/g) || []).length, 1);
  assert.match(splash, /<button[\s\S]*type="button"[\s\S]*onClick=\{requestRenderAccess\}/);
  assert.equal((splash.match(/"Enter the world"/g) || []).length, 1);
  assert.equal((splash.match(/Or scroll straight to the work/g) || []).length, 1);
});

contract("loading narrative reports real gate work rather than elapsed-time completion", () => {
  assert.match(splash, /role="status"[\s\S]*aria-live="polite"/);
  assert.match(splash, /permissionState[\s\S]*permissionRows[\s\S]*diagnosticEvents/);
  assert.doesNotMatch(splash, /setCharge|nextCharge|startedAt[\s\S]*1400/);
});

contract("reduced motion freezes the procedural field without losing state", () => {
  assert.match(shader, /prefers-reduced-motion:\s*reduce/);
  assert.match(shader, /motionQuery\.matches/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*\.sdf-seal-splash/);
});

contract("gate renders authored black stars and four colliding radial wave fields", () => {
  for (const token of [
    "starField",
    "radialFront",
    "radialFractal",
    "kaleidoscopeDomain",
    "electricBlueWave",
    "bloodRedWave",
    "neonRedWave",
    "nuclearAmberWave",
    "phaseNegation",
  ]) {
    assert.ok(shader.includes(token), `missing authored gate shader token: ${token}`);
  }
  for (const token of ["#00A3FF", "#8A0303", "#FF073A", "#FFB000"]) {
    assert.ok(shader.includes(token), `missing authored radial color token: ${token}`);
  }
  assert.match(shader, /vec3\s+color\s*=\s*vec3\(0\.0/);
  assert.match(shader, /smoothstep\(8\.0,\s*42\.0,\s*uTime\)/);
  assert.doesNotMatch(shader, /waveRibbon|ribbonNoise/);
  assert.doesNotMatch(splash, /sdf-art-dome|sdf-dome-tile|sdf-dome-shell/);
  assert.match(css, /\.sdf-seal-splash \.sdf-render-button[\s\S]{0,900}background:\s*#39ff14/i);
  assert.match(css, /\.sdf-seal-splash[\s\S]{0,240}background:\s*#0[0-9a-f]{5}/i);
});

if (process.exitCode) process.exit(process.exitCode);
console.log("polar-gate contract passed: 5 checks");
