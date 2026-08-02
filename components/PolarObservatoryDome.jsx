"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  DOME_XZ_COLOR_ZONES,
  POLAR_PALETTE,
  POLAR_XZ_NOISE_GLSL,
  POLAR_XZ_SHADER_POLICY,
} from "../lib/polar-art-direction";
import { STATION_PERSONALITY_PROFILES } from "../lib/polar-station-personality";
import {
  POLAR_DOME_AIRLOCK,
  POLAR_DOME_INTERACTION_PROFILE,
  POLAR_DOME_LATTICE_COUNTS,
  POLAR_DOME_LATTICE_GEOMETRY,
  POLAR_DOME_LATTICE_TIERS,
  computePolarDomeInteractionWeight,
  createPolarDomeLattice,
  stepPolarDomeSpring,
} from "../lib/polar-dome-lattice";

export const DOME_PANEL_ROWS = POLAR_DOME_LATTICE_TIERS.medium.ringCount;
export const DOME_RIB_COUNT = POLAR_DOME_LATTICE_TIERS.high.radialRibs;
export const DOME_TILE_COLUMNS_BY_ROW =
  POLAR_DOME_LATTICE_COUNTS.medium.ringColumns;
export const DOME_LATTICE_COUNTS_BY_QUALITY = POLAR_DOME_LATTICE_COUNTS;
export const DOME_COLLISION_MODE =
  "intact by default; contact drives a heavy bounded root recoil and tiny optical signal, never course deformation; a real seal ram above the knock threshold detaches the bricks nearest the contact point and repeated rams demolish the shell into a rubble field that auto-rebuilds";
export const DOME_WEIGHTED_CONTACT_PROFILE = Object.freeze({
  angularLimitRadians: 0.012,
  dampingRatio: POLAR_DOME_INTERACTION_PROFILE.dampingRatio,
  displacementLimit: POLAR_DOME_INTERACTION_PROFILE.maxDisplacement,
  mass: 1.8,
  naturalFrequency: POLAR_DOME_INTERACTION_PROFILE.naturalFrequency,
  response: "near-critical heavy architecture recoil; no elastic surface wobble",
});
export const DOME_POINTER_LIFT_PROFILE = Object.freeze({
  heroLiftMeters: 0.15,
  neighborFalloff: "geodesic-normal",
  approachResponse: 18,
  recoveryResponse: 12,
});
// igloo.inc-style suspension: shell courses hover off the inner weather shell with
// visible gaps. Motion follows the mined igloo.inc model: a coherent traveling
// azimuthal wave (one breathing shell, not independent jitter), a dissipating
// pointer splat wake (uSplatCoords ring buffer, gaussian falloff, exponential
// decay), and a bottom-up staggered materialize on world-stream reveal. All
// displacement is additive along the same local +Z (outward normal) axis as the
// pointer hover lift; the base course (weight ~= 0) stays seated on the plinth
// and reduced motion pins wave and wake amplitudes to zero while the static
// suspension gaps remain and the materialize is pinned complete.
export const DOME_FLOAT_PROFILE = Object.freeze({
  axis: "local outward normal (+Z), additive with brickHoverLift",
  courseWeight: "smoothstep(0.08, 0.85, normalizedBrickHeight)",
  materialize: Object.freeze({
    margin: 0.55,
    order: "normalizedBrickHeight bottom-up; base course lands first, crown last",
    scaleFrom: 0.62,
    slideInLocal: 0.55,
    window: 0.45,
  }),
  proximityStirGain: 0.5,
  reducedMotion:
    "wave and wake amplitudes pinned to zero, materialize pinned complete; static suspension gaps remain",
  // Tight igloo.inc lay: courses nearly touch with thin dark seams; the old 0.045
  // read as separate floating boxes.
  suspensionGapRadiusRatio: 0.015,
  wake: Object.freeze({
    amplitudeRangeLocal: Object.freeze([0.03, 0.1]),
    decayTauSeconds: 0.9,
    minSplatDistanceLocal: 0.25,
    minSplatIntervalMs: 90,
    sigmaLocal: 0.55,
    splatCount: 8,
  }),
  wave: Object.freeze({
    amplitudes: Object.freeze([0.02, 0.007]),
    angularWavenumber: 3,
    frequenciesHz: Object.freeze([0.09, 0.178]),
    model:
      "traveling azimuthal wave (k crests around the dome Y axis) plus a small deterministic hash shimmer; one cohesive breathing shell",
  }),
});
export const DOME_TILE_FALL_PROFILE = Object.freeze({
  detachThreshold: 0.68,
  damping: 1.8,
  gravity: -4.6,
  groundFriction: 6.5,
  settleBounce: 0.18,
  // Local-Y rest height for a knocked-loose block: half a course thickness above the
  // plinth, so detached bricks come to rest ON the snow instead of hovering.
  settleFloorY: 0.085,
  settleVelocity: 0.08,
  response: "damped gravity detachment with a soft settle while docked",
});
// The dome's own reaction is a continuous function of seal distance, never the
// authored dock point: one ramp drives the seam/rim emissive breath, the lattice rib
// glow, the airlock threshold light, and whether pointer lift is live. The station
// docking contract (data-docked-station, station schema, traversal) is untouched.
export const DOME_PROXIMITY_RESPONSE_PROFILE = Object.freeze({
  contactRadius: 3.2,
  falloff: "1 - smoothstep(nearRadius, farRadius, contactDistance); continuous, no dock-point binary",
  // The scene unmounts the dome past OBSERVATORY_DOME_DEPARTURE_DISTANCE (7.2), so the
  // ramp spans exactly the band where the dome is on screen: 0 at the edge of its own
  // world, 1 where the traversal collider parks the seal against the shell.
  farRadius: 7.4,
  hoverEnableRamp: 0.12,
  nearRadius: 3.4,
  thresholdLightGain: 0.55,
});
// Seal ram -> brick knock-off. The ram signal is the traversal collision impulse
// (impactSequence / lastImpactStrength) already bridged into impactPulse; the dome
// projects the seal's world position onto its own ellipsoid to find the contact
// point and detaches the bricks nearest it using DOME_TILE_FALL_PROFILE gravity.
// Tumble is deterministic: every angle, spin, and lateral kick is hashed from the
// brick index. No Math.random, no audio, no new draw calls.
export const DOME_RAM_KNOCK_PROFILE = Object.freeze({
  contactHeightLocal: 0.42,
  damageReachGain: 1.5,
  hash: "deterministic sin/fract hash of the brick index; never Math.random",
  knockRadiusLocal: 1.15,
  lateralMetresPerSecond: 0.9,
  maxBricksPerRam: 18,
  minStrength: 0.26,
  tumbleSpinRadiansPerSecond: 2.4,
});
// Damage is a live fraction of detached shell bricks. Past the collapse fraction the
// remaining shell gives way, the inner weather shell hides, and the buried entry
// cache underneath is exposed. After a cooldown the shell re-lays itself through the
// existing bottom-up uBrickReveal materialize choreography - one animation system.
export const DOME_DEMOLITION_PROFILE = Object.freeze({
  collapseFraction: 0.38,
  damageModel: "detachedShellBricks / totalShellBricks; runtime only, resets on reload",
  rebuildCooldownSeconds: 5.5,
  rebuildSeconds: 1.9,
  reducedMotion: "detached bricks vanish and reappear at zero scale; no tumble, no gravity",
  reveals: "the buried entry cache: mined public-corpus crates, the warm hearth, and the plaque core",
});
export const OBSERVATORY_ENTRY_CACHE_PROFILE = Object.freeze({
  drawBudget: "one merged vertex-colored draw that takes the hidden inner weather shell's slot",
  meaning:
    "the home dome is built on top of its own evidence: knock the shell down and the mined public corpus, the warm hearth, and the plaque core are what is underneath",
  visibility: "only while the shell is demolished",
});
export const OBSERVATORY_MACRO_SCALE_PROFILE = Object.freeze({
  domeHeightInSealHeights: 3.8,
  dockedViewportWidthRange: Object.freeze([0.42, 0.68]),
  worldScale: 1.58,
});
export const DOME_INTACT_SHELL_PROFILE =
  "one continuous inner weather shell plus real lattice-instanced crystalline blocks on medium/high; no image or texture-faked masonry";
export const DOME_ANIME_ICE_PROFILE =
  "bright anime-soft ivory ice, blue-grey recessed joints, restrained XZ tint fields, and neutral contact shadow";
export const DOME_XZ_SHADER_PROFILE =
  "world-XZ palette geography with local ellipsoid construction coordinates and derivative-lit relief";
export const DOME_LOW_XZ_FRAGMENT_PROFILE =
  "zero stochastic samples and zero displacement on low; analytic courses and fwidth joint anti-aliasing remain";
export const DOME_CRYSTAL_GROWTH_PROFILE =
  "four-octave low-pass macro ice growth at gain 0.35 plus subtle micro frost on medium and high";
export const DOME_BRICK_SHADER_PROFILE =
  "deterministic staggered lattice cells, tangent-frame block instances, recessed seams, bevel light, per-cell frost variation, and weight-ramped suspended float courses driven by one traveling azimuthal wave, a dissipating pointer splat wake, and a bottom-up stream materialize";
export const DOME_TEXTURE_POLICY =
  "zero image textures: geometry, masonry, frost, tint, and optics are generated from math";
export const DOME_INSPIRATION_CREDIT =
  "Material and construction-language study inspired by Igloo Inc.; all geometry and shader code here is original.";
export const DOME_CONTINUOUS_DRAW_CALL_PROFILE = Object.freeze({
  legacyHighPanelMeshCallsRemoved: 208,
  legacyLowPanelMeshCallsRemoved: 104,
  continuousShellCalls: 1,
  ribCalls: 1,
  airlockShellCalls: 1,
  airlockDoorCalls: 1,
  plinthCalls: 2,
  shellBlockInstanceCalls: 1,
  airlockBlockInstanceCalls: 1,
  // The buried entry cache is only drawn while the shell is demolished, and the inner
  // weather shell it reveals is hidden for exactly that window: the swap is draw-neutral.
  entryCacheCalls: 1,
  entryCacheReplaces: "continuousShellCalls",
  lowVisibleCalls: 6,
  lowShadowMapCalls: 2,
  fullVisibleCalls: 8,
  // One instanced shadow draw for the course blocks. It was zero, which meant
  // the hero building cast nothing at the tier that renders it best: the dark
  // patch under the dome was contact shading, not a shadow, and the courses
  // could not shade each other. One instanced submission of ~77 rounded boxes
  // buys both, and the shell keeps its own casting off so this stays one draw.
  fullShadowMapCalls: 1,
  maxFullFrameCalls: 8,
});
export const DOME_INSTANCED_CONSTRUCTION_PROFILE = Object.freeze({
  airlockBlockDraws: 1,
  courseCounts: DOME_TILE_COLUMNS_BY_ROW,
  courseCountsByQuality: Object.freeze({
    high: POLAR_DOME_LATTICE_COUNTS.high.ringColumns,
    medium: POLAR_DOME_LATTICE_COUNTS.medium.ringColumns,
  }),
  shellBlocksByQuality: Object.freeze({
    high: POLAR_DOME_LATTICE_COUNTS.high.visibleCells,
    medium: POLAR_DOME_LATTICE_COUNTS.medium.visibleCells,
  }),
  imageTextures: 0,
  jointGapRatio: Object.freeze({ azimuthal: 0.035, course: 0.045 }),
  shellBlockDraws: 1,
  strategy: "one curved tapered block topology, shared-lattice tangent frames, weighted hover, anime-indigo inner weather shell",
});
export const DOME_AWARD_ICE_PROFILE = Object.freeze({
  caps: "ivory wind-packed frost on the upward face",
  contact: "soft blue-grey architectural grounding",
  facets: "derivative crystalline micro-normal with seeded per-block response",
  optics: "wrapped anime key, cyan internal transmission, restrained Fresnel rim",
  palette: Object.freeze(["ivory", "frost-cyan", "sage", "warm-door-refraction"]),
  seams: "3-5% frost-filled blue-grey joints; never black voids",
  tunnel: "recessed cyan shell, warm-neutral block surround, separated inner door",
});
const OBSERVATORY_PERSONALITY = STATION_PERSONALITY_PROFILES["observatory-plaque"];
// Glacial ice-glass override: the observatory personality surface family (#CBDCD2 /
// #A9C9C4) reads sage-olive once multiplied under the warm dusk key, so the hero dome
// authors its own desaturated pale glacial white-blue family instead of inheriting
// station upholstery. The world grade amplifies saturation downstream, so the face
// band stays near-monochrome (#D9E6F5 / #C4D6EC / #B7C9E2) to land as serious frosted
// glass rather than toy primary blue.
export const DOME_CRYSTAL_PALETTE = Object.freeze({
  contactBlueGrey: "#4B5665",
  frostIvory: "#D9E6F5",
  iceBlue: "#B7C9E2",
  seamBlueGrey: "#6C7D91",
  subsurfaceCyan: "#AFD6D0",
  windCap: "#F0F5FA",
});
export const DOME_CRYSTAL_MATERIAL_CONTRACT =
  "bright anime-soft crystalline ice; recessed blue-grey frost seams; hairline seam recesses; scene-lit body with near-zero base emissive; bounded contact-weight optics";
export const OBSERVATORY_HOME_WORLD_PROFILE =
  "crystalline-articulated-observatory in a cyan-white Antarctic frost sanctuary with sunrise-gold entrance/contact light";
export const OBSERVATORY_HOME_LIGHT_PROFILE = Object.freeze({
  color: OBSERVATORY_PERSONALITY.palette.glow,
  contactColor: OBSERVATORY_PERSONALITY.palette.accent,
  // Short throw keeps the amber inside the tunnel; 3.8 leaked orange dots through
  // the dome shell seams from the interior threshold position.
  distance: 2.4,
  intensity: Object.freeze({ high: 2.1, medium: 1.55, low: 0.9 }),
});
/**
 * Interior light, not a blue cave and not a jack-o'-lantern. Everything the
 * viewer sees THROUGH the block gaps and the doorway is the continuous inner
 * shell, so that shell is the only thing standing in for the light inside.
 *
 * Two earlier attempts and why each failed. Slate blue (#3D5680) with a 0.5
 * subsurface-cyan emissive turned every gap into a cold blue lamp and made the
 * dome read as blue all the way through. Replacing it with a dark warm body and
 * a 0.72 sunrise-gold glow fixed that while the courses were thin tiles whose
 * seams were hairlines — but the masonry now stands off the shell as real
 * blocks with real gaps, and at that gap width the amber floods out and the
 * whole igloo reads as a pumpkin.
 *
 * The reference separates inside from outside by VALUE, not hue: a near-white
 * interior an order of magnitude brighter than the lit ice, so the gaps read as
 * slits of light rather than as coloured paint. That also survives any gap
 * width, which the hue split did not. Emissive, not another point light: the
 * scene's point-light count is a shader define and must stay invariant for the
 * whole session.
 */
