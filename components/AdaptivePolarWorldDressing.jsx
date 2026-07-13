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
      vInstanceColor = vec3(0.72, 0.88, 0.90);
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
    vec3 frost = vec3(0.955, 0.985, 0.965);
    vec3 color = vInstanceColor * (${WORLD_DRESSING_COLOR_PROFILE.ambientFloor.toFixed(2)} + toonDiffuse * 0.28);
    color = mix(color, frost, frostStratum * 0.10 + fresnel * 0.22);
    float terrainContact = 1.0 - smoothstep(0.0, 0.16, vLocalPosition.y);
    color = mix(color, vec3(0.82, 0.91, 0.90), terrainContact * 0.04);
    color += vec3(0.16, 0.31, 0.38) * fresnel * (0.05 + slowGlint * uMotion * 0.025);
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
  const frost = new THREE.Color("#EAF8F1");
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
  const geometries = useMemo(() => createWorldDressingGeometries(), []);
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

  useEffect(
    () => () => {
      geometries.near.dispose();
      geometries.mid.dispose();
      geometries.far.dispose();
      material.dispose();
    },
    [geometries, material],
  );

  useFrame(({ clock }) => {
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
  });

  return (
    <group
      name={POLAR_WORLD_DRESSING_PROFILE}
      ref={root}
      userData={{
        drawCalls: budget.drawCalls,
        localWorldDrawCalls: localPolicy.drawCalls,
        farObjects: budget.far,
        midObjects: budget.mid,
        nearObjects: budget.near,
        totalObjects: budget.total,
        stationCount: STATION_WORLD_SCHEMA.order.length,
      }}
    >
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
