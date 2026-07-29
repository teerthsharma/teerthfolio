import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import {
  POLAR_TRAVEL_DEBRIS_CONTRACT,
  TRAVEL_DEBRIS_BUDGET,
  buildTravelDebrisSeeds,
  createWindCutFlakeGeometry,
  sampleWeightedDebrisArc,
} from "../lib/polar-travel-debris.js";

assert.deepEqual(
  Object.fromEntries(
    Object.entries(TRAVEL_DEBRIS_BUDGET).map(([quality, profile]) => [
      quality,
      profile.instances,
    ]),
  ),
  { high: 18, low: 8, medium: 12 },
  "travel debris must keep the approved 8/12/18 quality counts",
);
assert.equal(POLAR_TRAVEL_DEBRIS_CONTRACT.drawCalls, 1);
assert.equal(POLAR_TRAVEL_DEBRIS_CONTRACT.programs, 1);
assert.equal(POLAR_TRAVEL_DEBRIS_CONTRACT.textures, 0);
assert.equal(POLAR_TRAVEL_DEBRIS_CONTRACT.reducedMotionInstances, 0);

for (const hex of POLAR_TRAVEL_DEBRIS_CONTRACT.palette) {
  const color = new THREE.Color(hex);
  const luma = color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
  assert.ok(luma >= 0.72, `${hex} must remain bright frost rather than near-black debris`);
}

const seeds = buildTravelDebrisSeeds("high");
assert.equal(seeds.length, 18);
assert.deepEqual(
  seeds,
  buildTravelDebrisSeeds("high"),
  "the debris pool must be deterministic for identical quality and seed",
);
assert.ok(
  new Set(seeds.map((seed) => seed.phase.toFixed(4))).size >= 16,
  "pooled flakes need varied deterministic phases rather than a confetti clump",
);
assert.ok(
  seeds.every(
    (seed) =>
      seed.mass >= 0.32 &&
      seed.mass <= 1 &&
      seed.scale >= 0.045 &&
      seed.scale <= 0.12,
  ),
  "every flake must carry a bounded mass and subtle screen-safe scale",
);

const lightSeed = { ...seeds[0], mass: 0.32, phase: 0 };
const heavySeed = { ...seeds[0], mass: 1, phase: 0 };
const movingPose = { vx: 5.8, vz: 0, x: -10, z: 8 };
const lightApex = sampleWeightedDebrisArc(lightSeed, movingPose, 0.86);
const heavyApex = sampleWeightedDebrisArc(heavySeed, movingPose, 0.86);
assert.ok(
  lightApex.y > heavyApex.y + 0.04,
  "lighter frost must lift higher than heavy fragments under the weighted ballistic arc",
);
assert.ok(
  lightApex.x < movingPose.x && heavyApex.x < movingPose.x,
  "positive-X travel must shed debris behind the seal rather than into its face",
);
const northbound = sampleWeightedDebrisArc(seeds[1], { ...movingPose, vx: 0, vz: 5.8 }, 0.86);
assert.ok(
  northbound.z < movingPose.z,
  "positive-Z travel must rotate the deterministic debris wake into the velocity frame",
);
const stationary = sampleWeightedDebrisArc(seeds[1], { ...movingPose, vx: 0, vz: 0 }, 0.86);
assert.equal(stationary.visible, false, "a stopped seal cannot leave suspended flying debris");
assert.equal(stationary.scale, 0);

const geometry = createWindCutFlakeGeometry();
geometry.computeBoundingBox();
const bounds = geometry.boundingBox;
assert.ok(geometry.attributes.position.count >= 18, "flake needs a faceted wind-cut topology");
assert.ok(
  bounds.max.z - bounds.min.z > (bounds.max.x - bounds.min.x) * 1.7,
  "shared geometry must read as a long wind-cut ice flake, not a cube",
);
assert.equal(geometry.userData.form, "faceted wind-cut frost flake");
geometry.dispose();

const [componentSource, sceneSource] = await Promise.all([
  readFile(new URL("../components/PolarTravelDebris.jsx", import.meta.url), "utf8"),
  readFile(new URL("../components/IglooScene.jsx", import.meta.url), "utf8"),
]);

assert.equal(
  componentSource.match(/<instancedMesh/g)?.length,
  1,
  "travel debris must render as exactly one instanced draw",
);
assert.equal(
  componentSource.match(/useFrame\(/g)?.length,
  1,
  "the entire pool must share one frame callback",
);
assert.doesNotMatch(componentSource, /useState|\.map\([^)]*=>\s*<mesh|<boxGeometry|BoxGeometry/);
assert.match(componentSource, /DynamicDrawUsage/);
assert.match(componentSource, /instanceMatrix\.needsUpdate\s*=\s*true/);
assert.match(componentSource, /geometry\.dispose\(\)/);
assert.match(componentSource, /material\.dispose\(\)/);
assert.match(componentSource, /dataTravelDebrisDrawCalls|travelDebrisDrawCalls/);
assert.match(componentSource, /if \(reducedMotion\) return null/);
assert.match(sceneSource, /import PolarTravelDebris from "\.\/PolarTravelDebris"/);
assert.match(sceneSource, /<PolarTravelDebris/);
assert.match(sceneSource, /traversalPoseRef=\{traversalPoseRef\}/);
assert.doesNotMatch(sceneSource, /SmashableObject|SMASHABLE_FIELD_OBJECTS/);
// PolarSmashables survives only as the scene's documented no-op compatibility
// marker; it must never regain a mounted implementation.
assert.match(sceneSource, /export function PolarSmashables\(\) \{\r?\n\s*return null;\r?\n\}/);
assert.doesNotMatch(sceneSource, /<PolarSmashables/);

console.log("polar travel debris contract passed: 18 instances / 1 draw / 1 callback / 0 textures");