export const OBSERVATORY_INTERIOR_HEARTH_PROFILE = Object.freeze({
  hearthColor: "#EDF4FF",
  // Tuned for the state the visitor is actually in. The shell sits directly
  // behind the courses rather than deep inside the room, so an emissive strong
  // enough to look right through a demolished wall haloes every seated block
  // and turns the intact igloo into a lantern with tiles glued on. This level
  // leaves the resting joints reading as dark cut lines and still carries the
  // interior when the blocks come off.
  hearthIntensity: Object.freeze({ high: 0.62, medium: 0.52 }),
  read: "white-hot interior light read through the block gaps and the doorway",
  // The shell has two jobs and they pull opposite ways: it is the room behind
  // the doorway, and it is also the sliver that shows in every course joint. A
  // near-black body served the first and made the second a void, so the courses
  // stopped reading as one wall and became plates stuck on a ball. This is
  // shadowed ice: dark enough to sit behind the masonry, light enough that a
  // joint reads as a cut in snow rather than a hole through it.
  shellColor: "#7E8C9C",
});
export const OBSERVATORY_HOME_DRESSING_PROFILE = Object.freeze({
  surface: "wind-carved sastrugi radiating from a grounded frost shelf",
  accents: "three cyan expedition stakes with sunrise-gold survey bands",
  drawBudget: "one merged vertex-colored draw",
});

// Ablation only. Point lights are a per-fragment cost on every lit surface in
// the scene, and their count is a shader define, so three intensity-zero
// placeholders are not free — they are three more light evaluations per pixel.
const DOME_POINT_LIGHTS_ABLATED =
  typeof window !== "undefined" && window.location?.search.includes("qa-no-point-lights");

const HALF_PI = Math.PI * 0.5;
const DOME_CENTER_Y = POLAR_DOME_LATTICE_GEOMETRY.center[1];
const DOME_RADIUS = Object.freeze({
  x: POLAR_DOME_LATTICE_GEOMETRY.radii[0],
  y: POLAR_DOME_LATTICE_GEOMETRY.radii[1],
  z: POLAR_DOME_LATTICE_GEOMETRY.radii[2],
});
const AIRLOCK = POLAR_DOME_AIRLOCK;
const UP = new THREE.Vector3(0, 1, 0);

const DOME_NOISE_GLSL = `
float domeHash3(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float domeIceNoise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(domeHash3(i), domeHash3(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(domeHash3(i + vec3(0.0, 1.0, 0.0)), domeHash3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(domeHash3(i + vec3(0.0, 0.0, 1.0)), domeHash3(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(domeHash3(i + vec3(0.0, 1.0, 1.0)), domeHash3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z
  );
}

float domeFbmLowpass3(vec3 p) {
  float value = 0.0;
  float amplitude = 1.0;
  float frequency = 1.0;
  for (int octave = 0; octave < 4; octave += 1) {
    value += amplitude * (domeIceNoise3(p * frequency) * 2.0 - 1.0);
    frequency *= 2.0;
    amplitude *= 0.35;
  }
  return value;
}
`;

function normalizeQuality(quality) {
  return quality === "low" || quality === "medium" ? quality : "high";
}

function makeDomeUniforms(quality, surface) {
  const tier = POLAR_XZ_SHADER_POLICY.quality[quality];
  return {
    uDomeAccentColor: { value: new THREE.Color(DOME_XZ_COLOR_ZONES.teal) },
    uDomeBevelColor: { value: new THREE.Color(POLAR_PALETTE.dawnCyan) },
    // Cool the beige XZ cream toward glacier white so the shader courses stay ice.
    uDomeCreamColor: {
      value: new THREE.Color(DOME_XZ_COLOR_ZONES.cream).lerp(
        new THREE.Color(POLAR_PALETTE.glacierWhite),
        0.86,
      ),
    },
    uDomeDisplacementStrength: {
      value: surface === "shell" ? tier.vertexDisplacement : tier.vertexDisplacement * 0.32,
    },
    uDomeFrostColor: { value: new THREE.Color(DOME_XZ_COLOR_ZONES.frost) },
    uDomeImpact: { value: 0 },
    uDomeReveal: { value: 1 },
    uDomeSageColor: { value: new THREE.Color(DOME_XZ_COLOR_ZONES.sage) },
    uDomeTealColor: { value: new THREE.Color(DOME_XZ_COLOR_ZONES.teal) },
    uDomeTime: { value: 0 },
    uDomeWarmColor: { value: new THREE.Color(DOME_XZ_COLOR_ZONES.warm) },
  };
}

function createAnimeIceMaterial(quality, surface = "shell") {
  const isFull = quality !== "low";
  const uniforms = makeDomeUniforms(quality, surface);
  const material = new THREE.MeshPhysicalMaterial({
    clearcoat: quality === "high" ? 0.42 : 0.3,
    clearcoatRoughness: 0.44,
    color: "#DEE7F1",
    // Low tier draws this shader shell as the whole dome, so its emissive is pulled
    // down to a floor lift only: the low dome is lit by the scene rig too.
    emissive: quality === "low" ? "#C9D6E6" : DOME_XZ_COLOR_ZONES.teal,
    emissiveIntensity: quality === "low" ? 0.34 : 0.018,
    metalness: 0,
    roughness: quality === "low" ? 0.62 : 0.7,
    side: THREE.FrontSide,
  });

  material.userData.domeUniforms = uniforms;
  material.customProgramCacheKey = () =>
    `continuous-anime-igloo-${surface}-${isFull ? "full" : "low"}-v7-glacial`;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    material.userData.shader = shader;
    const qualityDefine = isFull ? "#define DOME_FULL_QUALITY 1\n" : "";
    const surfaceDefine = surface === "airlock" ? "#define DOME_AIRLOCK_SURFACE 1\n" : "";

    shader.vertexShader = `${qualityDefine}${surfaceDefine}${shader.vertexShader}`
      .replace(
        "#include <common>",
        `#include <common>
${DOME_NOISE_GLSL}
uniform float uDomeDisplacementStrength;
uniform float uDomeReveal;
uniform float uDomeTime;
varying vec3 vDomeLocalPosition;
varying vec3 vDomeWorldPosition;`,
      )
      .replace(
        "#include <begin_vertex>",
        `vec3 transformed = vec3(position);
#ifdef DOME_FULL_QUALITY
  float domeMacroDisplacement = domeFbmLowpass3(position * 1.35 + vec3(4.3, 9.7, 2.1));
  float domeMicroDisplacement = (domeIceNoise3(position * 15.0 + vec3(0.0, uDomeTime * 0.018, 0.0)) - 0.5) * 0.18;
  transformed += objectNormal * (domeMacroDisplacement * 0.72 + domeMicroDisplacement)
    * uDomeDisplacementStrength * uDomeReveal;
#endif
vDomeLocalPosition = transformed;
vDomeWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );

    shader.fragmentShader = `${qualityDefine}${surfaceDefine}${shader.fragmentShader}`
      .replace(
        "#include <common>",
        `#include <common>
${DOME_NOISE_GLSL}
${POLAR_XZ_NOISE_GLSL}
uniform vec3 uDomeAccentColor;
uniform vec3 uDomeBevelColor;
uniform vec3 uDomeCreamColor;
uniform vec3 uDomeFrostColor;
uniform vec3 uDomeSageColor;
uniform vec3 uDomeTealColor;
uniform vec3 uDomeWarmColor;
uniform float uDomeImpact;
uniform float uDomeTime;
varying vec3 vDomeLocalPosition;
varying vec3 vDomeWorldPosition;

float domeCellHash(vec2 cell) {
  return polarXZHash(cell + vec2(19.31, 7.17));
}`,
      )
      .replace(
        "#include <normal_fragment_begin>",
        `#include <normal_fragment_begin>
#ifdef DOME_FULL_QUALITY
  vec3 domeDx = dFdx(vDomeWorldPosition);
  vec3 domeDy = dFdy(vDomeWorldPosition);
  vec3 domeDerivativeNormal = normalize(cross(domeDx, domeDy));
  if (!gl_FrontFacing) domeDerivativeNormal *= -1.0;
  normal = normalize(mix(normal, domeDerivativeNormal, 0.72));
#endif`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
vec3 domeLocalDirection = normalize(vDomeLocalPosition + vec3(0.0, 0.0001, 0.0));
float domeTheta01;
float domeCourse;
float domeColumn;
#ifdef DOME_AIRLOCK_SURFACE
  domeCourse = max(vDomeLocalPosition.y, 0.0) * 9.25;
  float domeAirlockRow = floor(domeCourse);
  domeColumn = (vDomeLocalPosition.x + 0.62) * 5.6 + mod(domeAirlockRow, 2.0) * 0.5;
  domeTheta01 = clamp(vDomeLocalPosition.y / 0.86, 0.0, 1.0);
#else
  domeTheta01 = acos(clamp(domeLocalDirection.y, 0.0, 1.0)) / ${HALF_PI.toFixed(8)};
  domeCourse = domeTheta01 * ${DOME_PANEL_ROWS.toFixed(1)};
  float domeRow = min(${(DOME_PANEL_ROWS - 1).toFixed(1)}, floor(domeCourse));
  float domeColumns = 6.0 + domeRow * 2.0;
  float domeAzimuth01 = fract(atan(domeLocalDirection.z, domeLocalDirection.x) / 6.28318530718 + 1.0);
  domeColumn = domeAzimuth01 * domeColumns + mod(domeRow, 2.0) * 0.5;
#endif

vec2 domeCellUv = fract(vec2(domeColumn, domeCourse));
vec2 domeCellEdge = min(domeCellUv, 1.0 - domeCellUv);
float domeJointDistance = min(domeCellEdge.x * 0.9, domeCellEdge.y);
float domeJointAa = max(fwidth(domeJointDistance), 0.0015);
// Hairline course joints: a precise cut line, not a chunky moulded mortar band.
float domeMortar = 1.0 - smoothstep(0.018 - domeJointAa, 0.018 + domeJointAa, domeJointDistance);
float domeBevelBand = smoothstep(0.018 + domeJointAa, 0.038, domeJointDistance)
  * (1.0 - smoothstep(0.038, 0.072, domeJointDistance));
float domeBevelDirection = mix(0.88, 1.1, step(0.5, domeCellUv.x) * 0.55 + step(0.5, domeCellUv.y) * 0.45);

vec2 domeWorldXZ = vDomeWorldPosition.xz;
float domeTealZone = exp(-dot(domeWorldXZ - vec2(-0.55, 0.42), domeWorldXZ - vec2(-0.55, 0.42)) * 0.34);
float domeSageZone = exp(-dot(domeWorldXZ - vec2(0.82, -0.34), domeWorldXZ - vec2(0.82, -0.34)) * 0.28);
float domeWarmZone = exp(-dot(domeWorldXZ - vec2(0.96, 0.84), domeWorldXZ - vec2(0.96, 0.84)) * 0.46);
vec3 domeZoneColor = mix(uDomeFrostColor, uDomeCreamColor, 0.34 + domeTheta01 * 0.08);
domeZoneColor = mix(domeZoneColor, uDomeTealColor, domeTealZone * 0.055);
domeZoneColor = mix(domeZoneColor, uDomeSageColor, domeSageZone * 0.035);
domeZoneColor = mix(domeZoneColor, uDomeWarmColor, domeWarmZone * 0.03);

vec2 domeCellId = floor(vec2(domeColumn, domeCourse));
// Wider per-cell frost value variation (+/-6%) off the same deterministic cell hash.
float domeCellVariation = (domeCellHash(domeCellId) - 0.5) * 0.12;
float domeFrost = 0.5;
#ifdef DOME_FULL_QUALITY
  float domeFrostA = domeIceNoise3(vec3(domeWorldXZ * 4.8, 1.7));
  float domeFrostB = domeIceNoise3(vec3(domeWorldXZ * 11.0 + 3.4, 6.2));
  domeFrost = domeFrostA * 0.68 + domeFrostB * 0.32;
#endif

vec3 domeJointColor = mix(vec3(0.35, 0.45, 0.62), ${`vec3(${new THREE.Color(POLAR_PALETTE.horizonIndigo).r.toFixed(5)}, ${new THREE.Color(POLAR_PALETTE.horizonIndigo).g.toFixed(5)}, ${new THREE.Color(POLAR_PALETTE.horizonIndigo).b.toFixed(5)})`}, 0.12);
vec3 domeSurfaceColor = domeZoneColor * (1.0 + domeCellVariation + (domeFrost - 0.5) * 0.075);
domeSurfaceColor *= 1.0 + (1.0 - domeTheta01) * 0.09;
domeSurfaceColor += uDomeBevelColor * domeBevelBand * domeBevelDirection * 0.06;
domeSurfaceColor = mix(domeSurfaceColor, domeJointColor, domeMortar * 0.86);
domeSurfaceColor += uDomeAccentColor * domeBevelBand * (0.025 + uDomeImpact * 0.055);
diffuseColor.rgb *= domeSurfaceColor;`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
totalEmissiveRadiance += uDomeAccentColor * (domeBevelBand * 0.018 + uDomeImpact * 0.045);`,
      );
  };
  material.needsUpdate = true;
  return material;
}

function useAnimeIceMaterial(quality, surface = "shell") {
  const material = useMemo(() => createAnimeIceMaterial(quality, surface), [quality, surface]);
  useEffect(() => () => material.dispose(), [material]);
  return material;
}

