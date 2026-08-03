import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  POLAR_PARTICLE_FRAGMENT_SHADER,
  POLAR_PARTICLE_LANGUAGE,
  POLAR_PARTICLE_QUALITY,
  POLAR_PARTICLE_SOURCE_CREDIT,
  POLAR_PARTICLE_STATION_ORDER,
  POLAR_PARTICLE_VERTEX_SHADER,
  createPolarSemanticParticleAttributes,
} from "../lib/polar-semantic-particles.js";

const root = process.cwd();
const component = readFileSync(join(root, "components", "PolarSemanticParticles.jsx"), "utf8");
const scene = readFileSync(join(root, "components", "IglooScene.jsx"), "utf8");
const verifier = readFileSync(join(root, "scripts", "verify-polar-semantic-particles.mjs"), "utf8");
const world = readFileSync(join(root, "components", "IglooWorld.jsx"), "utf8");

assert.equal(POLAR_PARTICLE_STATION_ORDER.length, 8);
assert.deepEqual(Object.keys(POLAR_PARTICLE_LANGUAGE).sort(), [...POLAR_PARTICLE_STATION_ORDER].sort());
assert.match(POLAR_PARTICLE_SOURCE_CREDIT.inspiration, /Cortiz[\s\S]*Igloo/i);
assert.match(POLAR_PARTICLE_SOURCE_CREDIT.adaptation, /no GLB|no source asset/i);

const expectedQualityBudgets = Object.freeze({
  low: Object.freeze({ countPerStation: 64, total: 512 }),
  medium: Object.freeze({ countPerStation: 192, total: 1536 }),
  high: Object.freeze({ countPerStation: 512, total: 4096 }),
});
const expectedAttributeStreams = Object.freeze([
  "behaviors",
  "bounds",
  "centers",
  "colors",
  "locals",
  "seeds",
  "stations",
  "velocities",
]);
const counts = [];
for (const [quality, budget] of Object.entries(expectedQualityBudgets)) {
  const attributes = createPolarSemanticParticleAttributes(quality);
  const repeat = createPolarSemanticParticleAttributes(quality);
  assert.equal(POLAR_PARTICLE_QUALITY[quality].countPerStation, budget.countPerStation);
  assert.equal(attributes.count, budget.total);
  assert.equal(attributes.stations.length, budget.total);
  assert.equal(attributes.locals.length, budget.total * 3);
  assert.equal(attributes.bounds.length, budget.total * 3);
  assert.equal(attributes.seeds.length, budget.total * 4);
  for (const stream of expectedAttributeStreams) {
    assert.ok(attributes[stream] instanceof Float32Array, `${quality} ${stream} must be a typed attribute stream`);
    assert.deepEqual(attributes[stream], repeat[stream], `${quality} ${stream} must be deterministic`);
  }
  const stationCounts = Array.from({ length: POLAR_PARTICLE_STATION_ORDER.length }, () => 0);
  for (const stationIndex of attributes.stations) stationCounts[stationIndex] += 1;
  assert.deepEqual(
    stationCounts,
    Array.from({ length: POLAR_PARTICLE_STATION_ORDER.length }, () => budget.countPerStation),
    `${quality} must assign its per-station budget to every station`,
  );
  counts.push(budget.total);
}
assert.deepEqual(counts, [512, 1536, 4096]);

