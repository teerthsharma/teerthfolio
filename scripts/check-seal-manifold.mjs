import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  SEAL_MANIFOLD_BASELINE,
  SEAL_MANIFOLD_INVARIANT,
  SEAL_MANIFOLD_QUALITY,
  createSealManifoldGeometry,
  inspectSealManifold,
} from "../lib/seal-manifold.js";
import {
  STATION_PERSONALITY_ORDER,
  STATION_PERSONALITY_PROFILES,
  resolveStationHaloPresentation,
} from "../lib/polar-station-personality.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const component = readFileSync(join(root, "components", "TopologicalSealMascot.jsx"), "utf8");
const scene = readFileSync(join(root, "components", "IglooScene.jsx"), "utf8");

const haloPresentations = STATION_PERSONALITY_ORDER.map((stationId) => {
  const presentation = resolveStationHaloPresentation(stationId);
  const profile = STATION_PERSONALITY_PROFILES[stationId];
  assert.equal(presentation.stationId, stationId);
  assert.equal(presentation.base, profile.halo.colors[0]);
  assert.equal(presentation.edge, profile.halo.colors[1]);
  assert.ok(Number.isFinite(presentation.tiltRadians));
  assert.ok(presentation.pulseHz >= 0);
  return presentation;
});
assert.equal(
  new Set(haloPresentations.map(({ base, edge }) => `${base}:${edge}`)).size,
  STATION_PERSONALITY_ORDER.length,
  "all eight stations need a distinct two-color seal halo",
);
assert.match(
  component,
  /resolveStationHaloPresentation\(activeArtifact\?\.id\)/,
  "the mascot must resolve every station halo from canonical personality authority",
);
assert.doesNotMatch(
  component,
  /const STATION_HALO_(?:PAIRS|AXES)/,
  "the mascot must not keep a partial hard-coded station halo table",
);

assert.equal(SEAL_MANIFOLD_BASELINE, "46-mesh primitive assembly");
assert.deepEqual(
  {
    beta0: SEAL_MANIFOLD_INVARIANT.beta0,
    beta1: SEAL_MANIFOLD_INVARIANT.beta1,
    beta2: SEAL_MANIFOLD_INVARIANT.beta2,
  },
  { beta0: 1, beta1: 0, beta2: 1 },
);

for (const [quality, profile] of Object.entries(SEAL_MANIFOLD_QUALITY)) {
  const geometry = createSealManifoldGeometry({ quality });
  const report = inspectSealManifold(geometry);

  assert.equal(report.connectedComponents, 1, `${quality}: manifold must be connected`);
  assert.equal(report.boundaryEdges, 0, `${quality}: manifold must be closed`);
  assert.equal(report.nonManifoldEdges, 0, `${quality}: each edge must have degree two`);
  assert.equal(report.eulerCharacteristic, 2, `${quality}: sphere topology must have chi=2`);
  assert.equal(report.beta0, 1, `${quality}: expected beta0=1`);
  assert.equal(report.beta1, 0, `${quality}: expected beta1=0`);
  assert.equal(report.beta2, 1, `${quality}: expected beta2=1`);
  assert.ok(report.triangles <= profile.triangleBudget, `${quality}: triangle budget exceeded`);
  assert.ok(report.bounds.x >= 1.8, `${quality}: silhouette needs a readable body axis`);
  assert.ok(report.bounds.y >= 0.88, `${quality}: raised head and dropped flipper must read at 64px`);
  assert.ok(report.bounds.z >= 0.82, `${quality}: silhouette needs lateral flipper breadth`);
  assert.equal(geometry.getAttribute("canonical").count, geometry.getAttribute("position").count);
  geometry.dispose();
}

for (const token of [
  "forwardRef",
  "useImperativeHandle",
  "createSealManifoldGeometry",
  "MeshToonMaterial",
  "seal-zone-xz",
  "SEAL_STATE_POSES",
  "idle",
  "probing",
  "moving",
  "docking",
  "error",
  "reducedMotion",
  "MAX_TRANSLATION_SPEED",
  "STATION_WORLD_SCHEMA",
  "uState",
  "seal-anime-eye-pair",
  "seal-anime-eye-highlights",
  "seal-accent-guide-halo",
  "haloMaterial.current.color.lerp",
  "sealFrontToBack",
  "sealGlumphWave",
  "uSpeed",
  "resolveStationHaloPresentation",
  "HALO_MINIMUM_OPACITY",
  "haloBreath",
]) {
  assert.ok(component.includes(token), `TopologicalSealMascot must include ${token}`);
}

assert.doesNotMatch(
  component,
  /WORLD_LOOP_LENGTH|nearestLoopedX|STATION_DEPTH_SCALE|GUIDE_OFFSET_[XZ]/,
  "topological seal must consume the canonical traversal pose without a second coordinate transform",
);
assert.match(
  component,
  /Math\.sin\(clock\.elapsedTime \* 2\.6\) \* 0\.014/,
  "the user-approved permanent breath must remain exact",
);
assert.match(
  component,
  /sealFrontToBack\s*=\s*\(1\.0\s*-\s*canonical\.x\)[\s\S]*sealGlumphWave[\s\S]*uTime\s*\*\s*9\.2/,
  "moving topology must carry a real face-to-tail glumph deformation",
);
assert.match(
  component,
  /root\.current\.position\.copy\(targetPosition\)/,
  "the seal root must follow the canonical pose directly without a second translation filter",
);
assert.match(
  component,
  /const HALO_MINIMUM_OPACITY = 0\.58;/,
  "station halos must remain clearly visible in their quietest state",
);
assert.match(
  component,
  /name="[^"]*seal-accent-guide-halo[^"]*"[\s\S]{0,220}position=\{\[0\.58, 1\.02, -0\.16\]\}/,
  "the station halo must crown the seal above its head instead of falling around its feet",
);
assert.match(
  component,
  /torusGeometry args=\{\[0\.38, 0\.026, 8, 64\]\}/,
  "the single crown halo must remain readable without becoming a ground navigation ring",
);

assert.equal(
  (component.match(/createSealManifoldGeometry\(/g) || []).length,
  1,
  "geometry must be constructed once in a memo, never per frame",
);
assert.equal(
  (component.match(/name="seal-zone-xz topological-seal-primary-surface"/g) || []).length,
  1,
  "the mascot must keep one primary surface draw",
);
assert.equal(
  (component.match(/<instancedMesh\b/g) || []).length,
  2,
  "both eyes and both highlights must use two instanced draws",
);
assert.equal(
  (component.match(/<pointLight\b/g) || []).length,
  1,
  "mascot polish must preserve the existing light without adding another",
);
assert.ok(
  component.includes("SEAL_MASCOT_ACCESSORY_DRAW_BUDGET"),
  "mascot accessory draws must remain explicit and reviewable",
);
assert.ok(
  component.includes("const continuousBreath =") &&
    !component.includes('state === "idle" ? 1 + Math.sin(clock.elapsedTime * 2.6)'),
  "the approved breathing cycle must remain active at every monument, not only in idle state",
);

for (const token of [
  'import SealAvatar from "./SealAvatar"',
  'import TopologicalSealMascot from "./TopologicalSealMascot"',
  "debugFlags.legacySeal ? SealAvatar : TopologicalSealMascot",
  "<SealMascot",
  "quality={quality}",
]) {
  assert.ok(scene.includes(token), `IglooScene must preserve topological-primary seal integration: ${token}`);
}

console.log(
  "seal manifold contract: 3 quality tiers, closed beta=(1,0,1), one primary draw, topological scene primary",
);
