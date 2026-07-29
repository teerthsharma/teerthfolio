"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { POLAR_BIOME_PROFILES } from "../lib/polar-biome-fields";

export const POLAR_ATMOSPHERE_PROFILE =
  "original textureless Antarctic mist: one instanced draw, seeded side/horizon clear-space distribution, additive order-independent plumes, GPU-only drift, station-accent hook";

export const POLAR_ATMOSPHERE_BUDGET = Object.freeze({
  low: Object.freeze({ instances: 0, noiseOctaves: 0, opacity: 0 }),
  medium: Object.freeze({ instances: 28, noiseOctaves: 3, opacity: 0.046 }),
  high: Object.freeze({ instances: 52, noiseOctaves: 4, opacity: 0.064 }),
});

const VERTEX_SHADER = `
attribute vec3 aOffset;
attribute vec2 aScale;
attribute float aSeed;

uniform float uTime;
uniform float uWind;

varying vec2 vMistUv;
varying float vMistSeed;
varying vec2 vWorldXZ;

void main() {
  float phase = aSeed * 31.4159;
  vec3 offset = aOffset;
  offset.x += sin(uTime * (0.024 + aSeed * 0.018) + phase) * (0.18 + uWind * 0.08);
  offset.y += cos(uTime * 0.031 + phase * 0.7) * 0.035;

  // Build each quad directly in view space so all plumes face the camera.
  vec4 worldCenter = modelMatrix * vec4(offset, 1.0);
  vec4 viewCenter = viewMatrix * worldCenter;
  viewCenter.xy += position.xy * aScale;
  gl_Position = projectionMatrix * viewCenter;

  vMistUv = uv;
  vMistSeed = aSeed;
  vWorldXZ = worldCenter.xz;
}
`;

function makeFragmentShader(noiseOctaves) {
  return `
uniform vec3 uAccent;
uniform float uOpacity;
uniform float uStationInfluence;
uniform float uTime;
uniform float uBiomeRadius;
uniform float uBiomeFalloff;
uniform vec2 uBiomeCenterXZ;
uniform vec3 uAtmosphereColor;
uniform vec3 uAtmosphereGlow;

varying vec2 vMistUv;
varying float vMistSeed;
varying vec2 vWorldXZ;

float continuousAtmosphereXZEnvelope(
  vec2 worldXZ,
  vec2 centerXZ,
  float radius,
  float falloff
) {
  float distanceXZ = length(worldXZ - centerXZ);
  return 1.0 - smoothstep(radius * falloff, radius, distanceXZ);
}

float polarHash(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
}

float polarNoise(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  local = local * local * (3.0 - 2.0 * local);
  float a = polarHash(cell);
  float b = polarHash(cell + vec2(1.0, 0.0));
  float c = polarHash(cell + vec2(0.0, 1.0));
  float d = polarHash(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
}

float polarFbm(vec2 point) {
  float sum = 0.0;
  float amplitude = 0.56;
  mat2 rotation = mat2(0.82, -0.57, 0.57, 0.82);
  for (int octave = 0; octave < ${noiseOctaves}; octave += 1) {
    sum += amplitude * polarNoise(point);
    point = rotation * point * 2.03 + 7.13;
    amplitude *= 0.48;
  }
  return sum;
}

void main() {
  vec2 centered = vMistUv * 2.0 - 1.0;
  vec2 drift = vec2(uTime * 0.008, -uTime * 0.003);
  vec2 noiseUv = centered * vec2(1.35, 1.8) + drift + vMistSeed * 19.7;

  float broadEnvelope = 1.0 - smoothstep(0.28, 1.04, length(centered * vec2(0.72, 1.16)));
  float lowerShelf = smoothstep(-0.94, -0.34, centered.y);
  float upperFade = 1.0 - smoothstep(0.42, 1.0, centered.y);
  float macro = polarFbm(noiseUv);
  float lace = polarNoise(noiseUv * 2.7 + vec2(vMistSeed * 4.0, 0.0));
  float density = smoothstep(0.37, 0.76, macro * 0.78 + lace * 0.22 + broadEnvelope * 0.38);
  density *= broadEnvelope * lowerShelf * upperFade;

  vec3 polarColor = mix(uAtmosphereColor, uAtmosphereGlow, 0.24 + macro * 0.46);
  polarColor = mix(polarColor, uAccent, uStationInfluence * (0.24 + 0.25 * macro));

  float breathing = 0.88 + 0.12 * sin(uTime * 0.11 + vMistSeed * 18.0);
  float localEnvelope = continuousAtmosphereXZEnvelope(
    vWorldXZ,
    uBiomeCenterXZ,
    uBiomeRadius,
    uBiomeFalloff
  );
  float alpha = density * uOpacity * breathing * localEnvelope;
  if (alpha < 0.002) discard;
  gl_FragColor = vec4(polarColor, alpha);
}
`;
}

function seededValue(index, salt) {
  const value = Math.sin((index + 1) * (12.9898 + salt * 17.131)) * 43758.5453;
  return value - Math.floor(value);
}

