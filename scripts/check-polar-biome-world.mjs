import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as THREE from "three";
import {
  BIOME_WEIGHT_EXPONENT,
  FRAMED_NEIGHBOR_SHARE_CAP,
  FRAMED_NEIGHBOR_SHARE_FLOOR,
  POLAR_BIOME_ORDER,
  POLAR_BIOME_PROFILES,
  POLAR_BIOME_QUALITY,
  POLAR_BIOME_SHADER_POLICY,
  POLAR_BIOME_FRAGMENT_SHADER,
  POLAR_BIOME_VERTEX_SHADER,
  amplifyBiomeColorLumaPreserving,
  clampCombinedBiomeInfluence,
  computeLocalBiomeInfluence,
  resolveNearestWeather,
  resolveLocalWorldOwnership,
  resolveTwoNearestBiomes,
} from "../lib/polar-biome-fields.js";
import { solvePolarCameraComposition } from "../lib/polar-camera-composition.js";
import { STATION_WORLD_SCHEMA } from "../lib/polar-station-world.js";
import {
  POLAR_CONTACT_RADIUS_SCALE,
  POLAR_GROUND_PEAK,
  POLAR_PROP_CONTACT_COUNT,
  polarGroundHeight,
} from "../lib/polar-ground.js";

const root = process.cwd();
const source = readFileSync(join(root, "components", "PolarBiomeWorld.jsx"), "utf8");
const dressingSource = readFileSync(
  join(root, "components", "AdaptivePolarWorldDressing.jsx"),
  "utf8",
);
assert.match(
  dressingSource,
  /STATION_DRESSING_BAND_POLICY[\s\S]*"observatory-plaque"[\s\S]*expeditionObjects: true[\s\S]*sastrugi: true[\s\S]*"s2-kernel-core"[\s\S]*expeditionObjects: false[\s\S]*sastrugi: false/,
  "Observatory dressing must retain expedition snow objects while S2 remains a clean scientific environment",
);
assert.match(
  dressingSource,
  /placementAllowedForStation[\s\S]*STATION_DRESSING_BAND_POLICY[\s\S]*visiblePlacements = placements\.filter/,
  "station dressing policy must be enforced before instance upload",
);
const artifactsSource = readFileSync(
  join(root, "components", "IglooArtifacts.jsx"),
  "utf8",
);
const sceneSource = readFileSync(join(root, "components", "IglooScene.jsx"), "utf8");
const worldSource = readFileSync(join(root, "components", "IglooWorld.jsx"), "utf8");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const stationIds = [
  "observatory-plaque",
  "s2-kernel-core",
  "manifold-reactor",
  "field-chamber-coils",
  "qpu-ice-bridge",
  "upstream-radio-mast",
  "topology-archive-wall",
  "assembly-tool-locker",
];

assert.deepEqual(POLAR_BIOME_ORDER, stationIds);
assert.equal(BIOME_WEIGHT_EXPONENT, 2.2);
assert.ok(Object.isFrozen(POLAR_BIOME_PROFILES));
assert.ok(Object.values(POLAR_BIOME_PROFILES).every(Object.isFrozen));

const biomeIdentityContract = {
  "observatory-plaque": {
    personality: "cyan-white Antarctic frost sanctuary",
    particleFamily: "ice-crystal-snow",
    atmosphereKind: "antarctic-frost-snow-ice",
    forbiddenClimate: "warm-wash",
  },
  "s2-kernel-core": {
    personality: "clean-room cryogenic science",
    particleFamily: "sterile-pressure-prisms",
    atmosphereKind: "cern-cryogenic-clean-room",
  },
  "manifold-reactor": {
    personality: "abyss-blue and living-gold primordial chapel",
    particleFamily: "aether-votive-motes",
    atmosphereKind: "abyss-blue-living-gold-aether",
  },
  "field-chamber-coils": {
    personality: "graphite thermal plasma forge",
    particleFamily: "thermal-plasma-refraction",
    atmosphereKind: "graphite-thermal-plasma-heat-haze",
    forbiddenClimate: "ice",
  },
  "qpu-ice-bridge": {
    personality: "alien jade-cyan interference field",
    particleFamily: "quantized-interference-motes",
    atmosphereKind: "alien-jade-cyan-interference",
  },
  "upstream-radio-mast": {
    personality: "coral radio-signal uplink",
    particleFamily: "coral-signal-pulses",
    atmosphereKind: "coral-radio-propagation",
  },
  "topology-archive-wall": {
    personality: "magenta archive canyon",
    particleFamily: "laminar-archive-strata",
    atmosphereKind: "magenta-archive-canyon",
  },
  "assembly-tool-locker": {
    personality: "purple-lit basalt computational archaeology",
    particleFamily: "ochre-glyph-dust",
    atmosphereKind: "egyptian-basalt-ochre-computational-archaeology",
  },
};

for (const [id, identity] of Object.entries(biomeIdentityContract)) {
  const profile = POLAR_BIOME_PROFILES[id];
  assert.equal(profile.personality, identity.personality, `${id} personality drifted`);
  assert.equal(
    profile.particleFamily,
    identity.particleFamily,
    `${id} particle family drifted`,
  );
  assert.equal(profile.atmosphere.kind, identity.atmosphereKind, `${id} atmosphere drifted`);
  assert.equal(
    profile.atmosphere.coordinateSpace,
    "continuous-world-xz",
    `${id} atmosphere must use a continuous XZ envelope`,
  );
  assert.equal(profile.atmosphere.colors.length, 2, `${id} needs a bounded two-color atmosphere`);
  assert.ok(
    profile.atmosphere.particleStrength >= 0 && profile.atmosphere.particleStrength <= 1,
    `${id} particle strength must remain bounded`,
  );
  if (identity.forbiddenClimate) {
    assert.equal(
      profile.forbiddenClimate,
      identity.forbiddenClimate,
      `${id} forbidden climate guard drifted`,
    );
  }
}

const plaqueParticleStrength =
  POLAR_BIOME_PROFILES["observatory-plaque"].atmosphere.particleStrength;
assert.equal(
  plaqueParticleStrength,
  Math.max(
    ...Object.values(POLAR_BIOME_PROFILES).map(
      ({ atmosphere }) => atmosphere.particleStrength,
    ),
  ),
  "Plaque must own the strongest Antarctic frost/snow/ice particle field",
);

