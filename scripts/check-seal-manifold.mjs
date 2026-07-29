import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  SEAL_FUR_TIER_COUNT,
  SEAL_MANIFOLD_BASELINE,
  SEAL_MANIFOLD_INVARIANT,
  SEAL_MANIFOLD_QUALITY,
  createSealFurPlacements,
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

// The seal's floating crown halo is gone: the per-station anime hairstyles and
// costumes carry station identity on the body now. What survives of the station
// palette is the guide point light and the shader rim accent, so the canonical
// personality resolver still has to be the single source for that colour.
for (const stationId of STATION_PERSONALITY_ORDER) {
  const presentation = resolveStationHaloPresentation(stationId);
  const profile = STATION_PERSONALITY_PROFILES[stationId];
  assert.equal(presentation.stationId, stationId);
  assert.equal(presentation.base, profile.halo.colors[0]);
  assert.equal(presentation.edge, profile.halo.colors[1]);
  assert.ok(presentation.pulseHz >= 0);
}
assert.match(
  component,
  /resolveStationHaloPresentation\(activeArtifact\?\.id\)/,
  "the mascot must resolve the station guide accent from canonical personality authority",
);
assert.doesNotMatch(
  component,
  /const STATION_HALO_(?:PAIRS|AXES)/,
  "the mascot must not keep a partial hard-coded station accent table",
);
// The halo must not creep back: no ring geometry, no crown mesh, no opacity table.
for (const forbidden of [
  /torusGeometry/,
  /seal-crown-halo/,
  /seal-accent-guide-halo/,
  /HALO_(?:MINIMUM_OPACITY|STATE_OPACITY)/,
  /SEAL_CROWN_HALO_PROFILE/,
  /haloMesh|haloMaterial/,
]) {
  assert.doesNotMatch(
    component,
    forbidden,
    `the retired crown halo must stay retired: ${forbidden}`,
  );
}
assert.match(
  component,
  /SEAL_STATION_IDENTITY_PROFILE[\s\S]*per-station anime hairstyle plus costume wardrobe[\s\S]*no floating ring geometry/,
  "the mascot must declare that hairstyles and costumes carry station identity now",
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

  // Hairstyle anchors: deterministic hash-seeded crown sampling, tier-capped.
  // Strand budget math: each strand is one capped 5x4-segment cone (<= 45
  // triangles), so the pool adds at most 45 * 40 = 1800 triangles at high
  // tier on top of the manifold budget above; low adds at most 1260.
  const furA = createSealFurPlacements(geometry, quality);
  const furB = createSealFurPlacements(geometry, quality);
  assert.equal(furA.length, SEAL_FUR_TIER_COUNT[quality], `${quality}: anchor pool must match its tier cap`);
  assert.ok(furA.length <= 40, `${quality}: anchor pool must stay a few big strands, never a fuzz coat`);
  assert.deepEqual(furA, furB, `${quality}: hair anchor sampling must be fully deterministic`);
  for (const hair of furA) {
    assert.ok(
      hair.canonicalX >= 0.34 && hair.canonicalX <= 0.8,
      `${quality}: every strand must root on the crown/back-of-head band, never the body or face`,
    );
    assert.ok(hair.canonicalY >= 0.05, `${quality}: strands must root on the upper head only`);
    assert.ok(
      hair.lengthJitter >= 0 && hair.lengthJitter < 1,
      `${quality}: strand length jitter must stay a unit hash for per-style length ranges`,
    );
  }
  geometry.dispose();
}
assert.deepEqual(
  SEAL_FUR_TIER_COUNT,
  { low: 28, medium: 40, high: 40 },
  "hair anchor counts must stay tier-capped",
);

