import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  POLAR_DOME_INTERACTION_PROFILE,
  POLAR_DOME_LATTICE_COUNTS,
  POLAR_DOME_LATTICE_TIERS,
} from "../lib/polar-dome-lattice.js";

const root = process.cwd();
const domeSource = readFileSync(join(root, "components", "PolarObservatoryDome.jsx"), "utf8");

for (const requiredContract of [
  "DOME_CONTINUOUS_DRAW_CALL_PROFILE",
  "legacyHighPanelMeshCallsRemoved: 208",
  "legacyLowPanelMeshCallsRemoved: 104",
  "continuousShellCalls: 1",
  "ribCalls: 1",
  "airlockShellCalls: 1",
  "airlockDoorCalls: 1",
  "plinthCalls: 2",
  "shellBlockInstanceCalls: 1",
  "airlockBlockInstanceCalls: 1",
  "lowVisibleCalls: 6",
  "lowShadowMapCalls: 2",
  "fullVisibleCalls: 8",
  "fullShadowMapCalls: 1",
  "maxFullFrameCalls: 8",
  "DOME_INSTANCED_CONSTRUCTION_PROFILE",
  "shellBlocksByQuality: Object.freeze({",
  "high: POLAR_DOME_LATTICE_COUNTS.high.visibleCells",
  "medium: POLAR_DOME_LATTICE_COUNTS.medium.visibleCells",
  "jointGapRatio: Object.freeze({ azimuthal: 0.035, course: 0.045 })",
  "DOME_TEXTURE_POLICY",
  "zero image textures",
  "DOME_LOW_XZ_FRAGMENT_PROFILE",
  "DOME_WEIGHTED_CONTACT_PROFILE",
  "displacementLimit: POLAR_DOME_INTERACTION_PROFILE.maxDisplacement",
  "angularLimitRadians: 0.012",
  "dampingRatio: POLAR_DOME_INTERACTION_PROFILE.dampingRatio",
]) {
  assert.ok(domeSource.includes(requiredContract), `dome performance contract is missing ${requiredContract}`);
}

for (const requiredImplementation of [
  "mergeGeometries",
  "ContinuousDomeTopology",
  "ContinuousDomeIceMaterial",
  "createLatticeSkeletonGeometry",
  "domeFbmLowpass3",
  "domeIceNoise3",
  "domeMortar",
  "domeBevelBand",
  "fwidth(domeJointDistance)",
  "IntegratedAirlock",
  "InstancedDomeBlocks",
  "InstancedAirlockBlocks",
  "RoundedBoxGeometry",
  "setMatrixAt",
  "instanceFrost",
  "instanceMass",
  "instanceDelay",
  "instanceHover",
  "NeutralContactPlinth",
  "uDomeImpact",
  "geometry.dispose()",
  "vDomeWorldPosition.xz",
]) {
  assert.ok(domeSource.includes(requiredImplementation), `dome batching implementation is missing ${requiredImplementation}`);
}

assert.ok(
  /ContinuousDomeTopology[\s\S]*sphereGeometry[\s\S]*ContinuousDomeIceMaterial/.test(domeSource),
  "the hero shell must be one continuous procedural sphere topology",
);

assert.ok(
  /createLatticeSkeletonGeometry[\s\S]*appendSkeletonTube[\s\S]*mergeGeometries/.test(domeSource),
  "structural ribs must be continuous curves merged into one draw call",
);

assert.deepEqual(
  [
    POLAR_DOME_LATTICE_TIERS.high.radialRibs,
    POLAR_DOME_LATTICE_TIERS.medium.radialRibs,
    POLAR_DOME_LATTICE_TIERS.low.radialRibs,
  ],
  [8, 6, 4],
  "ribs must remain bounded at 8/6/4",
);
assert.ok(/for \(const rib of lattice\.ribs\)/.test(domeSource), "the merged skeleton must consume the bounded lattice ribs");
assert.ok(/DOME_FULL_QUALITY[\s\S]*domeFbmLowpass3/.test(domeSource), "noise must stay behind the full-quality compile gate");
// Every tier draws the masonry, low included. The quality ladder steps down to
// low on any machine that cannot hold 60fps at high, so gating the blocks on
// medium/high made the frame-rate target and the building's identity mutually
// exclusive: low rendered a painted dome with course lines on it. Low draws its
// own 32-cell lattice against high's 75, in the same one instanced draw, which
// the draw-call assertions above still hold to.
assert.ok(
  /<InstancedDomeBlocks/.test(domeSource),
  "every tier must build the shell from real instanced blocks",
);
assert.ok(
  !/tier !== "low"\s*&&\s*\(\s*<InstancedDomeBlocks/.test(domeSource),
  "the instanced construction must not be gated away from the low tier again",
);
assert.ok(/for \(const cell of lattice\.visibleCells\)[\s\S]*blocks\.push/.test(domeSource), "every visible generated lattice cell must create one tangible block instance");
assert.ok(/function stepWeightedContact[\s\S]*stepPolarDomeSpring\([\s\S]*state\.displacement = THREE\.MathUtils\.clamp/.test(domeSource), "contact must use the shared analytic near-critical spring instead of direct transform mapping");
assert.ok(!/domeImpactWave|impact \* 0\.018/.test(domeSource), "impact must never elastically deform or directly offset the shell");
assert.ok(!/CurvedDomeTile|DomeTile|DomeBrickFaceMaterial|useDomeBrickTextureBundle/.test(domeSource), "the dome must not rebuild shader courses as individual meshes");
assert.ok(!/useTexture|\/assets\/pbr/i.test(domeSource), "the continuous dome must not load image textures");

assert.equal(
  POLAR_DOME_INTERACTION_PROFILE.dampingRatio,
  1,
  "the architectural return must remain critically damped",
);
assert.ok(
  POLAR_DOME_LATTICE_COUNTS.medium.visibleCells >
    POLAR_DOME_LATTICE_COUNTS.low.visibleCells &&
    POLAR_DOME_LATTICE_COUNTS.high.visibleCells >
      POLAR_DOME_LATTICE_COUNTS.medium.visibleCells,
  "generated shell detail must scale monotonically by quality tier",
);

console.log(
  `Dome performance contract passed: ${POLAR_DOME_LATTICE_COUNTS.medium.visibleCells}/${POLAR_DOME_LATTICE_COUNTS.high.visibleCells} tangible medium/high shell blocks in one draw, one instanced airlock draw, <=8 full-tier submissions, zero textures.`,
);