const exactProfiles = {
  "observatory-plaque": {
    angle: 12,
    center: [-3, 1],
    dock: [-7.26, 2.99],
    radii: [10.5, 7, 2.6],
    palette: ["#F2D3A8", "#D7E6F5", "#A9C9C4", "#5CC9C2", "#93B4A6", "#F2B96B", "#232E52"],
    geography: "sastrugi-melt-ribbon",
  },
  "s2-kernel-core": {
    angle: 38,
    center: [3, 8],
    dock: [1.99, 10.61],
    radii: [8.5, 5.5, 1.8],
    palette: ["#B7D6EC", "#7FB9DE", "#6FA8C9", "#5573E0", "#A5E9FF", "#232E52"],
    geography: "voronoi-pressure-ridge-parhelion",
  },
  "manifold-reactor": {
    angle: -27,
    center: [-14, -6],
    dock: [-12.45, -3.67],
    radii: [8.8, 5.8, 1.9],
    palette: ["#020711", "#07152F", "#0B2A56", "#2D6FA3", "#FFD05A", "#FFF1B8"],
    geography: "ribbon-cavern-isocontours",
  },
  "field-chamber-coils": {
    angle: 74,
    center: [-10, -9],
    dock: [-6.79, -8.24],
    radii: [9.2, 6.2, 2.2],
    palette: ["#F5E3B0", "#EFC15C", "#F5C044", "#EE9440", "#7FA8C0", "#40312F"],
    geography: "salt-pan-field-lines",
  },
  "qpu-ice-bridge": {
    angle: -48,
    center: [17, -13],
    dock: [20, -14.6],
    radii: [9.4, 6.4, 2.4],
    palette: ["#BCE4D4", "#8FCDB2", "#55CE85", "#36D8FF", "#6FA8C9", "#24443F"],
    geography: "sea-ice-lead-interference",
  },
  "upstream-radio-mast": {
    angle: 19,
    center: [14, 12],
    dock: [14.59, 9.26],
    radii: [9, 6, 2],
    palette: ["#E5B9AC", "#E08A87", "#E8705E", "#55CE85", "#6FB0A9", "#3F3547"],
    geography: "aurora-signal-ridge",
  },
  "topology-archive-wall": {
    angle: 61,
    center: [11, -8],
    dock: [8.53, -10.47],
    radii: [9.4, 6.3, 2.3],
    palette: ["#E3C6D6", "#C9A3BF", "#E25AA0", "#8D69D6", "#7FB3AF", "#453043"],
    geography: "strata-barcode-cliff",
  },
  "assembly-tool-locker": {
    angle: -9,
    center: [-16, 2],
    dock: [-18.98, 1.67],
    radii: [8.7, 5.8, 2.1],
    palette: ["#080713", "#151024", "#2A1B4A", "#6D4BE8", "#A78BFA", "#F2B96B", "#F2ECFF"],
    geography: "runway-knurl-yard",
  },
};

for (const [id, exact] of Object.entries(exactProfiles)) {
  const profile = POLAR_BIOME_PROFILES[id];
  assert.equal(profile.angleDegrees, exact.angle, `${id} angle drifted`);
  assert.deepEqual(profile.centerXZ, exact.center, `${id} center drifted`);
  assert.deepEqual(profile.dockXZ, exact.dock, `${id} dock drifted`);
  assert.deepEqual(
    [profile.radii.far, profile.radii.approach, profile.radii.dock],
    exact.radii,
    `${id} proximity radii drifted`,
  );
  assert.deepEqual(profile.palette, exact.palette, `${id} palette drifted`);
  assert.equal(profile.geography, exact.geography, `${id} geography identity drifted`);
  for (const fieldKey of [
    "centerXZ",
    "radius",
    "falloff",
    "accent",
    "shadow",
    "weatherVector",
  ]) {
    assert.ok(
      Object.hasOwn(profile, fieldKey),
      `${id} local field is missing ${fieldKey}`,
    );
  }
  assert.equal(
    profile.radius,
    profile.radii.far,
    `${id} local radius must match Rfar`,
  );
  assert.ok(
    profile.falloff > 0 && profile.falloff < 1,
    `${id} falloff must be reversed-edge smoothstep safe`,
  );
  assert.equal(
    profile.accent,
    profile.colors.accent,
    `${id} accent must have one authored source`,
  );
  assert.match(
    profile.shadow,
    /^#[0-9A-F]{6}$/i,
    `${id} shadow must be an explicit color`,
  );
  assert.equal(profile.weatherVector.length, 2, `${id} weather vector must stay in XZ`);
  assert.ok(
    Math.abs(Math.hypot(...profile.weatherVector) - 1) < 0.002,
    `${id} weather vector must be normalized`,
  );
}

for (const profile of Object.values(POLAR_BIOME_PROFILES)) {
  const inner = computeLocalBiomeInfluence(profile, profile.centerXZ);
  const outer = computeLocalBiomeInfluence(profile, [
    profile.centerXZ[0] + profile.radius,
    profile.centerXZ[1],
  ]);
  assert.equal(
    inner.influence,
    1,
    `${profile.geography} center must own its local field`,
  );
  assert.equal(
    outer.influence,
    0,
    `${profile.geography} must end at its local radius`,
  );
}
assert.equal(clampCombinedBiomeInfluence([0.72, 0.61]), 1);
assert.ok(
  Math.abs(clampCombinedBiomeInfluence([0.18, 0.24]) - 0.42) < 1e-12,
);

assert.equal(
  new Set(Object.values(POLAR_BIOME_PROFILES).map(({ fieldKind }) => fieldKind)).size,
  8,
  "all eight zones need a distinct authored field kind",
);
assert.equal(
  new Set(Object.values(POLAR_BIOME_PROFILES).map(({ weather }) => weather.kind)).size,
  8,
  "all eight zones need distinct bounded weather behavior",
);

const plaqueDock = exactProfiles["observatory-plaque"].dock;
const atPlaque = resolveTwoNearestBiomes(plaqueDock);
assert.equal(atPlaque.primary.id, "observatory-plaque");
assert.equal(atPlaque.entries.length, 2);
assert.ok(atPlaque.primary.weight > atPlaque.secondary.weight);
assert.ok(
  Math.abs(
    atPlaque.primary.weight + atPlaque.secondary.weight + atPlaque.neutralWeight - 1
  ) < 1e-10,
);
assert.equal(atPlaque.secondary.weight, 0, "an out-of-Rfar neighbor must not receive invented ambient weight");

assert.equal(FRAMED_NEIGHBOR_SHARE_CAP, 0.28);
assert.equal(FRAMED_NEIGHBOR_SHARE_FLOOR, 0.04);
for (const id of stationIds) {
  const ownership = resolveLocalWorldOwnership(exactProfiles[id].dock);
  assert.equal(ownership.current?.id, id, `${id} must own its dock region`);
  assert.ok(
    ownership.blend.primary.weight >= ownership.blend.totalInfluence * 0.72 - 1e-10,
    `${id} must dominate its local authored energy`,
  );
  assert.ok(ownership.visibleStationIds.length <= 2, `${id} may frame at most one neighbor`);
  assert.equal(ownership.visibleStationIds[0], id);
  assert.ok(
    !ownership.visibleStationIds.some((visibleId) => /igloo/i.test(visibleId)),
    `${id} local ownership must not leak an igloo owner`,
  );
}

