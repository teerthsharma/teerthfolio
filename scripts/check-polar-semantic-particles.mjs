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

assert.equal(POLAR_PARTICLE_STATION_ORDER.length, 8);
assert.deepEqual(Object.keys(POLAR_PARTICLE_LANGUAGE).sort(), [...POLAR_PARTICLE_STATION_ORDER].sort());
assert.match(POLAR_PARTICLE_SOURCE_CREDIT.inspiration, /Cortiz[\s\S]*Igloo/i);
assert.match(POLAR_PARTICLE_SOURCE_CREDIT.adaptation, /no GLB|no source asset/i);

const counts = [];
for (const quality of ["low", "medium", "high"]) {
  const attributes = createPolarSemanticParticleAttributes(quality);
  const expected = POLAR_PARTICLE_QUALITY[quality].countPerStation * 8;
  assert.equal(attributes.count, expected);
  assert.equal(attributes.stations.length, expected);
  assert.equal(attributes.locals.length, expected * 3);
  assert.equal(attributes.bounds.length, expected * 3);
  assert.equal(attributes.seeds.length, expected * 4);
  counts.push(expected);
}
assert.deepEqual(counts, [96, 224, 448]);

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
assert.match(scene, /<PolarSemanticParticles[\s\S]*enabled=\{renderEnabled\s*&&\s*worldActive\}/);

console.log(`polar semantic particle contract passed (${counts.join("/")} particles, one shared draw)`);
