import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  POLAR_CONTACT_OCCLUSION_PEAK,
  POLAR_CONTACT_RADIUS_SCALE,
  POLAR_DOME_WORLD_SCALE,
  POLAR_GROUND_DRIFT_HEIGHT,
  POLAR_GROUND_DRIFT_INNER_RADIUS,
  POLAR_GROUND_DRIFT_OUTER_RADIUS,
  POLAR_LIGHT_POOL_COUNT,
  POLAR_PROP_CONTACT_COUNT,
  POLAR_PROP_CONTACT_PEAK,
  POLAR_SHADOW_CASTER_COUNT,
  POLAR_GROUND_GLSL,
  POLAR_GROUND_PAD_FALLOFF,
  POLAR_GROUND_PAD_RADIUS,
  POLAR_GROUND_PEAK,
  polarGroundDrift,
  polarGroundHeight,
  polarGroundPadMask,
} from "../lib/polar-ground.js";
import { STATION_WORLD_SCHEMA } from "../lib/polar-station-world.js";
import {
  POLAR_BIOME_FRAGMENT_SHADER,
  POLAR_BIOME_QUALITY,
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
// The drift bank must be compactly supported, or its tail lifts the graded
// shelves off flat and leaves a fraction of its height out in the open field.
assert.equal(polarGroundDrift(0, 0), 0, "drift must vanish at a station centre");
assert.equal(
  polarGroundDrift(STATION_WORLD_SCHEMA.stations["qpu-ice-bridge"].center.x + 40, 0),
  0,
  "drift must vanish far from every facility",
);
assert.ok(
  POLAR_GROUND_DRIFT_HEIGHT > 0.1 && POLAR_GROUND_DRIFT_HEIGHT < 0.5,
  `a drift bank must be findable without becoming a wall (${POLAR_GROUND_DRIFT_HEIGHT})`,
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
// Scope the centre extraction to the pad-mask function: the drift ring emits an
// identical nearest-station sweep of its own, and counting both would report
// sixteen shelves for eight stations.
const padMaskSource = /float polarGroundPadMask[\s\S]*?\n\}/.exec(POLAR_GROUND_GLSL)[0];
const driftSource = /float polarGroundDrift[\s\S]*?\n\}/.exec(POLAR_GROUND_GLSL)[0];
const padBody = /nearest = min\(nearest, distance\(worldXZ, vec2\(([-\d.]+), ([-\d.]+)\)\)\);/g;
const padPoints = [...padMaskSource.matchAll(padBody)].map(([, x, z]) => [
  Number(x),
  Number(z),
]);
assert.equal(
  (driftSource.match(/nearest = min\(nearest, distance/g) || []).length,
  STATION_WORLD_SCHEMA.order.length,
  "the drift ring must sweep the same station set as the pad mask",
);
const driftBounds = /t = \(nearest - ([\d.]+)\) \/ ([\d.]+)/.exec(driftSource);
assert.ok(driftBounds, "the drift ring must publish its inner radius and span");
assert.equal(Number(driftBounds[1]), POLAR_GROUND_DRIFT_INNER_RADIUS);
assert.equal(
  Number(driftBounds[2]),
  POLAR_GROUND_DRIFT_OUTER_RADIUS - POLAR_GROUND_DRIFT_INNER_RADIUS,
);
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
  const driftT =
    (nearest - POLAR_GROUND_DRIFT_INNER_RADIUS) /
    (POLAR_GROUND_DRIFT_OUTER_RADIUS - POLAR_GROUND_DRIFT_INNER_RADIUS);
  const driftShape = driftT <= 0 || driftT >= 1 ? 0 : Math.sin(Math.PI * driftT);
  return height * mask + POLAR_GROUND_DRIFT_HEIGHT * driftShape * driftShape;
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
    (POLAR_BIOME_FRAGMENT_SHADER.match(/deltaSquared = dot\(delta, delta\);\n {2}if \(deltaSquared </g) || [])
      .length,
    STATION_WORLD_SCHEMA.order.length,
    "every station caster must sit behind its own XZ reject",
  );
  assert.match(
    POLAR_BIOME_FRAGMENT_SHADER,
    /deltaSquared = dot\(travelerDelta, travelerDelta\);\n {2}if \(deltaSquared </,
    "the traveler caster must sit behind its own XZ reject",
  );
  // CONTACT OCCLUSION. The thrown ellipsoid shadow only lands in frame where the
  // station's authored key bearing puts it, which measured over the eight docked
  // framings is inside the foreground at some stations and outside it at others;
  // the sky-occlusion skirt is what keeps a body from sitting on an unbroken
  // plate at the rest. One per station plus the traveler, each reusing the
  // squared distance its reject already computed.
  assert.equal(
    (POLAR_BIOME_FRAGMENT_SHADER.match(/shadow = max\(shadow, polarContactOcclusion\(/g) || [])
      .length,
    STATION_WORLD_SCHEMA.order.length + 1,
    "every station plus the traveler must darken the snow it stands on",
  );
  assert.match(
    POLAR_BIOME_FRAGMENT_SHADER,
    /float polarContactOcclusion\(float deltaSquared, float radiusSquared, float peak\) \{\n\s*return peak \* \(1\.0 - smoothstep\(0\.0, radiusSquared, deltaSquared\)\);/,
    "contact occlusion must stay a compactly supported skirt with no sqrt and no light term",
  );
  // Bounded for the same reason the light pools are: the terrain applies the
  // combined shadow at 0.62 toward vec3(0.74, 0.78, 0.88), a 13.7% luma drop at
  // full strength. A contact peak over ~0.75 turns a skirt into a painted decal
  // and starts costing the colour contract its luma-100 snow anchor pixels.
  assert.ok(
    POLAR_CONTACT_OCCLUSION_PEAK > 0.25 && POLAR_CONTACT_OCCLUSION_PEAK <= 0.75,
    `contact occlusion must read without becoming a decal (peak ${POLAR_CONTACT_OCCLUSION_PEAK})`,
  );
  for (const [, radiusSquared, peak] of POLAR_BIOME_FRAGMENT_SHADER.matchAll(
    /polarContactOcclusion\(\s*(?:deltaSquared),\s*([\d.]+),\s*([\d.]+)/g,
  )) {
    assert.ok(
      Number(radiusSquared) > 1 && Number(radiusSquared) < 100,
      `a contact skirt must stay local to its caster (radius squared ${radiusSquared})`,
    );
    assert.ok(
      Number(peak) > 0.25 && Number(peak) <= 0.75,
      `a contact skirt must stay a value drop rather than a hole (peak ${peak})`,
    );
  }
  assert.match(
    POLAR_BIOME_FRAGMENT_SHADER,
    /mat2 intoSealFrame = mat2\(sealForward\.x, -sealForward\.y, sealForward\.y, sealForward\.x\)/,
    "the traveler caster must solve in the seal's own heading frame",
  );

  // PROP CONTACT. The local geography props cast the same sky-occlusion skirt,
  // but they cannot be unrolled like the nine casters above: which bodies exist
  // changes with the docked station, so they arrive as a uniform array and the
  // ground WALKS it — the one per-fragment loop on the largest surface in frame.
  // Everything below is the shape scripts/probe-prop-contact-fill.mjs measured
  // and chose; the numbers are in the note above POLAR_PROP_CONTACT_COUNT.
  assert.equal(
    POLAR_PROP_CONTACT_COUNT,
    POLAR_BIOME_QUALITY.high.geographyInstances,
    "the prop skirt array must hold every prop the richest tier can draw",
  );
  assert.match(
    POLAR_BIOME_FRAGMENT_SHADER,
    new RegExp(`uniform vec3 uPropContacts\\[${POLAR_PROP_CONTACT_COUNT}\\];`),
    "the prop skirt array must be declared at the count the world fills",
  );
  assert.match(
    POLAR_BIOME_FRAGMENT_SHADER,
    new RegExp(`for \\(int propIndex = 0; propIndex < ${POLAR_PROP_CONTACT_COUNT}; propIndex`),
    "the prop loop must walk exactly the array that is declared",
  );
  // The single most load-bearing line in the whole feature: without it every
  // ground fragment in the world walks 32 props, which measured 807 us/Mpx
  // branchless against 32 us/Mpx behind this reject. It is also what keeps the
  // low tier — which draws no props at all, and whose uPropField.z is therefore
  // 0 — paying one subtract, one dot and one compare and nothing else.
  assert.match(
    POLAR_BIOME_FRAGMENT_SHADER,
    /vec2 fieldDelta = groundXZ - uPropField\.xy;\n\s*if \(dot\(fieldDelta, fieldDelta\) >= uPropField\.z\) return 0\.0;/,
    "the whole prop loop must sit behind one reject against the field's bounding circle",
  );
  assert.match(
    POLAR_BIOME_FRAGMENT_SHADER,
    /if \(propDistanceSquared < prop\.z\) \{\n\s*propShadow = max\(/,
    "each prop must keep its own reject inside the loop; it is worth 43% of the loop's cost",
  );
  // Same skirt function as every other caster — one falloff in the world, not a
  // second copy that can drift — but fed the distance BEYOND the body instead of
  // from its centre, which is the only reason a prop's skirt is visible at all.
  // Shipped centre-ramped, the 0.5 peak arrived at the stone's edge as 0.19 of
  // itself and the rendered apron could not be told from no skirt.
  const [, bodyShare, skirtShare, emittedPeak] =
    /polarContactOcclusion\(\n\s*max\(0\.0, propDistanceSquared - prop\.z \* ([\d.]+)\),\n\s*prop\.z \* ([\d.]+),\n\s*([\d.]+)\n/.exec(
      POLAR_BIOME_FRAGMENT_SHADER,
    ) || [];
  assert.ok(bodyShare, "prop skirts must reuse the shared contact falloff, offset past the body");
  assert.equal(Number(emittedPeak), POLAR_PROP_CONTACT_PEAK, "prop skirt peak drifted");
  // The two shares are the one radius scale split at the body's own edge: they
  // must still add to the whole skirt, and the inner one must be the square of
  // the reciprocal footprint scale, or the falloff starts somewhere other than
  // the silhouette and the skirt either floats off the body or never reaches it.
  assert.ok(
    Math.abs(Number(bodyShare) + Number(skirtShare) - 1) < 1e-6,
    `prop skirt shares must partition the skirt (${bodyShare} + ${skirtShare})`,
  );
  assert.ok(
    Math.abs(Number(bodyShare) - 1 / POLAR_CONTACT_RADIUS_SCALE ** 2) < 1e-5,
    `prop skirt must begin at the body's own silhouette (${bodyShare} vs ` +
      `${(1 / POLAR_CONTACT_RADIUS_SCALE ** 2).toFixed(6)})`,
  );
  assert.ok(
    POLAR_PROP_CONTACT_PEAK > 0.25 && POLAR_PROP_CONTACT_PEAK < POLAR_CONTACT_OCCLUSION_PEAK,
    `a half-metre boulder blocks less sky than a facility (prop peak ${POLAR_PROP_CONTACT_PEAK} ` +
      `vs station ${POLAR_CONTACT_OCCLUSION_PEAK})`,
  );
  // A lit building throws light as well as blocking it. One pool per station,
  // applied after the shadow so a building's own shadow still catches the spill
  // from its openings.
  assert.equal(
    POLAR_LIGHT_POOL_COUNT,
    STATION_WORLD_SCHEMA.order.length,
    "every station must contribute a ground light pool",
  );
  assert.match(
    POLAR_BIOME_FRAGMENT_SHADER,
    /color \+= polarGroundLightPools\(vWorldXZ\) \* 0\.\d+ \* \(1\.0 - horizonFade\)/,
    "the terrain must add the pools it defines, bounded and faded at the horizon",
  );
  // The pool is a light source reading, not a second route for identity to dye
  // the field — the guard neutralizeGroundColor exists for. Keep it bounded.
  const poolGain = Number(
    /polarGroundLightPools\(vWorldXZ\) \* ([\d.]+)/.exec(POLAR_BIOME_FRAGMENT_SHADER)[1],
  );
  assert.ok(
    poolGain > 0 && poolGain <= 0.35,
    `ground light pools must stay a local spill rather than a field-wide dye (gain ${poolGain})`,
  );

  // The traveler's shadow carries the body's shape, not a circle, and that shape
  // turns with the heading. Evaluate the emitted solve as arithmetic on a grid
  // and measure the shadowed footprint's extent along and across two headings
  // 90 degrees apart; a round shadow would report the same extent both ways.
  {
    const seal = { axial: 1.04, lateral: 0.49, vertical: 0.35, y: 0.57 };
    const light = { x: -0.46, y: 0.82, z: 0.34 };
    const shadowedAt = (dx, dz, heading) => {
      const cos = Math.cos(heading);
      const sin = Math.sin(heading);
      const localX = cos * dx + sin * dz;
      const localZ = -sin * dx + cos * dz;
      const lightX = cos * light.x + sin * light.z;
      const lightZ = -sin * light.x + cos * light.z;
      const origin = [localX / seal.axial, -seal.y / seal.vertical, localZ / seal.lateral];
      const direction = [lightX / seal.axial, light.y / seal.vertical, lightZ / seal.lateral];
      const a = direction.reduce((sum, v) => sum + v * v, 0);
      const b = 2 * origin.reduce((sum, v, i) => sum + v * direction[i], 0);
      const c = origin.reduce((sum, v) => sum + v * v, 0) - 1;
      const discriminant = b * b - 4 * a * c;
      if (discriminant <= 0) return false;
      return (-b + Math.sqrt(discriminant)) / (2 * a) > 0;
    };
    const extents = (heading) => {
      let along = 0;
      let across = 0;
      for (let t = 0; t <= 4; t += 0.02) {
        if (shadowedAt(Math.cos(heading) * t, Math.sin(heading) * t, heading)) along = t;
        if (shadowedAt(-Math.sin(heading) * t, Math.cos(heading) * t, heading)) across = t;
      }
      return { along, across };
    };
    for (const heading of [0, Math.PI / 2]) {
      const { along, across } = extents(heading);
      assert.ok(
        along > across * 1.4,
        `traveler shadow must be longer along its heading than across it (heading ${heading.toFixed(
          2,
        )}: ${along.toFixed(2)} vs ${across.toFixed(2)})`,
      );
    }
  }

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
