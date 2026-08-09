import { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  POLAR_XZ_NOISE_GLSL,
  POLAR_XZ_SHADER_POLICY,
  STATION_SHADER_FAMILY_POLICY,
  STATION_SHADER_PROFILES,
} from "../lib/polar-art-direction";

export const STATION_SURFACE_SHADER_PROFILE =
  "two-program world-XZ station family: eight uniform identities, zero textures, branch-free toon optics";

// The kernel core needs to remain readable against the polar sky without
// turning the shared station shader into a bloom lamp.
export const S2_ACTIVE_EMISSIVE = 0.24;

function makeColor(value) {
  return { value: new THREE.Color(value) };
}

export default function StationSurfaceMaterial({
  active = false,
  hovered = false,
  opacity = 1,
  profileId,
  quality = "medium",
  tone = "surface",
  zoneOrigin = [0, 0],
}) {
  const profile = STATION_SHADER_PROFILES[profileId];
  const shaderVariant = STATION_SHADER_FAMILY_POLICY.qualityMapping[quality] || "full";
  const profileAngle = THREE.MathUtils.degToRad(profile.angle);
  const displacementBudget =
    POLAR_XZ_SHADER_POLICY.quality[quality]?.vertexDisplacement ??
    POLAR_XZ_SHADER_POLICY.quality.medium.vertexDisplacement;
  const zoneOriginX = zoneOrigin[0];
  const zoneOriginZ = zoneOrigin[1];
  const customProgramCacheKey = useMemo(
    () => () => `${STATION_SURFACE_SHADER_PROFILE}:polar-station-surface:${shaderVariant}`,
    [shaderVariant],
  );
  const uniforms = useMemo(() => {
    const inkTone = tone === "ink";
    return {
      uStationBaseColor: makeColor(inkTone ? profile.ink : profile.surface),
      uStationSecondaryColor: makeColor(inkTone ? profile.surface : profile.secondary),
      uStationAccentColor: makeColor(profile.accent),
      uStationInkColor: makeColor(profile.ink),
      uStationAxis: {
        value: new THREE.Vector2(Math.cos(profileAngle), Math.sin(profileAngle)),
      },
      uStationOriginXZ: { value: new THREE.Vector2() },
      uProfileSeed: {
        value: new THREE.Vector2(profile.angle * 0.017, profile.stripeScale * 0.13),
      },
      uMacroScale: { value: profile.macroScale },
      uMicroScale: { value: profile.microScale },
      uStripeScale: { value: profile.stripeScale },
      uZoneBias: { value: profile.zoneBias },
      uStationDisplacement: { value: displacementBudget * profile.displacement },
      uRimPower: { value: profile.rimPower },
      uRimStrength: { value: profile.rimStrength },
      uToonSteps: { value: profile.toonSteps },
      uStationEnergy: { value: 0.16 },
    };
  }, [displacementBudget, profile, profileAngle, tone]);

  useEffect(() => {
    uniforms.uStationEnergy.value = active ? 1 : hovered ? 0.58 : 0.16;
    uniforms.uStationOriginXZ.value.set(zoneOriginX, zoneOriginZ);
    uniforms.uStationDisplacement.value = displacementBudget * profile.displacement;
  }, [active, displacementBudget, hovered, profile.displacement, uniforms, zoneOriginX, zoneOriginZ]);

  const onBeforeCompile = useMemo(
    () => (shader) => {
      Object.assign(shader.uniforms, uniforms);
      const fullVertexNoise =
        shaderVariant === "full"
          ? `${POLAR_XZ_NOISE_GLSL}
float stationVertexDisplacement(vec2 stationLocalXZ) {
  float stationMacroDisplacement = polarXZNoise(stationLocalXZ * uMacroScale + uProfileSeed);
  return (stationMacroDisplacement * 2.0 - 1.0) * uStationDisplacement;
}`
          : "";
      const vertexDisplacement =
        shaderVariant === "full"
          ? "transformed += objectNormal * stationVertexDisplacement(stationLocalXZ);"
          : "";
      const fragmentNoise = shaderVariant === "full" ? POLAR_XZ_NOISE_GLSL : "";
      const fragmentZoneField =
        shaderVariant === "full"
          ? `float stationMacroField = polarXZNoise(stationLocalXZ * uMacroScale + uProfileSeed);
float stationMicroField = polarXZNoise(stationLocalXZ * uMicroScale - uProfileSeed.yx);
float stationSweep = 0.5 + 0.5 * sin(dot(stationLocalXZ, uStationAxis) * uStripeScale + stationMacroField * 2.4);
float stationZoneSelector = stationMacroField * 0.56 + stationMicroField * 0.12 + stationSweep * 0.32;`
          : `float stationSweep = 0.5 + 0.5 * sin(dot(stationLocalXZ, uStationAxis) * uStripeScale + uProfileSeed.x);
float stationCrossSweep = 0.5 + 0.5 * cos(dot(stationLocalXZ, uStationAxis.yx * vec2(-1.0, 1.0)) * (uStripeScale * 0.61) + uProfileSeed.y);
float stationZoneSelector = stationSweep * 0.68 + stationCrossSweep * 0.32;`;
      const fragmentNormal =
        shaderVariant === "full"
          ? `vec3 stationDx = dFdx(vStationWorldPosition);
vec3 stationDy = dFdy(vStationWorldPosition);
vec3 stationComputedNormal = normalize(cross(stationDx, stationDy));
if (dot(stationComputedNormal, normalize(vStationWorldNormal)) < 0.0) stationComputedNormal *= -1.0;`
          : "vec3 stationComputedNormal = normalize(vStationWorldNormal);";

      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
uniform vec2 uStationOriginXZ;
uniform vec2 uProfileSeed;
uniform float uMacroScale;
uniform float uStationDisplacement;
varying vec3 vStationWorldPosition;
varying vec3 vStationWorldNormal;
${fullVertexNoise}`,
        )
        .replace(
          "#include <beginnormal_vertex>",
          `#include <beginnormal_vertex>
vStationWorldNormal = normalize(mat3(modelMatrix) * objectNormal);`,
        )
        .replace(
          "#include <displacementmap_vertex>",
          `#include <displacementmap_vertex>
vec2 stationLocalXZ = (modelMatrix * vec4(transformed, 1.0)).xz - uStationOriginXZ;
${vertexDisplacement}
vStationWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
uniform vec3 uStationBaseColor;
uniform vec3 uStationSecondaryColor;
uniform vec3 uStationAccentColor;
uniform vec3 uStationInkColor;
uniform vec2 uStationAxis;
uniform vec2 uStationOriginXZ;
uniform vec2 uProfileSeed;
uniform float uMacroScale;
uniform float uMicroScale;
uniform float uStripeScale;
uniform float uZoneBias;
uniform float uRimPower;
uniform float uRimStrength;
uniform float uToonSteps;
uniform float uStationEnergy;
varying vec3 vStationWorldPosition;
varying vec3 vStationWorldNormal;
${fragmentNoise}`,
        )
        .replace(
          "#include <map_fragment>",
          `#include <map_fragment>
vec2 stationLocalXZ = vStationWorldPosition.xz - uStationOriginXZ;
${fragmentZoneField}
float stationZoneStart = clamp(0.34 + uZoneBias, 0.12, 0.62);
float stationZoneEnd = clamp(0.69 + uZoneBias, 0.38, 0.94);
float stationZoneMix = smoothstep(stationZoneStart, stationZoneEnd, stationZoneSelector);
${fragmentNormal}
vec3 stationViewDirection = normalize(cameraPosition - vStationWorldPosition);
vec3 stationLightDirection = normalize(vec3(-0.42, 0.84, 0.34));
float stationFacing = clamp(dot(stationComputedNormal, stationViewDirection), 0.0, 1.0);
float stationRim = pow(1.0 - stationFacing, uRimPower);
float stationWrappedDiffuse = clamp(dot(stationComputedNormal, stationLightDirection) * 0.5 + 0.5, 0.0, 1.0);
float stationToonDiffuse = floor(stationWrappedDiffuse * uToonSteps + 0.5) / uToonSteps;
vec3 stationZoneColor = mix(uStationBaseColor, uStationSecondaryColor, stationZoneMix * 0.74);
stationZoneColor = mix(stationZoneColor, uStationAccentColor, (0.035 + uStationEnergy * 0.055) * stationSweep);
vec3 stationOpticalColor = stationZoneColor * (0.88 + stationToonDiffuse * 0.16);
// DIRECTIONAL RELIEF, the plate's share of the camp-wide pass. This normal is
// already world space, so the shared GLSL block's viewMatrix inversion is not
// needed here — only its ramp, and the same soffit constant. Without it the
// plate's lit top edge and its underside sat at one value and it read as a
// decal on the pedestal rather than as a slab with a thickness.
float stationDeckLight = smoothstep(0.20, 0.64, stationComputedNormal.y);
float stationSoffitShade = smoothstep(0.20, 0.64, -stationComputedNormal.y);
float stationWallTurn = clamp(dot(stationComputedNormal.xz, vec2(0.629, 0.777)), 0.0, 1.0);
stationOpticalColor *=
  1.0 + stationDeckLight * 0.17 + stationWallTurn * 0.07 - stationSoffitShade * 0.34;
stationOpticalColor += uStationSecondaryColor * stationRim * uRimStrength * 0.44;
float stationInkContour = smoothstep(0.72, 0.99, stationRim) * (0.07 + uRimStrength * 0.13);
stationOpticalColor = mix(stationOpticalColor, uStationInkColor, stationInkContour);
diffuseColor.rgb = mix(diffuseColor.rgb, stationOpticalColor, 0.96);`,
        )
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
totalEmissiveRadiance += uStationAccentColor * (uStationEnergy * 0.018 + stationRim * uRimStrength * 0.024);`,
        );
    },
    [shaderVariant, uniforms],
  );

  return (
    <meshStandardMaterial
      color={profile.surface}
      customProgramCacheKey={customProgramCacheKey}
      emissive={profile.accent}
      emissiveIntensity={
        active
          ? profileId === "s2-kernel-core"
            ? S2_ACTIVE_EMISSIVE
            : 0.11
          : hovered
            ? 0.065
            : 0.025
      }
      key={`polar-station-${shaderVariant}`}
      metalness={0.04}
      onBeforeCompile={onBeforeCompile}
      opacity={opacity}
      roughness={tone === "ink" ? 0.72 : 0.5}
      transparent
    />
  );
}
