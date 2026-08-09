"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  WORLD_DRESSING_COLOR_PROFILE,
  WORLD_DRESSING_BUDGET,
  buildWorldDressingLayout,
  createWorldDressingGeometries,
} from "../lib/polar-world-cadence";
import { resolveLocalWorldOwnership } from "../lib/polar-biome-fields";
import { STATION_WORLD_SCHEMA } from "../lib/polar-station-world";

export const POLAR_WORLD_DRESSING_PROFILE =
  "local-owner Antarctic cadence: current station plus one optional framed neighbor; no route-wide monument leakage";

export const LOCAL_WORLD_DRESSING_POLICY = Object.freeze({
  low: Object.freeze({ drawCalls: 1, far: false, mid: false, neighbor: false }),
  medium: Object.freeze({ drawCalls: 2, far: false, mid: true, neighbor: true }),
  high: Object.freeze({ drawCalls: 3, far: true, mid: true, neighbor: true }),
});
export const STATION_DRESSING_BAND_POLICY = Object.freeze({
  "observatory-plaque": Object.freeze({ expeditionObjects: true, sastrugi: true }),
  "s2-kernel-core": Object.freeze({ expeditionObjects: false, sastrugi: false }),
});

export const HORIZON_THEATRE_PROFILE =
  "bruno-style horizon theatre: instanced parallax ice-ridge silhouettes ringing the world beyond the playable radius";
/** Layers rendered per quality tier; low keeps one static far ring. */
export const HORIZON_THEATRE_POLICY = Object.freeze({ low: 1, medium: 2, high: 3 });
/**
 * Distant landform rings. Far rings sit deeper, scale bigger, and read hazier
 * (atmospheric perspective); follow factors < 1 give slow deterministic
 * parallax as the traveler crosses the playable field. All radii sit outside
 * the ~30-unit playable radius at spawn and inside the 44-unit sky shell.
 */
export const HORIZON_THEATRE_LAYERS = Object.freeze([
  Object.freeze({
    id: "far",
    radius: 40.5,
    jitter: 2.4,
    count: 26,
    follow: 0.965,
    drift: 0.0016,
    baseY: -2.2,
    // Atmospheric perspective, at the strength the eye expects over tens of
    // kilometres of polar air. At 0.62-0.78 the far ring kept a quarter of its
    // own value and read as painted cardboard standing behind the field; the
    // reference dissolves its farthest ridge almost entirely into the sky.
    haze: [0.88, 0.95],
    width: [7.2, 11.5],
    height: [4.6, 7.4],
  }),
  Object.freeze({
    id: "mid",
    radius: 36,
    jitter: 2.1,
    count: 19,
    follow: 0.9,
    drift: -0.0011,
    baseY: -1.9,
    haze: [0.72, 0.84],
    width: [5.2, 8.4],
    height: [3.1, 5.2],
  }),
  Object.freeze({
    id: "near",
    radius: 32,
    jitter: 1.8,
    count: 13,
    follow: 0.82,
    drift: 0.0007,
    baseY: -1.7,
    haze: [0.52, 0.66],
    width: [3.6, 6.2],
    height: [2.0, 3.6],
  }),
]);