function createCurvedBlockGeometry(quality) {
  // The bevel is authored on the unit box and then stretched by the per-cell
  // scale, so it lands anisotropically. It also eats the flat face from both
  // sides: at 0.085 a block's face shrank to 83% of its cell and the shoulders
  // curved away from its neighbours, which widened every joint into a lit slot.
  // 0.052 keeps the softened weathered edge that separates cut snow from a
  // machined tile without opening the courses up.
  // Segments carry the curved face. At 3 the flat face is a 4x4 grid, which is
  // too coarse to hold a bulge: the old 0.012 attempt shaded as a dark diagonal
  // X across the triangulation and read as a plastic toy brick, and that was
  // read as a reason not to curve the face at all rather than as a reason to
  // give it vertices.
  const geometry = new RoundedBoxGeometry(1, 1, 1, quality === "high" ? 5 : 3, quality === "high" ? 0.055 : 0.046);
  const position = geometry.getAttribute("position");
  for (let index = 0; index < position.count; index += 1) {
    let x = position.getX(index);
    let y = position.getY(index);
    let z = position.getZ(index);
    const faceX = Math.max(0, 1 - x * x * 3.6);
    const faceY = Math.max(0, 1 - y * y * 3.6);
    // A block cut from a dome is a slab off a spherical shell: its outer face is
    // a patch of that sphere, not a plane. The sagitta is real geometry, not
    // styling — a 0.85-wide block on a 2.10 radius stands 0.043 proud at its
    // centre, which against a 0.205 block depth is 0.21 of the unit box. That is
    // what separates a laid dome from a faceted ball, and a near-flat 0.0015 was
    // giving every course a hard chord edge against its neighbours.
    if (z > 0.28) z += faceX * faceY * 0.2;
    // Radial taper, sized from the shell the block is cut out of rather than
    // eyeballed. A wall block spans radius R - t/2 to R + t/2, so its inner face
    // is narrower than its outer by that ratio: 2.10 and a 0.205 depth give
    // 0.907 across the width, and 2.80 gives 0.929 up the height. Expressed as a
    // taper across the unit box that is 0.093 and 0.073. At the previous 0.055
    // and 0.026 the sides were nearly parallel, so neighbours splayed apart at
    // the outer face — the joint opened exactly where it is most visible.
    const wedge = 1 + z * 0.093;
    x *= wedge * (1 - (y + 0.5) * 0.018);
    y *= 1 + z * 0.073;
    position.setXYZ(index, x, y, z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  // Bright crystalline vertex colors: unbound color attributes read as black in WebGL,
  // so the instanced ice must carry its own near-white per-vertex frost field that the
  // authored instance colors can multiply against. Crown faces read slightly whiter,
  // recessed bases slightly cooler, keeping the anime ice luminous instead of void-dark.
  const colors = new Float32Array(position.count * 3);
  for (let index = 0; index < position.count; index += 1) {
    const crown = Math.min(1, Math.max(0, position.getY(index) + 0.5));
    const face = Math.min(1, Math.max(0, position.getZ(index) + 0.5));
    const lift = 0.93 + crown * 0.05 + face * 0.02;
    colors[index * 3] = Math.min(1, lift - 0.004);
    colors[index * 3 + 1] = Math.min(1, lift + 0.002);
    colors[index * 3 + 2] = Math.min(1, lift + 0.01);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

// Ablation only. Paired measurement puts the observatory at 7.19ms of a ~20ms
// frame, which is the largest single item in it, and the two candidates —
// fragment complexity on 56 instanced blocks, or the overdraw of stacking them
// — are not separable from the outside. This swaps the authored ice for the
// cheapest lit material three has, keeping every draw, every instance and every
// triangle, so the difference is the shader and nothing else.
function createPlainIceMaterial() {
  return new THREE.MeshLambertMaterial({ color: "#D6DEE9", vertexColors: true });
}

function createInstancedIceMaterial(quality) {
  const uniforms = {
    uBrickAccent: { value: new THREE.Color(DOME_XZ_COLOR_ZONES.teal) },
    uBrickCompression: { value: 0 },
    uBrickContactBlueGrey: { value: new THREE.Color(DOME_CRYSTAL_PALETTE.contactBlueGrey) },
    uBrickFloatMotion: { value: 1 },
    uBrickFrostIvory: { value: new THREE.Color(DOME_CRYSTAL_PALETTE.frostIvory) },
    uBrickImpact: { value: 0 },
    uBrickIceBlue: { value: new THREE.Color(DOME_CRYSTAL_PALETTE.iceBlue) },
    uBrickProximity: { value: 0 },
    uBrickReveal: { value: 1 },
    uBrickSeamBlueGrey: { value: new THREE.Color(DOME_CRYSTAL_PALETTE.seamBlueGrey) },
    uBrickSubsurfaceCyan: { value: new THREE.Color(DOME_CRYSTAL_PALETTE.subsurfaceCyan) },
    uBrickTime: { value: 0 },
    uBrickWindCap: { value: new THREE.Color(DOME_CRYSTAL_PALETTE.windCap) },
    // Pointer wake ring buffer (igloo.inc fluid-splat vocabulary): world-space hit
    // xyz + spawn time per vec4, with a parallel speed-scaled amplitude array. All
    // splats start expired (spawn time far in the past, amplitude zero).
    uSplatCoords: {
      value: Array.from(
        { length: DOME_FLOAT_PROFILE.wake.splatCount },
        () => new THREE.Vector4(0, -999, 0, -1000),
      ),
    },
    uSplatAmps: { value: new Array(DOME_FLOAT_PROFILE.wake.splatCount).fill(0) },
    uSplatRadius: {
      value: DOME_FLOAT_PROFILE.wake.sigmaLocal * OBSERVATORY_MACRO_SCALE_PROFILE.worldScale,
    },
  };
  // MeshStandardMaterial, not MeshPhysicalMaterial. Measured: the dome is 6.7ms
  // of a 30.9ms frame at 1440x900, and the physical lobes are why — clearcoat,
  // sheen and specular each add a BRDF evaluation per fragment, on 56 instanced
  // blocks with heavy overdraw. Cut snow is a rough scattering dielectric, which
  // is exactly the standard model; the traces that were left were paying three
  // extra lobes for a contribution no screenshot could separate.
  const material = new THREE.MeshStandardMaterial({
    // Neutral, and a value step down out of the clipping ceiling. Two separate
    // measurements drove this. 17.41% of the dome's pixels were pinned at pure
    // 255,255,255 against 0.00% in the reference, so the body had to come down
    // from #E1E9F2's luma 230. Doing that in the same cool hue then pushed mean
    // saturation across the dome from 0.321 to 0.428, because the ice tint was
    // being carried TWICE — once here and once by the per-instance colours from
    // colorForDomeBlock — and two cool colours multiplied compound. This is the
    // same class of error as the warm-key-times-sage product that produced the
    // old olive brick read. The tint now lives only on the instances.
    color: "#DCDDDF",
    // Body emissive is effectively off. The shell must be LIT by the scene rig so the
    // seam/face/crown value ladder survives; glow stays in the airlock, the seam
    // recesses, and the interior spill, never on the brick faces.
    emissive: DOME_CRYSTAL_PALETTE.subsurfaceCyan,
    emissiveIntensity: quality === "high" ? 0.012 : 0.01,
    // The scene probe carries what the coat used to: a rough dielectric under an
    // irradiance probe still catches a broad sky reflection, for one lobe rather
    // than four.
    envMapIntensity: quality === "high" ? 1.15 : 1,
    metalness: 0,
    roughness: quality === "high" ? 0.64 : 0.7,
    vertexColors: true,
  });
  material.userData.brickUniforms = uniforms;
  // Shared CPU-side splat writer state for every mesh drawing this material, so the
  // dome shell and airlock arch feed one coherent wake trail.
  material.userData.wakeState = {
    hasLast: false,
    index: 0,
    lastPoint: new THREE.Vector3(),
    lastStampMs: 0,
  };
  material.customProgramCacheKey = () => `instanced-curved-ice-blocks-${quality}-glacial-v14-wake`;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    material.userData.shader = shader;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute float instanceDelay;
attribute float instanceBevel;
attribute float instanceFacet;
attribute vec3 instanceFloat;
attribute float instanceFrost;
attribute float instanceHover;
attribute float instanceMass;
uniform float uBrickCompression;
uniform float uBrickFloatMotion;
uniform float uBrickImpact;
uniform float uBrickProximity;
uniform float uBrickReveal;
uniform float uBrickTime;
uniform vec4 uSplatCoords[${DOME_FLOAT_PROFILE.wake.splatCount}];
uniform float uSplatAmps[${DOME_FLOAT_PROFILE.wake.splatCount}];
uniform float uSplatRadius;
varying float vBrickBevel;
varying float vBrickFacet;
varying float vBrickFrost;
varying float vBrickHover;
varying vec3 vBrickCourseAxis;
varying vec3 vBrickLocalPosition;
varying vec3 vBrickTangentAxis;
varying vec3 vBrickWorldNormal;
varying vec3 vBrickWorldPosition;`,
      )
      .replace(
        "#include <begin_vertex>",
        `vec3 transformed = vec3(position);
// Staggered assembly (igloo.inc uIntroMaterialize/uAnimationOrder register): each
// brick arrives bottom-up on world-stream reveal, scaling and sliding from slightly
// inward (below seated, along -Z) to its seated pose. Reduced motion pins
// uBrickReveal at 1 so the shell is fully materialized instantly.
float brickReveal = smoothstep(
  instanceFloat.x * ${DOME_FLOAT_PROFILE.materialize.margin.toFixed(2)},
  instanceFloat.x * ${DOME_FLOAT_PROFILE.materialize.margin.toFixed(2)} + ${DOME_FLOAT_PROFILE.materialize.window.toFixed(2)},
  uBrickReveal
);
transformed *= mix(${DOME_FLOAT_PROFILE.materialize.scaleFrom.toFixed(2)}, 1.0, brickReveal);
float brickArrival = smoothstep(instanceDelay, min(1.0, instanceDelay + 0.22), uBrickImpact);
float brickCollisionCompression = uBrickCompression * brickArrival / max(instanceMass, 0.75);
float brickHoverLift = instanceHover * 0.15;
transformed.z += brickHoverLift - brickCollisionCompression;
// Suspended-course float: weight ramps 0 at the seated base course to 1 near the
// crown; every term is an additive outward (+Z) displacement in dome-local metres,
// converted to block-local units by the per-instance thickness scale. The temporal
// drift is one coherent traveling azimuthal wave (k crests marching around the dome
// Y axis, neighbours in phase) plus a small deterministic per-brick hash shimmer.
float brickFloatWeight = smoothstep(0.08, 0.85, instanceFloat.x);
#ifdef USE_INSTANCING
  float brickFloatAxisScale = max(length(instanceMatrix[2].xyz), 0.05);
#else
  float brickFloatAxisScale = 1.0;
#endif
float brickSuspensionGap = ${DOME_FLOAT_PROFILE.suspensionGapRadiusRatio.toFixed(3)} * ${DOME_RADIUS.y.toFixed(4)} * brickFloatWeight;
float brickFloatDrift = brickFloatWeight * uBrickFloatMotion * (1.0 + 0.5 * uBrickProximity)
  * (${DOME_FLOAT_PROFILE.wave.amplitudes[0].toFixed(3)} * sin(${DOME_FLOAT_PROFILE.wave.angularWavenumber.toFixed(1)} * instanceFloat.z - 6.28318530718 * ${DOME_FLOAT_PROFILE.wave.frequenciesHz[0].toFixed(3)} * uBrickTime + instanceFloat.x * 2.4)
    + ${DOME_FLOAT_PROFILE.wave.amplitudes[1].toFixed(3)} * sin(6.28318530718 * ${DOME_FLOAT_PROFILE.wave.frequenciesHz[1].toFixed(3)} * uBrickTime + 1.7 * instanceFloat.y));
transformed.z += (brickSuspensionGap + brickFloatDrift) / brickFloatAxisScale;
// Pointer splat wake (igloo.inc uSplatCoords/uSplatRadius/dissipation register):
// sum gaussian-falloff, exponentially-decaying splats against the rigid brick
// centroid so cursor drags leave a dissipating displaced trail. Strictly additive
// outward; never below the seated pose. uBrickFloatMotion pins it for reduced motion.
#ifdef USE_INSTANCING
  vec3 brickCentroidWorld = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
#else
  vec3 brickCentroidWorld = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
#endif
float brickWake = 0.0;
for (int splat = 0; splat < ${DOME_FLOAT_PROFILE.wake.splatCount}; splat += 1) {
  vec4 splatData = uSplatCoords[splat];
  float splatAge = uBrickTime - splatData.w;
  float splatDistance = distance(brickCentroidWorld, splatData.xyz);
  brickWake += uSplatAmps[splat]
    * exp(-(splatDistance * splatDistance) / max(uSplatRadius * uSplatRadius, 0.0001))
    * exp(-max(splatAge, 0.0) / ${DOME_FLOAT_PROFILE.wake.decayTauSeconds.toFixed(2)})
    * step(0.0, splatAge);
}
brickWake = min(brickWake, 0.16) * uBrickFloatMotion * brickReveal;
transformed.z += brickWake / brickFloatAxisScale;
transformed.z += (brickReveal - 1.0) * ${DOME_FLOAT_PROFILE.materialize.slideInLocal.toFixed(2)};
vBrickBevel = instanceBevel;
vBrickFacet = instanceFacet;
vBrickFrost = instanceFrost;
vBrickHover = instanceHover;
vBrickLocalPosition = transformed;
#ifdef USE_INSTANCING
  vBrickWorldPosition = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
  vBrickWorldNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);
  vBrickTangentAxis = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * vec3(1.0, 0.0, 0.0));
  vBrickCourseAxis = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * vec3(0.0, 1.0, 0.0));
#else
  vBrickWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vBrickWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
  vBrickTangentAxis = normalize(mat3(modelMatrix) * vec3(1.0, 0.0, 0.0));
  vBrickCourseAxis = normalize(mat3(modelMatrix) * vec3(0.0, 1.0, 0.0));
#endif`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
${POLAR_XZ_NOISE_GLSL}
uniform vec3 uBrickAccent;
uniform vec3 uBrickContactBlueGrey;
uniform vec3 uBrickFrostIvory;
uniform vec3 uBrickIceBlue;
uniform vec3 uBrickSeamBlueGrey;
uniform vec3 uBrickSubsurfaceCyan;
uniform vec3 uBrickWindCap;
uniform float uBrickImpact;
uniform float uBrickProximity;
varying float vBrickBevel;
varying float vBrickFacet;
varying float vBrickFrost;
varying float vBrickHover;
varying vec3 vBrickCourseAxis;
varying vec3 vBrickLocalPosition;
varying vec3 vBrickTangentAxis;
varying vec3 vBrickWorldNormal;
varying vec3 vBrickWorldPosition;`,
      )
      .replace(
        "#include <normal_fragment_begin>",
        `#include <normal_fragment_begin>
float brickCrystalDx = dFdx(brickCrystalHeight);
float brickCrystalDy = dFdy(brickCrystalHeight);
vec3 brickFrostGradient = vec3(-brickCrystalDx, brickCrystalDy, 0.0);
normal = normalize(normal + brickFrostGradient * ${quality === "high" ? "0.34" : "0.22"});`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
vec2 brickFrostFrame = vec2(
  dot(vBrickWorldPosition, normalize(vBrickTangentAxis)),
  dot(vBrickWorldPosition, normalize(vBrickCourseAxis))
);
float brickAnisotropicFrost = polarXZNoise(
  brickFrostFrame * vec2(27.0, 6.5) + vec2(vBrickFacet * 17.0, vBrickFrost * 9.0)
);
float brickCrossFacet = polarXZNoise(
  brickFrostFrame.yx * vec2(8.0, 19.0) - vec2(vBrickFacet * 7.0, vBrickFrost * 13.0)
);
// A third, much finer octave. Packed snow is granular at a scale well below the
// wind grain the first two carry: measured against the reference, this surface
// held 7.60% normalised high-frequency energy against its 9.68%, which is the
// difference between a smooth shell and one cut from drift.
// 42, not 96. Measured at the docked framing the dome spans ~580px for 6.6
// world units, so a 96-cycle octave puts one noise cell inside a single pixel:
// what it adds there is aliasing, not grain, and the Laplacian energy it scored
// was counting its own shimmer. 42 leaves a cell about two pixels wide at the
// hero distance, which is the finest thing this camera can actually resolve.
vec2 brickGrainFrame = brickFrostFrame * vec2(42.0, 38.0);
float brickSnowGrain = polarXZNoise(
  brickGrainFrame + vec2(vBrickFrost * 31.0, vBrickFacet * 23.0)
);
// Fade the grain as its cell approaches a pixel. The octave is authored in world
// space, so a distant dome carries the same frequency and would alias into
// shimmer long before it visually faded; fwidth on the grain's own frame is the
// screen-space size of one cell, and the noise is worth nothing once that
// crosses a pixel.
float brickGrainCell = max(fwidth(brickGrainFrame.x), fwidth(brickGrainFrame.y));
float brickGrainFade = 1.0 - smoothstep(0.35, 1.1, brickGrainCell);
float brickCrystalHeight =
  mix(brickAnisotropicFrost, brickCrossFacet, 0.24) +
  (brickSnowGrain - 0.5) * 0.42 * brickGrainFade;
vec3 brickNormal = normalize(vBrickWorldNormal);
vec3 brickView = normalize(cameraPosition - vBrickWorldPosition);
vec3 brickKeyDirection = normalize(vec3(-0.46, 0.82, 0.34));
float brickNdotL = dot(brickNormal, brickKeyDirection);
float brickWrappedDiffuse = clamp((brickNdotL + 0.42) / 1.42, 0.0, 1.0);
float brickFresnel = pow(1.0 - max(dot(brickNormal, brickView), 0.0), 3.4);
float brickTransmission = pow(max(dot(-brickNormal, brickKeyDirection), 0.0), 1.65)
  * (0.42 + brickFresnel * 0.34);
float brickMacroFrost = polarXZNoise(vBrickWorldPosition.xz * 4.2 + vBrickFrost * 7.0);
float brickFrost = brickMacroFrost * 0.42 + brickAnisotropicFrost * 0.58;

// Hairline seams: the bevel band is a fraction of its old width so the joint reads as
// a precise cut line between blocks instead of a chunky rounded toy edge. Screen-space
// derivative width keeps it at least one pixel wide at any distance without fattening.
float brickEdgeDistance = 0.5 - max(abs(vBrickLocalPosition.x), abs(vBrickLocalPosition.y));
// The seam field 0.5 - max(|x|,|y|) flips its gradient axis across the face
// diagonals; raw fwidth() therefore jumps discontinuously there, and under
// foreshortening it exceeded brickBevelWidth, degenerating the recess
// smoothsteps over whole triangle regions (the dark bow-tie X on every face).
// Keep the pixel-width AA but cap it safely below the narrowest seam edge.
float brickSeamAa = clamp(fwidth(brickEdgeDistance), 0.0012, 0.006);
float brickBevelWidth = mix(0.022, 0.036, clamp(vBrickBevel, 0.0, 1.0));
float brickRecess = 1.0 - smoothstep(brickSeamAa, brickBevelWidth, brickEdgeDistance);
float brickSeamCore = 1.0 - smoothstep(brickSeamAa, brickBevelWidth * 0.42, brickEdgeDistance);
float brickBevelLight = smoothstep(brickBevelWidth, brickBevelWidth * 1.7, brickEdgeDistance)
  * (1.0 - smoothstep(brickBevelWidth * 1.7, brickBevelWidth * 3.1, brickEdgeDistance));
float brickWindCap = smoothstep(0.14, 0.46, vBrickLocalPosition.y)
  * (0.72 + brickFrost * 0.28);
float brickCrownHighlight = clamp(
  smoothstep(0.48, 0.84, brickNormal.y) * (1.0 - smoothstep(0.93, 1.0, brickNormal.y) * 0.42),
  0.0,
  0.72
);
float brickContactOcclusion = (1.0 - smoothstep(0.12, 0.62, vBrickWorldPosition.y))
  * (0.72 + (1.0 - brickWrappedDiffuse) * 0.28);
float brickCrownGradient = clamp(vBrickWorldPosition.y * 0.28, 0.0, 0.55);

vec2 brickWorldXZ = vBrickWorldPosition.xz;
float brickCyanZone = exp(-dot(brickWorldXZ - vec2(-0.55, 0.42), brickWorldXZ - vec2(-0.55, 0.42)) * 0.3);
float brickIvoryZone = exp(-dot(brickWorldXZ - vec2(0.82, -0.34), brickWorldXZ - vec2(0.82, -0.34)) * 0.26);
vec3 brickXzTint = mix(uBrickIceBlue, uBrickSubsurfaceCyan, brickCyanZone * 0.06);
brickXzTint = mix(brickXzTint, uBrickFrostIvory, brickIvoryZone * 0.14);

// Value ladder (dark seam recess / mid ice face / bright crown specular). Chroma is
// carried almost entirely by value here; the XZ tint is a whisper so the shell stays
// near-monochrome glacial glass.
vec3 brickSurface = mix(diffuseColor.rgb, brickXzTint, 0.1);
brickSurface *= 0.96 + brickWrappedDiffuse * 0.2 + (brickFrost - 0.5) * 0.08;
// Crown terms are deliberately small. Measured against the reference at 1440x900
// the dome there spans luma 59-101 across crown, faces and shadow side — a 1.71
// ratio held by a soft key and aerial haze. This shell was spanning 63-255 with
// the upward faces pinned at pure 255,255,255: a clipped crown carries no form
// at all, and the wide spread is what made laid courses read as separate plates.
// The stack that got it there was a 0.24 world-height gradient, a 0.16 wind-cap
// mix and a 0.075 emissive lift, all landing on the same upward normals.
brickSurface *= 1.0 + brickCrownGradient * 0.09;
brickSurface = mix(brickSurface, uBrickWindCap, brickWindCap * 0.09 + brickCrownHighlight * 0.06);
brickSurface = mix(brickSurface, uBrickSeamBlueGrey, brickRecess * 0.62);
// Cool grey-blue seam by default; the subtle cyan-mint only lives in the deep cut.
brickSurface = mix(brickSurface, uBrickSubsurfaceCyan, brickSeamCore * 0.12);
brickSurface *= 1.0 - brickSeamCore * 0.34;
brickSurface += uBrickFrostIvory * brickBevelLight * (0.028 + vBrickFacet * 0.012);
brickSurface = mix(brickSurface, uBrickContactBlueGrey, brickContactOcclusion * 0.12);
diffuseColor.rgb = brickSurface;`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
roughnessFactor = clamp(
  roughnessFactor + (brickAnisotropicFrost - 0.5) * 0.1 + brickWindCap * 0.1 - brickBevelLight * 0.05,
  0.24,
  0.58
);`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
float brickContactSignal = uBrickImpact * (0.012 + brickBevelLight * 0.026);
// Near-zero body emissive: only enough lift to keep the shadow side off black. The
// dome is lit by the scene rig, so the seam/face/crown ladder is not washed flat.
totalEmissiveRadiance += brickSurface * 0.06;
// The cyan additives are halved. They are ADDED, not multiplied, so their share
// of a face grows as the body darkens: taking the base down out of the clipping
// ceiling made the shell measurably bluer (mean saturation 0.32 -> 0.44 across
// the dome region) even though every palette entry stayed inside the 0.2
// desaturation cap. The transmission term was the bulk of it, landing on exactly
// the faces angled away from the key.
totalEmissiveRadiance += uBrickIceBlue * 0.006;
totalEmissiveRadiance += uBrickSubsurfaceCyan * brickTransmission * 0.045;
totalEmissiveRadiance += uBrickFrostIvory * (brickFresnel * 0.04 + brickCrownHighlight * 0.022);
// Interior spill through the seam cuts stays: this is the lab-lit-from-within read.
totalEmissiveRadiance += uBrickSubsurfaceCyan * brickSeamCore * (0.03 + uBrickProximity * 0.1);
totalEmissiveRadiance += uBrickFrostIvory * brickFresnel * uBrickProximity * 0.07;
totalEmissiveRadiance += uBrickSubsurfaceCyan * vBrickHover * (0.12 + brickFresnel * 0.08);
totalEmissiveRadiance += uBrickAccent * brickContactSignal;`,
      );
  };
  material.userData.contactOptics = "bounded contact-weight optics";
  material.needsUpdate = true;
  return material;
}

