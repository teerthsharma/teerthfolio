"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
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
  "intact by default; contact drives a heavy bounded root recoil and tiny optical signal, never shell collapse or course deformation";
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
export const DOME_TILE_FALL_PROFILE = Object.freeze({
  detachThreshold: 0.68,
  damping: 1.8,
  gravity: -4.6,
  settleBounce: 0.18,
  settleFloorY: 0.16,
  settleVelocity: 0.08,
  response: "damped gravity detachment with a soft settle while docked",
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
  "deterministic staggered lattice cells, tangent-frame block instances, recessed seams, bevel light, and per-cell frost variation";
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
  lowVisibleCalls: 6,
  lowShadowMapCalls: 2,
  fullVisibleCalls: 8,
  fullShadowMapCalls: 0,
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
export const DOME_CRYSTAL_PALETTE = Object.freeze({
  contactBlueGrey: OBSERVATORY_PERSONALITY.palette.world.shadow,
  frostIvory: OBSERVATORY_PERSONALITY.palette.surface,
  iceBlue: OBSERVATORY_PERSONALITY.palette.secondary,
  seamBlueGrey: OBSERVATORY_PERSONALITY.palette.ink,
  subsurfaceCyan: OBSERVATORY_PERSONALITY.palette.accent,
  windCap: OBSERVATORY_PERSONALITY.lighting.key,
});
export const DOME_CRYSTAL_MATERIAL_CONTRACT =
  "bright anime-soft crystalline ice; recessed blue-grey frost seams; bounded contact-weight optics";
export const OBSERVATORY_HOME_WORLD_PROFILE =
  "crystalline-articulated-observatory in a cyan-white Antarctic frost sanctuary with sunrise-gold entrance/contact light";
export const OBSERVATORY_HOME_LIGHT_PROFILE = Object.freeze({
  color: OBSERVATORY_PERSONALITY.palette.glow,
  contactColor: OBSERVATORY_PERSONALITY.palette.accent,
  distance: 3.8,
  intensity: Object.freeze({ high: 2.1, medium: 1.55, low: 0.9 }),
});
export const OBSERVATORY_HOME_DRESSING_PROFILE = Object.freeze({
  surface: "wind-carved sastrugi radiating from a grounded frost shelf",
  accents: "three cyan expedition stakes with sunrise-gold survey bands",
  drawBudget: "one merged vertex-colored draw",
});

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
    uDomeCreamColor: { value: new THREE.Color(DOME_XZ_COLOR_ZONES.cream) },
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
    clearcoat: quality === "high" ? 0.42 : 0.28,
    clearcoatRoughness: 0.54,
    color: DOME_XZ_COLOR_ZONES.frost,
    emissive: quality === "low" ? OBSERVATORY_PERSONALITY.lighting.fill : DOME_XZ_COLOR_ZONES.teal,
    emissiveIntensity: quality === "low" ? 0.14 : 0.018,
    metalness: 0,
    roughness: quality === "low" ? 0.76 : 0.7,
    side: THREE.FrontSide,
  });

  material.userData.domeUniforms = uniforms;
  material.customProgramCacheKey = () =>
    `continuous-anime-igloo-${surface}-${isFull ? "full" : "low"}-v5`;
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
float domeMortar = 1.0 - smoothstep(0.052 - domeJointAa, 0.052 + domeJointAa, domeJointDistance);
float domeBevelBand = smoothstep(0.052 + domeJointAa, 0.095, domeJointDistance)
  * (1.0 - smoothstep(0.095, 0.18, domeJointDistance));
float domeBevelDirection = mix(0.78, 1.18, step(0.5, domeCellUv.x) * 0.55 + step(0.5, domeCellUv.y) * 0.45);

