"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  POLAR_BIOME_FRAGMENT_SHADER,
  POLAR_BIOME_PROFILES,
  POLAR_BIOME_QUALITY,
  POLAR_BIOME_SHADER_POLICY,
  POLAR_BIOME_VERTEX_SHADER,
  resolveLocalWorldOwnership,
  resolveNearestWeather,
  resolveTwoNearestBiomes as resolveTwoNearestBiomesFromFields,
} from "../lib/polar-biome-fields";

export const resolveTwoNearestBiomes = resolveTwoNearestBiomesFromFields;

export const POLAR_BIOME_WORLD_PROFILE =
  "dominant local Antarctic owner with one optional framed neighbor; eight continuous-XZ atmospheres; neutral remote field; singular nearest weather; two programs; zero textures";

export const POLAR_BIOME_WORLD_INTEGRATION = Object.freeze({
  requiredPose: "canonical traversal world XZ; no depth multiplier or world wrapping",
  props: Object.freeze([
    "axisX",
    "depthZ",
    "travelerRef",
    "quality",
    "reducedMotion",
    "safeMode",
    "simulationPaused",
    "visible",
    "onBiomeChange",
  ]),
  drawBudget: POLAR_BIOME_SHADER_POLICY.maxDrawCalls,
  programBudget: POLAR_BIOME_SHADER_POLICY.maxCompiledPrograms,
  textureBudget: POLAR_BIOME_SHADER_POLICY.textures,
});

const TERRAIN_SIZE = 58;
const SKY_RADIUS = 44;
const TERRAIN_RECENTER_STEP = 8;
const DEG_TO_RAD = Math.PI / 180;
const NEUTRAL_FOG_COLOR = "#697CA6";
const NEUTRAL_KEY_COLOR = "#FFEFD8";
const NEUTRAL_FILL_COLOR = "#B8C6DC";
const NEUTRAL_RIM_COLOR = "#DCE8FF";
const NEUTRAL_FOG_DENSITY = 0.0085;
const LOCAL_ENVIRONMENT_CAP = 0.42;

/**
 * Rig neutrality. Station identity may TINT the rig, it may never DYE it.
 * A docked station drives key/fill/rim from its own identity hue at full weight
 * (`environmentCap` is 1 when exclusive), so an unclamped rig paints e.g. a violet
 * key light over every material in the machine shop and eight albedos collapse into
 * one wash. Capping saturation and flooring lightness keeps the hue as a hint while
 * the light stays bright and near-neutral, which is what lets albedo read.
 * The twilight mood is carried by the sky and fog, not by dyeing every surface.
 */
const RIG_NEUTRALITY = Object.freeze({
  key: { saturationCap: 0.16, lightnessFloor: 0.76 },
  fill: { saturationCap: 0.24, lightnessFloor: 0.62 },
  rim: { saturationCap: 0.34, lightnessFloor: 0.68 },
});

const rigHslScratch = { h: 0, s: 0, l: 0 };

function neutralizeRigColor(color, { saturationCap, lightnessFloor }) {
  color.getHSL(rigHslScratch);
  if (rigHslScratch.s <= saturationCap && rigHslScratch.l >= lightnessFloor) return color;
  return color.setHSL(
    rigHslScratch.h,
    Math.min(rigHslScratch.s, saturationCap),
    Math.max(rigHslScratch.l, lightnessFloor),
  );
}

function addBiomeRole(geometry, role) {
  const roles = new Float32Array(geometry.getAttribute("position").count);
  roles.fill(role);
  geometry.setAttribute("aBiomeRole", new THREE.BufferAttribute(roles, 1));
  return geometry;
}

function makeTerrainGeometry(policy) {
  const geometry = new THREE.PlaneGeometry(
    TERRAIN_SIZE,
    TERRAIN_SIZE,
    policy.terrainSegments,
    policy.terrainSegments,
  );
  geometry.rotateX(-Math.PI / 2);
  addBiomeRole(geometry, 0);
  geometry.computeBoundingSphere();
  return geometry;
}

function makeSkyGeometry(policy) {
  const geometry = new THREE.SphereGeometry(
    SKY_RADIUS,
    policy.skySegments[0],
    policy.skySegments[1],
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.62,
  );
  addBiomeRole(geometry, 1);
  return geometry;
}

function finishGeographyGeometry(geometry) {
  geometry.computeVertexNormals();
  addBiomeRole(geometry, 2);
  return geometry;
}