function useInstancedIceAssets(quality) {
  const domeGeometry = useMemo(() => createCurvedBlockGeometry(quality), [quality]);
  const airlockGeometry = useMemo(() => createCurvedBlockGeometry(quality), [quality]);
  const plain =
    typeof window !== "undefined" && window.location?.search.includes("qa-dome-plain");
  const material = useMemo(
    () => (plain ? createPlainIceMaterial() : createInstancedIceMaterial(quality)),
    [plain, quality],
  );
  useEffect(
    () => () => {
      domeGeometry.dispose();
      airlockGeometry.dispose();
      material.dispose();
    },
    [airlockGeometry, domeGeometry, material],
  );
  return { airlockGeometry, domeGeometry, material };
}

function useInnerShellMaterial(quality) {
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        clearcoat: quality === "high" ? 0.18 : 0.1,
        clearcoatRoughness: 0.76,
        color: OBSERVATORY_INTERIOR_HEARTH_PROFILE.shellColor,
        emissive: OBSERVATORY_INTERIOR_HEARTH_PROFILE.hearthColor,
        emissiveIntensity:
          quality === "high"
            ? OBSERVATORY_INTERIOR_HEARTH_PROFILE.hearthIntensity.high
            : OBSERVATORY_INTERIOR_HEARTH_PROFILE.hearthIntensity.medium,
        metalness: 0,
        roughness: 0.9,
      }),
    [quality],
  );
  useEffect(() => () => material.dispose(), [material]);
  return material;
}

// Near-monochrome glacial band: the face family walks #B7C9E2 -> #D9E6F5 by frost seed
// with only a whisper of dawn cyan. The saturated cornflower wash and the teal/sage XZ
// zone lerps are gone; per-instance identity is carried by value, not hue.
function colorForDomeBlock(position, seed) {
  const iceBlue = new THREE.Color(DOME_CRYSTAL_PALETTE.iceBlue);
  const ivory = new THREE.Color(DOME_CRYSTAL_PALETTE.frostIvory);
  const cyan = new THREE.Color(POLAR_PALETTE.dawnCyan);
  const windCap = new THREE.Color(DOME_CRYSTAL_PALETTE.windCap);
  // A narrow band, walked from near the ivory end. Spanning 0.30-0.76 of the
  // ice-to-ivory ramp gave neighbouring blocks a full value step between them,
  // and on courses of ~13 large blocks that checkerboards: each face reads as
  // its own plate instead of the wall reading as one mass cut from one drift.
  // Cut snow varies, but within a few percent.
  const color = iceBlue.clone().lerp(ivory, 0.52 + seed * 0.16).lerp(cyan, 0.012);
  // Occasional near-white wind-packed frost block (~7% of the shell) breaks the uniform
  // toy read without adding hue. Deterministic: same frost seed the lattice already has.
  if (seed > 0.93) color.lerp(windCap, 0.32);
  // +/-3% per-instance value variation, saturation pulled down hard.
  color.offsetHSL(0, -0.07, (seed - 0.5) * 0.06);
  return color;
}

// The airlock arch sits a value step below the shell so the entrance trim reads as a
// separate built element rather than more of the same ice.
function colorForAirlockBlock(position, seed) {
  const frost = new THREE.Color(DOME_CRYSTAL_PALETTE.iceBlue);
  const cream = new THREE.Color(DOME_CRYSTAL_PALETTE.frostIvory);
  const cyan = new THREE.Color(POLAR_PALETTE.dawnCyan);
  // Same ice-block family as the dome shell (a half value-step cooler), so the
  // arch reads as built from the same blocks rather than a dark separate trim.
  const color = cream.clone().lerp(frost, 0.45 + seed * 0.2).lerp(cyan, 0.02 + position.y * 0.012);
  color.offsetHSL(0, -0.06, (seed - 0.5) * 0.05 - 0.02);
  return color;
}

// Deterministic per-brick drift phase from the brick centroid, computed once at
// build time (GLSL-equivalent of TWO_PI * fract(43758.5453 * sin(dot(centroid.xz,
// vec2(12.9898, 78.233))))). No per-frame CPU work.
function suspensionPhaseFor(position) {
  const raw = 43758.5453 * Math.sin(position.x * 12.9898 + position.z * 78.233);
  return Math.PI * 2 * (raw - Math.floor(raw));
}