vec2 domeWorldXZ = vDomeWorldPosition.xz;
float domeTealZone = exp(-dot(domeWorldXZ - vec2(-0.55, 0.42), domeWorldXZ - vec2(-0.55, 0.42)) * 0.34);
float domeSageZone = exp(-dot(domeWorldXZ - vec2(0.82, -0.34), domeWorldXZ - vec2(0.82, -0.34)) * 0.28);
float domeWarmZone = exp(-dot(domeWorldXZ - vec2(0.96, 0.84), domeWorldXZ - vec2(0.96, 0.84)) * 0.46);
vec3 domeZoneColor = mix(uDomeFrostColor, uDomeCreamColor, 0.34 + domeTheta01 * 0.08);
domeZoneColor = mix(domeZoneColor, uDomeTealColor, domeTealZone * 0.14);
domeZoneColor = mix(domeZoneColor, uDomeSageColor, domeSageZone * 0.09);
domeZoneColor = mix(domeZoneColor, uDomeWarmColor, domeWarmZone * 0.065);

vec2 domeCellId = floor(vec2(domeColumn, domeCourse));
float domeCellVariation = (domeCellHash(domeCellId) - 0.5) * 0.075;
float domeFrost = 0.5;
#ifdef DOME_FULL_QUALITY
  float domeFrostA = domeIceNoise3(vec3(domeWorldXZ * 4.8, 1.7));
  float domeFrostB = domeIceNoise3(vec3(domeWorldXZ * 11.0 + 3.4, 6.2));
  domeFrost = domeFrostA * 0.68 + domeFrostB * 0.32;
#endif