function makeGeographyGeometryBank() {
  const plaque = new THREE.CapsuleGeometry(0.17, 0.72, 3, 8);
  plaque.rotateZ(Math.PI / 2);
  const plaquePosition = plaque.getAttribute("position");
  for (let index = 0; index < plaquePosition.count; index += 1) {
    const x = plaquePosition.getX(index);
    const envelope = 0.54 + 0.46 * Math.max(0, 1 - Math.abs(x) / 0.55);
    plaquePosition.setY(
      index,
      plaquePosition.getY(index) * envelope + 0.045 * (envelope - 0.54),
    );
    plaquePosition.setZ(index, plaquePosition.getZ(index) * envelope);
  }
  plaquePosition.needsUpdate = true;

  const upstream = new THREE.CapsuleGeometry(0.13, 0.68, 2, 6);
  upstream.rotateZ(Math.PI / 2);
  const assembly = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
  const assemblyPosition = assembly.getAttribute("position");
  for (let index = 0; index < assemblyPosition.count; index += 1) {
    if (assemblyPosition.getY(index) > 0) {
      assemblyPosition.setX(index, assemblyPosition.getX(index) * 0.76 + 0.08);
      assemblyPosition.setZ(index, assemblyPosition.getZ(index) * 0.82);
    }
  }
  assemblyPosition.needsUpdate = true;

  return [
    finishGeographyGeometry(plaque),
    finishGeographyGeometry(new THREE.DodecahedronGeometry(0.58, 0)),
    finishGeographyGeometry(new THREE.TorusGeometry(0.42, 0.072, 5, 14, Math.PI * 1.38)),
    finishGeographyGeometry(new THREE.CylinderGeometry(0.52, 0.57, 1, 6, 1)),
    finishGeographyGeometry(new THREE.CylinderGeometry(0.54, 0.5, 1, 10, 1)),
    finishGeographyGeometry(upstream),
    finishGeographyGeometry(new THREE.BoxGeometry(1, 1, 1, 1, 1, 1)),
    finishGeographyGeometry(assembly),
  ];
}

function seeded(index, salt) {
  const value = Math.sin((index + 1) * (12.9898 + salt * 37.719)) * 43758.5453123;
  return value - Math.floor(value);
}

function rotateLocalToWorld(localX, localZ, angleRadians) {
  const cosine = Math.cos(-angleRadians);
  const sine = Math.sin(-angleRadians);
  return [localX * cosine - localZ * sine, localX * sine + localZ * cosine];
}

/**
 * One low-poly prism vocabulary produces eight layouts. Field shaders provide
 * their surface identities; transforms provide the physical geography identity.
 * This runs only when the nearest biome changes, never continuously per frame.
 */