// Pointer wake splat writer: on raycast pointer-move, append a world-space splat
// (hit xyz + spawn time on the shared uBrickTime clock) to the uSplatCoords ring
// buffer when the hit moved far enough from the last splat or enough time elapsed.
// Amplitude scales with pointer speed (slow drag ~0.03, fast flick ~0.10 dome-local
// units). Zero textures, zero draws, zero per-frame CPU: dissipation happens in the
// vertex shader.
function writePointerWakeSplat(material, event) {
  const uniforms = material?.userData?.brickUniforms;
  const state = material?.userData?.wakeState;
  const point = event?.point;
  if (!uniforms?.uSplatCoords || !state || !point) return;
  const wake = DOME_FLOAT_PROFILE.wake;
  const worldScale = OBSERVATORY_MACRO_SCALE_PROFILE.worldScale;
  const stampMs = typeof performance !== "undefined" ? performance.now() : Date.now();
  const movedWorld = state.hasLast ? point.distanceTo(state.lastPoint) : Infinity;
  const elapsedMs = stampMs - state.lastStampMs;
  if (
    state.hasLast &&
    movedWorld < wake.minSplatDistanceLocal * worldScale &&
    elapsedMs < wake.minSplatIntervalMs
  ) {
    return;
  }
  const speedLocal =
    state.hasLast && elapsedMs > 0 ? movedWorld / worldScale / (elapsedMs / 1000) : 0;
  const amplitude = THREE.MathUtils.clamp(
    0.018 + speedLocal * 0.02,
    wake.amplitudeRangeLocal[0],
    wake.amplitudeRangeLocal[1],
  );
  const index = state.index;
  uniforms.uSplatCoords.value[index].set(point.x, point.y, point.z, uniforms.uBrickTime.value);
  uniforms.uSplatAmps.value[index] = amplitude;
  state.index = (index + 1) % wake.splatCount;
  state.lastPoint.copy(point);
  state.lastStampMs = stampMs;
  state.hasLast = true;
}

// Per-instance detachment state. The same instances stay in the same instanced draw;
// only their transforms change, so knocking the shell apart adds zero draw calls.
function createKnockState() {
  return {
    detached: false,
    instanceFallOffset: 0,
    instanceFallVelocity: 0,
    knockAngle: 0,
    knockAxis: new THREE.Vector3(0, 1, 0),
    knockHidden: false,
    knockOffsetX: 0,
    knockOffsetZ: 0,
    knockSettled: false,
    knockSpin: 0,
    knockVelocityX: 0,
    knockVelocityZ: 0,
  };
}

// Deterministic per-brick tumble seed. Same brick index, same salt, same tumble on
// every run and every reload; there is no Math.random anywhere in the damage path.
function knockHash(index, salt) {
  const raw = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return raw - Math.floor(raw);
}

function detachKnockedBlock(block, index, strength, biasX = 0, biasZ = 0) {
  if (block.detached) return false;
  const hashA = knockHash(index, 1);
  const hashB = knockHash(index, 2);
  const hashC = knockHash(index, 3);
  const radial = Math.hypot(block.basePosition.x, block.basePosition.z) || 1;
  const outwardX = block.basePosition.x / radial + biasX * 0.6;
  const outwardZ = block.basePosition.z / radial + biasZ * 0.6;
  const lateral = DOME_RAM_KNOCK_PROFILE.lateralMetresPerSecond * (0.45 + strength);
  block.detached = true;
  block.knockSettled = false;
  block.instanceFallVelocity = 0.14 + strength * 0.42;
  block.knockVelocityX = (outwardX * (0.55 + hashA * 0.8) + (hashB - 0.5) * 0.6) * lateral;
  block.knockVelocityZ = (outwardZ * (0.55 + hashB * 0.8) + (hashC - 0.5) * 0.6) * lateral;
  block.knockSpin =
    (hashC - 0.5) * 2 * DOME_RAM_KNOCK_PROFILE.tumbleSpinRadiansPerSecond * (0.4 + strength);
  block.knockAxis.set(hashA - 0.5, hashB - 0.5, hashC - 0.5);
  if (block.knockAxis.lengthSq() < 1e-6) block.knockAxis.set(0, 1, 0);
  block.knockAxis.normalize();
  return true;
}

// Knock the bricks nearest the projected seal contact point loose. Bounded per ram so
// a single hit chips the shell instead of erasing it; repeated rams accumulate.
function knockBlocksNearContact(blocks, contactPoint, strength, damageFraction = 0) {
  // The reach grows with accumulated damage: a shell that has already lost courses has
  // less to hold the next ones, so repeated rams escalate instead of plateauing.
  const radius =
    DOME_RAM_KNOCK_PROFILE.knockRadiusLocal *
    (0.55 + strength * 0.8) *
    (1 + damageFraction * DOME_RAM_KNOCK_PROFILE.damageReachGain);
  const reach = Math.hypot(contactPoint.x, contactPoint.z) || 1;
  const biasX = contactPoint.x / reach;
  const biasZ = contactPoint.z / reach;
  let knocked = 0;
  for (let index = 0; index < blocks.length; index += 1) {
    if (knocked >= DOME_RAM_KNOCK_PROFILE.maxBricksPerRam) break;
    const block = blocks[index];
    if (block.detached) continue;
    if (block.basePosition.distanceTo(contactPoint) > radius) continue;
    if (detachKnockedBlock(block, index, strength, biasX, biasZ)) knocked += 1;
  }
  return knocked;
}

function collapseRemainingBlocks(blocks) {
  for (let index = 0; index < blocks.length; index += 1) {
    detachKnockedBlock(blocks[index], index, 0.85);
  }
}

function buildDomeBlockInstances(lattice) {
  const blocks = [];
  const matrixBasis = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const matrix = new THREE.Matrix4();

  for (const cell of lattice.visibleCells) {
    const tangent = new THREE.Vector3().fromArray(cell.tangent);
    const bitangent = new THREE.Vector3().fromArray(cell.bitangent);
    const normal = new THREE.Vector3().fromArray(cell.normal);
    matrixBasis.makeBasis(tangent, bitangent, normal);
    quaternion.setFromRotationMatrix(matrixBasis);
    const thickness = cell.scale[2];
    const position = new THREE.Vector3()
      .fromArray(cell.position)
      .addScaledVector(normal, thickness * 0.46 + 0.012 + (cell.frostSeed - 0.5) * 0.006);
    const scale = new THREE.Vector3().fromArray(cell.scale);
    matrix.compose(position, quaternion, scale);
    blocks.push({
      bevel: 0.34 + cell.bevelSeed * 0.58,
      color: colorForDomeBlock(position, cell.frostSeed),
      cell,
      delay: Math.min(0.76, cell.ringIndex * 0.06 + (cell.cellIndex % 5) * 0.024),
      facet: cell.facetSeed,
      // Centroid angle around the dome Y axis feeds the coherent traveling wave.
      floatAzimuth: Math.atan2(position.z, position.x),
      floatHeight: cell.height01,
      floatPhase: suspensionPhaseFor(position),
      frost: cell.frostSeed,
      mass: Math.min(3.2, 1.05 + cell.mass * 0.46),
      matrix: matrix.clone(),
      basePosition: position.clone(),
      baseQuaternion: quaternion.clone(),
      baseScale: scale.clone(),
      renderMatrix: matrix.clone(),
      ...createKnockState(),
    });
  }
  return blocks;
}

// Courses along the tunnel, not one ring at its mouth. The reference builds its
// entrance out of the same laid blocks as the dome, so the passage reads as
// masonry from every angle; a single face arch over a shader-banded barrel reads
// as a pipe with a decorated end, which is what this was while the tunnel was
// too short to see. Ring spacing sets the block depth so courses abut, and
// alternate rings step half a block round the arch the way the dome's courses
// stagger.
const AIRLOCK_COURSE_COUNT = 4;

function buildAirlockBlockInstances() {
  const blocks = [];
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const mouthZ = AIRLOCK.depth + 0.075;
  const springY = AIRLOCK.springY;
  const radius = AIRLOCK.outerRadius + 0.018;
  const archCount = 11;
  const courseDepth = mouthZ / AIRLOCK_COURSE_COUNT;
  for (let course = 0; course < AIRLOCK_COURSE_COUNT; course += 1) {
    const z = mouthZ - course * courseDepth;
    const stagger = course % 2 === 0 ? 0 : 0.5;
    for (let index = 0; index < archCount; index += 1) {
      const angle = ((index + stagger) / (archCount - 1)) * Math.PI;
      if (angle > Math.PI) continue;
      const frost = ((index + course * 3) * 0.61803398875) % 1;
      quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle - HALF_PI);
      scale.set((Math.PI * radius * 0.86) / (archCount - 1), 0.19, courseDepth * 0.94);
      const position = new THREE.Vector3(
        Math.cos(angle) * radius,
        springY + Math.sin(angle) * radius,
        z,
      );
      matrix.compose(position, quaternion, scale);
      blocks.push({
        bevel: 0.42 + ((index + course) % 5) * 0.11,
        color: colorForAirlockBlock(position, frost),
        delay: course * 0.06 + index * 0.045,
        facet: ((index + course * 2) * 0.41421356237) % 1,
        // The airlock arch stays mortared (float weight 0) so the always-on amber
        // threshold keeps a seated masonry frame under the suspended shell.
        floatAzimuth: Math.atan2(position.z, position.x),
        floatHeight: 0,
        floatPhase: suspensionPhaseFor(position),
        frost,
        mass: 1.3 + frost,
        matrix: matrix.clone(),
        basePosition: position.clone(),
        baseQuaternion: quaternion.clone(),
        baseScale: scale.clone(),
        renderMatrix: matrix.clone(),
        ...createKnockState(),
      });
    }
  }
  for (const side of [-1, 1]) {
    for (let course = 0; course < AIRLOCK_COURSE_COUNT; course += 1) {
     for (let row = 0; row < 3; row += 1) {
      const z = mouthZ - course * courseDepth;
      const frost = ((row + 1 + course) * (side < 0 ? 0.271 : 0.731)) % 1;
      quaternion.identity();
      scale.set(0.19, 0.19, courseDepth * 0.94);
      const position = new THREE.Vector3(side * radius, 0.09 + row * 0.19, z);
      matrix.compose(position, quaternion, scale);
      blocks.push({
        bevel: 0.5 + row * 0.14,
        color: colorForAirlockBlock(position, frost),
        delay: 0.18 + row * 0.08,
        facet: ((row + 1) * (side < 0 ? 0.382 : 0.618)) % 1,
        floatAzimuth: Math.atan2(position.z, position.x),
        floatHeight: 0,
        floatPhase: suspensionPhaseFor(position),
        frost,
        mass: 1.4 + frost,
        matrix: matrix.clone(),
        basePosition: position.clone(),
        baseQuaternion: quaternion.clone(),
        baseScale: scale.clone(),
        renderMatrix: matrix.clone(),
        ...createKnockState(),
      });
     }
    }
  }
  return blocks;
}

function applyInstances(mesh, blocks, geometry) {
  const bevel = new Float32Array(blocks.length);
  const facet = new Float32Array(blocks.length);
  const floatData = new Float32Array(blocks.length * 3);
  const frost = new Float32Array(blocks.length);
  const hover = new Float32Array(blocks.length);
  const mass = new Float32Array(blocks.length);
  const delay = new Float32Array(blocks.length);
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    mesh.setMatrixAt(index, block.matrix);
    mesh.setColorAt(index, block.color);
    bevel[index] = block.bevel;
    facet[index] = block.facet;
    floatData[index * 3] = block.floatHeight ?? 0;
    floatData[index * 3 + 1] = block.floatPhase ?? 0;
    floatData[index * 3 + 2] = block.floatAzimuth ?? 0;
    frost[index] = block.frost;
    mass[index] = block.mass;
    delay[index] = block.delay;
  }
  geometry.setAttribute("instanceBevel", new THREE.InstancedBufferAttribute(bevel, 1));
  geometry.setAttribute("instanceFacet", new THREE.InstancedBufferAttribute(facet, 1));
  geometry.setAttribute("instanceFloat", new THREE.InstancedBufferAttribute(floatData, 3));
  geometry.setAttribute("instanceFrost", new THREE.InstancedBufferAttribute(frost, 1));
  geometry.setAttribute("instanceHover", new THREE.InstancedBufferAttribute(hover, 1));
  geometry.setAttribute("instanceMass", new THREE.InstancedBufferAttribute(mass, 1));
  geometry.setAttribute("instanceDelay", new THREE.InstancedBufferAttribute(delay, 1));
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  geometry.attributes.instanceBevel.needsUpdate = true;
  geometry.attributes.instanceFacet.needsUpdate = true;
  geometry.attributes.instanceFloat.needsUpdate = true;
  geometry.attributes.instanceFrost.needsUpdate = true;
  geometry.attributes.instanceHover.needsUpdate = true;
  geometry.attributes.instanceMass.needsUpdate = true;
  geometry.attributes.instanceDelay.needsUpdate = true;
  mesh.computeBoundingSphere();
}

function resetDetachedBlocks(mesh, blocks) {
  if (!mesh || !blocks) return false;
  let changed = false;
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (!block.detached && block.instanceFallOffset === 0 && block.instanceFallVelocity === 0) continue;
    Object.assign(block, createKnockState());
    block.renderMatrix.copy(block.matrix);
    mesh.setMatrixAt(index, block.renderMatrix);
    changed = true;
  }
  if (changed) mesh.instanceMatrix.needsUpdate = true;
  return changed;
}

const KNOCK_POSITION = new THREE.Vector3();
const KNOCK_QUATERNION = new THREE.Quaternion();
const KNOCK_ZERO_SCALE = new THREE.Vector3(0, 0, 0);