const HORIZON_VERTEX_SHADER = `
  varying vec3 vInstanceColor;
  varying float vCrest;
  varying float vFlank;
  varying vec3 vWorldPosition;

  void main() {
    vec4 localPosition = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      // SILHOUETTE. Every ridge on the skyline was the same fourteen-point crest
      // profile, scaled, mirrored and rotated -- which is why a ring of them read
      // as one lump repeated rather than as a range. Reshaped per instance from a
      // seed hashed out of the instance's own translation, so no attribute, no
      // second buffer and no CPU work: the ring is populated once at mount and
      // the profile falls out of where each berg already stands.
      //
      // Warped above the shoulder only. The skirt still has to meet the snow flat
      // -- a berg that lifts off its base cuts the hard ground line the haze mix
      // exists to hide.
      float bergSeed = fract(
        sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453
      );
      float crestMask = smoothstep(0.0, 0.30, position.y);
      localPosition.y *= 0.70 + 0.60 * fract(bergSeed * 7.31);
      localPosition.y += crestMask * 0.26
        * sin(position.x * (4.0 + 11.0 * bergSeed) + bergSeed * 31.4);
      localPosition.x += crestMask * 0.12 * sin(position.x * 3.1 + bergSeed * 17.7);
      // Which way is across this berg, in world space, mirror and yaw included.
      // The fragment stage needs it to tell a sunward face from a lee face.
      vec2 acrossWorld = normalize((instanceMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xz);
      vFlank = position.x * dot(acrossWorld, normalize(vec2(0.904, -0.426)));
      localPosition = instanceMatrix * localPosition;
    #else
      vFlank = 0.0;
    #endif
    vec4 worldPosition = modelMatrix * localPosition;
    #ifdef USE_INSTANCING_COLOR
      vInstanceColor = instanceColor;
    #else
      vInstanceColor = vec3(0.55, 0.60, 0.74);
    #endif
    vCrest = clamp(position.y, 0.0, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const HORIZON_SKY_TINT = new THREE.Color("#E2E9F4");

const HORIZON_FRAGMENT_SHADER = `
  uniform vec2 uTravelerXZ;
  // The haze the rings dissolve into is the scene's own fog colour, not a
  // baked constant: each station carries its own atmosphere, and a fixed haze
  // left the horizon reading as cardboard pasted over whichever sky was live.
  uniform vec3 uHazeColor;
  varying vec3 vInstanceColor;
  varying float vCrest;
  varying float vFlank;
  varying vec3 vWorldPosition;

  void main() {
    vec3 hazeColor = uHazeColor;
    // Base color already carries the layer haze mix; the skirt dissolves
    // further into the horizon haze so bergs never cut a hard ground line.
    vec3 color = mix(vInstanceColor, hazeColor, (1.0 - vCrest) * 0.42);
    // RIDGE AND FACE. These are flat extruded silhouettes with no form to light,
    // and shading them by their geometric normal would only report which way the
    // billboard faces. What separates a ridge from a grey lump is that its two
    // flanks take the sun differently, with the break landing on the crest line
    // -- so the separation is DIRECTIONAL, driven by which side of its own spine
    // a fragment sits on relative to the sun bearing, rather than a uniform
    // gradient laid over the whole shape. Value only; the aerial haze mix that
    // sets each ring's depth is untouched, and the term vanishes into the skirt
    // where the berg is already dissolving into the horizon.
    //
    // Symmetric on purpose. A one-sided mix toward a darkened haze was tried
    // for the lee face and it only ever removed light: over a ring that fills
    // the horizon band it cost ~3 mean luma, which at the darkest station is
    // enough to drop a large block of sky-and-snow pixels under the 100-luma
    // line check-polar-color-continuity uses to count a snow anchor. A multiply
    // by a zero-mean quantity lights one flank and drops the other by the same
    // amount and leaves the band's mean where it found it.
    float flank = clamp(vFlank * 1.7, -1.0, 1.0) * smoothstep(0.04, 0.46, vCrest);
    color *= 1.0 + flank * 0.21;
    vec2 toBerg = normalize(vWorldPosition.xz - uTravelerXZ);
    vec2 sunXZ = normalize(vec2(0.904, -0.426));
    float sunSide = clamp(dot(toBerg, sunXZ), 0.0, 1.0);
    float rim = pow(sunSide, 3.0) * smoothstep(0.35, 0.95, vCrest);
    color += vec3(0.910, 0.608, 0.373) * rim * 0.16;
    // Snow-line lip. A tabular berg carries its brightest value along the top
    // edge where wind-packed crust catches a low sun, and weighting it to the
    // sunward flank keeps the read directional rather than outlining the shape.
    float crestLip = smoothstep(0.60, 0.97, vCrest);
    color += vec3(0.965, 0.950, 0.930) * crestLip * (0.05 + 0.11 * max(flank, 0.0));
    // Faint stratification: horizontal compression bands in world Y, the way
    // tabular bergs carry annual layering. Value-only darkening that fades
    // into the skirt haze so the horizon still reads clean at a glance.
    float strata = 0.5 + 0.5 * sin(
      vWorldPosition.y * 2.9 + vWorldPosition.x * 0.05 + vWorldPosition.z * 0.05
    );
    float strataLine = smoothstep(0.80, 0.97, strata) * smoothstep(0.15, 0.45, vCrest);
    color = mix(color, hazeColor * 0.90, strataLine * 0.16);
    gl_FragColor = vec4(color, 1.0);
  }
