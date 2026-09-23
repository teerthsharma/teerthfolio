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

// REWRITTEN, with evidence. This block used to require nine shader tokens and four hex
// colours describing "black stars and four colliding radial wave fields" — starField,
// radialFront, kaleidoscopeDomain, electricBlueWave, bloodRedWave, neonRedWave,
// nuclearAmberWave, and #00A3FF/#8A0303/#FF073A/#FFB000. None of them exist any more.
//
// Commit a74e08b ("revamp: rebuild all 8 stations, dome interaction, shader suite,
// horizon") rewrote components/AntarcticSplashShader.jsx by 294 lines, removing two
// starField lines and adding none. The splash was deliberately redesigned from colliding
// radial waves in blood/neon red to an aurora-and-dusk polar gate. The old assertion was
// not catching a regression; it was describing a design that had been replaced.
//
// It survived because this script is an orphan — not in `npm run build`. That same commit
// message reads "Gates: all 21 build gates green", which was TRUE and incomplete: this
// contract was not one of the 21, so a deliberate rewrite silently invalidated it and
// nobody could see.
//
// Replaced with the current authored identity rather than deleted, so the block still
// guards something real: the gate is aurora-and-dusk, in the polar palette, with the
// phase-negation and star-sparkle terms the redesign kept.
contract("gate renders the authored aurora-and-dusk polar field", () => {
  for (const token of [
    "aurora",
    "duskCore",
    "amber",
    "phaseNegation",
    "starSparkle",
    "gateRing",
    "splashFbm",
  ]) {
    assert.ok(shader.includes(token), `missing authored gate shader token: ${token}`);
  }
  // Polar palette, not the old blood/neon red set: dusk navy, aether violet, ice blue,
  // ember amber. If the splash drifts back out of the world's palette this fails.
  for (const token of ["#2C3F66", "#8D69D6", "#BFD8FF", "#F2B96B"]) {
    assert.ok(shader.includes(token), `missing authored polar gate color token: ${token}`);
  }
  // The old block also required `vec3 color = vec3(0.0` — the previous design was
  // literally "authored BLACK stars" and started the accumulator at pure black. That is
  // gone with the rest of that design, and asserting it now would contradict the world's
  // own no-pure-black policy (see components/IglooScene.jsx). Removed rather than
  // rewritten: the colour tokens above already pin what the field is made of.
  assert.match(shader, /smoothstep\(8\.0,\s*42\.0,\s*uTime\)/);
  assert.doesNotMatch(shader, /waveRibbon|ribbonNoise/);
  assert.doesNotMatch(splash, /sdf-art-dome|sdf-dome-tile|sdf-dome-shell/);
  // The primary action was #39ff14 neon green under the previous splash design and is now
// a mint/violet gradient on the world's own palette — rgba(111,231,200) skyMint into
// rgba(141,105,214) aetherViolet. Asserting the neon green was asserting a design that
// commit a74e08b replaced. Pinned to the palette family rather than to one hex, because
// what matters is that the gate's one primary action stays inside the world's colour
// language, not that it is a specific gradient stop.
assert.match(
    css,
    /\.sdf-render-button[\s\S]{0,900}background:\s*linear-gradient\([\s\S]{0,160}rgba\(111,\s*231,\s*200/i,
    "the gate's primary action must stay in the world's mint/violet palette",
  )
  assert.match(css, /\.sdf-seal-splash[\s\S]{0,240}background:\s*#0[0-9a-f]{5}/i);
});

if (process.exitCode) process.exit(process.exitCode);
console.log("polar-gate contract passed: 5 checks");