export function populateGeographyInstances(mesh, profile, instanceCount) {
  if (!mesh || !profile || instanceCount <= 0) return;
  const transform = new THREE.Object3D();
  const angle = profile.angleDegrees * DEG_TO_RAD;
  const kind = profile.fieldKind;
  const plaqueInstanceCount = Math.min(instanceCount, instanceCount >= 32 ? 16 : 12);
  const aetherInstanceCount = Math.max(6, Math.round(instanceCount * 0.25));
  const upstreamInstanceCount = instanceCount >= 32 ? 14 : 10;
  const topologyInstanceCount = instanceCount >= 32 ? 14 : 10;
  const assemblyInstanceCount = instanceCount >= 32 ? 12 : 9;
  let activeInstanceCount = instanceCount;
  if (kind === 0) activeInstanceCount = plaqueInstanceCount;
  else if (kind === 2) activeInstanceCount = aetherInstanceCount;
  else if (kind === 5) activeInstanceCount = upstreamInstanceCount;
  else if (kind === 6) activeInstanceCount = topologyInstanceCount;
  else if (kind === 7) activeInstanceCount = assemblyInstanceCount;

  for (let index = 0; index < activeInstanceCount; index += 1) {
    const progress = activeInstanceCount <= 1 ? 0 : index / (activeInstanceCount - 1);
    const seedA = seeded(index, kind + 0.17);
    const seedB = seeded(index, kind + 0.61);
    let localX = 0;
    let localZ = 0;
    let yaw = -angle;
    let scaleX = 1;
    let scaleY = 0.1;
    let scaleZ = 0.2;
    let positionY = -0.14;
    let roll = 0;

    if (kind === 0) {
      const theta = progress * Math.PI * 2 + (seedA - 0.5) * 0.18;
      const radius = 5.8 + (index % 3) * 1.24 + seedB * 0.58;
      localX = Math.cos(theta) * radius;
      localZ = Math.sin(theta) * radius * 0.72;
      yaw = -angle - theta + Math.PI / 2;
      scaleX = 0.70 + seedA * 0.45;
      scaleY = 0.50 + seedB * 0.25;
      scaleZ = 0.60 + seedA * 0.35;
      positionY = -0.105 + seedB * 0.018;
    } else if (kind === 1) {
      const theta = progress * Math.PI * 2 + seedA * 0.18;
      const radius = 4.1 + seedB * 2.2;
      localX = Math.cos(theta) * radius;
      localZ = Math.sin(theta) * radius;
      yaw = -angle - theta;
      scaleX = 0.54 + seedA * 0.58;
      scaleY = 0.22 + seedB * 0.58;
      scaleZ = 0.48 + seedA * 0.44;
      positionY = -0.12 + scaleY * 0.16;
    } else if (kind === 2) {
      localX = -5.4 + progress * 10.8;
      localZ = 0.54 * Math.sin(localX * 0.24) + (index % 2 === 0 ? -1.16 : 1.16);
      yaw = -angle - Math.atan(0.1296 * Math.cos(localX * 0.24));
      scaleX = 0.36 + seedA * 0.44;
      scaleY = 0.16 + seedB * 0.38;
      scaleZ = 0.10 + seedA * 0.10;
      positionY = -0.12 + seedB * 0.05;
    } else if (kind === 3) {
      const columns = 6;
      const row = Math.floor(index / columns);
      const column = index % columns;
      // Salt-crust ridges, not a tiled floor: a regular 6-column grid of flat
      // 1.1-wide hexagons is paving, whatever colour it is. Jittered off the grid,
      // elongated along the wind, given real thickness and a heave tilt, the same
      // instances read as wind-broken crust shoved out of the pan.
      localX = (column - 2.5) * 1.75 + (row % 2) * 0.84 + (seedA - 0.5) * 1.15;
      localZ = (row - 1.5) * 1.62 + (seedB - 0.5) * 1.05;
      yaw = -angle + (seedA - 0.5) * 0.9;
      scaleX = 0.52 + seedA * 0.86;
      scaleY = 0.24 + seedB * 0.30;
      scaleZ = 0.26 + seedB * 0.32;
      positionY = -0.24;
      roll = (seedA - 0.5) * 0.34;
    } else if (kind === 4) {
      localX = -7.2 + progress * 14.4;
      const leadAxis = 0.24 * Math.sin(localX * 0.31);
      localZ = leadAxis + (index % 2 === 0 ? -0.88 : 0.88) + (seedB - 0.5) * 0.28;
      yaw = -angle + (seedA - 0.5) * 0.42;
      // Floe blocks either side of the lead. Same pad problem, same fix: the slab
      // gets thickness and a heave tilt so it reads as ice shoved out of a crack.
      scaleX = 0.54 + seedA * 0.78;
      scaleY = 0.32 + seedB * 0.40;
      scaleZ = 0.30 + seedB * 0.46;
      positionY = -0.17;
      roll = (seedB - 0.5) * 0.44;
    } else if (kind === 5) {
      const lane = index % 3;
      localX = -4.8 + progress * 9.6;
      localZ = -2.2 + lane * 2.2 + Math.sin(localX * 0.24) * 0.28;
      scaleX = 0.34 + seedA * 0.34;
      scaleY = 0.28 + seedB * 0.26;
      scaleZ = 0.22 + seedA * 0.20;
      positionY = -0.14 + seedB * 0.02;
    } else if (kind === 6) {
      const row = index % 7;
      localX = -4.6 + seedA * 9.2;
      localZ = -2.55 + row * 0.85 + (seedB - 0.5) * 0.18;
      yaw = -angle + (seedA - 0.5) * 0.2;
      scaleX = 0.22 + seedB * 0.45;
      scaleY = 0.35 + (row % 3) * 0.25 + seedA * 0.3;
      scaleZ = 0.08 + seedA * 0.09;
      positionY = -0.14 + scaleY * 0.5;
    } else {
      const side = index % 2 === 0 ? -1 : 1;
      localX = -4.6 + progress * 9.2;
      localZ = side * (1.35 + (index % 3) * 0.42);
      scaleX = 0.50 + seedA * 0.65;
      scaleY = 0.045 + seedB * 0.055;
      scaleZ = 0.09 + seedA * 0.09;
      positionY = -0.15;
    }

    const [worldOffsetX, worldOffsetZ] = rotateLocalToWorld(localX, localZ, angle);
    transform.position.set(
      profile.centerXZ[0] + worldOffsetX,
      positionY,
      profile.centerXZ[1] + worldOffsetZ,
    );
    transform.rotation.set(0, yaw, kind === 2 ? (seedA - 0.5) * 0.16 : roll);
    transform.scale.set(scaleX, scaleY, scaleZ);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
  }

  mesh.count = activeInstanceCount;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

function makeUniforms(shaderDetail) {
  return {
    uTime: { value: 0 },
    uShaderDetail: { value: shaderDetail },
    uPrimaryFieldKind: { value: 0 },
    uSecondaryFieldKind: { value: 1 },
    uPrimaryAngle: { value: 0 },
    uSecondaryAngle: { value: 0 },
    uPrimaryWeight: { value: 0 },
    uSecondaryWeight: { value: 0 },
    uPrimaryProximity: { value: 0 },
    uSecondaryProximity: { value: 0 },
    uPrimaryRadius: { value: 10.5 },
    uSecondaryRadius: { value: 8.5 },
    uPrimaryFalloff: { value: 0.62 },
    uSecondaryFalloff: { value: 0.62 },
    uPrimaryFogDensity: { value: 0.012 },
    uSecondaryFogDensity: { value: 0.01 },
    uPrimaryFogHeightFalloff: { value: 0.42 },
    uSecondaryFogHeightFalloff: { value: 0.36 },
    uWeatherFieldKind: { value: -1 },
    uWeatherStrength: { value: 0 },
    uWeatherSpeed: { value: 0 },
    uPrimaryAtmosphereStrength: { value: 1 },
    uWeatherDirection: { value: new THREE.Vector2(1, 0) },
    uPrimaryCenterXZ: { value: new THREE.Vector2() },
    uSecondaryCenterXZ: { value: new THREE.Vector2() },
    uTravelerXZ: { value: new THREE.Vector2() },
    uPrimaryLightDirection: { value: new THREE.Vector3(-0.42, 0.84, 0.34) },
    uSecondaryLightDirection: { value: new THREE.Vector3(-0.42, 0.84, 0.34) },
    uPrimaryBaseColor: { value: new THREE.Color("#C9D5D9") },
    uPrimarySecondaryColor: { value: new THREE.Color("#A9C9C4") },
    uPrimaryAccentColor: { value: new THREE.Color("#5CC9C2") },
    uPrimaryGlowColor: { value: new THREE.Color("#F2B96B") },
    uPrimaryFogColor: { value: new THREE.Color("#3C5B60") },
    uPrimaryInkColor: { value: new THREE.Color("#232E52") },
    uPrimaryShadowColor: { value: new THREE.Color("#33475E") },
    uPrimaryAtmosphereColor: { value: new THREE.Color("#22354F") },
    uPrimaryAtmosphereGlow: { value: new THREE.Color("#5A93A8") },
    uSecondaryBaseColor: { value: new THREE.Color("#B4C7D4") },
    uSecondarySecondaryColor: { value: new THREE.Color("#8CA6BB") },
    uSecondaryAccentColor: { value: new THREE.Color("#5573E0") },
    uSecondaryGlowColor: { value: new THREE.Color("#A5E9FF") },
    uSecondaryFogColor: { value: new THREE.Color("#364F5E") },
    uSecondaryInkColor: { value: new THREE.Color("#232E52") },
    uSecondaryShadowColor: { value: new THREE.Color("#3A5570") },
    uSecondaryAtmosphereColor: { value: new THREE.Color("#1E3252") },
    uSecondaryAtmosphereGlow: { value: new THREE.Color("#5573E0") },
  };
}

function makeMaterial(uniforms, role) {
  const sky = role === "sky";
  const material = new THREE.ShaderMaterial({
    depthTest: true,
    depthWrite: !sky,
    fragmentShader: POLAR_BIOME_FRAGMENT_SHADER,
    side: sky ? THREE.BackSide : THREE.FrontSide,
    toneMapped: false,
    uniforms,
    vertexShader: POLAR_BIOME_VERTEX_SHADER,
  });
  material.name = `polar-biome-world-${role}`;
  material.customProgramCacheKey = () => `polar-biome-world:${role}`;
  return material;
}

function setLightDirection(target, light) {
  const azimuth = light.azimuth * DEG_TO_RAD;
  const elevation = light.elevation * DEG_TO_RAD;
  const horizontal = Math.cos(elevation);
  return target.set(
    Math.sin(azimuth) * horizontal,
    Math.sin(elevation),
    Math.cos(azimuth) * horizontal,
  );
}

function applyProfileUniforms(uniforms, prefix, entry) {
  const profile = entry.profile;
  uniforms[`u${prefix}FieldKind`].value = profile.fieldKind;
  uniforms[`u${prefix}Angle`].value = profile.angleDegrees * DEG_TO_RAD;
  uniforms[`u${prefix}Weight`].value = entry.weight;
  uniforms[`u${prefix}Proximity`].value = entry.proximity;
  uniforms[`u${prefix}Radius`].value = profile.radius;
  uniforms[`u${prefix}Falloff`].value = profile.falloff;
  uniforms[`u${prefix}FogDensity`].value = profile.fog.density;
  uniforms[`u${prefix}FogHeightFalloff`].value = profile.fog.heightFalloff;
  uniforms[`u${prefix}CenterXZ`].value.set(profile.centerXZ[0], profile.centerXZ[1]);
  setLightDirection(uniforms[`u${prefix}LightDirection`].value, profile.light);
  uniforms[`u${prefix}BaseColor`].value.set(profile.colors.base);
  uniforms[`u${prefix}SecondaryColor`].value.set(profile.colors.secondary);
  uniforms[`u${prefix}AccentColor`].value.set(profile.accent);
  uniforms[`u${prefix}GlowColor`].value.set(profile.colors.glow);
  uniforms[`u${prefix}FogColor`].value.set(profile.colors.fog);
  uniforms[`u${prefix}InkColor`].value.set(profile.colors.ink);
  uniforms[`u${prefix}ShadowColor`].value.set(profile.shadow);
  uniforms[`u${prefix}AtmosphereColor`].value.set(profile.atmosphere.colors[0]);
  uniforms[`u${prefix}AtmosphereGlow`].value.set(profile.atmosphere.colors[1]);
  if (prefix === "Primary") {
    uniforms.uPrimaryAtmosphereStrength.value = profile.atmosphere.particleStrength;
  }
}

function syncUniforms(uniformSets, blend, weather, time, shaderDetail, travelerXZ) {
  for (const uniforms of uniformSets) {
    uniforms.uTime.value = time;
    uniforms.uShaderDetail.value = shaderDetail;
    applyProfileUniforms(uniforms, "Primary", blend.primary);
    applyProfileUniforms(uniforms, "Secondary", blend.secondary);
    uniforms.uTravelerXZ.value.set(travelerXZ[0], travelerXZ[1]);
    if (weather) {
      uniforms.uWeatherFieldKind.value = weather.fieldKind;
      uniforms.uWeatherStrength.value = weather.opacity * weather.influence;
      uniforms.uWeatherSpeed.value = weather.speed;
      uniforms.uWeatherDirection.value.set(
        weather.weatherVector[0],
        weather.weatherVector[1],
      );
    } else {
      uniforms.uWeatherFieldKind.value = -1;
      uniforms.uWeatherStrength.value = 0;
      uniforms.uWeatherSpeed.value = 0;
    }
  }
}

function PolarBiomeWorldStage({
  axisX,
  depthZ,
  exclusiveStationId,
  onBiomeChange,
  quality,
  reducedMotion,
  safeMode,
  simulationPaused,
  travelerRef,
}) {
  const skyRef = useRef(null);
  const keyLightRef = useRef(null);
  const fillLightRef = useRef(null);
  const simulationTime = useRef(0);
  const telemetryElapsed = useRef(0);
  const primaryBiomeId = useRef(undefined);
  const positionScratch = useRef([0, 0]);
  const ownershipScratch = useRef({
    blend: { entries: [{}, {}], primary: null, secondary: null },
    visibleStationIds: [],
  });
  const weatherScratch = useRef({});
  const weatherOptions = useRef({
    quality,
    reducedMotion,
    safeMode,
    target: weatherScratch.current,
  });
  const qualityPolicy = POLAR_BIOME_QUALITY[quality] || POLAR_BIOME_QUALITY.medium;
  const keyLightTarget = useMemo(() => new THREE.Object3D(), []);
  const fillLightTarget = useMemo(() => new THREE.Object3D(), []);
  const environmentScratch = useMemo(
    () => ({
      primaryColor: new THREE.Color(),
      secondaryColor: new THREE.Color(),
      fogColor: new THREE.Color(),
      keyColor: new THREE.Color(),
      fillColor: new THREE.Color(),
      rimColor: new THREE.Color(),
      primaryDirection: new THREE.Vector3(),
      secondaryDirection: new THREE.Vector3(),
      blendedDirection: new THREE.Vector3(),
      desiredKeyPosition: new THREE.Vector3(),
      desiredFillPosition: new THREE.Vector3(),
    }),
    [],
  );
  const terrainGeometry = useMemo(() => makeTerrainGeometry(qualityPolicy), [qualityPolicy]);
  const skyGeometry = useMemo(() => makeSkyGeometry(qualityPolicy), [qualityPolicy]);
  const geographyGeometryBank = useMemo(
    () => (qualityPolicy.geographyInstances > 0 ? makeGeographyGeometryBank() : null),
    [qualityPolicy.geographyInstances],
  );
  const solidUniforms = useMemo(() => makeUniforms(qualityPolicy.shaderDetail), [qualityPolicy.shaderDetail]);
  const skyUniforms = useMemo(() => makeUniforms(qualityPolicy.shaderDetail), [qualityPolicy.shaderDetail]);
  const solidMaterial = useMemo(() => makeMaterial(solidUniforms, "solid"), [solidUniforms]);
  const skyMaterial = useMemo(() => makeMaterial(skyUniforms, "sky"), [skyUniforms]);
  const terrainMesh = useMemo(() => {
    const mesh = new THREE.InstancedMesh(terrainGeometry, solidMaterial, 1);
    const identity = new THREE.Matrix4();
    mesh.setMatrixAt(0, identity);
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.name = "polar-biome-recyclable-terrain";
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.renderOrder = -20;
    return mesh;
  }, [solidMaterial, terrainGeometry]);
  const geographyMesh = useMemo(() => {
    if (!geographyGeometryBank || qualityPolicy.geographyInstances <= 0) return null;
    const mesh = new THREE.InstancedMesh(
      geographyGeometryBank[0],
      solidMaterial,
      qualityPolicy.geographyInstances,
    );
    mesh.name = "polar-biome-nearest-local-geography";
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.count = 0;
    return mesh;
  }, [geographyGeometryBank, qualityPolicy.geographyInstances, solidMaterial]);
  const uniformSets = useMemo(() => [solidUniforms, skyUniforms], [skyUniforms, solidUniforms]);

  useEffect(
    () => () => {
      terrainGeometry.dispose();
      skyGeometry.dispose();
      geographyGeometryBank?.forEach((geometry) => geometry.dispose());
      solidMaterial.dispose();
      skyMaterial.dispose();
    },
    [geographyGeometryBank, skyGeometry, skyMaterial, solidMaterial, terrainGeometry],
  );

  useFrame(({ gl, scene }, delta) => {
    const refPose = travelerRef?.current;
    const x = Number.isFinite(refPose?.x) ? refPose.x : axisX;
    const z = Number.isFinite(refPose?.z) ? refPose.z : depthZ;
    positionScratch.current[0] = Number.isFinite(x) ? x : 0;
    positionScratch.current[1] = Number.isFinite(z) ? z : 0;
    const ownership = resolveLocalWorldOwnership(
      positionScratch.current,
      ownershipScratch.current,
      { exclusiveStationId },
    );
    const blend = ownership.blend;
    weatherOptions.current.quality = quality;
    weatherOptions.current.reducedMotion = reducedMotion;
    weatherOptions.current.safeMode = safeMode;
    const weather = resolveNearestWeather(blend, weatherOptions.current);
    const currentBiomeId = ownership.current?.id || null;
    const biomeChanged = primaryBiomeId.current !== currentBiomeId;
    telemetryElapsed.current += Math.min(Math.max(delta, 0), 0.05);
    if (biomeChanged || telemetryElapsed.current >= 0.25) {
      telemetryElapsed.current = 0;
      const canvasData = gl.domElement.dataset;
      canvasData.biomeDrawBudget = String(qualityPolicy.drawCalls);
      canvasData.biomeProgramBudget = String(POLAR_BIOME_SHADER_POLICY.maxCompiledPrograms);
      canvasData.biomeTextureBudget = String(POLAR_BIOME_SHADER_POLICY.textures);
      canvasData.biomePrimary = currentBiomeId || "";
      canvasData.biomeFramedNeighbor = ownership.framedNeighbor?.id || "";
      canvasData.biomePrimaryWeight = blend.primary.weight.toFixed(4);
      canvasData.biomeSecondaryWeight = blend.secondary.weight.toFixed(4);
    }

    if (!simulationPaused && !reducedMotion) {
      simulationTime.current += Math.min(Math.max(delta, 0), 0.05);
    }
    const shaderTime = reducedMotion ? 0 : simulationTime.current;
    syncUniforms(
      uniformSets,
      blend,
      weather,
      shaderTime,
      qualityPolicy.shaderDetail,
      positionScratch.current,
    );

    const environmentAlpha = reducedMotion
      ? 1
      : 1 - Math.exp(-Math.min(Math.max(delta, 0), 0.05) * 5.4);
    const primaryProfile = blend.primary.profile;
    const secondaryProfile = blend.secondary.profile;
    const primaryWeight = blend.primary.weight;
    const secondaryWeight = blend.secondary.weight;
    const environmentCap = exclusiveStationId ? 1 : LOCAL_ENVIRONMENT_CAP;
    const primaryEnvironmentWeight = primaryWeight * environmentCap;
    const secondaryEnvironmentWeight = secondaryWeight * environmentCap;
    const neutralEnvironmentWeight =
      1 - primaryEnvironmentWeight - secondaryEnvironmentWeight;
    environmentScratch.fogColor
      .set(NEUTRAL_FOG_COLOR)
      .multiplyScalar(neutralEnvironmentWeight)
      .add(
        environmentScratch.primaryColor
          .set(primaryProfile.fog.color)
          .multiplyScalar(primaryEnvironmentWeight),
      )
      .add(
        environmentScratch.secondaryColor
          .set(secondaryProfile.fog.color)
          .multiplyScalar(secondaryEnvironmentWeight),
      );
    if (scene.fog?.isFogExp2) {
      scene.fog.color.lerp(environmentScratch.fogColor, environmentAlpha);
      const fogDensity =
        (NEUTRAL_FOG_DENSITY * neutralEnvironmentWeight +
          primaryProfile.fog.density * primaryEnvironmentWeight +
          secondaryProfile.fog.density * secondaryEnvironmentWeight) *
        0.68;
      scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, fogDensity, environmentAlpha);
    }

    if (keyLightRef.current && fillLightRef.current) {
      environmentScratch.keyColor
        .set(NEUTRAL_KEY_COLOR)
        .multiplyScalar(neutralEnvironmentWeight)
        .add(
          environmentScratch.primaryColor
            .set(primaryProfile.light.key)
            .multiplyScalar(primaryEnvironmentWeight),
        )
        .add(
          environmentScratch.secondaryColor
            .set(secondaryProfile.light.key)
            .multiplyScalar(secondaryEnvironmentWeight),
        );
      environmentScratch.fillColor
        .set(NEUTRAL_FILL_COLOR)
        .multiplyScalar(neutralEnvironmentWeight)
        .add(
          environmentScratch.primaryColor
            .set(primaryProfile.light.fill)
            .multiplyScalar(primaryEnvironmentWeight),
        )
        .add(
          environmentScratch.secondaryColor
            .set(secondaryProfile.light.fill)
            .multiplyScalar(secondaryEnvironmentWeight),
        );
      environmentScratch.rimColor
        .set(NEUTRAL_RIM_COLOR)
        .multiplyScalar(neutralEnvironmentWeight)
        .add(
          environmentScratch.primaryColor
            .set(primaryProfile.light.rim)
            .multiplyScalar(primaryEnvironmentWeight),
        )
        .add(
          environmentScratch.secondaryColor
            .set(secondaryProfile.light.rim)
            .multiplyScalar(secondaryEnvironmentWeight),
        );
      neutralizeRigColor(environmentScratch.keyColor, RIG_NEUTRALITY.key);
      neutralizeRigColor(environmentScratch.rimColor, RIG_NEUTRALITY.rim);
      environmentScratch.fillColor.lerp(environmentScratch.rimColor, 0.32);
      neutralizeRigColor(environmentScratch.fillColor, RIG_NEUTRALITY.fill);
      keyLightRef.current.color.lerp(environmentScratch.keyColor, environmentAlpha);
      fillLightRef.current.color.lerp(environmentScratch.fillColor, environmentAlpha);

      setLightDirection(environmentScratch.primaryDirection, primaryProfile.light);
      setLightDirection(environmentScratch.secondaryDirection, secondaryProfile.light);
      environmentScratch.blendedDirection
        .set(-0.42, 0.84, 0.34)
        .normalize()
        .multiplyScalar(neutralEnvironmentWeight)
        .addScaledVector(
          environmentScratch.primaryDirection,
          primaryEnvironmentWeight,
        )
        .addScaledVector(
          environmentScratch.secondaryDirection,
          secondaryEnvironmentWeight,
        )
        .normalize();
      environmentScratch.desiredKeyPosition
        .set(positionScratch.current[0], 0, positionScratch.current[1])
        .addScaledVector(environmentScratch.blendedDirection, 11.5);
      environmentScratch.desiredFillPosition
        .set(positionScratch.current[0], 0.8, positionScratch.current[1])
        .addScaledVector(environmentScratch.blendedDirection, -7.5);
      keyLightRef.current.position.lerp(environmentScratch.desiredKeyPosition, environmentAlpha);
      fillLightRef.current.position.lerp(environmentScratch.desiredFillPosition, environmentAlpha);
      keyLightTarget.position.lerp(
        environmentScratch.desiredFillPosition.set(
          positionScratch.current[0],
          0.15,
          positionScratch.current[1],
        ),
        environmentAlpha,
      );
      fillLightTarget.position.copy(keyLightTarget.position);

      const approachEnergy = 0.12 * blend.totalInfluence;
      const keyIntensity = Math.min(1.84, 1.68 + approachEnergy);
      const fillIntensity =
        0.72 +
        primaryProfile.light.fillStrength * primaryEnvironmentWeight +
        secondaryProfile.light.fillStrength * secondaryEnvironmentWeight;
      keyLightRef.current.intensity = THREE.MathUtils.lerp(
        keyLightRef.current.intensity,
        keyIntensity,
        environmentAlpha,
      );
      fillLightRef.current.intensity = THREE.MathUtils.lerp(
        fillLightRef.current.intensity,
        fillIntensity,
        environmentAlpha,
      );
    }

    terrainMesh.position.set(
      Math.round(positionScratch.current[0] / TERRAIN_RECENTER_STEP) * TERRAIN_RECENTER_STEP,
      -0.22,
      Math.round(positionScratch.current[1] / TERRAIN_RECENTER_STEP) * TERRAIN_RECENTER_STEP,
    );
    if (skyRef.current) {
      skyRef.current.position.set(positionScratch.current[0], -0.3, positionScratch.current[1]);
    }

    if (biomeChanged) {
      primaryBiomeId.current = currentBiomeId;
      if (geographyMesh) {
        if (ownership.current) {
          geographyMesh.geometry =
            geographyGeometryBank[ownership.current.profile.fieldKind];
          populateGeographyInstances(
            geographyMesh,
            POLAR_BIOME_PROFILES[ownership.current.id],
            qualityPolicy.geographyInstances,
          );
        } else {
          geographyMesh.count = 0;
          geographyMesh.instanceMatrix.needsUpdate = true;
        }
      }
      onBiomeChange?.({
        id: currentBiomeId,
        proximity: ownership.current?.proximity || 0,
        secondaryId: ownership.framedNeighbor?.id || null,
      });
    }
  });

  return (
    <group name={POLAR_BIOME_WORLD_PROFILE}>
      <primitive object={keyLightTarget} />
      <primitive object={fillLightTarget} />
      <directionalLight
        castShadow
        color={NEUTRAL_KEY_COLOR}
        intensity={1.68}
        name="polar-biome-key-light"
        ref={keyLightRef}
        shadow-bias={-0.00018}
        shadow-camera-bottom={-6}
        shadow-camera-far={24}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={6}
        shadow-mapSize={[1024, 1024]}
        target={keyLightTarget}
      />
      <directionalLight
        color={NEUTRAL_FILL_COLOR}
        intensity={0.7}
        name="polar-biome-fill-rim-light"
        ref={fillLightRef}
        target={fillLightTarget}
      />
      <primitive dispose={null} object={terrainMesh} />
      <mesh
        frustumCulled={false}
        geometry={skyGeometry}
        material={skyMaterial}
        name="polar-biome-authored-sky"
        ref={skyRef}
        renderOrder={-30}
      />
      {geographyMesh ? <primitive dispose={null} object={geographyMesh} /> : null}
    </group>
  );
}

export default function PolarBiomeWorld({
  axisX = 0,
  depthZ = 0,
  exclusiveStationId = null,
  onBiomeChange = null,
  quality = "medium",
  reducedMotion = false,
  safeMode = false,
  simulationPaused = false,
  travelerRef = null,
  visible = true,
}) {
  if (!visible || safeMode) return null;
  return (
    <PolarBiomeWorldStage
      axisX={axisX}
      depthZ={depthZ}
      exclusiveStationId={exclusiveStationId}
      onBiomeChange={onBiomeChange}
      quality={quality}
      reducedMotion={reducedMotion}
      safeMode={safeMode}
      simulationPaused={simulationPaused}
      travelerRef={travelerRef}
    />
  );
}