`;

function horizonSeeded(index, salt) {
  const value = Math.sin((index + 1) * (12.9898 + salt * 37.719)) * 43758.5453123;
  return value - Math.floor(value);
}

/** One deterministic jagged pressure-ridge/berg profile shared by every ring. */
function createHorizonSilhouetteGeometry() {
  const crest = [
    [-1.0, 0.0],
    [-0.85, 0.42],
    [-0.62, 0.3],
    [-0.52, 0.68],
    [-0.3, 0.72],
    [-0.22, 0.5],
    [-0.05, 0.55],
    [0.02, 0.95],
    [0.18, 0.98],
    [0.3, 0.62],
    [0.48, 0.66],
    [0.62, 0.35],
    [0.78, 0.45],
    [1.0, 0.0],
  ];
  const shape = new THREE.Shape();
  shape.moveTo(crest[0][0], crest[0][1]);
  for (let index = 1; index < crest.length; index += 1) {
    shape.lineTo(crest[index][0], crest[index][1]);
  }
  shape.lineTo(1.0, -0.25);
  shape.lineTo(-1.0, -0.25);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    bevelEnabled: false,
    depth: 0.3,
    steps: 1,
  });
  geometry.translate(0, 0, -0.15);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function populateHorizonLayer(mesh, layer, layerIndex, hazeBoost = 0) {
  if (!mesh || !layer) return;
  const transform = new THREE.Object3D();
  const color = new THREE.Color();
  const indigo = new THREE.Color("#8290AE");
  const violet = new THREE.Color("#8A8FB5");
  const hazeTint = new THREE.Color("#C2CBE2");
  for (let index = 0; index < layer.count; index += 1) {
    const seedA = horizonSeeded(index, layerIndex * 7.31 + 1.7);
    const seedB = horizonSeeded(index, layerIndex * 3.97 + 9.2);
    const seedC = horizonSeeded(index, layerIndex * 5.53 + 4.4);
    const angle =
      ((index + (seedA - 0.5) * 0.82) / layer.count) * Math.PI * 2 +
      layerIndex * 0.9;
    const radius = layer.radius + (seedB - 0.5) * 2 * layer.jitter;
    const width = layer.width[0] + seedA * (layer.width[1] - layer.width[0]);
    const height = layer.height[0] + seedC * (layer.height[1] - layer.height[0]);
    const mirror = seedB > 0.5 ? 1 : -1;
    transform.position.set(
      Math.cos(angle) * radius,
      layer.baseY,
      Math.sin(angle) * radius,
    );
    transform.rotation.set(0, -angle - Math.PI / 2 + (seedC - 0.5) * 0.5, 0);
    transform.scale.set(width * mirror, height, Math.max(width * 0.16, 1.1));
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
    const hazeMix = Math.min(
      1,
      layer.haze[0] + seedB * (layer.haze[1] - layer.haze[0]) + hazeBoost,
    );
    color.copy(indigo).lerp(violet, seedC).lerp(hazeTint, hazeMix);
    mesh.setColorAt(index, color);
  }
  mesh.count = layer.count;
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
}

const VERTEX_SHADER = `
  attribute float instanceMorphology;
  varying vec3 vInstanceColor;
  varying vec3 vLocalPosition;
  varying float vMorphology;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  #include <fog_pars_vertex>

  float morphologyWarp(vec3 point, float morphology) {
    float signedSeed = morphology * 2.0 - 1.0;
    float heightMask = smoothstep(0.0, 1.18, max(point.y, 0.0));
    float windCut = sin(point.z * 3.4 + point.x * 2.1 + morphology * 6.2831853);
    return signedSeed * heightMask * 0.17 + windCut * heightMask * 0.045;
  }

  void main() {
    vec4 localPosition = vec4(position, 1.0);
    vec3 localNormal = normal;
    #ifdef USE_INSTANCING
      float silhouetteWarp = morphologyWarp(localPosition.xyz, instanceMorphology);
      localPosition.x += silhouetteWarp;
      localPosition.z += silhouetteWarp * (instanceMorphology - 0.5) * 0.52;
      localPosition.x *= 0.88 + instanceMorphology * 0.24;
      localPosition.z *= 1.08 - instanceMorphology * 0.16;
      localPosition = instanceMatrix * localPosition;
      localNormal = mat3(instanceMatrix) * localNormal;
    #endif
    vec4 mvPosition = modelViewMatrix * localPosition;
    vLocalPosition = position;
    vMorphology = instanceMorphology;
    vViewNormal = normalize(normalMatrix * localNormal);
    vViewPosition = -mvPosition.xyz;
    #ifdef USE_INSTANCING_COLOR
      vInstanceColor = instanceColor;
    #else
      vInstanceColor = vec3(0.42, 0.52, 0.64);
    #endif
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const FRAGMENT_SHADER = `
  uniform float uMotion;
  uniform float uTime;
  varying vec3 vInstanceColor;
  varying vec3 vLocalPosition;
  varying float vMorphology;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  #include <fog_pars_fragment>

  float strataDistance(float coordinate) {
    return abs(fract(coordinate) - 0.5);
  }

  void main() {
    vec3 normal = normalize(vViewNormal);
    vec3 viewDirection = normalize(vViewPosition);
    vec3 lightDirection = normalize(vec3(0.42, 0.84, 0.34));
    float wrappedDiffuse = clamp((dot(normal, lightDirection) + 0.42) / 1.42, 0.0, 1.0);
    float toonDiffuse = floor(wrappedDiffuse * 4.0 + 0.5) / 4.0;
    float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.8);
    float contourDistance = strataDistance(vLocalPosition.y * 3.2 + vLocalPosition.x * 0.22 + vMorphology * 0.31);
    float contourWidth = max(fwidth(contourDistance), 0.012);
    float frostStratum = 1.0 - smoothstep(0.40 - contourWidth, 0.49, contourDistance);
    float slowGlint = 0.5 + 0.5 * sin(uTime * 0.32 + vLocalPosition.x * 2.1 + vLocalPosition.z * 1.7);
    vec3 frost = vec3(0.62, 0.72, 0.84);
    vec3 color = vInstanceColor * (${WORLD_DRESSING_COLOR_PROFILE.ambientFloor.toFixed(2)} + toonDiffuse * 0.28);
    color = mix(color, frost, frostStratum * 0.10 + fresnel * 0.22);
    // Edge-value definition: a darker contour band just inside the bright
    // fresnel rim separates prop silhouettes from the snow behind them, and a
    // tight near-rim lift crisps the outermost edge. Value work only -- no new
    // draw, no hue, instance color untouched.
    float edgeBand = smoothstep(0.28, 0.58, fresnel) * (1.0 - smoothstep(0.58, 0.90, fresnel));
    color = mix(color, vec3(0.33, 0.40, 0.52), edgeBand * 0.12);
    color += vec3(0.90, 0.94, 0.99) * smoothstep(0.78, 0.98, fresnel) * 0.07;
    // Cairn signal ring: the torus/lens crown sits near y=1.0 in cairn local
    // space, so a height band isolates it without a second draw or attribute.
    float signalRingBand = smoothstep(0.86, 0.98, vLocalPosition.y)
      * (1.0 - smoothstep(1.24, 1.44, vLocalPosition.y));
    float signalPulse = 0.5 + 0.5 * sin(uTime * 6.2831853 * 0.25 + vMorphology * 6.2831853);
    color += vec3(0.42, 0.86, 0.80) * signalRingBand * signalPulse * 0.34;
    float terrainContact = 1.0 - smoothstep(0.0, 0.16, vLocalPosition.y);
    color = mix(color, vec3(0.28, 0.36, 0.48), terrainContact * 0.04);
    color += vec3(0.30, 0.44, 0.62) * fresnel * (0.05 + slowGlint * uMotion * 0.025);
    gl_FragColor = vec4(color, 1.0);
    #include <fog_fragment>
  }
`;

function placementAllowedForStation(placement, band) {
  const policy = STATION_DRESSING_BAND_POLICY[placement.anchorId];
  if (!policy) return true;
  return band === "near" ? policy.sastrugi : policy.expeditionObjects;
}

function applyInstances(mesh, placements, band, allowedStationIds) {
  if (!mesh) return;
  const visiblePlacements = placements.filter(
    (placement) =>
      placementAllowedForStation(placement, band) &&
      (!allowedStationIds || allowedStationIds.has(placement.anchorId)),
  );
  const transform = new THREE.Object3D();
  const color = new THREE.Color();
  // Ground cover is snow, and snow next to snow differs by a few percent of
  // value, not by a hue step. At #A9C2DB the sastrugi sat a full value below the
  // field they are cut from, so a dense band of them read as blue glass shards
  // scattered on white rather than as drift the wind carved out of it.
  const frost = new THREE.Color("#CBD9E8");
  const morphology = new Float32Array(visiblePlacements.length);
  const bandMix =
    band === "near"
      ? WORLD_DRESSING_COLOR_PROFILE.nearFrostMix
      : band === "mid"
        ? WORLD_DRESSING_COLOR_PROFILE.midFrostMix
        : WORLD_DRESSING_COLOR_PROFILE.farFrostMix;
  for (let index = 0; index < visiblePlacements.length; index += 1) {
    const placement = visiblePlacements[index];
    transform.position.set(...placement.position);
    transform.rotation.set(...placement.rotation);
    transform.scale.set(...placement.scale);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
    morphology[index] = placement.morphology;
    color.set(placement.accent).lerp(frost, bandMix);
    if (band === "far") color.offsetHSL(0.015, -0.1, 0.06);
    mesh.setColorAt(index, color);
  }
  mesh.count = visiblePlacements.length;
  mesh.geometry.setAttribute(
    "instanceMorphology",
    new THREE.InstancedBufferAttribute(morphology, 1),
  );
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
}

export default function AdaptivePolarWorldDressing({
  artifacts,
  exclusiveStationId = null,
  quality = "medium",
  reducedMotion = false,
  traversalPoseRef,
}) {
  const root = useRef(null);
  const near = useRef(null);
  const mid = useRef(null);
  const far = useRef(null);
  const horizonRings = useRef([null, null, null]);
  const ownershipScratch = useRef({
    blend: { entries: [{}, {}], primary: null, secondary: null },
    visibleStationIds: [],
  });
  const positionScratch = useRef([0, 0]);
  const visibleOwnershipKey = useRef("");
  const layout = useMemo(
    () => buildWorldDressingLayout(artifacts, { quality }),
    [artifacts, quality],
  );
  const budget = WORLD_DRESSING_BUDGET[quality] || WORLD_DRESSING_BUDGET.medium;
  const lowQuality = quality === "low";
  const localPolicy =
    LOCAL_WORLD_DRESSING_POLICY[quality] || LOCAL_WORLD_DRESSING_POLICY.medium;
  const horizonLayerCount =
    HORIZON_THEATRE_POLICY[quality] ?? HORIZON_THEATRE_POLICY.medium;
  const geometries = useMemo(() => createWorldDressingGeometries(), []);
  const horizonGeometry = useMemo(() => createHorizonSilhouetteGeometry(), []);
  const horizonMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        fragmentShader: HORIZON_FRAGMENT_SHADER,
        side: THREE.DoubleSide,
        toneMapped: false,
        uniforms: {
          uHazeColor: { value: new THREE.Color("#BDC7E1") },
          uTravelerXZ: { value: new THREE.Vector2() },
        },
        vertexColors: true,
        vertexShader: HORIZON_VERTEX_SHADER,
      }),
    [],
  );
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        fog: true,
        fragmentShader: FRAGMENT_SHADER,
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          {
            uMotion: { value: 0 },
            uTime: { value: 0 },
          },
        ]),
        vertexColors: true,
        vertexShader: VERTEX_SHADER,
      }),
    [],
  );

  useLayoutEffect(() => {
    const hidden = new Set();
    applyInstances(near.current, layout.bands.near, "near", hidden);
    applyInstances(mid.current, layout.bands.mid, "mid", hidden);
    applyInstances(far.current, layout.bands.far, "far", hidden);
    visibleOwnershipKey.current = "";
  }, [layout]);

  useLayoutEffect(() => {
    // Low tier keeps one static far ring and dissolves it further into haze so
    // the pixel-graded low pipeline never trades horizon depth for luminance.
    const hazeBoost = lowQuality ? 0.24 : 0;
    for (let index = 0; index < horizonLayerCount; index += 1) {
      populateHorizonLayer(
        horizonRings.current[index],
        HORIZON_THEATRE_LAYERS[index],
        index,
        hazeBoost,
      );
    }
  }, [horizonLayerCount, lowQuality]);

  useEffect(
    () => () => {
      geometries.near.dispose();
      geometries.mid.dispose();
      geometries.far.dispose();
      material.dispose();
      horizonGeometry.dispose();
      horizonMaterial.dispose();
    },
    [geometries, horizonGeometry, horizonMaterial, material],
  );

  useFrame(({ clock, scene }) => {
    const pose = traversalPoseRef?.current;
    positionScratch.current[0] = Number.isFinite(pose?.x) ? pose.x : 0;
    positionScratch.current[1] = Number.isFinite(pose?.z) ? pose.z : 0;
    const ownership = resolveLocalWorldOwnership(
      positionScratch.current,
      ownershipScratch.current,
      { exclusiveStationId },
    );
    const visibleStationIds = ownership.visibleStationIds;
    const currentId = visibleStationIds[0] || "";
    const neighborId = localPolicy.neighbor ? visibleStationIds[1] || "" : "";
    const ownershipKey = `${quality}:${currentId}|${neighborId}`;
    if (ownershipKey !== visibleOwnershipKey.current) {
      visibleOwnershipKey.current = ownershipKey;
      const allowedStationIds = new Set();
      if (currentId) allowedStationIds.add(currentId);
      if (neighborId) allowedStationIds.add(neighborId);
      applyInstances(near.current, layout.bands.near, "near", allowedStationIds);
      applyInstances(
        mid.current,
        layout.bands.mid,
        "mid",
        localPolicy.mid ? allowedStationIds : new Set(),
      );
      applyInstances(
        far.current,
        layout.bands.far,
        "far",
        localPolicy.far ? allowedStationIds : new Set(),
      );
    }
    const speed = Math.hypot(pose?.vx || 0, pose?.vz || 0);
    material.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime;
    material.uniforms.uMotion.value = reducedMotion
      ? 0
      : THREE.MathUtils.clamp(speed / 5.8, 0, 1);
    // Tiny far-berg wobble: a whole-pool yaw breath, so the horizon band is
    // never perfectly still. No instance rewrite, no extra draw.
    if (far.current) {
      far.current.rotation.y = reducedMotion
        ? 0
        : Math.sin(clock.elapsedTime * 0.21) * 0.01;
    }
    const horizonDriftTime = reducedMotion || lowQuality ? 0 : clock.elapsedTime;
    horizonMaterial.uniforms.uTravelerXZ.value.set(
      positionScratch.current[0],
      positionScratch.current[1],
    );
    if (scene.fog?.color) {
      // Toward the sky the rings actually stand against, not the fog constant.
      // scene.fog.color is the mid-depth extinction tint (#697CA6 at the home
      // field); the sky it meets at the horizon is far lighter, so dissolving
      // straight into the fog value left the ridges reading as dark cardboard
      // instead of disappearing.
      horizonMaterial.uniforms.uHazeColor.value
        .copy(scene.fog.color)
        .lerp(HORIZON_SKY_TINT, 0.55);
    }
    for (let index = 0; index < horizonLayerCount; index += 1) {
      const ring = horizonRings.current[index];
      const layer = HORIZON_THEATRE_LAYERS[index];
      if (!ring || !layer) continue;
      ring.position.set(
        positionScratch.current[0] * layer.follow,
        0,
        positionScratch.current[1] * layer.follow,
      );
      ring.rotation.y = horizonDriftTime * layer.drift;
    }
  });

  return (
    <group
      name={POLAR_WORLD_DRESSING_PROFILE}
      ref={root}
      userData={{
        drawCalls: budget.drawCalls,
        localWorldDrawCalls: localPolicy.drawCalls,
        farObjects: budget.far,
        horizonLayers: horizonLayerCount,
        midObjects: budget.mid,
        nearObjects: budget.near,
        totalObjects: budget.total,
        stationCount: STATION_WORLD_SCHEMA.order.length,
      }}
    >
      {HORIZON_THEATRE_LAYERS.slice(0, horizonLayerCount).map((layer, index) => (
        <instancedMesh
          args={[horizonGeometry, horizonMaterial, layer.count]}
          castShadow={false}
          frustumCulled={false}
          geometry={horizonGeometry}
          key={layer.id}
          material={horizonMaterial}
          name={`horizon-theatre-${layer.id}-berg-ring`}
          receiveShadow={false}
          ref={(node) => {
            horizonRings.current[index] = node;
          }}
        />
      ))}
      <instancedMesh
        castShadow={false}
        frustumCulled
        geometry={geometries.far}
        material={material}
        name="far-tabular-berg-pool"
        ref={far}
        receiveShadow={false}
        args={[geometries.far, material, budget.far]}
        visible={!lowQuality && localPolicy.far}
      />
      <instancedMesh
        castShadow={quality === "high"}
        frustumCulled
        geometry={geometries.mid}
        material={material}
        name="mid-expedition-cairn-pool"
        ref={mid}
        receiveShadow={false}
        args={[geometries.mid, material, budget.mid]}
        visible={!lowQuality && localPolicy.mid}
      />
      <instancedMesh
        castShadow={false}
        frustumCulled
        geometry={geometries.near}
        material={material}
        name="near-wind-cut-sastrugi-pool"
        ref={near}
        receiveShadow={quality !== "low"}
        args={[geometries.near, material, budget.near]}
      />
    </group>
  );
}