for (const stationId of POLAR_PARTICLE_STATION_ORDER) {
  const language = POLAR_PARTICLE_LANGUAGE[stationId];
  assert.ok(language.semantic.length > 24, `${stationId} must have a specific particle meaning`);
  // Facility emitter contract: every station anchors its matter to a real
  // rebuilt-facility feature, with rotated local anchors and bounded motion.
  assert.equal(language.anchor.length, 3, `${stationId} needs a local emitter anchor`);
  assert.equal(language.spread.length, 3, `${stationId} needs emitter half-extents`);
  assert.ok(Number.isFinite(language.yawDegrees), `${stationId} needs the station yaw`);
  assert.ok(language.whiten >= 0 && language.whiten <= 0.6, `${stationId} whiten stays bounded`);
  assert.ok(["box", "disc"].includes(language.emitterShape));
}
// Soft round sprite: a gaussian alpha disc, never a hard square point.
assert.match(POLAR_PARTICLE_FRAGMENT_SHADER, /exp\(-radiusSquared/);
assert.match(POLAR_PARTICLE_FRAGMENT_SHADER, /if \(radiusSquared > 1\.0\) discard;/);
// Looping lifetimes fade in and out so station matter never pops.
assert.match(POLAR_PARTICLE_VERTEX_SHADER, /lifeEnvelope/);
// The eight facility behaviors stay authored: snow, data motes, embers,
// shimmer sparks, ice chips, signal motes, frost breath, weld sparks.
for (const marker of [
  /snow motes/i,
  /data motes/i,
  /embers/i,
  /shimmer sparks/i,
  /ice chips/i,
  /signal motes/i,
  /frost breath/i,
  /weld-spark/i,
]) {
  assert.match(POLAR_PARTICLE_VERTEX_SHADER, marker);
}
assert.equal(POLAR_PARTICLE_LANGUAGE["manifold-reactor"].color, "#FFD05A");
assert.match(
  POLAR_PARTICLE_LANGUAGE["manifold-reactor"].semantic,
  /golden[\s\S]*(seed|atom)/i,
);

assert.match(component, /THREE\.NormalBlending/);
assert.match(component, /depthWrite:\s*false/);
assert.match(component, /geometry\.dispose\(\)[\s\S]*material\.dispose\(\)/);
assert.match(component, /uMotion\.value\s*=\s*reducedMotion\s*\?\s*0\s*:\s*1/);
assert.match(component, /uMorphPhase/);
assert.match(component, /enabled\s*&&\s*visible/);
assert.match(
  component,
  /semanticParticleMode\s*=\s*enabled\s*&&\s*visible\s*\?\s*"active"\s*:\s*"suspended"[\s\S]*\[enabled, geometry, gl, visible\]/,
);
assert.equal((component.match(/<points\b/g) ?? []).length, 1, "one shared particle draw");
assert.equal((component.match(/new THREE\.ShaderMaterial\(/g) ?? []).length, 1, "one particle program");
assert.doesNotMatch(component, /new THREE\.(?:Texture|CanvasTexture|DataTexture)|\b(?:alphaMap|map)\s*:/);
assert.match(
  scene,
  /function SceneDiagnostics\(\{[\s\S]*?onGpuEvent,[\s\S]*?quality,[\s\S]*?reducedMotion,[\s\S]*?\}\)[\s\S]*gl\.domElement\.dataset\.quality\s*=\s*quality[\s\S]*gl\.domElement\.dataset\.reducedMotion\s*=\s*reducedMotion\s*\?\s*"true"\s*:\s*"false"/,
);
// The opening guess must still fall back to deviceMemory and reduced motion, but
// it is no longer the first thing consulted: a returning visitor opens at the
// tier the ladder measured on their machine last time, which is a fact rather
// than a guess. The guess is what remains when there is nothing remembered, so
// this pins the fallback rather than the whole call.
assert.match(
  world,
  /setQuality\(\s*remembered\s*\?\?\s*\(memory\s*<=\s*4\s*\?\s*"low"\s*:\s*reducedMotion\s*\?\s*"medium"\s*:\s*"high"\)\s*\)/,
);
assert.match(world, /const remembered = readSettledTier\(\)/);
assert.match(world, /quality=\{safeMode\s*\?\s*"low"\s*:\s*quality\}/);
assert.match(scene, /<PolarSemanticParticles[\s\S]*enabled=\{renderEnabled\s*&&\s*worldActive\}/);
assert.match(
  verifier,
  /async function selectQuality\(page, quality, expectedCount\)[\s\S]*dataset\.quality\s*===\s*expectedQuality[\s\S]*dataset\.semanticParticleCount\s*===\s*String\(expectedCount\)/,
);
assert.doesNotMatch(verifier, /await page\.waitForTimeout\(240\)/);

console.log(`polar semantic particle contract passed (${counts.join("/")} particles, one shared draw)`);
