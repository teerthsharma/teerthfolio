import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  POLAR_DOME_WORLD_SCALE,
  POLAR_SHADOW_CASTER_COUNT,
  POLAR_GROUND_GLSL,
  POLAR_GROUND_PAD_FALLOFF,
  POLAR_GROUND_PAD_RADIUS,
  POLAR_GROUND_PEAK,
  polarGroundHeight,
  polarGroundPadMask,
} from "../lib/polar-ground.js";
import { STATION_WORLD_SCHEMA } from "../lib/polar-station-world.js";
import {
  POLAR_BIOME_FRAGMENT_SHADER,
  POLAR_BIOME_VERTEX_SHADER,
} from "../lib/polar-biome-fields.js";

// One surface, two evaluators. The GLSL is generated from the same table the JS
// reads, so this gate's job is to prove the generation is actually wired up —
// that nothing reintroduced a hand-written shader copy — and then to evaluate
// the emitted GLSL as arithmetic and confirm it agrees with the JS pointwise.

assert.match(
  POLAR_BIOME_VERTEX_SHADER,
  /float polarGroundHeight\(vec2 worldXZ\)/,
  "the terrain vertex shader must carry the generated ground field",
);
assert.equal(
  (POLAR_BIOME_VERTEX_SHADER.match(/float polarGroundHeight\(/g) || []).length,
  1,
  "the ground field must be defined exactly once in the terrain shader",
);
assert.match(
  POLAR_BIOME_VERTEX_SHADER,
  /worldPosition\.y \+= polarGroundHeight\(worldPosition\.xz\);/,
  "the terrain must be displaced by the shared ground field",
);
assert.doesNotMatch(
  POLAR_BIOME_VERTEX_SHADER,
  /polarMacroHeight/,
  "the retired GPU-only macro height must not come back alongside the shared field",
);

const fieldsSource = readFileSync(join(process.cwd(), "lib", "polar-biome-fields.js"), "utf8");
assert.match(
  fieldsSource,
  /\$\{POLAR_GROUND_GLSL\}/,
  "the shader must interpolate the generated field rather than restate it",
);

// Every station stands on a graded shelf, or its fixed-Y plinth floats over a
// trough / buries itself in a crest.
for (const id of STATION_WORLD_SCHEMA.order) {
  const { center } = STATION_WORLD_SCHEMA.stations[id];
  assert.equal(
    Math.abs(polarGroundHeight(center.x, center.z)),
    0,
    `${id} must stand on flat ground`,
  );
  assert.equal(polarGroundPadMask(center.x, center.z), 0, `${id} pad must be fully flat`);
}
assert.ok(
  POLAR_GROUND_PAD_RADIUS >= 4 && POLAR_GROUND_PAD_FALLOFF >= 4,
  "station shelves must be wide enough to hold a facility and its approach",
);

// Relief has to be findable next to a 4.5-unit building and small enough that
// the seal's authored clearance still reads as contact.
assert.ok(
  POLAR_GROUND_PEAK >= 0.45 && POLAR_GROUND_PEAK <= 0.9,
  `ground relief must be visible without breaking contact (peak ${POLAR_GROUND_PEAK})`,
);
let openFieldPeak = 0;
for (let x = -29; x <= 29; x += 0.5) {
  for (let z = -29; z <= 29; z += 0.5) {
    openFieldPeak = Math.max(openFieldPeak, Math.abs(polarGroundHeight(x, z)));
  }
}
assert.ok(
  openFieldPeak > 0.3,
  `the open field must actually undulate, sampled peak ${openFieldPeak}`,
);

// Evaluate the emitted GLSL as arithmetic and compare it to the JS pointwise.
// A hand-edit to either side that breaks the correspondence fails here.
const glslToJs = POLAR_GROUND_GLSL.replace(/\bfloat\b|\bvec2\b/g, "")
  .replace(/distance\(worldXZ, \(([^)]*)\)\)/g, "Math.hypot(x - ($1s0), y - ($1s1))");
const padBody = /nearest = min\(nearest, distance\(worldXZ, vec2\(([-\d.]+), ([-\d.]+)\)\)\);/g;
const padPoints = [...POLAR_GROUND_GLSL.matchAll(padBody)].map(([, x, z]) => [
  Number(x),
  Number(z),
]);
assert.equal(
  padPoints.length,
  STATION_WORLD_SCHEMA.order.length,
  "the emitted pad mask must carry one centre per station",
);
const termBody = /height \+= ([-\d.]+) \* sin\(([-\d.]+) \* worldXZ\.x \+ ([-\d.]+) \* worldXZ\.y \+ ([-\d.]+)\);/g;
const terms = [...POLAR_GROUND_GLSL.matchAll(termBody)].map(([, a, ax, az, phase]) => ({
  amplitude: Number(a),
  ax: Number(ax),
  az: Number(az),
  phase: Number(phase),
}));
assert.ok(terms.length >= 3, "the emitted field must carry its dune terms");
assert.equal(
  Number(terms.reduce((sum, term) => sum + term.amplitude, 0).toFixed(10)),
  Number(POLAR_GROUND_PEAK.toFixed(10)),
  "emitted amplitudes must sum to the published peak",
);
void glslToJs;