function makeMistGeometry(count) {
  const base = new THREE.PlaneGeometry(2, 1, 1, 1);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = base.index.clone();
  geometry.setAttribute("position", base.getAttribute("position").clone());
  geometry.setAttribute("uv", base.getAttribute("uv").clone());

  const offsets = new Float32Array(count * 3);
  const scales = new Float32Array(count * 2);
  const seeds = new Float32Array(count);

  for (let index = 0; index < count; index += 1) {
    const seed = seededValue(index, 0.19);
    const side = seededValue(index, 0.43) > 0.5 ? 1 : -1;
    const horizonLayer = index % 5 === 0;
    const x = horizonLayer
      ? (seededValue(index, 0.71) - 0.5) * 31
      : side * (5.6 + seededValue(index, 0.71) * 12.8);

    offsets[index * 3] = x;
    offsets[index * 3 + 1] = 0.58 + seededValue(index, 1.07) * (horizonLayer ? 1.7 : 2.5);
    offsets[index * 3 + 2] = -7.2 - seededValue(index, 1.39) * 11.5 - (horizonLayer ? 3.0 : 0);
    scales[index * 2] = 3.6 + seededValue(index, 1.83) * (horizonLayer ? 5.8 : 4.4);
    scales[index * 2 + 1] = 1.0 + seededValue(index, 2.11) * (horizonLayer ? 1.5 : 2.2);
    seeds[index] = seed;
  }

  geometry.setAttribute("aOffset", new THREE.InstancedBufferAttribute(offsets, 3));
  geometry.setAttribute("aScale", new THREE.InstancedBufferAttribute(scales, 2));
  geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
  geometry.instanceCount = count;
  base.dispose();
  geometry.computeBoundingSphere();
  return geometry;
}

export default function PolarAtmosphereField({
  accent = "#5CC9C2",
  axisX = 0,
  depthZ = 0,
  quality = "medium",
  reducedMotion = false,
  safeMode = false,
  stationId = "observatory-plaque",
  stationInfluence = 0.18,
  visible = true,
  windSpeed = 1,
}) {
  const root = useRef(null);
  const profile =
    POLAR_BIOME_PROFILES[stationId] || POLAR_BIOME_PROFILES["observatory-plaque"];
  const budget = POLAR_ATMOSPHERE_BUDGET[quality] || POLAR_ATMOSPHERE_BUDGET.medium;
  const enabled = visible && !safeMode && !reducedMotion && budget.instances > 0;
  const geometry = useMemo(
    () => (enabled ? makeMistGeometry(budget.instances) : null),
    [budget.instances, enabled],
  );
  const material = useMemo(
    () =>
      enabled
        ? new THREE.ShaderMaterial({
            blending: THREE.AdditiveBlending,
            depthTest: true,
            depthWrite: false,
            fragmentShader: makeFragmentShader(budget.noiseOctaves),
            side: THREE.DoubleSide,
            toneMapped: false,
            transparent: true,
            uniforms: {
              uAccent: { value: new THREE.Color("#5CC9C2") },
              uAtmosphereColor: { value: new THREE.Color("#22354F") },
              uAtmosphereGlow: { value: new THREE.Color("#5A93A8") },
              uBiomeCenterXZ: { value: new THREE.Vector2(-15, 7) },
              uBiomeFalloff: { value: 0.62 },
              uBiomeRadius: { value: 10.5 },
              uOpacity: { value: budget.opacity },
              uStationInfluence: { value: 0.18 },
              uTime: { value: 0 },
              uWind: { value: 1 },
            },
            vertexShader: VERTEX_SHADER,
          })
        : null,
    [budget.noiseOctaves, budget.opacity, enabled],
  );

  useEffect(() => {
    if (!material) return;
    material.uniforms.uAccent.value.set(accent);
    material.uniforms.uAtmosphereColor.value.set(profile.atmosphere.colors[0]);
    material.uniforms.uAtmosphereGlow.value.set(profile.atmosphere.colors[1]);
    material.uniforms.uBiomeCenterXZ.value.set(...profile.centerXZ);
    material.uniforms.uBiomeFalloff.value = profile.falloff;
    material.uniforms.uBiomeRadius.value = profile.radius;
    material.uniforms.uOpacity.value =
      budget.opacity * profile.atmosphere.particleStrength;
    material.uniforms.uStationInfluence.value = THREE.MathUtils.clamp(stationInfluence, 0, 0.4);
  }, [accent, budget.opacity, material, profile, stationInfluence]);

  useEffect(
    () => () => {
      geometry?.dispose();
      material?.dispose();
    },
    [geometry, material],
  );

  useFrame(({ clock }) => {
    if (!enabled || !root.current || !material) return;
    root.current.position.set(axisX, 0, depthZ);
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uWind.value = THREE.MathUtils.clamp(windSpeed, 0.4, 2.4);
  });

  if (!enabled || !geometry || !material) return null;

  return (
    <mesh
      frustumCulled={false}
      geometry={geometry}
      material={material}
      name={POLAR_ATMOSPHERE_PROFILE}
      ref={root}
      renderOrder={-4}
      userData={{
        coordinateSpace: profile.atmosphere.coordinateSpace,
        instances: budget.instances,
        stationId,
      }}
    />
  );
}