for (const id of stationIds) {
  const exclusive = resolveLocalWorldOwnership([900, -900], null, {
    exclusiveStationId: id,
  });
  assert.equal(exclusive.current?.id, id, `${id} must fully own its docked scene`);
  assert.equal(exclusive.framedNeighbor, null, "a docked scene cannot frame another station");
  assert.deepEqual(exclusive.visibleStationIds, [id]);
  assert.equal(exclusive.blend.primary.weight, 1);
  assert.equal(exclusive.blend.secondary.weight, 0);
  assert.equal(exclusive.blend.neutralWeight, 0);
}

const exactTie = resolveTwoNearestBiomes([0, 4.5]);
assert.ok(
  Math.abs(
    exactTie.primary.weight + exactTie.secondary.weight - exactTie.totalInfluence,
  ) < 1e-10,
);
assert.ok(exactTie.entries.every(({ weight }) => Number.isFinite(weight)));

const remoteFallback = resolveTwoNearestBiomes([900, -900]);
assert.equal(remoteFallback.primary.weight, 0, "remote terrain must not inherit a station wash");
assert.equal(remoteFallback.secondary.weight, 0);
assert.equal(remoteFallback.totalInfluence, 0);
assert.equal(remoteFallback.neutralWeight, 1, "remote terrain must retain the neutral polar base");
const remoteOwnership = resolveLocalWorldOwnership([900, -900]);
assert.equal(remoteOwnership.current, null, "remote terrain must not invent a current station");
assert.equal(remoteOwnership.framedNeighbor, null, "remote terrain must not frame a distant monument");
assert.deepEqual(remoteOwnership.visibleStationIds, []);

const overlappingFields = resolveTwoNearestBiomes([-12, -7.5]);
assert.ok(overlappingFields.totalInfluence <= 1, "overlapping local fields must remain clamped");
assert.ok(overlappingFields.neutralWeight >= 0, "overlap must not create negative neutral energy");

const reusableBlend = { entries: [{}, {}], primary: null, secondary: null };
const reusableEntries = [...reusableBlend.entries];
assert.equal(resolveTwoNearestBiomes([0, 0], reusableBlend), reusableBlend);
assert.equal(resolveTwoNearestBiomes([1, 1], reusableBlend), reusableBlend);
assert.equal(reusableBlend.entries[0], reusableEntries[0]);
assert.equal(reusableBlend.entries[1], reusableEntries[1]);

const inputColor = [0.18, 0.47, 0.82];
const proximity = 0.64;
const shown = amplifyBiomeColorLumaPreserving(inputColor, proximity);
const luma = (color) => color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722;
const expectedGain = 0.96 + 0.08 * proximity;
assert.ok(Math.abs(luma(shown) - luma(inputColor) * expectedGain) < 1e-10);
assert.ok(shown.every((channel) => channel >= 0 && channel <= 1));

assert.equal(resolveNearestWeather(atPlaque, { quality: "high" }).biomeId, "observatory-plaque");
const reusableWeather = {};
assert.equal(
  resolveNearestWeather(atPlaque, { quality: "high", target: reusableWeather }),
  reusableWeather,
);
assert.equal(resolveNearestWeather(atPlaque, { reducedMotion: true }), null);
assert.equal(resolveNearestWeather(atPlaque, { safeMode: true }), null);
assert.equal(resolveNearestWeather(atPlaque, { quality: "low" }), null);

assert.deepEqual(Object.keys(POLAR_BIOME_QUALITY), ["low", "medium", "high"]);
assert.equal(POLAR_BIOME_SHADER_POLICY.textures, 0);
assert.equal(POLAR_BIOME_SHADER_POLICY.combinedInfluenceCap, 1);
assert.equal(POLAR_BIOME_SHADER_POLICY.environmentInfluenceCap, 0.42);
assert.equal(
  POLAR_BIOME_SHADER_POLICY.localInfluence,
  "smoothstep(radius, radius * falloff, distanceXZ)",
);
assert.equal(POLAR_BIOME_SHADER_POLICY.maxCompiledPrograms, 2);
assert.equal(POLAR_BIOME_SHADER_POLICY.maxDrawCalls, 3);
assert.equal(POLAR_BIOME_SHADER_POLICY.weatherOwners, 1);
assert.equal(POLAR_BIOME_QUALITY.high.drawCalls, 3);
assert.equal(POLAR_BIOME_QUALITY.medium.drawCalls, 3);
assert.equal(POLAR_BIOME_QUALITY.low.drawCalls, 2);
assert.equal(POLAR_BIOME_QUALITY.high.geographyInstances, 32);
// Medium carries high's content on purpose. The world is fill-bound — frame time
// tracks pixel count almost exactly across the tiers — so geometry and shader
// detail are close to free while resolution is not: raising medium from 64/24/0.72
// to 96/32/1.0 left the settled frame at 14.5-14.6ms across three runs, against
// 14.5-14.9ms before, and the tier still holds. Medium and high now differ in
// resolution alone. Low keeps its reduced content, because it is the rescue tier
// and content there measured ~1.8ms, which is worth more when the frame is
// already in trouble.
// Medium carries high's content on purpose. The world is fill-bound, so geometry
// and shader detail are close to free while resolution is not: raising medium
// from 64/24/0.72 to 96/32/1.0 left the settled frame unchanged at 14.5-14.6ms
// and bought +2.9% high-frequency detail, measured paired against a frozen clock
// with the low tier unchanged in the same run as a null control. Low keeps its
// reduced content because it is the rescue tier, where content measured ~1.8ms
// and every millisecond is worth more.
assert.equal(POLAR_BIOME_QUALITY.medium.geographyInstances, 32);
assert.equal(POLAR_BIOME_QUALITY.low.geographyInstances, 0);
// LOW DRAWS NO PROPS, SO LOW MUST PAY FOR NONE. The gate that keeps the ground's
// prop loop shut is uPropField.z, and the only thing that ever opens it is the
// biome-change branch guarded by a geography mesh the low tier never builds — so
// what the uniform is BORN as is what low renders with for the whole session. A
// non-zero default here would put a 32-iteration loop on every ground fragment
// at the tier that exists because this machine cannot afford one.
assert.match(
  source,
  /uPropField: \{ value: new THREE\.Vector3\(0, 0, 0\) \}/,
  "the prop-skirt gate must default shut, which is what makes the low tier free",
);
assert.match(
  source,
  /geographyMesh\.count = 0;[\s\S]{0,300}?uPropField\.value\.z = 0;/,
  "a station with no props drawn must close the prop-skirt gate behind it",
);
assert.equal(
  (source.match(/new THREE\.InstancedMesh/g) || []).length,
  2,
  "terrain and nearest geography must share the instanced solid program",
);