function stepDetachedBlocks(mesh, blocks, hover, pointerInteractionEnabled, reducedMotion, delta) {
  // instanceFallOffset and instanceFallVelocity implement damped gravity; the lateral
  // and spin terms are the deterministic knock tumble. Detached bricks keep falling
  // and stay fallen whether or not the pointer is still over the shell: only an
  // explicit rebuild re-seats them.
  if (!mesh || !blocks || !hover) return 0;

  let matrixChanged = false;
  let detachedCount = 0;
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const hoverValue = hover.getX(index);
    if (
      !block.detached &&
      pointerInteractionEnabled &&
      hoverValue >= DOME_TILE_FALL_PROFILE.detachThreshold
    ) {
      detachKnockedBlock(block, index, 0.35);
    }
    if (!block.detached) continue;
    detachedCount += 1;

    if (reducedMotion) {
      // Reduced motion: the brick is simply not there any more. Zero scale on the same
      // instance, no gravity, no tumble, and it reappears on rebuild.
      if (!block.knockHidden) {
        block.renderMatrix.compose(block.basePosition, block.baseQuaternion, KNOCK_ZERO_SCALE);
        mesh.setMatrixAt(index, block.renderMatrix);
        block.knockHidden = true;
        matrixChanged = true;
      }
      continue;
    }
    if (block.knockSettled) continue;

    block.instanceFallVelocity += DOME_TILE_FALL_PROFILE.gravity * delta;
    block.instanceFallOffset += block.instanceFallVelocity * delta;
    const floorOffset = DOME_TILE_FALL_PROFILE.settleFloorY - block.basePosition.y;
    let grounded = false;
    if (block.instanceFallOffset <= floorOffset) {
      block.instanceFallOffset = floorOffset;
      grounded = true;
      if (Math.abs(block.instanceFallVelocity) > DOME_TILE_FALL_PROFILE.settleVelocity) {
        block.instanceFallVelocity = -block.instanceFallVelocity * DOME_TILE_FALL_PROFILE.settleBounce;
      } else {
        block.instanceFallVelocity = 0;
      }
    }
    block.instanceFallVelocity *= Math.exp(-DOME_TILE_FALL_PROFILE.damping * delta);
    const friction = Math.exp(
      -(grounded ? DOME_TILE_FALL_PROFILE.groundFriction : DOME_TILE_FALL_PROFILE.damping) * delta,
    );
    block.knockVelocityX *= friction;
    block.knockVelocityZ *= friction;
    block.knockSpin *= friction;
    block.knockOffsetX += block.knockVelocityX * delta;
    block.knockOffsetZ += block.knockVelocityZ * delta;
    block.knockAngle += block.knockSpin * delta;
    KNOCK_POSITION.set(
      block.basePosition.x + block.knockOffsetX,
      block.basePosition.y + block.instanceFallOffset,
      block.basePosition.z + block.knockOffsetZ,
    );
    KNOCK_QUATERNION.setFromAxisAngle(block.knockAxis, block.knockAngle).multiply(
      block.baseQuaternion,
    );
    block.renderMatrix.compose(KNOCK_POSITION, KNOCK_QUATERNION, block.baseScale);
    mesh.setMatrixAt(index, block.renderMatrix);
    matrixChanged = true;
    if (
      grounded &&
      block.instanceFallVelocity === 0 &&
      Math.abs(block.knockSpin) < 0.01 &&
      Math.hypot(block.knockVelocityX, block.knockVelocityZ) < 0.01
    ) {
      block.knockSettled = true;
    }
  }
  if (matrixChanged) {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }
  return detachedCount;
}

function updateHoverTargets(targets, blocks, nextIndex) {
  if (!targets) return;
  const contactCell = blocks?.[nextIndex]?.cell;
  if (contactCell) {
    for (let index = 0; index < targets.length; index += 1) {
      const cell = blocks[index]?.cell;
      targets[index] = cell ? computePolarDomeInteractionWeight(cell, contactCell.normal) : 0;
    }
    return;
  }
  if (blocks?.[0]?.cell) {
    targets.fill(0);
    return;
  }
  targets.fill(0);
  if (Number.isInteger(nextIndex) && nextIndex >= 0 && nextIndex < targets.length) targets[nextIndex] = 1;
}

function useSmoothHoverAttribute(
  meshRef,
  blocks,
  targetsRef,
  pointerInteractionEnabled,
  reducedMotion,
  proximityRef,
  damageRef,
) {
  const knockSequenceRef = useRef(0);
  const rebuildSequenceRef = useRef(0);
  useFrame((_, delta) => {
    const mesh = meshRef.current;
    const hover = mesh?.geometry?.getAttribute("instanceHover");
    if (!hover) return;
    const damage = damageRef?.current;
    if (damage) {
      // The shell re-lays itself: every brick returns to its seated matrix and the
      // existing bottom-up uBrickReveal materialize replays from zero.
      if (damage.rebuildSequence !== rebuildSequenceRef.current) {
        rebuildSequenceRef.current = damage.rebuildSequence;
        resetDetachedBlocks(mesh, blocks);
        damage.detachedCount = 0;
      }
      // A real seal ram: knock the bricks nearest the projected contact point loose.
      if (damage.knockSequence !== knockSequenceRef.current) {
        knockSequenceRef.current = damage.knockSequence;
        knockBlocksNearContact(
          blocks,
          damage.knockPoint,
          damage.knockStrength,
          blocks.length ? damage.detachedCount / blocks.length : 0,
        );
      }
    }
    // Pointer lift ramps with nearness rather than switching on at a dock point.
    const proximityGain = proximityRef ? THREE.MathUtils.clamp(proximityRef.current ?? 0, 0, 1) : 1;
    let changed = false;
    for (let index = 0; index < hover.count; index += 1) {
      const target = pointerInteractionEnabled
        ? (targetsRef.current[index] ?? 0) * proximityGain
        : 0;
      const current = hover.getX(index);
      const response = target > current
        ? DOME_POINTER_LIFT_PROFILE.approachResponse
        : DOME_POINTER_LIFT_PROFILE.recoveryResponse;
      const next = reducedMotion ? target : THREE.MathUtils.damp(current, target, response, delta);
      if (Math.abs(next - current) < 0.0001) continue;
      hover.setX(index, next);
      changed = true;
    }
    if (changed) hover.needsUpdate = true;
    const detachedCount = stepDetachedBlocks(
      mesh,
      blocks,
      hover,
      pointerInteractionEnabled,
      reducedMotion,
      delta,
    );
    if (!damage) return;
    damage.totalCount = blocks.length;
    damage.detachedCount = detachedCount;
    if (!damage.demolished && detachedCount >= blocks.length * DOME_DEMOLITION_PROFILE.collapseFraction) {
      collapseRemainingBlocks(blocks);
      damage.demolished = true;
    }
  });
}

function InstancedDomeBlocks({
  assets,
  damageRef,
  lattice,
  pointerInteractionEnabled,
  proximityRef,
  reducedMotion,
}) {
  const meshRef = useRef(null);
  const hoveredRef = useRef(-1);
  const blocks = useMemo(() => buildDomeBlockInstances(lattice), [lattice]);
  const hoverTargetsRef = useRef(new Float32Array(blocks.length));
  useEffect(() => {
    hoverTargetsRef.current = new Float32Array(blocks.length);
  }, [blocks.length]);
  useSmoothHoverAttribute(
    meshRef,
    blocks,
    hoverTargetsRef,
    pointerInteractionEnabled,
    reducedMotion,
    proximityRef,
    damageRef,
  );
  useLayoutEffect(() => {
    if (!meshRef.current) return;
    applyInstances(meshRef.current, blocks, assets.domeGeometry);
  }, [assets.domeGeometry, blocks]);
  return (
    <instancedMesh
      args={[assets.domeGeometry, assets.material, blocks.length]}
      castShadow
      name={`InstancedDomeBlocks ${blocks.length}-blocks one-draw`}
      receiveShadow
      ref={meshRef}
      onPointerMove={(event) => {
        if (!pointerInteractionEnabled) return;
        event.stopPropagation();
        writePointerWakeSplat(assets.material, event);
        const nextIndex = Number.isInteger(event.instanceId) ? event.instanceId : -1;
        if (hoveredRef.current === nextIndex) return;
        updateHoverTargets(hoverTargetsRef.current, blocks, nextIndex);
        hoveredRef.current = nextIndex;
      }}
      onPointerOut={() => {
        updateHoverTargets(hoverTargetsRef.current, blocks, -1);
        hoveredRef.current = -1;
      }}
      userData={{ className: "ice-block instanced-dome-block" }}
    />
  );
}

function InstancedAirlockBlocks({ assets, pointerInteractionEnabled, proximityRef, reducedMotion }) {
  const meshRef = useRef(null);
  const hoveredRef = useRef(-1);
  const blocks = useMemo(() => buildAirlockBlockInstances(), []);
  const hoverTargetsRef = useRef(new Float32Array(blocks.length));
  // The arch is the doorway frame and is never demolished: no damage ref here.
  useSmoothHoverAttribute(
    meshRef,
    blocks,
    hoverTargetsRef,
    pointerInteractionEnabled,
    reducedMotion,
    proximityRef,
  );
  useLayoutEffect(() => {
    if (!meshRef.current) return;
    applyInstances(meshRef.current, blocks, assets.airlockGeometry);
  }, [assets.airlockGeometry, blocks]);
  return (
    <instancedMesh
      args={[assets.airlockGeometry, assets.material, blocks.length]}
      castShadow={false}
      name={`InstancedAirlockBlocks ${blocks.length}-blocks one-draw`}
      receiveShadow={false}
      ref={meshRef}
      onPointerMove={(event) => {
        if (!pointerInteractionEnabled) return;
        event.stopPropagation();
        writePointerWakeSplat(assets.material, event);
        const nextIndex = Number.isInteger(event.instanceId) ? event.instanceId : -1;
        if (hoveredRef.current === nextIndex) return;
        updateHoverTargets(hoverTargetsRef.current, blocks, nextIndex);
        hoveredRef.current = nextIndex;
      }}
      onPointerOut={() => {
        updateHoverTargets(hoverTargetsRef.current, blocks, -1);
        hoveredRef.current = -1;
      }}
      userData={{ className: "ice-block instanced-airlock-block" }}
    />
  );
}

function appendSkeletonTube(
  geometries,
  points,
  quality,
  radius,
) {
  if (!points || points.length < 2) return;
  const vectors = points.map((point) => new THREE.Vector3().fromArray(point));
  const curve = new THREE.CatmullRomCurve3(vectors, false, "centripetal");
  const segmentScale = quality === "high" ? 1 : quality === "medium" ? 0.8 : 0.62;
  const tubularSegments = Math.max(
    8,
    Math.round(points.length * segmentScale),
  );
  geometries.push(
    new THREE.TubeGeometry(
      curve,
      tubularSegments,
      radius,
      quality === "high" ? 6 : 4,
      false,
    ),
  );
}

function createLatticeSkeletonGeometry(lattice, quality) {
  const geometries = [];
  for (const rib of lattice.ribs) {
    appendSkeletonTube(geometries, rib.points, quality, 0.007);
  }
  for (const seam of lattice.ringSeams) {
    for (const segment of seam.segments) {
      appendSkeletonTube(geometries, segment, quality, 0.006);
    }
  }
  for (const segment of lattice.baseRing.segments) {
    appendSkeletonTube(geometries, segment, quality, 0.016);
  }
  appendSkeletonTube(geometries, lattice.doorwayArch, quality, 0.013);
  const merged = mergeGeometries(geometries, false);
  for (const geometry of geometries) geometry.dispose();
  if (!merged) {
    const fallbackCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, DOME_CENTER_Y + DOME_RADIUS.y, 0),
      new THREE.Vector3(DOME_RADIUS.x, DOME_CENTER_Y, 0),
    ]);
    return new THREE.TubeGeometry(fallbackCurve, 16, 0.007, 4, false);
  }
  merged.computeVertexNormals();
  return merged;
}

