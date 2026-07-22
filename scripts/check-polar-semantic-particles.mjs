import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  POLAR_PARTICLE_LANGUAGE,
  POLAR_PARTICLE_QUALITY,
  POLAR_PARTICLE_SOURCE_CREDIT,
  POLAR_PARTICLE_STATION_ORDER,
  createPolarSemanticParticleAttributes,
} from "../lib/polar-semantic-particles.js";

const root = process.cwd();
const component = readFileSync(join(root, "components", "PolarSemanticParticles.jsx"), "utf8");
const scene = readFileSync(join(root, "components", "IglooScene.jsx"), "utf8");
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
  assert.ok(attributes.centers instanceof Float32Array);
  assert.ok(attributes.colors instanceof Float32Array);
  assert.ok(attributes.locals instanceof Float32Array);
  assert.ok(attributes.seeds instanceof Float32Array);
  assert.deepEqual(attributes.locals, repeat.locals, `${quality} attributes must be deterministic`);
  assert.deepEqual(attributes.seeds, repeat.seeds, `${quality} seeds must be deterministic`);
  counts.push(budget.total);
}
assert.deepEqual(counts, [512, 1536, 4096]);

for (const stationId of POLAR_PARTICLE_STATION_ORDER) {
  const semantic = POLAR_PARTICLE_LANGUAGE[stationId].semantic;
  assert.ok(semantic.length > 24, `${stationId} must have a specific particle meaning`);
}
assert.equal(POLAR_PARTICLE_LANGUAGE["manifold-reactor"].color, "#FFD05A");
assert.match(
  POLAR_PARTICLE_LANGUAGE["manifold-reactor"].semantic,
  /golden[\s\S]*(seed|atom)/i,
);

assert.match(component, /THREE\.AdditiveBlending/);
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
  /function SceneDiagnostics\(\{ onGpuEvent, quality, reducedMotion \}\)[\s\S]*gl\.domElement\.dataset\.quality\s*=\s*quality[\s\S]*gl\.domElement\.dataset\.reducedMotion\s*=\s*reducedMotion\s*\?\s*"true"\s*:\s*"false"/,
);
assert.match(world, /setQuality\(memory\s*<=\s*4\s*\?\s*"low"\s*:\s*reducedMotion\s*\?\s*"medium"\s*:\s*"high"\)/);
assert.match(world, /quality=\{safeMode\s*\?\s*"low"\s*:\s*quality\}/);
assert.match(scene, /<PolarSemanticParticles[\s\S]*enabled=\{renderEnabled\s*&&\s*worldActive\}/);

console.log(`polar semantic particle contract passed (${counts.join("/")} particles, one shared draw)`);