// Per-station hairstyle wardrobe: costume 0 (observatory home / undocked
// travel) must stay bald, and each of the seven docked styles must stay a
// small count of big shaped strands within the anchor pool.
const hairTableMatch = component.match(/SEAL_COSTUME_HAIR = Object\.freeze\(\{([\s\S]*?)\n\}\);/);
assert.ok(hairTableMatch, "the per-station SEAL_COSTUME_HAIR table must stay pinned in the mascot");
const hairTable = hairTableMatch[1];
assert.doesNotMatch(
  hairTable,
  /^\s*0:\s*Object\.freeze/m,
  "observatory costume 0 must have no hairstyle entry: sleek plain seal",
);
const hairCounts = [...hairTable.matchAll(/count:\s*(\d+)/g)].map((entry) => Number(entry[1]));
assert.equal(hairCounts.length, 7, "all seven docked stations need a hairstyle entry");
for (const styleCount of hairCounts) {
  assert.ok(
    styleCount >= 12 && styleCount <= 40,
    "each hairstyle must read as few large strands (12-40), never scattered fuzz",
  );
}
assert.match(
  hairTable,
  /count: 40, length: \[0\.2, 0\.6\], radius: \[0\.075, 0\.12\],\s*\n\s*rake: \[-0\.1, 1\.6\], flat: 1, feature: "fringe", flame: true/,
  "the s2 flame crown must use the full anchor pool with overlapping bases, never a sparse spike ring",
);
assert.match(
  hairTable,
  /tipColor: "#FFE96B", tipBias: 1/,
  "the s2 flame crown must keep its deep-amber-to-bright-gold tip gradient",
);
// Station identity map: each remapped archetype must stay pinned to its dock.
const hairEntries = Object.fromEntries(
  [...hairTable.matchAll(/(\d+): Object\.freeze\(\{([\s\S]*?)\}\),/g)].map((entry) => [
    entry[1],
    entry[2],
  ]),
);
// Identity replacement for the retired distinct-halo-pair check: the seven
// docked hairstyles must stay mutually distinguishable on their own, both as
// silhouettes and by their root-to-tip tip colour.
const hairSignatures = Object.entries(hairEntries).map(([station, body]) => {
  const field = (pattern) => pattern.exec(body)?.[1] ?? "-";
  return {
    signature: [
      field(/count:\s*(\d+)/),
      field(/feature: "([^"]*)"/),
      field(/(flame): true/),
      field(/(ponytail): true/),
      field(/rake: \[([^\]]*)\]/),
      field(/curl: \[([^\]]*)\]/),
      field(/anchorBias: "([^"]*)"/),
    ].join("|"),
    station,
    tipColor: field(/tipColor: "([^"]*)"/),
  };
});
assert.equal(hairSignatures.length, 7, "all seven docked stations need a hairstyle signature");
assert.equal(
  new Set(hairSignatures.map((entry) => entry.signature)).size,
  7,
  "all seven docked stations need a distinct hairstyle silhouette: the hair is the station identity now that the halo is gone",
);
assert.equal(
  new Set(hairSignatures.map((entry) => entry.tipColor)).size,
  7,
  "all seven docked hairstyles need a distinct tip colour so station identity still reads by colour without a halo",
);
for (const { station, tipColor } of hairSignatures) {
  assert.match(tipColor, /^#[0-9A-F]{6}$/i, `station ${station} hairstyle needs a real tip colour`);
}
for (const [station, marker, read] of [
  ["2", 'feature: "fringe"', "manifold-reactor raven rival needs face-framing bangs"],
  ["2", '"#0A0E16"', "manifold-reactor raven rival stays blue-black"],
  ["3", 'feature: "antenna"', "field-chamber needs the twin gold antenna v-tufts"],
  ["3", '"#FFD75E"', "field-chamber antenna tufts stay gold-blond"],
  ["5", "ponytail: true", "upstream-radio-mast needs the violet high ponytail"],
  ["6", 'feature: "horns"', "archive demon lord needs front-hairline horn spikes"],
  ["6", 'anchorBias: "back"', "archive mane must bias back so it never tentacles the face"],
]) {
  assert.ok(hairEntries[station]?.includes(marker), `station ${station} hairstyle: ${read}`);
}
assert.match(
  component,
  /PONYTAIL_TAIL_STRANDS/,
  "the ponytail must bake a deterministic gather-point tail column",
);
assert.match(
  component,
  /writeHairStyle\(furCoat\.current, furPlacements, null\)/,
  "the strand pool must bake to zero scale (bald) as its baseline",
);
assert.match(
  component,
  /uHairGrow\.value = !hairStyle \? 0 : toHair \? costumeBlend : 1 - costumeBlend/,
  "hair must grow in with the dock crossfade and shrink to bald on undock",
);
const manifoldLibrary = readFileSync(join(root, "lib", "seal-manifold.js"), "utf8");
assert.doesNotMatch(
  manifoldLibrary,
  /Math\.random\s*\(/,
  "seal manifold sampling must stay deterministic with no Math.random call",
);
assert.doesNotMatch(
  component,
  /Math\.random\s*\(/,
  "the mascot must stay deterministic with no Math.random call",
);

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
  "seal-anime-hairstyle-pool",
  "createSealFurPlacements",
  "SEAL_FUR_COAT_PROFILE",
  "SEAL_COSTUME_HAIR",
  "writeHairStyle",
  "uHairGrow",
  "uHairCurl",
  "uHairTipColor",
  "uHairTipBias",
  "COSTUME_DEMON_ACCENT",
  "COSTUME_EYE_STYLE",
  "SEAL_STATION_IDENTITY_PROFILE",
  "guideLight.current.color.copy",
  "sealFrontToBack",
  "sealGlumphWave",
  "uSpeed",
  "resolveStationHaloPresentation",
  "accentBreath",
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
  /accentBreath[\s\S]{0,200}stationPresentation\.pulseHz/,
  "the station pulse the halo used to show must survive on the guide light",
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
  3,
  "eyes, highlights, and the deterministic hairstyle pool must use exactly three instanced draws",
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
  "seal manifold contract: 3 quality tiers, closed beta=(1,0,1), one primary draw, deterministic crown-only station hairstyles (observatory bald) carrying station identity with no crown halo, topological scene primary",
);