const smoothstepJs = (edge0, edge1, value) => {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};
const evaluateEmitted = (x, z) => {
  let nearest = Infinity;
  for (const [px, pz] of padPoints) nearest = Math.min(nearest, Math.hypot(x - px, z - pz));
  const mask = smoothstepJs(
    POLAR_GROUND_PAD_RADIUS,
    POLAR_GROUND_PAD_RADIUS + POLAR_GROUND_PAD_FALLOFF,
    nearest,
  );
  let height = 0;
  for (const term of terms) {
    height += term.amplitude * Math.sin(term.ax * x + term.az * z + term.phase);
  }
  return height * mask;
};

let worstDelta = 0;
for (let x = -29; x <= 29; x += 0.37) {
  for (let z = -29; z <= 29; z += 0.41) {
    worstDelta = Math.max(worstDelta, Math.abs(evaluateEmitted(x, z) - polarGroundHeight(x, z)));
  }
}
assert.ok(
  worstDelta < 1e-9,
  `the emitted shader field and the JS field must be the same surface (worst delta ${worstDelta})`,
);

// The hero shadow is solved against the dome's own lattice scaled into the
// world, and lib/ cannot import the component that owns that scale. Parse it and
// fail if the mirrored constant drifts.
{
  const domeSource = readFileSync(
    join(process.cwd(), "components", "PolarObservatoryDome.jsx"),
    "utf8",
  );
  const componentScale = Number(/worldScale: ([\d.]+)/.exec(domeSource)[1]);
  assert.equal(
    componentScale,
    POLAR_DOME_WORLD_SCALE,
    "lib/polar-ground.js must mirror OBSERVATORY_MACRO_SCALE_PROFILE.worldScale",
  );
  // The solver must be emitted into the terrain fragment shader and actually
  // applied, or the hero stands on the snow casting nothing.
  assert.equal(
    (POLAR_BIOME_FRAGMENT_SHADER.match(/float polarHeroShadow\(/g) || []).length,
    1,
    "the hero shadow solver must be defined exactly once in the terrain shader",
  );
  assert.match(
    POLAR_BIOME_FRAGMENT_SHADER,
    /heroShadow = polarHeroShadow\(/,
    "the terrain must apply the hero shadow it defines",
  );
  // Every facility casts, not just the hero. One emitted ellipsoid test per
  // station, each behind its own XZ reject so an open-field fragment pays eight
  // dot products rather than eight ray solves.
  assert.equal(
    POLAR_SHADOW_CASTER_COUNT,
    STATION_WORLD_SCHEMA.order.length,
    "every station must contribute a ground shadow caster",
  );
  // Eight stations plus the traveler.
  assert.equal(
    (POLAR_BIOME_FRAGMENT_SHADER.match(/shadow = max\(shadow, polarShadowFromEllipsoid/g) || [])
      .length,
    STATION_WORLD_SCHEMA.order.length + 1,
    "the terrain shader must solve one ellipsoid per station plus the traveler",
  );
  assert.equal(
    (POLAR_BIOME_FRAGMENT_SHADER.match(/if \(dot\(delta, delta\) </g) || []).length,
    STATION_WORLD_SCHEMA.order.length,
    "every station caster must sit behind its own XZ reject",
  );
  assert.match(
    POLAR_BIOME_FRAGMENT_SHADER,
    /if \(dot\(travelerDelta, travelerDelta\) </,
    "the traveler caster must sit behind its own XZ reject",
  );
  // The traveler's shadow has to ride the same surface the traveler rides, or it
  // slides off the body as the seal crosses a dune.
  assert.match(
    POLAR_BIOME_FRAGMENT_SHADER,
    /\+ polarGroundHeight\(uTravelerXZ\)/,
    "the traveler caster must sit on the shared ground field",
  );
}

console.log(
  `polar ground contract passed: one field, peak ${POLAR_GROUND_PEAK.toFixed(2)}, ${padPoints.length} station shelves, GPU/CPU agree to ${worstDelta.toExponential(1)}`,
);