for (const shader of [POLAR_BIOME_VERTEX_SHADER, POLAR_BIOME_FRAGMENT_SHADER]) {
  assert.ok(shader.includes("void main()"));
  assert.equal((shader.match(/{/g) || []).length, (shader.match(/}/g) || []).length);
}
// GROUND NEUTRALITY. The mirror of RIG_NEUTRALITY (see check-render-budget.mjs):
// station identity may TINT the snow, it may never DYE it. The regression this
// locks out is a docked station driving the terrain palette at full weight, which
// painted olive ground under the generator hall and mint lily pads under the drill
// rig. Every identity colour that reaches the ground must pass the saturation cap
// and lightness floor first, and no field may author more than a third of it.
assert.match(
  POLAR_BIOME_FRAGMENT_SHADER,
  /const float GROUND_SATURATION_CAP = 0\.10;[\s\S]*vec3 neutralizeGroundColor\(vec3 color, float saturationCap, float lightnessFloor\)[\s\S]*vec3 groundPrimaryBase = neutralizeGroundColor\(primaryBase, GROUND_SATURATION_CAP, GROUND_LIGHTNESS_FLOOR\)[\s\S]*vec3 groundPrimaryAccent = neutralizeGroundColor\(primaryAccent, GROUND_ACCENT_SATURATION_CAP, GROUND_ACCENT_LIGHTNESS_FLOOR\)/,
  "the ground must neutralize station identity colour before it reaches the snow",
);
for (const dyeSource of [
  "groundPrimaryBase",
  "groundPrimarySecondary",
  "groundPrimaryAccent",
  "groundPrimaryGlow",
  "groundSecondaryBase",
  "groundSecondarySecondary",
  "groundSecondaryAccent",
  "groundSecondaryGlow",
]) {
  assert.ok(
    POLAR_BIOME_FRAGMENT_SHADER.includes(dyeSource),
    `ground colour path bypasses the neutrality gate for ${dyeSource}`,
  );
}
assert.doesNotMatch(
  POLAR_BIOME_FRAGMENT_SHADER,
  /authoredTerrainColor\(\s*u(?:Primary|Secondary)FieldKind,\s*v(?:Primary|Secondary)Field,\s*(?:primary|secondary)Base,/,
  "authored terrain colour must be fed neutralized identity, never the raw station palette",
);
const readFieldShares = (functionName) => {
  const start = POLAR_BIOME_FRAGMENT_SHADER.indexOf(`float ${functionName}(`);
  assert.ok(start >= 0, `${functionName} is missing from the biome fragment shader`);
  const body = POLAR_BIOME_FRAGMENT_SHADER.slice(start);
  return body
    .slice(0, body.indexOf("\n}"))
    .match(/return (\d*\.?\d+);/g)
    .map((entry) => Number.parseFloat(entry.replace(/[^\d.]/g, "")));
};
{
  const authorship = readFieldShares("biomeTerrainAuthorship");
  assert.equal(authorship.length, 8, "every field must declare a terrain authorship share");
  assert.ok(
    authorship.every((share) => share <= 0.34),
    `no station may author more than a third of the ground albedo: ${authorship.join(", ")}`,
  );
  const geographyAccent = readFieldShares("biomeLocalGeographyAccent");
  assert.equal(geographyAccent.length, 8, "every field must declare an ice-prop accent whisper");
  assert.ok(
    geographyAccent.every((share) => share <= 0.08),
    `ice props take a whisper of station hue, not a dye: ${geographyAccent.join(", ")}`,
  );
}
assert.ok(
  POLAR_BIOME_FRAGMENT_SHADER.includes("vec3 iceSlab = mix(shadowIce, sunCrust,"),
  "local geography props must read as snow/ice slabs, not station-coloured pads",
);
// Colour alone does not un-pad a pad: a 0.04-tall disc on a 1.1-wide polygon is a
// lily pad whatever it is painted. The salt-crust and floe instances must keep
// real slab thickness and a heave tilt.
for (const [label, minimumThickness] of [
  ["scaleY = 0.24 + seedB * 0.30", 0.24],
  ["scaleY = 0.32 + seedB * 0.40", 0.32],
]) {
  assert.ok(
    source.includes(label),
    `ice slab instances lost their thickness (expected a >= ${minimumThickness} base scaleY)`,
  );
}
// The heave tilt itself is measured off the placed instances rather than matched
// as a source string; see PROP ORIENTATION below. A string match on the rotation
// call could not tell a heave from a typo and broke the first time the boulder
// ring gained a second rotation axis.
// Snow has to take cool shadow in the hollows and warm bounce on the crests, and
// that read is driven by the displaced surface height.
//
// This used to pin the literal `clamp((vWorldPosition.y + 0.42) / 0.42, ...)`.
// Those two constants encode a ground peak of 0.61, and nothing tied them to it:
// when the dune amplitudes were retuned the ramp silently kept normalising by
// the old range, drove far past both ends, and parked a large area of every
// trough at the floor of the hollow-shadow mix -- which is a colour-continuity
// failure, not a relief failure, so this gate reported nothing. Pinning the
// generated ramp instead means the check follows the field.
assert.ok(
  POLAR_BIOME_FRAGMENT_SHADER.includes(
    "float groundRelief = polarGroundRelief(vWorldPosition.y + 0.22);",
  ),
  "snow must take cool shadow in the hollows and warm bounce on the crests",
);
assert.ok(
  POLAR_BIOME_FRAGMENT_SHADER.includes(
    `return clamp((surfaceHeight + ${POLAR_GROUND_PEAK}) / ${Number(
      (POLAR_GROUND_PEAK * 2).toFixed(6),
    )}, 0.0, 1.0);`,
  ),
  "the relief ramp must be normalised by the ground field's own published peak",
);
// The terrain plane ships PlaneGeometry's constant up normal, so every lighting
// term on the largest surface in frame evaluates to the same number everywhere
// until the vertex stage replaces it with the ground field's own slope. Without
// this the displaced relief is geometry nothing ever lights.
assert.ok(
  POLAR_BIOME_VERTEX_SHADER.includes("localNormal = polarGroundNormal(worldPosition.xz);"),
  "the terrain must shade against the ground field's surface normal",
);
// Derivatives are not available in the WebGL1 compile-verify context; the ground
// shading must stay inside the ES 1.00 core so verify:biome-shaders keeps passing.
assert.doesNotMatch(
  POLAR_BIOME_FRAGMENT_SHADER,
  /dFdx\(|dFdy\(|fwidth\(/,
  "biome shaders must not depend on GL_OES_standard_derivatives",
);

for (const shaderIdentity of [
  "plaqueField",
  "s2PressureField",
  "aetherRibbonField",
  "magneticSaltField",
  "qpuLeadField",
  "upstreamSignalField",
  "topologyStrataField",
  "assemblyRunwayField",
]) {
  assert.ok(
    POLAR_BIOME_VERTEX_SHADER.includes(shaderIdentity),
    `vertex shader is missing authored identity ${shaderIdentity}`,
  );
}

const material = new THREE.ShaderMaterial({
  fragmentShader: POLAR_BIOME_FRAGMENT_SHADER,
  vertexShader: POLAR_BIOME_VERTEX_SHADER,
});
assert.equal(material.type, "ShaderMaterial");
material.dispose();

for (const needle of [
  "useFrame",
  "THREE.ShaderMaterial",
  "THREE.InstancedMesh",
  "resolveLocalWorldOwnership",
  "resolveNearestWeather",
  "populateGeographyInstances",
  "makeGeographyGeometryBank",
  "THREE.CapsuleGeometry",
  "THREE.DodecahedronGeometry",
  "THREE.TorusGeometry",
  "THREE.CylinderGeometry",
  "plaqueInstanceCount",
  "exclusiveStationId",
  "uPrimaryFieldKind",
  "uSecondaryFieldKind",
  "uPrimaryWeight",
  "uSecondaryWeight",
  "uPrimaryRadius",
  "uSecondaryRadius",
  "uPrimaryFalloff",
  "uSecondaryFalloff",
  "uPrimaryFogDensity",
  "uSecondaryFogDensity",
  "uPrimaryLightDirection",
  "uSecondaryLightDirection",
  "uPrimaryShadowColor",
  "uSecondaryShadowColor",
  "LOCAL_ENVIRONMENT_CAP",
  "uTravelerXZ",
  "uWeatherFieldKind",
  "scene.fog",
  "keyLightRef",
  "fillLightRef",
  "biomeDrawBudget",
  "biomeProgramBudget",
  "biomeTextureBudget",
  "biomePrimary",
  "biomeFramedNeighbor",
  "geographyMesh.count = 0",
  "<directionalLight",
  "reducedMotion",
  "safeMode",
  "visible",
]) {
  assert.ok(source.includes(needle), `PolarBiomeWorld.jsx is missing ${JSON.stringify(needle)}`);
}

// THE PROPS HAVE TO CLEAR THE SNOW.
//
// The eight local-geography layouts author a bed depth, and the layout code ran
// for a long time against a ground plane that no longer exists: the sheet now
// carries a 0.74-peak dune field and a 0.38 drift bank ringing every station.
// Placed at an absolute world Y, 117 of the 160 props stood entirely under the
// surface — at s2-kernel-core, 28 of 32 — and the only thing a docked camera
// could still see was the top facet of a body it could not read, which is why a
// ring of half-metre boulders looked like flat pale pentagons lying on a plate.
//
// A string match cannot hold this: the failure is arithmetic between two files.
// So the component's own placement function is evaluated here, out of its own
// source (no second copy of the layout numbers), against the ground field the
// terrain actually renders, and every instance is required to break the surface.
{
  // Both taken from the component verbatim: the one module constant the layout
  // reads, and the whole geometry-and-placement block it is used by.
  const degToRad = /^const DEG_TO_RAD = .*$/m.exec(source);
  assert.ok(degToRad, "PolarBiomeWorld.jsx must declare DEG_TO_RAD as a module constant");
  const placementSource = `${degToRad[0]}\n${source
    .slice(source.indexOf("function addBiomeRole"), source.indexOf("function makeUniforms"))
    .replace(/^export /gm, "")}`;
  assert.ok(
    /const MAX_GEOGRAPHY_BED_FRACTION = 0\.[1-9]/.test(placementSource),
    "the geography layout must cap how deep a body beds into the snow",
  );
  const { makeGeographyGeometryBank, populateGeographyInstances } = new Function(
    "THREE",
    "polarGroundHeight",
    `${placementSource}\nreturn { makeGeographyGeometryBank, populateGeographyInstances };`,
  )(THREE, polarGroundHeight);
  // The skirt radius law is shared with the facility casters on purpose; the
  // component cannot import it (this sandbox hands it THREE and a height field
  // and nothing else), so the two copies are checked against each other here.
  assert.equal(
    Number(/const PROP_CONTACT_RADIUS_SCALE = ([\d.]+)/.exec(placementSource)?.[1]),
    POLAR_CONTACT_RADIUS_SCALE,
    "a prop's contact skirt must reach the same footprints a facility's does",
  );
  const bank = makeGeographyGeometryBank();
  const instanceCount = POLAR_BIOME_QUALITY.medium.geographyInstances;
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const box = new THREE.Box3();
  const contacts = new Float32Array(POLAR_PROP_CONTACT_COUNT * 3);
  for (const stationId of stationIds) {
    const profile = POLAR_BIOME_PROFILES[stationId];
    const geometry = bank[profile.fieldKind];
    geometry.computeBoundingBox();
    const mesh = new THREE.InstancedMesh(geometry, null, instanceCount);
    contacts.fill(1);
    const fieldRadiusSquared = populateGeographyInstances(
      mesh,
      profile,
      instanceCount,
      contacts,
    );
    assert.ok(mesh.count > 0, `${stationId} draws a geography mesh with no instances`);
    for (let index = 0; index < mesh.count; index += 1) {
      mesh.getMatrixAt(index, matrix);
      matrix.decompose(position, quaternion, scale);
      // The transformed AABB, not boundingBox.max.y * scale.y. The boulder ring
      // tumbles about all three axes now, and the upright top of a body says
      // nothing about where a body tipped 50 degrees actually ends.
      box.copy(geometry.boundingBox).applyMatrix4(matrix);
      const clearance = box.max.y - polarGroundHeight(position.x, position.z);
      assert.ok(
        clearance > 0,
        `${stationId} geography instance ${index} is buried ${(-clearance).toFixed(3)} under the snow`,
      );
      // CONTACT SKIRTS. A prop that darkens the snow somewhere other than where
      // it stands is worse than one that darkens nothing, and a skirt narrower
      // than the body it belongs to leaves the pasted-on edge the whole thing
      // exists to remove.
      const [skirtX, skirtZ, skirtRadiusSquared] = contacts.slice(index * 3, index * 3 + 3);
      assert.ok(
        Math.abs(skirtX - position.x) < 1e-4 && Math.abs(skirtZ - position.z) < 1e-4,
        `${stationId} prop ${index} darkens snow it is not standing on`,
      );
      const skirtRadius = Math.sqrt(skirtRadiusSquared);
      const bodyRadius = Math.max(box.max.x - position.x, box.max.z - position.z);
      assert.ok(
        skirtRadius > bodyRadius && skirtRadius < bodyRadius * 3,
        `${stationId} prop ${index} skirt (${skirtRadius.toFixed(2)}) must cover its own body ` +
          `(${bodyRadius.toFixed(2)}) without becoming a wash`,
      );
      const fromFieldCenter = Math.hypot(
        position.x - profile.centerXZ[0],
        position.z - profile.centerXZ[1],
      );
      // Compared as radii rather than squares, and to a millimetre: both sides
      // of this arrive through Float32Arrays (the instance matrix and the
      // uniform), so the squares disagree in the seventh digit.
      assert.ok(
        fromFieldCenter + skirtRadius <= Math.sqrt(fieldRadiusSquared) + 1e-3,
        `${stationId} prop ${index} skirt falls outside the gate that is the only ` +
          `reason an open-field fragment does not walk the whole prop array`,
      );
    }
    // Layouts place as few as 12 bodies against a 32-slot array; a stale skirt
    // left in the tail is a shadow with nothing casting it.
    for (let index = mesh.count * 3; index < contacts.length; index += 1) {
      assert.equal(contacts[index], 0, `${stationId} left a skirt in unused prop slot ${index}`);
    }
  }

  // PROP ORIENTATION. A layout that stands every instance the same way up reads
  // as one body copied N times, whatever it is painted: the salt-crust and floe
  // slabs were lily pads until they got a heave tilt, and s2-kernel-core's ring
  // drew 32 instances of one DodecahedronGeometry turned only about Y — a
  // rotation a near-spherical solid's silhouette barely notices — so every stone
  // showed the same crest facet up. Measured off the placed instances, because a
  // source string cannot tell a heave from a typo.
  {
    const up = new THREE.Vector3(0, 1, 0);
    const bodyUp = new THREE.Vector3();
    const placedTilts = (stationId) => {
      const profile = POLAR_BIOME_PROFILES[stationId];
      const mesh = new THREE.InstancedMesh(bank[profile.fieldKind], null, instanceCount);
      populateGeographyInstances(mesh, profile, instanceCount);
      const tilts = [];
      const axes = [[], [], []];
      for (let index = 0; index < mesh.count; index += 1) {
        mesh.getMatrixAt(index, matrix);
        matrix.decompose(position, quaternion, scale);
        tilts.push(bodyUp.copy(up).applyQuaternion(quaternion).angleTo(up));
        axes[0].push(scale.x);
        axes[1].push(scale.y);
        axes[2].push(scale.z);
      }
      return { axes, mean: tilts.reduce((sum, value) => sum + value, 0) / tilts.length };
    };
    // The three slab layouts heave out of the pan and the crack; the boulder ring
    // tumbles, which is a different order of magnitude and is meant to be.
    for (const [stationId, minimumTilt] of [
      ["manifold-reactor", 0.02],
      ["field-chamber-coils", 0.05],
      ["qpu-ice-bridge", 0.06],
      ["s2-kernel-core", 0.35],
    ]) {
      const { mean } = placedTilts(stationId);
      assert.ok(
        mean > minimumTilt,
        `${stationId} stands every prop the same way up (mean tilt ${mean.toFixed(3)} rad, ` +
          `needs > ${minimumTilt})`,
      );
    }
    // Two scale axes riding one seed keeps the footprint a single family however
    // far the sizes move, which is most of why the ring read as copies.
    const { axes } = placedTilts("s2-kernel-core");
    const correlation = (a, b) => {
      const meanA = a.reduce((sum, value) => sum + value, 0) / a.length;
      const meanB = b.reduce((sum, value) => sum + value, 0) / b.length;
      let covariance = 0;
      let varianceA = 0;
      let varianceB = 0;
      for (let index = 0; index < a.length; index += 1) {
        covariance += (a[index] - meanA) * (b[index] - meanB);
        varianceA += (a[index] - meanA) ** 2;
        varianceB += (b[index] - meanB) ** 2;
      }
      return Math.abs(covariance / Math.sqrt(varianceA * varianceB));
    };
    for (const [first, second] of [
      [0, 1],
      [0, 2],
      [1, 2],
    ]) {
      const r = correlation(axes[first], axes[second]);
      assert.ok(
        r < 0.5,
        `boulder scale axes ${first} and ${second} move together (|r| ${r.toFixed(2)}), ` +
          "which keeps the footprint one family however the sizes change",
      );
    }
  }
  bank.forEach((geometry) => geometry.dispose());
}

// STATION HUE IN THE LIGHT. The rig composed key/fill from each station's
// authored lighting, but RIG_NEUTRALITY collapsed the eight docked keys into a
// 13/255 spread with two of them bit-identical (observatory-plaque and
// field-chamber-coils are both authored #FFD9A3). Identity is therefore taken
// from the accent, which the colour contract already asserts is eight-way
// distinct, and taken as hue only so the neutrality caps have nothing to undo.
{
  const identityLerp = Number(/const IDENTITY_HUE_LERP = ([\d.]+)/.exec(source)?.[1]);
  assert.ok(
    identityLerp >= 0.1 && identityLerp <= 0.22,
    `station hue must tint the rig without dyeing it (IDENTITY_HUE_LERP ${identityLerp})`,
  );
  const identityRate = Number(/const IDENTITY_TRANSITION_RATE = ([\d.]+)/.exec(source)?.[1]);
  // 3 time constants is the settle; a dock change should turn over seconds
  // rather than cut, and the rest of the rig runs an order of magnitude faster.
  const settleSeconds = 3 / identityRate;
  assert.ok(
    settleSeconds >= 1.2 && settleSeconds <= 3.5,
    `a dock change must turn the rig hue over seconds (${settleSeconds.toFixed(2)}s)`,
  );
  assert.match(
    source,
    /const identityAlpha = reducedMotion\s*\n\s*\? 1\s*\n\s*: 1 - Math\.exp\(/,
    "reduced motion must snap the station hue instead of animating a sweep",
  );
  // Hue only: saturation and lightness pass through untouched, which is what
  // keeps this term out of the exposure and out of the snow anchor ratio.
  assert.match(
    source,
    /return color\.setHSL\(\s*\n\s*\(rigHslScratch\.h \+ hueDelta \* amount \+ 1\) % 1,\s*\n\s*rigHslScratch\.s,\s*\n\s*rigHslScratch\.l,/,
    "the station tint must rotate hue only, never saturation or lightness",
  );
  assert.match(
    source,
    /if \(hueDelta > 0\.5\) hueDelta -= 1;\s*\n\s*else if \(hueDelta < -0\.5\) hueDelta \+= 1;/,
    "the station tint must take the shortest hue arc across the 0/1 seam",
  );
  // Key takes the accent, fill takes its complement: the split itself carries
  // the station, instead of both ends drifting the same way.
  assert.match(
    source,
    /tintRigHue\(\s*\n\s*environmentScratch\.keyColor,[\s\S]*?identityHueWeight,\s*\n\s*0,\s*\n\s*\);/,
    "the key must take the station's own accent hue",
  );
  assert.match(
    source,
    /tintRigHue\(\s*\n\s*environmentScratch\.fillColor,[\s\S]*?identityHueWeight,\s*\n\s*0\.5,\s*\n\s*\);/,
    "the fill must take the complement of that hue",
  );
  // Scaled by how docked we are, or the neutral polar field between stations
  // inherits whichever station happens to be nearest.
  assert.match(
    source,
    /const identityHueWeight =\s*\n\s*\(primaryEnvironmentWeight \+ secondaryEnvironmentWeight\) \* IDENTITY_HUE_LERP;/,
    "the station tint must fade out with the dock weight",
  );
  // Published on the canvas beside the biome telemetry, so a live page can be
  // asked whether the station hue actually reached the rig. Without it the only
  // way to check is to re-derive the composition offline, which is how a term
  // like this quietly stops working.
  for (const needle of ["biomeKeyColor", "biomeFillColor"]) {
    assert.ok(
      source.includes(needle),
      `PolarBiomeWorld.jsx must publish the settled rig as ${JSON.stringify(needle)}`,
    );
  }
}

for (const needle of ["dockedStationId", "exclusiveStationId"]) {
  assert.ok(sceneSource.includes(needle), `IglooScene.jsx is missing dock exclusivity ${JSON.stringify(needle)}`);
  assert.ok(worldSource.includes(needle), `IglooWorld.jsx is missing dock exclusivity ${JSON.stringify(needle)}`);
}
for (const needle of ["exclusiveStationId", "artifactsToRender", ".filter("]) {
  assert.ok(
    artifactsSource.includes(needle),
    `IglooArtifacts.jsx is missing exclusive dock rendering ${JSON.stringify(needle)}`,
  );
}
for (const forbidden of ["useTexture", "TextureLoader", "/assets/", "map:", "CanvasTexture"] ) {
  assert.ok(!source.includes(forbidden), `PolarBiomeWorld.jsx must not use ${JSON.stringify(forbidden)}`);
}
assert.ok(POLAR_BIOME_FRAGMENT_SHADER.includes("exp(-polarDistance * blendedFogDensity)"));
assert.ok(POLAR_BIOME_FRAGMENT_SHADER.includes("floor(wrappedLight * 4.0 + 0.5) / 4.0"));
// The terrain is displaced by the shared ground field, which lib/polar-ground.js
// emits into this shader from the same table its JS evaluator reads. Correctness
// of that field is check-polar-ground's job; this only pins that the terrain is
// still displaced by it rather than left flat.
assert.ok(POLAR_BIOME_VERTEX_SHADER.includes("polarGroundHeight(worldPosition.xz)"));
assert.ok(POLAR_BIOME_VERTEX_SHADER.includes("combinedLocalInfluence"));
assert.ok(POLAR_BIOME_FRAGMENT_SHADER.includes("biomeLocalColorEnvelope"));
assert.ok(POLAR_BIOME_FRAGMENT_SHADER.includes("continuousAtmosphereXZEnvelope"));
assert.ok(POLAR_BIOME_FRAGMENT_SHADER.includes("biomeAtmosphereTint"));
assert.ok(POLAR_BIOME_FRAGMENT_SHADER.includes("fieldThermalPlasmaHaze"));
assert.ok(POLAR_BIOME_FRAGMENT_SHADER.includes("neutralBlendWeight"));
assert.ok(POLAR_BIOME_FRAGMENT_SHADER.includes("boundPolarHighlights"));
assert.ok(POLAR_BIOME_FRAGMENT_SHADER.includes("clamp(color + dither, 0.03, 0.99)"));
// SKY PARITY. The shared polar sky carries curtain-physics aurora, a
// deterministic hash-cell starfield and a double-lobe dawn -- all value-only,
// all inside fill-guarded branches, zero extra programs, draws or textures.
assert.match(
  POLAR_BIOME_FRAGMENT_SHADER,
  /float macroFold = biomeFbm2\([\s\S]*float curtainFold = biomeFbm3\([\s\S]*macroFold[\s\S]*float curtainStreak = biomeFbm2\([\s\S]*float hemRim = exp\(-pow\(/,
  "aurora must keep its nested curtain folds and the bright lower-edge hem rim",
);
assert.ok(
  POLAR_BIOME_FRAGMENT_SHADER.includes("if (auroraWindow > 0.0002)"),
  "the aurora fill guard must survive the curtain elevation",
);
assert.match(
  POLAR_BIOME_FRAGMENT_SHADER,
  /if \(direction\.y > 0\.20\) \{[\s\S]*vec2 starCell = floor\(starSpace\);[\s\S]*biomeHash21\(starCell\)/,
  "the upper sky must carry the fill-guarded deterministic hash-cell starfield",
);
assert.match(
  POLAR_BIOME_FRAGMENT_SHADER,
  /vec3 dawnCore = [\s\S]*vec3 dawnBloom = /,
  "the dawn kiss must keep its warm-core plus cool-bloom double lobe",
);
assert.match(
  POLAR_BIOME_FRAGMENT_SHADER,
  /vec3\(0\.4353, 0\.9059, 0\.7843\),\s*\n\s*vec3\(0\.2824, 0\.7412, 0\.7647\),[\s\S]*vec3\(0\.5529, 0\.4118, 0\.8392\),/,
  "aurora emission ladder must band mint -> teal -> violet by altitude",
);

for (const needle of [
  "resolveLocalWorldOwnership",
  "visibleStationIds",
  "placement.anchorId",
  "localWorldDrawCalls",
  'quality === "low"',
]) {
  assert.ok(
    dressingSource.includes(needle),
    `AdaptivePolarWorldDressing.jsx is missing local ownership ${JSON.stringify(needle)}`,
  );
}
for (const needle of [
  'import PolarBiomeWorld from "./PolarBiomeWorld"',
  "<PolarBiomeWorld",
  "travelerRef={traversalPoseRef}",
  "visible={worldActive}",
  "simulationPaused={!worldActive || !renderEnabled}",
  "<AdaptivePolarWorldDressing",
  "<RetroCinematicPostProcess",
]) {
  assert.ok(sceneSource.includes(needle), `IglooScene.jsx is missing live integration ${JSON.stringify(needle)}`);
}
for (const removedOwner of [
  'import IglooTerrain from "./IglooTerrain"',
  'import PolarAtmosphereField from "./PolarAtmosphereField"',
  'import SnowAtmosphere from "./SnowAtmosphere"',
  "function PolarGradientSky()",
  "function HorizontalParallaxSignalField(",
  "<PolarGradientSky",
  "<IglooTerrain",
  "<PolarAtmosphereField",
  "<SnowAtmosphere",
  "<HorizontalParallaxSignalField",
]) {
  assert.ok(!sceneSource.includes(removedOwner), `IglooScene.jsx still mounts redundant owner ${JSON.stringify(removedOwner)}`);
}
for (const removedWorldAtmosphere of [
  "function useAtmosphereCanvas(",
  "useAtmosphereCanvas(",
  "igloo-atmosphere-canvas",
  "ATMOSPHERE_FRAME_MS",
]) {
  assert.ok(
    !worldSource.includes(removedWorldAtmosphere),
    `IglooWorld.jsx still retains redundant CPU atmosphere ${JSON.stringify(removedWorldAtmosphere)}`,
  );
}
assert.ok(
  sceneSource.indexOf("<PolarBiomeWorld") < sceneSource.indexOf("<IglooArtifacts"),
  "biome world must mount behind monument silhouettes",
);
assert.ok(
  sceneSource.indexOf("<IglooArtifacts") < sceneSource.indexOf("<RetroCinematicPostProcess"),
  "postprocess must remain the final scene layer",
);

// THE SUN AND THE KEY MUST AGREE WHERE BOTH ARE ON SCREEN.
//
// The sky paints one fixed sun and each station authors its own key, in two
// different conventions (the sky reads atan(x, -z), setLightDirection writes
// atan(x, +z), so a station azimuth A is sky bearing 180 - A). Converted to one
// convention the eight keys sat 3 to 167 degrees off the sun and nothing
// checked it, which is how six of them drifted.
//
// Six is not the defect count. A bearing can only be contradicted by a bearing
// the frame SHOWS, and the sun's azimuthal identity -- the honey/ice seam split,
// both dawn lobes, the disc -- was ablated (sunAmount forced to 0) and the eight
// frames differenced against it at medium/1440x900, with a second run of the
// same build as the null control:
//
//   station                 min |sun - framed sky|   sky delta / 255   null
//   s2-kernel-core                    0 deg              23.886       0.000
//   observatory-plaque                0 deg              17.137       0.000
//   assembly-tool-locker             19 deg              10.718       0.000
//   manifold-reactor                 46 deg               2.700       0.000
//   topology-archive-wall            63 deg               1.393       0.000
//   field-chamber-coils              86 deg               0.279       0.256  <- noise
//   qpu-ice-bridge                  127 deg               0.003       0.003  <- noise
//   upstream-radio-mast             179 deg               0.000       0.005  <- noise
//
// Three stations have NO sun in frame at the null floor, whatever their key
// bearing says, and three more show it strongly. The gap in the middle is wide
// in both columns -- 19 to 46 degrees of bearing, 10.7 to 2.7 of signal -- so
// the cutoff below sits in measured empty space rather than on a preference.
//
// The key's own bearing, by contrast, IS on screen everywhere: ablating
// polarShadowFromEllipsoid moved 10.5% to 56.5% of each station's
// run-to-run-deterministic ground pixels, peaks to 126/255. So the rule is
// one-sided. A station that frames the sun must agree with it; a station that
// does not may light itself however its identity wants.
{
  const DEG = Math.PI / 180;
  const wrap = (degrees) => Math.abs(((((degrees + 180) % 360) + 360) % 360) - 180);
  const sun = new THREE.Vector3(0.904, 0.235, -0.426).normalize();
  const sunBearing = Math.atan2(sun.x, -sun.z) / DEG;
  assert.match(
    POLAR_BIOME_FRAGMENT_SHADER,
    /vec3 sunDir = normalize\(vec3\(0\.904, 0\.235, -0\.426\)\)/,
    "the sky sun this contract measures against must be the one the shader paints",
  );
  for (const id of POLAR_BIOME_ORDER) {
    const station = STATION_WORLD_SCHEMA.stations[id];
    const { camera } = solvePolarCameraComposition({
      height: 900,
      quality: "medium",
      sealPosition: station.dock,
      station,
      width: 1440,
    });
    // The lens sits at `azimuthDegrees` from the look point and looks back at
    // it, so the optical axis points along sky bearing -azimuthDegrees.
    const halfFov =
      Math.atan(Math.tan((camera.verticalFovDegrees * DEG) / 2) * (1440 / 900)) / DEG;
    const framedSunOffset = Math.max(0, wrap(-camera.azimuthDegrees - sunBearing) - halfFov);
    if (framedSunOffset > 25) continue;
    const keyBearing = 180 - POLAR_BIOME_PROFILES[id].light.azimuth;
    assert.ok(
      wrap(keyBearing - sunBearing) <= 20,
      `${id} frames the sun (${framedSunOffset.toFixed(0)} deg outside the lens) but keys ` +
        `itself from ${wrap(keyBearing - sunBearing).toFixed(0)} deg away, so its ground ` +
        "shadow points where the sky says the sun is not",
    );
  }
}

assert.equal(packageJson.scripts["check:biome-world"], "node scripts/check-polar-biome-world.mjs");
assert.equal(
  packageJson.scripts["verify:biome-shaders"],
  "node scripts/verify-polar-biome-shader-compile.mjs",
);
// Script paths, not npm keys - the build chains node calls directly.
assert.ok(packageJson.scripts.build.includes("check-polar-biome-world.mjs"));
assert.ok(!packageJson.scripts.build.includes("verify-polar-biome-shader-compile.mjs"));
assert.equal(
  packageJson.scripts["verify:ci-browser"],
  // Second half added with scripts/verify-render-frame.mjs: compiling is not
  // rendering, and two optimisations in this branch passed every compile-side
  // contract while the world came out wrong.
  "npm run verify:biome-shaders && npm run verify:render-frame && npm run verify:station-frames",
);

console.log(
  "Polar biome world contract verified: dominant local owner plus <=1 framed neighbor, 8 continuous-XZ atmospheres, no remote geography leakage, bounded highlights, 1 weather owner, 2 programs, <=3 draws, 0 textures.",
);