function useLatticeSkeletonGeometry(lattice, quality) {
  const geometry = useMemo(
    () => createLatticeSkeletonGeometry(lattice, quality),
    [lattice, quality],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

function createAirlockShape(radius) {
  const shape = new THREE.Shape();
  const springY = AIRLOCK.springY;
  shape.moveTo(-radius, 0);
  shape.lineTo(radius, 0);
  shape.lineTo(radius, springY);
  shape.absarc(0, springY, radius, 0, Math.PI, false);
  shape.lineTo(-radius, 0);
  shape.closePath();
  return shape;
}

function createAirlockHole(radius) {
  const hole = new THREE.Path();
  const springY = AIRLOCK.springY;
  hole.moveTo(-radius, 0);
  hole.lineTo(-radius, springY);
  hole.absarc(0, springY, radius, Math.PI, 0, true);
  hole.lineTo(radius, 0);
  hole.lineTo(-radius, 0);
  hole.closePath();
  return hole;
}

function createAirlockShellGeometry(quality) {
  const outer = createAirlockShape(AIRLOCK.outerRadius);
  outer.holes.push(createAirlockHole(AIRLOCK.innerRadius));
  const geometry = new THREE.ExtrudeGeometry(outer, {
    bevelEnabled: quality !== "low",
    bevelSegments: quality === "high" ? 3 : 2,
    bevelSize: 0.035,
    bevelThickness: 0.035,
    curveSegments: quality === "low" ? 10 : quality === "medium" ? 18 : 24,
    depth: AIRLOCK.depth,
    steps: 1,
  });
  geometry.computeVertexNormals();
  return geometry;
}

function createAirlockDoorGeometry(quality) {
  const geometry = new THREE.ExtrudeGeometry(createAirlockShape(AIRLOCK.innerRadius * 0.91), {
    bevelEnabled: quality !== "low",
    bevelSegments: quality === "high" ? 2 : 1,
    bevelSize: 0.014,
    bevelThickness: 0.014,
    curveSegments: quality === "low" ? 8 : 18,
    depth: 0.038,
    steps: 1,
  });
  geometry.computeVertexNormals();
  return geometry;
}

function useAirlockGeometries(quality) {
  const shell = useMemo(() => createAirlockShellGeometry(quality), [quality]);
  const door = useMemo(() => createAirlockDoorGeometry(quality), [quality]);
  useEffect(
    () => () => {
      shell.dispose();
      door.dispose();
    },
    [door, shell],
  );
  return { door, shell };
}

function ContinuousDomeIceMaterial({ material }) {
  return <primitive attach="material" object={material} />;
}

function ContinuousDomeTopology({ castShadow = true, material, quality, visible = true }) {
  const widthSegments = quality === "high" ? 96 : quality === "medium" ? 72 : 48;
  const heightSegments = quality === "high" ? 48 : quality === "medium" ? 36 : 24;
  const mortarFill = quality === "low" ? 1 : 1.004;
  return (
    <mesh
      castShadow={castShadow}
      name="ContinuousDomeTopology shader-course-ice-shell"
      position={[0, DOME_CENTER_Y, 0]}
      receiveShadow
      scale={[
        DOME_RADIUS.x * mortarFill,
        DOME_RADIUS.y * mortarFill,
        DOME_RADIUS.z * mortarFill,
      ]}
      userData={{ className: "ice-block igloo-dome shader-course-shell" }}
      visible={visible}
    >
      <sphereGeometry args={[1, widthSegments, heightSegments, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
      <ContinuousDomeIceMaterial material={material} />
    </mesh>
  );
}

function MergedLatticeSkeleton({ accent, lattice, proximityRef, quality }) {
  const geometry = useLatticeSkeletonGeometry(lattice, quality);
  const materialRef = useRef(null);
  const baseOpacity = quality === "low" ? 0.075 : 0.065;
  // Rim ribs breathe brighter as the seal approaches the observatory.
  useFrame(() => {
    if (!materialRef.current) return;
    const proximity = proximityRef?.current ?? 0;
    materialRef.current.opacity = baseOpacity + proximity * 0.1;
  });
  return (
    <mesh
      geometry={geometry}
      name={`merged-lattice-skeleton ${lattice.ribs.length}-ribs ${lattice.ringSeams.length}-ring-seams base-compression-ring doorway-arch one-draw`}
      renderOrder={2}
      userData={{
        className: "dome-lattice-skeleton",
        doorwayAligned: true,
        version: lattice.version,
      }}
    >
      <meshBasicMaterial
        color={quality === "low" ? accent : OBSERVATORY_PERSONALITY.lighting.rim}
        depthWrite={false}
        opacity={baseOpacity}
        ref={materialRef}
        transparent
      />
    </mesh>
  );
}

const DOOR_GLOW_DIM = new THREE.Color("#D89A55");
const DOOR_GLOW_BRIGHT = new THREE.Color("#FFCF8F");

function IntegratedAirlock({
  assets,
  material,
  pointerInteractionEnabled,
  proximityRef,
  quality,
  reducedMotion,
  showBlocks,
}) {
  const geometries = useAirlockGeometries(quality);
  const doorGlowRef = useRef(null);
  const thresholdLightRef = useRef(null);
  const baseThresholdIntensity = OBSERVATORY_HOME_LIGHT_PROFILE.intensity[quality];

  // Standing warm interior glow: always on (idle and undocked), gently breathing, and
  // lifting continuously with how near the seal is. The threshold brightening is the
  // dome's own "arrived" signal and is a function of distance, not of a dock event.
  useFrame(({ clock }) => {
    const glowPulse = reducedMotion
      ? 0.78
      : 0.78 + Math.sin(clock.elapsedTime * 1.4) * 0.22;
    const proximity = THREE.MathUtils.clamp(proximityRef?.current ?? 0, 0, 1);
    const approachLift = 1 + proximity * DOME_PROXIMITY_RESPONSE_PROFILE.thresholdLightGain;
    if (doorGlowRef.current) {
      doorGlowRef.current.color.lerpColors(
        DOOR_GLOW_DIM,
        DOOR_GLOW_BRIGHT,
        THREE.MathUtils.clamp(glowPulse * approachLift, 0, 1),
      );
    }
    if (thresholdLightRef.current) {
      thresholdLightRef.current.intensity =
        baseThresholdIntensity * (0.72 + glowPulse * 0.42) * approachLift;
    }
  });

  return (
    <group
      name="integrated-airlock original-procedural-arch"
      position={AIRLOCK.position}
      rotation={[0, AIRLOCK.rotationY, 0]}
      userData={{
        className: "ice-block igloo-dome",
        latticeAuthority: "POLAR_DOME_AIRLOCK",
      }}
    >
      <mesh castShadow={quality === "low"} geometry={geometries.shell} material={material} receiveShadow />
      {showBlocks && (
        <InstancedAirlockBlocks
          assets={assets}
          pointerInteractionEnabled={pointerInteractionEnabled}
          proximityRef={proximityRef}
          reducedMotion={reducedMotion}
        />
      )}
      {/* Glow door sits deep in the tunnel so the opening reads as depth with warm
          light inside, not a flat warm wall at the threshold. */}
      <mesh geometry={geometries.door} position={[0, 0, 0.3]}>
        <meshBasicMaterial
          color={OBSERVATORY_HOME_LIGHT_PROFILE.color}
          ref={doorGlowRef}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      {!DOME_POINT_LIGHTS_ABLATED && (
      <pointLight
        color={OBSERVATORY_HOME_LIGHT_PROFILE.color}
        decay={2}
        distance={OBSERVATORY_HOME_LIGHT_PROFILE.distance}
        intensity={OBSERVATORY_HOME_LIGHT_PROFILE.intensity[quality]}
        name="sunrise-gold-observatory-threshold-light"
        // Inside the tunnel: amber spills out through the arch as interior depth
        // light instead of staining the exterior arch bricks warm.
        position={[0, 0.3, 0.34]}
        ref={thresholdLightRef}
      />
      )}
    </group>
  );
}

function colorGeometry(geometry, color) {
  const resolved = new THREE.Color(color);
  const colors = new Float32Array(geometry.getAttribute("position").count * 3);
  for (let index = 0; index < colors.length; index += 3) {
    colors[index] = resolved.r;
    colors[index + 1] = resolved.g;
    colors[index + 2] = resolved.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function transformedGeometry(geometry, color, position, scale, rotationY = 0) {
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0, rotationY, 0),
  );
  matrix.compose(
    new THREE.Vector3(...position),
    quaternion,
    new THREE.Vector3(...scale),
  );
  geometry.applyMatrix4(matrix);
  return colorGeometry(geometry, color);
}

function createObservatoryHomeGroundGeometry(quality) {
  const pieces = [];
  const radialSegments = quality === "low" ? 28 : quality === "medium" ? 44 : 64;
  pieces.push(
    transformedGeometry(
      new THREE.CylinderGeometry(1, 1.018, 1, radialSegments),
      OBSERVATORY_PERSONALITY.palette.world.shadow,
      [0, 0.025, 0],
      [2.27, 0.055, 1.36],
    ),
  );

  const sastrugi = [
    [-1.88, 0.074, -0.82, 0.62, 0.032, 0.09, -0.24],
    [-1.54, 0.07, 0.96, 0.46, 0.026, 0.07, 0.18],
    [-0.88, 0.069, -1.22, 0.54, 0.024, 0.064, -0.08],
    [0.18, 0.071, 1.27, 0.7, 0.027, 0.068, 0.08],
    [0.96, 0.073, -1.18, 0.56, 0.029, 0.072, 0.2],
    [1.62, 0.076, 0.88, 0.48, 0.032, 0.082, -0.18],
    [1.93, 0.069, -0.54, 0.4, 0.024, 0.062, 0.28],
  ];
  for (const [x, y, z, sx, sy, sz, rotation] of sastrugi) {
    pieces.push(
      transformedGeometry(
        new THREE.BoxGeometry(1, 1, 1),
        OBSERVATORY_PERSONALITY.palette.surface,
        [x, y, z],
        [sx, sy, sz],
        rotation,
      ),
    );
  }

  const expeditionStakes = [
    [-1.84, -0.72, 0.9],
    [1.78, -0.66, -0.82],
    [1.97, 0.52, -0.52],
  ];
  for (const [x, z, rotation] of expeditionStakes) {
    pieces.push(
      transformedGeometry(
        new THREE.CylinderGeometry(1, 1, 1, quality === "low" ? 6 : 10),
        OBSERVATORY_PERSONALITY.palette.accent,
        [x, 0.34, z],
        [0.022, 0.55, 0.022],
        rotation,
      ),
    );
    pieces.push(
      transformedGeometry(
        new THREE.BoxGeometry(1, 1, 1),
        OBSERVATORY_PERSONALITY.palette.glow,
        [x + Math.cos(rotation) * 0.08, 0.54, z - Math.sin(rotation) * 0.08],
        [0.19, 0.045, 0.025],
        rotation,
      ),
    );
  }

  const merged = mergeGeometries(pieces, false);
  for (const piece of pieces) piece.dispose();
  if (!merged) {
    return colorGeometry(
      new THREE.CylinderGeometry(1, 1, 0.04, 32),
      OBSERVATORY_PERSONALITY.palette.world.shadow,
    );
  }
  merged.computeVertexNormals();
  return merged;
}

function NeutralContactPlinth({ impact, quality }) {
  const groundGeometry = useMemo(
    () => createObservatoryHomeGroundGeometry(quality),
    [quality],
  );
  useEffect(() => () => groundGeometry.dispose(), [groundGeometry]);
  return (
    <group name="bounded-neutral-contact-plinth">
      <mesh
        position={[0.03, 0.009, 0.12]}
        renderOrder={1}
        rotation={[-Math.PI * 0.5, 0, 0]}
        scale={[2.25, 1.64, 1]}
      >
        <circleGeometry args={[1, quality === "low" ? 32 : 64]} />
        <meshBasicMaterial
          color={DOME_CRYSTAL_PALETTE.contactBlueGrey}
          depthWrite={false}
          opacity={0.19 + impact * 0.0175}
          transparent
        />
      </mesh>
      <mesh
        geometry={groundGeometry}
        name="observatory-home-sastrugi-expedition-dressing one-draw"
        receiveShadow
      >
        <meshStandardMaterial
          color={OBSERVATORY_PERSONALITY.palette.surface}
          emissive={DOME_CRYSTAL_PALETTE.seamBlueGrey}
          emissiveIntensity={0.075}
          metalness={0}
          roughness={0.92}
          vertexColors
        />
      </mesh>
    </group>
  );
}

// The buried entry cache. It only exists while the shell is down, and it takes the
// hidden inner weather shell's draw slot, so the full-frame budget is unchanged. The
// point is meaning, not spectacle: the home dome is standing on the mined public
// corpus it was built from, and knocking it apart is what shows you that.
function createEntryCacheGeometry(quality) {
  const pieces = [];
  const radialSegments = quality === "low" ? 14 : quality === "medium" ? 22 : 32;
  // Excavated floor. The dome's own ground dressing carries a deliberate dark shelf
  // under the shell; with the shell down that shelf is suddenly the whole read, so the
  // cache lays its own pale packed-snow floor over it and keeps the scene glacial.
  pieces.push(
    transformedGeometry(
      new THREE.CylinderGeometry(1, 1, 1, radialSegments),
      DOME_CRYSTAL_PALETTE.frostIvory,
      [0, 0.055, 0],
      [1.5, 0.05, 1.05],
    ),
  );
  // Hearth: a low blue-grey basin with one warm ember core. This is the only warm
  // element down here, so the eye lands on it first.
  pieces.push(
    transformedGeometry(
      new THREE.CylinderGeometry(1, 0.88, 1, radialSegments),
      DOME_CRYSTAL_PALETTE.seamBlueGrey,
      [0, 0.115, 0.06],
      [0.4, 0.11, 0.4],
    ),
  );
  pieces.push(
    transformedGeometry(
      new THREE.SphereGeometry(1, radialSegments, Math.max(6, Math.round(radialSegments * 0.5))),
      DOOR_GLOW_BRIGHT,
      [0, 0.2, 0.06],
      [0.25, 0.18, 0.25],
    ),
  );
  // Plaque core: the station marker the shell was built around.
  pieces.push(
    transformedGeometry(
      new THREE.BoxGeometry(1, 1, 1),
      DOME_CRYSTAL_PALETTE.windCap,
      [0, 0.44, -0.66],
      [0.6, 0.66, 0.06],
      0.16,
    ),
  );
  pieces.push(
    transformedGeometry(
      new THREE.BoxGeometry(1, 1, 1),
      DOME_CRYSTAL_PALETTE.seamBlueGrey,
      [0, 0.14, -0.66],
      [0.72, 0.16, 0.2],
      0.16,
    ),
  );
  // Mined public-corpus crates, ringed around the hearth: same ice family as the shell
  // so they read as part of the station rather than imported cargo.
  const corpusCrates = [
    [-1.1, 0.36, 0.3, -0.42],
    [-0.66, -0.78, 0.24, 0.24],
    [0.4, -0.94, 0.32, 0.62],
    [1.14, -0.24, 0.26, -0.18],
    [0.96, 0.62, 0.22, 0.34],
    [0.16, 0.92, 0.28, -0.54],
    [-0.82, 0.82, 0.2, 0.18],
  ];
  for (const [x, z, height, rotation] of corpusCrates) {
    pieces.push(
      transformedGeometry(
        new THREE.BoxGeometry(1, 1, 1),
        DOME_CRYSTAL_PALETTE.iceBlue,
        [x, 0.08 + height * 0.5, z],
        [0.32, height, 0.26],
        rotation,
      ),
    );
    pieces.push(
      transformedGeometry(
        new THREE.BoxGeometry(1, 1, 1),
        DOME_CRYSTAL_PALETTE.windCap,
        [x, 0.08 + height + 0.016, z],
        [0.34, 0.032, 0.28],
        rotation,
      ),
    );
  }
  const merged = mergeGeometries(pieces, false);
  for (const piece of pieces) piece.dispose();
  if (!merged) {
    return colorGeometry(
      new THREE.CylinderGeometry(0.46, 0.46, 0.18, 12),
      DOME_CRYSTAL_PALETTE.frostIvory,
    );
  }
  merged.computeVertexNormals();
  return merged;
}

function BuriedEntryCache({ quality }) {
  const geometry = useMemo(() => createEntryCacheGeometry(quality), [quality]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh
      geometry={geometry}
      name="observatory-buried-entry-cache mined-public-corpus hearth plaque-core one-draw"
      renderOrder={2}
      userData={{
        cache: OBSERVATORY_ENTRY_CACHE_PROFILE,
        className: "observatory-entry-cache",
      }}
    >
      <meshStandardMaterial
        emissive={DOME_CRYSTAL_PALETTE.subsurfaceCyan}
        emissiveIntensity={0.09}
        metalness={0}
        roughness={0.8}
        vertexColors
      />
    </mesh>
  );
}

function updateDomeUniforms(material, { accent, impact, reveal, time }) {
  const uniforms = material.userData.domeUniforms;
  if (!uniforms) return;
  uniforms.uDomeAccentColor.value.set(accent);
  uniforms.uDomeImpact.value = impact;
  uniforms.uDomeReveal.value = reveal;
  uniforms.uDomeTime.value = time;
}

function updateInstancedIceUniforms(
  material,
  accent,
  impact,
  compression,
  proximity = 0,
  time = 0,
  floatMotion = 1,
  reveal = 1,
) {
  const uniforms = material.userData.brickUniforms;
  if (!uniforms) return;
  uniforms.uBrickAccent.value.set(accent);
  uniforms.uBrickCompression.value = Math.min(0.012, Math.abs(compression));
  uniforms.uBrickImpact.value = impact;
  if (uniforms.uBrickProximity) uniforms.uBrickProximity.value = proximity;
  if (uniforms.uBrickTime) uniforms.uBrickTime.value = time;
  // Reduced motion pins the temporal wave and pointer wake to zero while the
  // static suspension gaps (weight-scaled outward offsets) remain.
  if (uniforms.uBrickFloatMotion) uniforms.uBrickFloatMotion.value = floatMotion;
  // World-stream materialize progress; pinned to 1 for reduced motion by the caller.
  if (uniforms.uBrickReveal) uniforms.uBrickReveal.value = reveal;
  // Proximity stir now widens the wake footprint slightly (approach makes drags
  // stir a broader patch of shell) instead of amplifying the idle wave further.
  if (uniforms.uSplatRadius) {
    uniforms.uSplatRadius.value =
      DOME_FLOAT_PROFILE.wake.sigmaLocal *
      OBSERVATORY_MACRO_SCALE_PROFILE.worldScale *
      (1 + 0.18 * proximity);
  }
}

function stepWeightedContact(state, delta, impact, axisVelocity, reducedMotion) {
  if (reducedMotion) {
    state.displacement = 0;
    state.velocity = 0;
    state.angle = 0;
    state.angularVelocity = 0;
    state.previousImpact = impact;
    return;
  }

  const impulse = Math.max(0, impact - state.previousImpact);
  if (Math.abs(axisVelocity) > 0.02) state.direction = Math.sign(axisVelocity);
  state.velocity += state.direction * impulse * 0.095 / DOME_WEIGHTED_CONTACT_PROFILE.mass;
  state.angularVelocity -= state.direction * impulse * 0.034 / DOME_WEIGHTED_CONTACT_PROFILE.mass;

  const linearSpring = stepPolarDomeSpring(
    { displacement: state.displacement, velocity: state.velocity },
    delta,
    0,
  );
  const angularSpring = stepPolarDomeSpring(
    { displacement: state.angle, velocity: state.angularVelocity },
    delta,
    0,
  );
  state.displacement = THREE.MathUtils.clamp(
    linearSpring.displacement,
    -DOME_WEIGHTED_CONTACT_PROFILE.displacementLimit,
    DOME_WEIGHTED_CONTACT_PROFILE.displacementLimit,
  );
  state.velocity = linearSpring.velocity;
  state.angle = THREE.MathUtils.clamp(
    angularSpring.displacement,
    -DOME_WEIGHTED_CONTACT_PROFILE.angularLimitRadians,
    DOME_WEIGHTED_CONTACT_PROFILE.angularLimitRadians,
  );
  state.angularVelocity = angularSpring.velocity;
  state.previousImpact = impact;
}

export default function PolarObservatoryDome({
  activeArtifact,
  axisVelocity = 0,
  axisX,
  depthZ,
  homeX = 0,
  homePosition,
  impactPulse = 0,
  initialStreamRevealProgress = 1,
  pointerInteractionEnabled = false,
  quality = "high",
  reducedMotion = false,
  streamRevealProgressRef,
}) {
  const rootRef = useRef(null);
  const contactStateRef = useRef({
    angle: 0,
    angularVelocity: 0,
    direction: 1,
    displacement: 0,
    previousImpact: 0,
    velocity: 0,
  });
  const tier = normalizeQuality(quality);
  const lattice = useMemo(
    () => createPolarDomeLattice({ quality: tier }),
    [tier],
  );
  const shellMaterial = useAnimeIceMaterial(tier, "shell");
  const airlockMaterial = useAnimeIceMaterial(tier, "airlock");
  const innerShellMaterial = useInnerShellMaterial(tier);
  const instancedAssets = useInstancedIceAssets(tier);
  const accent = activeArtifact?.accent || DOME_XZ_COLOR_ZONES.teal;
  const resolvedHomeX = Number.isFinite(homePosition?.[0]) ? homePosition[0] : homeX;
  const resolvedHomeZ = Number.isFinite(homePosition?.[1]) ? homePosition[1] : 0;
  const resolvedAxisX = Number.isFinite(axisX) ? axisX : resolvedHomeX;
  const resolvedDepthZ = Number.isFinite(depthZ) ? depthZ : resolvedHomeZ;
  const contactDistance = Math.hypot(
    resolvedAxisX - resolvedHomeX,
    resolvedDepthZ - resolvedHomeZ,
  );
  // Continuous contact band. The traversal collider stops the seal a little outside the
  // shell, so the old 0.34m near-band could never be entered and this term was dead:
  // the dome only ever reacted to the pulse the world handed it. It now ramps with real
  // nearness, which is what makes contact feel like contact rather than a dock event.
  const contactBand =
    1 -
    THREE.MathUtils.smoothstep(
      contactDistance,
      DOME_PROXIMITY_RESPONSE_PROFILE.contactRadius,
      DOME_PROXIMITY_RESPONSE_PROFILE.nearRadius + 1.4,
    );
  const collisionImpact =
    contactBand * Math.min(1, Math.max(0, Math.abs(axisVelocity) - 0.72) * 2.1);
  const impact = Math.max(collisionImpact, Math.max(0, Math.min(1, impactPulse)));
  // Approach reactivity: 0 far from the observatory, 1 at the shell, smooth in between.
  // One ramp drives the seam/rim emissive breath, the lattice rib glow, the airlock
  // threshold lift, and whether pointer lift is live. No dock point anywhere in it.
  const approachProximity =
    1 -
    THREE.MathUtils.smoothstep(
      contactDistance,
      DOME_PROXIMITY_RESPONSE_PROFILE.nearRadius,
      DOME_PROXIMITY_RESPONSE_PROFILE.farRadius,
    );
  const proximityBreathRef = useRef(0);
  const proximityRef = useRef(0);
  const damageRef = useRef({
    cooldown: 0,
    demolished: false,
    detachedCount: 0,
    knockPoint: new THREE.Vector3(),
    knockSequence: 0,
    knockStrength: 0,
    rebuildProgress: 1,
    rebuildSequence: 0,
    totalCount: 0,
  });
  const previousPulseRef = useRef(0);
  const [shellDemolished, setShellDemolished] = useState(false);
  // Same canvas-dataset diagnostic channel the scene already uses for dome distance and
  // visibility, so the runtime damage fraction is observable without a debug overlay.
  const canvas = useThree((threeState) => threeState.gl.domElement);
  // Reduced motion runs the canvas on frameloop="demand", so an idle dome gets no
  // frames and a damage cooldown would never elapse. While anything is detached or a
  // rebuild is in flight the dome asks for the next frame itself; once the shell is
  // whole again it stops and the canvas goes back to sleep.
  const invalidate = useThree((threeState) => threeState.invalidate);
  const damageSignatureRef = useRef("");
  // The dome reacts to nearness on its own; the scene prop only widens the window.
  const proximityInteractive =
    pointerInteractionEnabled ||
    approachProximity > DOME_PROXIMITY_RESPONSE_PROFILE.hoverEnableRamp;

  useFrame(({ clock }, delta) => {
    const elapsed = reducedMotion ? 0 : clock.elapsedTime;
    const damage = damageRef.current;
    // Seal ram: the traversal collision impulse arrives as a rising impactPulse edge.
    // Project the seal's world position onto the dome ellipsoid to get the hit point.
    const pulse = Math.max(0, Math.min(1, impactPulse));
    if (
      !damage.demolished &&
      pulse >= DOME_RAM_KNOCK_PROFILE.minStrength &&
      pulse > previousPulseRef.current + 0.01
    ) {
      const worldScale = OBSERVATORY_MACRO_SCALE_PROFILE.worldScale;
      const localX = (resolvedAxisX - resolvedHomeX) / worldScale;
      const localZ = (resolvedDepthZ - resolvedHomeZ) / worldScale;
      const ellipsoidReach = Math.max(
        1e-4,
        Math.hypot(localX / DOME_RADIUS.x, localZ / DOME_RADIUS.z),
      );
      damage.knockPoint.set(
        localX / ellipsoidReach,
        DOME_RAM_KNOCK_PROFILE.contactHeightLocal,
        localZ / ellipsoidReach,
      );
      damage.knockStrength = pulse;
      damage.knockSequence += 1;
    }
    previousPulseRef.current = pulse;
    // Auto-rebuild so the world can never be permanently broken: cooldown, then replay
    // the existing bottom-up materialize by ramping the same uBrickReveal register.
    if (damage.demolished) {
      if (damage.rebuildProgress >= 1) {
        damage.cooldown += delta;
        if (damage.cooldown >= DOME_DEMOLITION_PROFILE.rebuildCooldownSeconds) {
          damage.cooldown = 0;
          damage.rebuildProgress = 0;
          damage.rebuildSequence += 1;
        }
      } else {
        damage.rebuildProgress = Math.min(
          1,
          damage.rebuildProgress + delta / DOME_DEMOLITION_PROFILE.rebuildSeconds,
        );
        if (damage.rebuildProgress >= 1) damage.demolished = false;
      }
    }
    if (shellDemolished !== damage.demolished) setShellDemolished(damage.demolished);
    if (damage.demolished || damage.detachedCount > 0 || damage.rebuildProgress < 1) invalidate();
    const damageFraction = damage.totalCount ? damage.detachedCount / damage.totalCount : 0;
    const signature = `${damageFraction.toFixed(2)}|${damage.demolished ? 1 : 0}|${damage.rebuildProgress.toFixed(2)}`;
    if (canvas && signature !== damageSignatureRef.current) {
      damageSignatureRef.current = signature;
      canvas.dataset.observatoryDomeDamage = damageFraction.toFixed(3);
      canvas.dataset.observatoryDomeDemolished = damage.demolished ? "true" : "false";
      canvas.dataset.observatoryDomeRebuild = damage.rebuildProgress.toFixed(3);
    }
    const streamReveal = streamRevealProgressRef?.current ?? initialStreamRevealProgress;
    const reveal = Math.min(streamReveal, damage.rebuildProgress);
    const proximityBreath = reducedMotion
      ? approachProximity
      : approachProximity * (0.78 + 0.22 * Math.sin(clock.elapsedTime * 1.5));
    proximityBreathRef.current = proximityBreath;
    proximityRef.current = approachProximity;
    updateDomeUniforms(shellMaterial, { accent, impact, reveal, time: elapsed });
    updateDomeUniforms(airlockMaterial, { accent, impact, reveal, time: elapsed });
    if (!rootRef.current) return;
    const contactState = contactStateRef.current;
    stepWeightedContact(contactState, delta, impact, axisVelocity, reducedMotion);
    updateInstancedIceUniforms(
      instancedAssets.material,
      accent,
      impact,
      contactState.displacement,
      proximityBreath,
      elapsed,
      reducedMotion ? 0 : 1,
      reducedMotion ? 1 : THREE.MathUtils.clamp(reveal, 0, 1),
    );
    rootRef.current.position.x = resolvedHomeX + contactState.displacement;
    rootRef.current.position.y = 0.035;
    rootRef.current.position.z = resolvedHomeZ;
    rootRef.current.rotation.y = 0;
    rootRef.current.rotation.z = contactState.angle;
  });

  return (
    <group
      name={`igloo-polar-dome PolarObservatoryDome ${DOME_INSPIRATION_CREDIT}`}
      position={[resolvedHomeX, 0.035, resolvedHomeZ]}
      ref={rootRef}
      scale={OBSERVATORY_MACRO_SCALE_PROFILE.worldScale}
      userData={{
        awardIce: DOME_AWARD_ICE_PROFILE,
        className: "igloo-polar-dome igloo-dome",
        collision: lattice.collision,
        construction: DOME_BRICK_SHADER_PROFILE,
        // Live runtime damage state (same mutable object the frame loop writes), so the
        // demolition fraction is inspectable without a second bookkeeping copy.
        damage: damageRef.current,
        demolition: DOME_DEMOLITION_PROFILE,
        entryCache: OBSERVATORY_ENTRY_CACHE_PROFILE,
        homeDressing: OBSERVATORY_HOME_DRESSING_PROFILE,
        homeWorld: OBSERVATORY_HOME_WORLD_PROFILE,
        lattice: {
          excludedCells: lattice.excludedCells.length,
          quality: lattice.quality,
          version: lattice.version,
          visibleCells: lattice.visibleCells.length,
        },
        texturePolicy: DOME_TEXTURE_POLICY,
      }}
    >
      {!DOME_POINT_LIGHTS_ABLATED && (
      <pointLight
        // Cold near-white key, not the saturated station accent: the shell carries
        // almost no body emissive now, so this local light IS the dome's colour. A
        // teal key stained every ice face cyan and read as toy plastic.
        color={DOME_CRYSTAL_PALETTE.windCap}
        decay={2}
        distance={8.5}
        // Low matches medium. These two point lights are the observatory's local
        // key and fill, and the mascot docks directly under them, so the tier
        // that cut them to 14 and 4.5 was also the tier where the character
        // measured 34 luma below its high-tier reading. The lights exist at
        // every tier regardless — their count is a shader define — and a
        // measured 0.43ms for all three is paid whether they are bright or not.
        intensity={tier === "high" ? 34 : 28}
        name="cyan-white-observatory-key-light"
        position={[-2.1, 2.9, 1.7]}
      />
      )}
      {!DOME_POINT_LIGHTS_ABLATED && (
      <pointLight
        color={DOME_CRYSTAL_PALETTE.frostIvory}
        decay={2}
        // Short range so the grazing fill stays on the shell instead of spilling onto
        // the seal and the surrounding snow.
        distance={6.5}
        intensity={tier === "high" ? 11 : 9}
        name="cold-observatory-fill-light"
        position={[2.6, 2.3, 1.5]}
      />
      )}
      <NeutralContactPlinth impact={impact} quality={tier} />
      <ContinuousDomeTopology
        castShadow={tier === "low"}
        material={tier === "low" ? shellMaterial : innerShellMaterial}
        quality={tier}
        // Demolished: the inner weather shell steps aside so the buried cache under it
        // is what you see, and hands its draw slot straight to the cache mesh.
        visible={!shellDemolished}
      />
      {shellDemolished && <BuriedEntryCache quality={tier} />}
      {/* All tiers, including low. The masonry is what makes this building an
          igloo rather than a painted dome, and the quality ladder now steps down
          to low on any machine that cannot hold 60fps at high — which is most of
          them — so dropping the blocks there meant the frame rate target and the
          building's identity were mutually exclusive. Low draws its own 32-cell
          lattice against high's 75, in the same single instanced draw. */}
      {(
        <InstancedDomeBlocks
          assets={instancedAssets}
          damageRef={damageRef}
          lattice={lattice}
          pointerInteractionEnabled={proximityInteractive}
          proximityRef={proximityRef}
          reducedMotion={reducedMotion}
        />
      )}
      <MergedLatticeSkeleton
        accent={accent}
        lattice={lattice}
        proximityRef={proximityBreathRef}
        quality={tier}
      />
      {/* All tiers use the airlock course shader so the tunnel reads as built from
          the same ice blocks as the shell, never a flat raw material. */}
      <IntegratedAirlock
        assets={instancedAssets}
        material={airlockMaterial}
        pointerInteractionEnabled={proximityInteractive}
        proximityRef={proximityRef}
        quality={tier}
        reducedMotion={reducedMotion}
        showBlocks={tier !== "low"}
      />
    </group>
  );
}