vec3 domeJointColor = mix(vec3(0.43, 0.53, 0.61), ${`vec3(${new THREE.Color(POLAR_PALETTE.horizonIndigo).r.toFixed(5)}, ${new THREE.Color(POLAR_PALETTE.horizonIndigo).g.toFixed(5)}, ${new THREE.Color(POLAR_PALETTE.horizonIndigo).b.toFixed(5)})`}, 0.14);
vec3 domeSurfaceColor = domeZoneColor * (1.0 + domeCellVariation + (domeFrost - 0.5) * 0.075);
domeSurfaceColor += uDomeBevelColor * domeBevelBand * domeBevelDirection * 0.17;
domeSurfaceColor = mix(domeSurfaceColor, domeJointColor, domeMortar * 0.78);
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
  const geometry = new RoundedBoxGeometry(1, 1, 1, quality === "high" ? 3 : 2, quality === "high" ? 0.032 : 0.026);
  const position = geometry.getAttribute("position");
  for (let index = 0; index < position.count; index += 1) {
    let x = position.getX(index);
    let y = position.getY(index);
    let z = position.getZ(index);
    const faceX = Math.max(0, 1 - x * x * 3.6);
    const faceY = Math.max(0, 1 - y * y * 3.6);
    if (z > 0.28) z += faceX * faceY * 0.012;
    const wedge = 1 + z * 0.055;
    x *= wedge * (1 - (y + 0.5) * 0.018);
    y *= 1 + z * 0.026;
    position.setXYZ(index, x, y, z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function createInstancedIceMaterial(quality) {
  const uniforms = {
    uBrickAccent: { value: new THREE.Color(DOME_XZ_COLOR_ZONES.teal) },
    uBrickCompression: { value: 0 },
    uBrickContactBlueGrey: { value: new THREE.Color(DOME_CRYSTAL_PALETTE.contactBlueGrey) },
    uBrickFrostIvory: { value: new THREE.Color(DOME_CRYSTAL_PALETTE.frostIvory) },
    uBrickImpact: { value: 0 },
    uBrickIceBlue: { value: new THREE.Color(DOME_CRYSTAL_PALETTE.iceBlue) },
    uBrickSeamBlueGrey: { value: new THREE.Color(DOME_CRYSTAL_PALETTE.seamBlueGrey) },
    uBrickSubsurfaceCyan: { value: new THREE.Color(DOME_CRYSTAL_PALETTE.subsurfaceCyan) },
    uBrickWindCap: { value: new THREE.Color(DOME_CRYSTAL_PALETTE.windCap) },
  };
  const material = new THREE.MeshPhysicalMaterial({
    clearcoat: quality === "high" ? 0.28 : 0.22,
    clearcoatRoughness: 0.56,
    color: OBSERVATORY_PERSONALITY.lighting.key,
    emissive: DOME_CRYSTAL_PALETTE.subsurfaceCyan,
    emissiveIntensity: quality === "high" ? 0.075 : 0.065,
    ior: 1.31,
    metalness: 0,
    roughness: quality === "high" ? 0.48 : 0.54,
    sheen: quality === "high" ? 0.12 : 0.08,
    sheenColor: new THREE.Color(DOME_CRYSTAL_PALETTE.frostIvory),
    sheenRoughness: 0.72,
    specularColor: new THREE.Color(OBSERVATORY_PERSONALITY.lighting.rim),
    specularIntensity: quality === "high" ? 0.46 : 0.4,
    vertexColors: true,
  });
  material.userData.brickUniforms = uniforms;
  material.customProgramCacheKey = () => `instanced-curved-ice-blocks-${quality}-crystal-v10`;
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
attribute float instanceFrost;
attribute float instanceHover;
attribute float instanceMass;
uniform float uBrickCompression;
uniform float uBrickImpact;
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
float brickArrival = smoothstep(instanceDelay, min(1.0, instanceDelay + 0.22), uBrickImpact);
float brickCollisionCompression = uBrickCompression * brickArrival / max(instanceMass, 0.75);
float brickHoverLift = instanceHover * 0.15;
transformed.z += brickHoverLift - brickCollisionCompression;
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
normal = normalize(normal + brickFrostGradient * ${quality === "high" ? "0.16" : "0.11"});`,
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
float brickCrystalHeight = mix(brickAnisotropicFrost, brickCrossFacet, 0.24);
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

float brickEdgeDistance = 0.5 - max(abs(vBrickLocalPosition.x), abs(vBrickLocalPosition.y));
float brickBevelWidth = mix(0.07, 0.125, clamp(vBrickBevel, 0.0, 1.0));
float brickRecess = 1.0 - smoothstep(0.012, brickBevelWidth * 0.72, brickEdgeDistance);
float brickBevelLight = smoothstep(0.008, brickBevelWidth * 0.56, brickEdgeDistance)
  * (1.0 - smoothstep(brickBevelWidth * 0.56, brickBevelWidth, brickEdgeDistance));
float brickWindCap = smoothstep(0.14, 0.46, vBrickLocalPosition.y)
  * (0.72 + brickFrost * 0.28);
float brickCrownHighlight = clamp(
  smoothstep(0.48, 0.84, brickNormal.y) * (1.0 - smoothstep(0.93, 1.0, brickNormal.y) * 0.42),
  0.0,
  0.72
);
float brickContactOcclusion = (1.0 - smoothstep(0.12, 0.62, vBrickWorldPosition.y))
  * (0.72 + (1.0 - brickWrappedDiffuse) * 0.28);

vec2 brickWorldXZ = vBrickWorldPosition.xz;
float brickCyanZone = exp(-dot(brickWorldXZ - vec2(-0.55, 0.42), brickWorldXZ - vec2(-0.55, 0.42)) * 0.3);
float brickIvoryZone = exp(-dot(brickWorldXZ - vec2(0.82, -0.34), brickWorldXZ - vec2(0.82, -0.34)) * 0.26);
vec3 brickXzTint = mix(uBrickIceBlue, uBrickSubsurfaceCyan, brickCyanZone * 0.16);
brickXzTint = mix(brickXzTint, uBrickFrostIvory, brickIvoryZone * 0.18);

vec3 brickSurface = mix(diffuseColor.rgb, brickXzTint, 0.34);
brickSurface *= 0.88 + brickWrappedDiffuse * 0.17 + (brickFrost - 0.5) * 0.055;
brickSurface = mix(brickSurface, uBrickWindCap, brickWindCap * 0.18 + brickCrownHighlight * 0.08);
brickSurface = mix(brickSurface, uBrickSeamBlueGrey, brickRecess * 0.24);
brickSurface += uBrickFrostIvory * brickBevelLight * (0.075 + vBrickFacet * 0.025);
brickSurface = mix(brickSurface, uBrickContactBlueGrey, brickContactOcclusion * 0.08);
diffuseColor.rgb = brickSurface;`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
roughnessFactor = clamp(
  roughnessFactor + (brickAnisotropicFrost - 0.5) * 0.12 + brickWindCap * 0.08 - brickBevelLight * 0.06,
  0.3,
  0.68
);`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
float brickContactSignal = uBrickImpact * (0.012 + brickBevelLight * 0.026);
totalEmissiveRadiance += brickSurface * (0.075 + brickWrappedDiffuse * 0.025);
totalEmissiveRadiance += uBrickIceBlue * 0.018;
totalEmissiveRadiance += uBrickSubsurfaceCyan * brickTransmission * 0.19;
totalEmissiveRadiance += uBrickFrostIvory * (brickFresnel * 0.11 + brickCrownHighlight * 0.09);
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
  const material = useMemo(() => createInstancedIceMaterial(quality), [quality]);
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
        color: OBSERVATORY_PERSONALITY.palette.world.shadow,
        emissive: DOME_CRYSTAL_PALETTE.subsurfaceCyan,
        emissiveIntensity: quality === "high" ? 0.52 : 0.46,
        metalness: 0,
        roughness: 0.9,
      }),
    [quality],
  );
  useEffect(() => () => material.dispose(), [material]);
  return material;
}

function useAirlockTunnelMaterial(quality) {
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        clearcoat: 0.28,
        clearcoatRoughness: 0.48,
        color: OBSERVATORY_PERSONALITY.palette.world.shadow,
        emissive: OBSERVATORY_PERSONALITY.palette.accent,
        emissiveIntensity: quality === "high" ? 0.36 : 0.3,
        metalness: 0,
        roughness: 0.56,
        side: THREE.DoubleSide,
      }),
    [quality],
  );
  useEffect(() => () => material.dispose(), [material]);
  return material;
}

function colorForDomeBlock(position, seed) {
  const iceBlue = new THREE.Color(DOME_CRYSTAL_PALETTE.iceBlue);
  const ivory = new THREE.Color(DOME_CRYSTAL_PALETTE.frostIvory);
  const cyan = new THREE.Color(POLAR_PALETTE.dawnCyan);
  const teal = new THREE.Color(DOME_XZ_COLOR_ZONES.teal);
  const sage = new THREE.Color(DOME_XZ_COLOR_ZONES.sage);
  const color = iceBlue
    .clone()
    .lerp(ivory, 0.22 + seed * 0.26)
    .lerp(cyan, 0.055 + (1 - seed) * 0.045);
  const tealZone = Math.exp(-((position.x + 0.55) ** 2 + (position.z - 0.42) ** 2) * 0.34);
  const sageZone = Math.exp(-((position.x - 0.82) ** 2 + (position.z + 0.34) ** 2) * 0.28);
  color.lerp(teal, tealZone * 0.055).lerp(sage, sageZone * 0.032);
  color.offsetHSL(0, seed < 0.5 ? 0.018 : -0.012, (seed - 0.5) * 0.035);
  return color;
}

function colorForAirlockBlock(position, seed) {
  const frost = new THREE.Color(DOME_CRYSTAL_PALETTE.iceBlue);
  const cream = new THREE.Color(DOME_CRYSTAL_PALETTE.frostIvory);
  const cyan = new THREE.Color(POLAR_PALETTE.dawnCyan);
  const color = cream.clone().lerp(frost, 0.4 + seed * 0.22).lerp(cyan, 0.045 + position.y * 0.025);
  color.offsetHSL(0, 0, (seed - 0.5) * 0.028);
  return color;
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
      frost: cell.frostSeed,
      mass: Math.min(3.2, 1.05 + cell.mass * 0.46),
      matrix: matrix.clone(),
      basePosition: position.clone(),
      renderMatrix: matrix.clone(),
      instanceFallOffset: 0,
      instanceFallVelocity: 0,
      detached: false,
    });
  }
  return blocks;
}

function buildAirlockBlockInstances() {
  const blocks = [];
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const z = AIRLOCK.depth + 0.075;
  const springY = AIRLOCK.springY;
  const radius = AIRLOCK.outerRadius + 0.018;
  const archCount = 11;
  for (let index = 0; index < archCount; index += 1) {
    const angle = (index / (archCount - 1)) * Math.PI;
    const frost = (index * 0.61803398875) % 1;
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle - HALF_PI);
    scale.set((Math.PI * radius * 0.86) / (archCount - 1), 0.19, 0.135);
    const position = new THREE.Vector3(Math.cos(angle) * radius, springY + Math.sin(angle) * radius, z);
    matrix.compose(position, quaternion, scale);
    blocks.push({
      bevel: 0.42 + (index % 5) * 0.11,
      color: colorForAirlockBlock(position, frost),
      delay: index * 0.045,
      facet: (index * 0.41421356237) % 1,
      frost,
      mass: 1.3 + frost,
      matrix: matrix.clone(),
      basePosition: position.clone(),
      renderMatrix: matrix.clone(),
      instanceFallOffset: 0,
      instanceFallVelocity: 0,
      detached: false,
    });
  }
  for (const side of [-1, 1]) {
    for (let row = 0; row < 3; row += 1) {
      const frost = ((row + 1) * (side < 0 ? 0.271 : 0.731)) % 1;
      quaternion.identity();
      scale.set(0.19, 0.19, 0.135);
      const position = new THREE.Vector3(side * radius, 0.09 + row * 0.19, z);
      matrix.compose(position, quaternion, scale);
      blocks.push({
        bevel: 0.5 + row * 0.14,
        color: colorForAirlockBlock(position, frost),
        delay: 0.18 + row * 0.08,
        facet: ((row + 1) * (side < 0 ? 0.382 : 0.618)) % 1,
        frost,
        mass: 1.4 + frost,
        matrix: matrix.clone(),
        basePosition: position.clone(),
        renderMatrix: matrix.clone(),
        instanceFallOffset: 0,
        instanceFallVelocity: 0,
        detached: false,
      });
    }
  }
  return blocks;
}

function applyInstances(mesh, blocks, geometry) {
  const bevel = new Float32Array(blocks.length);
  const facet = new Float32Array(blocks.length);
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
    frost[index] = block.frost;
    mass[index] = block.mass;
    delay[index] = block.delay;
  }
  geometry.setAttribute("instanceBevel", new THREE.InstancedBufferAttribute(bevel, 1));
  geometry.setAttribute("instanceFacet", new THREE.InstancedBufferAttribute(facet, 1));
  geometry.setAttribute("instanceFrost", new THREE.InstancedBufferAttribute(frost, 1));
  geometry.setAttribute("instanceHover", new THREE.InstancedBufferAttribute(hover, 1));
  geometry.setAttribute("instanceMass", new THREE.InstancedBufferAttribute(mass, 1));
  geometry.setAttribute("instanceDelay", new THREE.InstancedBufferAttribute(delay, 1));
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  geometry.attributes.instanceBevel.needsUpdate = true;
  geometry.attributes.instanceFacet.needsUpdate = true;
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
    block.detached = false;
    block.instanceFallOffset = 0;
    block.instanceFallVelocity = 0;
    block.renderMatrix.copy(block.matrix);
    mesh.setMatrixAt(index, block.renderMatrix);
    changed = true;
  }
  if (changed) mesh.instanceMatrix.needsUpdate = true;
  return changed;
}

function stepDetachedBlocks(mesh, blocks, hover, pointerInteractionEnabled, reducedMotion, delta) {
  // instanceFallOffset and instanceFallVelocity implement damped gravity.
  if (!mesh || !blocks || !hover) return;
  if (!pointerInteractionEnabled || reducedMotion) {
    resetDetachedBlocks(mesh, blocks);
    return;
  }

  let matrixChanged = false;
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const hoverValue = hover.getX(index);
    if (!block.detached && hoverValue >= DOME_TILE_FALL_PROFILE.detachThreshold) {
      block.detached = true;
      block.instanceFallVelocity = 0.18;
    }
    if (!block.detached) continue;

    block.instanceFallVelocity += DOME_TILE_FALL_PROFILE.gravity * delta;
    block.instanceFallOffset += block.instanceFallVelocity * delta;
    const floorOffset = DOME_TILE_FALL_PROFILE.settleFloorY - block.basePosition.y;
    if (block.instanceFallOffset <= floorOffset) {
      block.instanceFallOffset = floorOffset;
      if (Math.abs(block.instanceFallVelocity) > DOME_TILE_FALL_PROFILE.settleVelocity) {
        block.instanceFallVelocity = -block.instanceFallVelocity * DOME_TILE_FALL_PROFILE.settleBounce;
      } else {
        block.instanceFallVelocity = 0;
      }
    }
    block.instanceFallVelocity *= Math.exp(-DOME_TILE_FALL_PROFILE.damping * delta);
    block.renderMatrix.copy(block.matrix);
    block.renderMatrix.elements[13] = block.basePosition.y + block.instanceFallOffset;
    mesh.setMatrixAt(index, block.renderMatrix);
    matrixChanged = true;
  }
  if (matrixChanged) {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }
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
) {
  useFrame((_, delta) => {
    const hover = meshRef.current?.geometry?.getAttribute("instanceHover");
    if (!hover) return;
    let changed = false;
    for (let index = 0; index < hover.count; index += 1) {
      const target = pointerInteractionEnabled ? targetsRef.current[index] ?? 0 : 0;
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
    stepDetachedBlocks(
      meshRef.current,
      blocks,
      hover,
      pointerInteractionEnabled,
      reducedMotion,
      delta,
    );
  });
}

function InstancedDomeBlocks({ assets, lattice, pointerInteractionEnabled, reducedMotion }) {
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
  );
  useLayoutEffect(() => {
    if (!meshRef.current) return;
    applyInstances(meshRef.current, blocks, assets.domeGeometry);
  }, [assets.domeGeometry, blocks]);
  return (
    <instancedMesh
      args={[assets.domeGeometry, assets.material, blocks.length]}
      castShadow={false}
      name={`InstancedDomeBlocks ${blocks.length}-blocks one-draw`}
      receiveShadow={false}
      ref={meshRef}
      onPointerMove={(event) => {
        if (!pointerInteractionEnabled) return;
        event.stopPropagation();
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

function InstancedAirlockBlocks({ assets, pointerInteractionEnabled, reducedMotion }) {
  const meshRef = useRef(null);
  const hoveredRef = useRef(-1);
  const blocks = useMemo(() => buildAirlockBlockInstances(), []);
  const hoverTargetsRef = useRef(new Float32Array(blocks.length));
  useSmoothHoverAttribute(
    meshRef,
    blocks,
    hoverTargetsRef,
    pointerInteractionEnabled,
    reducedMotion,
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

function ContinuousDomeTopology({ castShadow = true, material, quality }) {
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
    >
      <sphereGeometry args={[1, widthSegments, heightSegments, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
      <ContinuousDomeIceMaterial material={material} />
    </mesh>
  );
}

function MergedLatticeSkeleton({ accent, lattice, quality }) {
  const geometry = useLatticeSkeletonGeometry(lattice, quality);
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
        opacity={quality === "low" ? 0.075 : 0.065}
        transparent
      />
    </mesh>
  );
}

function IntegratedAirlock({
  assets,
  material,
  pointerInteractionEnabled,
  quality,
  reducedMotion,
  showBlocks,
}) {
  const geometries = useAirlockGeometries(quality);

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
          reducedMotion={reducedMotion}
        />
      )}
      <mesh geometry={geometries.door} position={[0, 0, 0.46]}>
        <meshBasicMaterial color={OBSERVATORY_PERSONALITY.palette.ink} side={THREE.DoubleSide} toneMapped />
      </mesh>
      <pointLight
        color={OBSERVATORY_HOME_LIGHT_PROFILE.color}
        decay={2}
        distance={OBSERVATORY_HOME_LIGHT_PROFILE.distance}
        intensity={OBSERVATORY_HOME_LIGHT_PROFILE.intensity[quality]}
        name="sunrise-gold-observatory-threshold-light"
        position={[0, 0.34, 0.72]}
      />
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
          opacity={0.12 + impact * 0.0175}
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

function updateDomeUniforms(material, { accent, impact, reveal, time }) {
  const uniforms = material.userData.domeUniforms;
  if (!uniforms) return;
  uniforms.uDomeAccentColor.value.set(accent);
  uniforms.uDomeImpact.value = impact;
  uniforms.uDomeReveal.value = reveal;
  uniforms.uDomeTime.value = time;
}

function updateInstancedIceUniforms(material, accent, impact, compression) {
  const uniforms = material.userData.brickUniforms;
  if (!uniforms) return;
  uniforms.uBrickAccent.value.set(accent);
  uniforms.uBrickCompression.value = Math.min(0.012, Math.abs(compression));
  uniforms.uBrickImpact.value = impact;
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
  const airlockTunnelMaterial = useAirlockTunnelMaterial(tier);
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
  const collisionImpact =
    Math.max(0, 1 - contactDistance / 0.34) *
    Math.min(1, Math.max(0, Math.abs(axisVelocity) - 0.72) * 2.1);
  const impact = Math.max(collisionImpact, Math.max(0, Math.min(1, impactPulse)));

  useFrame(({ clock }, delta) => {
    const elapsed = reducedMotion ? 0 : clock.elapsedTime;
    const reveal = streamRevealProgressRef?.current ?? initialStreamRevealProgress;
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
      <pointLight
        color={OBSERVATORY_HOME_LIGHT_PROFILE.contactColor}
        decay={2}
        distance={7.2}
        intensity={tier === "high" ? 2.35 : tier === "medium" ? 1.7 : 0.85}
        name="cyan-white-observatory-key-light"
        position={[-1.65, 2.25, 1.35]}
      />
      <NeutralContactPlinth impact={impact} quality={tier} />
      <ContinuousDomeTopology
        castShadow={tier === "low"}
        material={tier === "low" ? shellMaterial : innerShellMaterial}
        quality={tier}
      />
      {tier !== "low" && (
        <InstancedDomeBlocks
          assets={instancedAssets}
          lattice={lattice}
          pointerInteractionEnabled={pointerInteractionEnabled}
          reducedMotion={reducedMotion}
        />
      )}
      <MergedLatticeSkeleton
        accent={accent}
        lattice={lattice}
        quality={tier}
      />
      <IntegratedAirlock
        assets={instancedAssets}
        material={tier === "low" ? airlockMaterial : airlockTunnelMaterial}
        pointerInteractionEnabled={pointerInteractionEnabled}
        quality={tier}
        reducedMotion={reducedMotion}
        showBlocks={tier !== "low"}
      />
    </group>
  );
}
