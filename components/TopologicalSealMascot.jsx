"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  SEAL_MANIFOLD_FORMULA,
  SEAL_MANIFOLD_INVARIANT,
  SEAL_MANIFOLD_MAPPING,
  createSealManifoldGeometry,
} from "../lib/seal-manifold";
import { STATION_WORLD_SCHEMA } from "../lib/polar-station-world";
import { SEAL_GUIDE_STATES } from "../lib/seal-guide-state";
import { criticallyDampedStep } from "../lib/polar-world-cadence";
import { resolveSealPresentationScale } from "../lib/polar-camera-composition";
import { resolveStationHaloPresentation } from "../lib/polar-station-personality";

export const MAX_TRANSLATION_SPEED = 4.2;
export const SEAL_MANIFOLD_DRAW_BUDGET = "one primary surface draw";
export const SEAL_MASCOT_ACCESSORY_DRAW_BUDGET =
  "three accessory draws: instanced eye pair, instanced highlight pair, one mesh halo";
export const SEAL_MANIFOLD_MOTION_PROFILE =
  "canonical acceleration-limited translation with permanent breathing, speed-gated face-to-tail glumph wave, critically damped lift, and no second position filter";
export const SEAL_MANIFOLD_TEXTURE_PROFILE =
  "seal-zone-xz pearl sage ivory asymmetric spots and indigo face markings";
export const SEAL_CROWN_HALO_PROFILE = Object.freeze({
  placement: "above and behind seal head",
  stationColor: "resolved from the active station halo palette",
  depthFrame: "rendered behind the seal head with depth testing",
});

const GUIDE_HEIGHT = 0.45;
const POSE_RESPONSE = 12;
const HEADING_RESPONSE = 9;
const MAX_FRAME_STEP = 1 / 20;
const MOVEMENT_LIFT_MAX = 0.145;
const MOVEMENT_LIFT_OMEGA = 12;
const SEAL_EYE_POSITIONS = Object.freeze([
  Object.freeze([1.01, 0.35, 0.105]),
  Object.freeze([1.01, 0.35, -0.105]),
]);
const SEAL_EYE_HIGHLIGHT_POSITIONS = Object.freeze([
  Object.freeze([1.03, 0.405, 0.105]),
  Object.freeze([1.03, 0.405, -0.105]),
]);
const HALO_MINIMUM_OPACITY = 0.58;
const HALO_STATE_OPACITY = Object.freeze({
  idle: HALO_MINIMUM_OPACITY,
  probing: 0.66,
  moving: 0.62,
  docking: 0.64,
  error: 0.7,
});

export const SEAL_STATE_POSES = Object.freeze({
  idle: Object.freeze({ tilt: 0, nod: 0, lift: 0, scale: 1 }),
  probing: Object.freeze({ tilt: -0.12, nod: -0.07, lift: 0.035, scale: 1.018 }),
  moving: Object.freeze({ tilt: 0, nod: -0.035, lift: 0.018, scale: 1.01 }),
  docking: Object.freeze({ tilt: 0.055, nod: -0.13, lift: 0.028, scale: 1.025 }),
  error: Object.freeze({ tilt: 0.22, nod: 0.05, lift: -0.045, scale: 0.985 }),
});

const STATE_VALUE = Object.freeze({ idle: 0, probing: 1, moving: 2, docking: 3, error: 4 });
function createToonResources(accent) {
  const gradientMap = new THREE.DataTexture(
    new Uint8Array([
      0xb2, 0xc3, 0xcc, 0xff,
      0xcf, 0xdb, 0xdb, 0xff,
      0xe8, 0xef, 0xeb, 0xff,
      0xff, 0xff, 0xff, 0xff,
    ]),
    4,
    1,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  gradientMap.name = "TopologicalSealFourBandRamp";
  gradientMap.colorSpace = THREE.SRGBColorSpace;
  gradientMap.minFilter = THREE.NearestFilter;
  gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.generateMipmaps = false;
  gradientMap.needsUpdate = true;

  const runtime = {
    uTime: { value: 0 },
    uState: { value: 0 },
    uMotion: { value: 1 },
    uSpeed: { value: 0 },
    uAccent: { value: new THREE.Color(accent) },
  };

  const material = new THREE.MeshToonMaterial({
    color: "#FFFFFF",
    gradientMap,
  });
  material.name = `TopologicalSealAnimeSkin ${SEAL_MANIFOLD_TEXTURE_PROFILE}`;
  material.userData = {
    invariant: SEAL_MANIFOLD_INVARIANT,
    mapping: SEAL_MANIFOLD_MAPPING,
    textureSource: "authored procedural object-space X/Z zones; no external asset",
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, runtime);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute vec3 canonical;
uniform float uMotion;
uniform float uSpeed;
uniform float uState;
uniform float uTime;
varying vec3 vSealCanonical;
varying vec3 vSealObjectPosition;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
float sealFrontToBack = (1.0 - canonical.x) * 4.8;
float sealBreathWave = sin(uTime * 2.6 - sealFrontToBack * 0.34) * 0.006 * uMotion;
float sealMovingState = 1.0 - step(0.51, abs(uState - 2.0));
float sealSpeed = smoothstep(0.16, 4.0, uSpeed) * sealMovingState * uMotion;
float sealGlumphWave = sin(sealFrontToBack - uTime * 9.2) * sealSpeed;
float sealGlumphEnvelope = smoothstep(-1.0, -0.5, canonical.x)
  * (1.0 - smoothstep(0.84, 1.04, canonical.x));
float sealSurfacePulse = sealBreathWave + sealGlumphWave * sealGlumphEnvelope * 0.026;
transformed += objectNormal * sealSurfacePulse;
transformed.y += max(sealGlumphWave, 0.0) * sealGlumphEnvelope * sealSpeed * 0.018;
transformed.x += sealGlumphWave * sealGlumphEnvelope * sealSpeed * 0.008;
vSealCanonical = canonical;
vSealObjectPosition = transformed;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uTime;
uniform float uState;
uniform float uMotion;
uniform vec3 uAccent;
varying vec3 vSealCanonical;
varying vec3 vSealObjectPosition;

float sealBlob(vec3 point, vec3 center, vec3 radius) {
  vec3 q = (point - center) / radius;
  return 1.0 - smoothstep(0.52, 1.0, dot(q, q));
}

float sealSoftBand(float value, float center, float width) {
  return 1.0 - smoothstep(width * 0.48, width, abs(value - center));
}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
vec3 pearlGray = vec3(0.79, 0.86, 0.85);
vec3 coolSage = vec3(0.63, 0.73, 0.70);
vec3 warmIvory = vec3(0.965, 0.937, 0.875);
vec3 blueGray = vec3(0.39, 0.50, 0.59);
vec3 indigoInk = vec3(0.13, 0.16, 0.29);

// Authored texture zones are functions of X and Z together, never Y-only bands.
float zoneXZ = 0.5 + 0.5 * sin(
  vSealObjectPosition.x * 5.1 +
  vSealObjectPosition.z * 3.7 +
  sin(vSealObjectPosition.z * 8.3) * 0.42
);
vec3 sealAlbedo = mix(pearlGray, coolSage, zoneXZ * 0.17);

float chest = sealBlob(vSealCanonical, vec3(0.30, -0.83, 0.0), vec3(0.66, 0.39, 0.72));
float muzzleNear = sealBlob(vSealCanonical, vec3(0.965, 0.015, 0.15), vec3(0.15, 0.25, 0.18));
float muzzleFar = sealBlob(vSealCanonical, vec3(0.965, 0.015, -0.15), vec3(0.15, 0.25, 0.18));
sealAlbedo = mix(sealAlbedo, warmIvory, clamp(chest * 0.78 + max(muzzleNear, muzzleFar), 0.0, 1.0));

float spotA = sealBlob(vSealCanonical, vec3(-0.34, 0.47, 0.79), vec3(0.43, 0.34, 0.30));
float spotB = sealBlob(vSealCanonical, vec3(0.08, 0.69, -0.69), vec3(0.36, 0.28, 0.34));
float spotC = sealBlob(vSealCanonical, vec3(-0.58, -0.34, -0.71), vec3(0.31, 0.30, 0.36));
sealAlbedo = mix(sealAlbedo, blueGray, clamp(spotA * 0.60 + spotB * 0.52 + spotC * 0.44, 0.0, 0.72));

float eyeNear = sealBlob(vSealCanonical, vec3(0.915, 0.345, 0.19), vec3(0.105, 0.115, 0.09));
float eyeFar = sealBlob(vSealCanonical, vec3(0.915, 0.345, -0.19), vec3(0.105, 0.115, 0.09));
float eyeHaloNear = sealBlob(vSealCanonical, vec3(0.88, 0.33, 0.19), vec3(0.18, 0.18, 0.15));
float eyeHaloFar = sealBlob(vSealCanonical, vec3(0.88, 0.33, -0.19), vec3(0.18, 0.18, 0.15));
float nose = sealBlob(vSealCanonical, vec3(0.997, 0.015, 0.0), vec3(0.06, 0.13, 0.14));
sealAlbedo = mix(sealAlbedo, blueGray, max(eyeHaloNear, eyeHaloFar) * 0.34);
sealAlbedo = mix(sealAlbedo, indigoInk, clamp(max(eyeNear, eyeFar) + nose, 0.0, 1.0));

float guideBand = sealSoftBand(vSealCanonical.x, 0.32, 0.085);
float movingTrace = 0.5 + 0.5 * sin(
  (vSealCanonical.x + vSealCanonical.z) * 13.0 - uTime * 3.2 * uMotion
);
float stateEnergy = step(0.5, uState) * (0.07 + movingTrace * 0.035 * uMotion);
vec3 stateColor = mix(uAccent, vec3(0.89, 0.64, 0.31), step(3.5, uState));
sealAlbedo = mix(sealAlbedo, stateColor, guideBand * stateEnergy);

diffuseColor.rgb = sealAlbedo;`,
      )
      .replace(
        "return vec3( texture2D( gradientMap, coord ).r );",
        "return texture2D( gradientMap, coord ).rgb;",
      );
    material.userData.shader = shader;
  };
  material.customProgramCacheKey = () => "topological-seal-anime-xz-glumph-v2";

  return { gradientMap, material, runtime };
}

const TopologicalSealMascot = forwardRef(function TopologicalSealMascot(
  {
    accent = "#65C1BC",
    activeArtifact,
    axisVelocity = 0,
    axisX = 0,
    depthVelocity = 0,
    depthZ = 0,
    guideState = "idle",
    moving = false,
    quality = "high",
    reducedMotion = false,
    traversalPoseRef,
  },
  forwardedRef,
) {
  const root = useRef(null);
  const poseRef = useRef(null);
  const eyes = useRef(null);
  const eyeHighlights = useRef(null);
  const haloMaterial = useRef(null);
  const haloMesh = useRef(null);
  const haloInitialized = useRef(false);
  const velocity = useRef(new THREE.Vector3());
  const movementLift = useRef({ position: 0, velocity: 0 });
  const size = useThree((state) => state.size);
  const presentationScale = resolveSealPresentationScale(size);
  const geometry = useMemo(() => createSealManifoldGeometry({ quality }), [quality]);
  const resources = useMemo(() => createToonResources(accent), [accent]);
  const haloPresentation = useMemo(
    () => resolveStationHaloPresentation(activeArtifact?.id),
    [activeArtifact?.id],
  );
  const haloAccent = useMemo(() => {
    return new THREE.Color(haloPresentation.base).lerp(
      new THREE.Color(haloPresentation.edge),
      haloPresentation.mix,
    );
  }, [haloPresentation]);
  const haloColors = useMemo(() => {
    const base = haloAccent.clone();
    const tint = (color, amount) => base.clone().lerp(new THREE.Color(color), amount);
    return {
      idle: tint("#F6F1E7", 0.08),
      probing: tint("#D8FFFF", 0.24),
      moving: base.clone(),
      docking: tint("#A7E5DF", 0.16),
      error: tint("#E2B86A", 0.56),
    };
  }, [haloAccent]);
  const targetPosition = useMemo(() => new THREE.Vector3(), []);

  useImperativeHandle(forwardedRef, () => root.current, []);

  useLayoutEffect(() => {
    const transform = new THREE.Object3D();
    for (let index = 0; index < SEAL_EYE_POSITIONS.length; index += 1) {
      transform.position.set(...SEAL_EYE_POSITIONS[index]);
      transform.updateMatrix();
      eyes.current?.setMatrixAt(index, transform.matrix);
      transform.position.set(...SEAL_EYE_HIGHLIGHT_POSITIONS[index]);
      transform.updateMatrix();
      eyeHighlights.current?.setMatrixAt(index, transform.matrix);
    }
    if (eyes.current) {
      eyes.current.instanceMatrix.needsUpdate = true;
      eyes.current.computeBoundingSphere();
    }
    if (eyeHighlights.current) {
      eyeHighlights.current.instanceMatrix.needsUpdate = true;
      eyeHighlights.current.computeBoundingSphere();
    }
  }, []);

  useEffect(
    () => () => {
      geometry.dispose();
    },
    [geometry],
  );
  useEffect(
    () => () => {
      resources.material.dispose();
      resources.gradientMap.dispose();
    },
    [resources],
  );

  useFrame(({ camera, clock }, delta) => {
    if (!root.current || !poseRef.current) return;

    const state = SEAL_GUIDE_STATES.includes(guideState) ? guideState : "idle";
    const pose = SEAL_STATE_POSES[state];
    const frameStep = Math.min(delta, MAX_FRAME_STEP);
    if (haloMaterial.current) {
      const haloTarget = haloColors[state] || haloColors.idle;
      const haloBreath = reducedMotion
        ? 0
        : (0.5 + 0.5 * Math.sin(clock.elapsedTime * Math.PI * 2 * haloPresentation.pulseHz)) * 0.08;
      const haloOpacity = Math.min(0.78, HALO_STATE_OPACITY[state] + haloBreath);
      if (!haloInitialized.current || reducedMotion) {
        haloMaterial.current.color.copy(haloTarget);
        haloMaterial.current.opacity = haloOpacity;
        haloInitialized.current = true;
      } else {
        const haloBlend = 1 - Math.exp(-6.5 * frameStep);
        haloMaterial.current.color.lerp(haloTarget, haloBlend);
        haloMaterial.current.opacity = THREE.MathUtils.lerp(
          haloMaterial.current.opacity,
          haloOpacity,
          haloBlend,
        );
      }
    }
    if (haloMesh.current) {
      const haloAxis = haloPresentation.tiltRadians;
      haloMesh.current.rotation.x = reducedMotion
        ? haloAxis
        : THREE.MathUtils.lerp(
            haloMesh.current.rotation.x,
            haloAxis,
            1 - Math.exp(-6.5 * frameStep),
          );
      haloMesh.current.rotation.z = reducedMotion
        ? 0
        : clock.elapsedTime * haloPresentation.pulseHz * 0.16;
    }
    const traversalPose = traversalPoseRef?.current;
    const resolvedAxisX = traversalPose?.x ?? axisX;
    const resolvedDepthZ = traversalPose?.z ?? depthZ;
    targetPosition.set(resolvedAxisX, GUIDE_HEIGHT, resolvedDepthZ);
    root.current.position.copy(targetPosition);
    velocity.current.set(
      traversalPose?.vx ?? axisVelocity * MAX_TRANSLATION_SPEED,
      0,
      traversalPose?.vz ?? depthVelocity * MAX_TRANSLATION_SPEED,
    );
    const speedRatio = THREE.MathUtils.smoothstep(velocity.current.length(), 0.16, 4);
    if (reducedMotion) {
      movementLift.current = { position: 0, velocity: 0 };
    } else {
      movementLift.current = criticallyDampedStep(
        movementLift.current,
        MOVEMENT_LIFT_MAX * speedRatio,
        MOVEMENT_LIFT_OMEGA,
        frameStep,
      );
    }

    let headingX = velocity.current.x || axisVelocity;
    let headingZ = velocity.current.z || depthVelocity;
    const stationWorld = activeArtifact
      ? STATION_WORLD_SCHEMA.stations[activeArtifact.id]
      : null;
    const speed = velocity.current.length();
    if (speed <= 0.14 && stationWorld) {
      const cameraHeadingX = camera.position.x - root.current.position.x;
      const cameraHeadingZ = camera.position.z - root.current.position.z;
      const cameraHeadingLength = Math.max(
        0.001,
        Math.hypot(cameraHeadingX, cameraHeadingZ),
      );
      const stationHeadingX = stationWorld.center.x - root.current.position.x;
      const stationHeadingZ = stationWorld.center.z - root.current.position.z;
      const stationHeadingLength = Math.max(
        0.001,
        Math.hypot(stationHeadingX, stationHeadingZ),
      );
      const cameraWeight = stationWorld.id === "observatory-plaque" ? 0.65 : 0.94;
      headingX =
        (cameraHeadingX / cameraHeadingLength) * cameraWeight +
        (stationHeadingX / stationHeadingLength) * (1 - cameraWeight);
      headingZ =
        (cameraHeadingZ / cameraHeadingLength) * cameraWeight +
        (stationHeadingZ / stationHeadingLength) * (1 - cameraWeight);
    }
    if (Math.hypot(headingX, headingZ) > 0.002) {
      const targetHeading = -Math.atan2(headingZ, headingX);
      const headingAlpha = reducedMotion ? 1 : 1 - Math.exp(-HEADING_RESPONSE * frameStep);
      const headingDelta = Math.atan2(
        Math.sin(targetHeading - root.current.rotation.y),
        Math.cos(targetHeading - root.current.rotation.y),
      );
      root.current.rotation.y += headingDelta * headingAlpha;
    }

    const poseAlpha = reducedMotion ? 1 : 1 - Math.exp(-POSE_RESPONSE * frameStep);
    const movingWaddle =
      !reducedMotion && state === "moving" ? Math.sin(clock.elapsedTime * 10.4) * 0.085 : 0;
    const continuousBreath =
      !reducedMotion ? 1 + Math.sin(clock.elapsedTime * 2.6) * 0.014 : 1;
    const dockingNod =
      !reducedMotion && state === "docking" ? Math.sin(clock.elapsedTime * 4.8) * 0.055 : 0;
    poseRef.current.rotation.z = THREE.MathUtils.lerp(
      poseRef.current.rotation.z,
      pose.tilt + movingWaddle,
      poseAlpha,
    );
    poseRef.current.rotation.x = THREE.MathUtils.lerp(
      poseRef.current.rotation.x,
      pose.nod + dockingNod,
      poseAlpha,
    );
    poseRef.current.position.y = THREE.MathUtils.lerp(
      poseRef.current.position.y,
      pose.lift +
        movementLift.current.position +
        (reducedMotion ? 0 : traversalPose?.dockSettleOffset || 0),
      poseAlpha,
    );
    const poseScale = THREE.MathUtils.lerp(
      poseRef.current.scale.x,
      pose.scale * continuousBreath * presentationScale,
      poseAlpha,
    );
    poseRef.current.scale.setScalar(poseScale);

    resources.runtime.uTime.value = reducedMotion ? 0 : clock.elapsedTime;
    resources.runtime.uState.value = STATE_VALUE[state];
    resources.runtime.uMotion.value = reducedMotion ? 0 : 1;
    resources.runtime.uSpeed.value = reducedMotion ? 0 : velocity.current.length();
    root.current.userData.guideState = state;
    root.current.userData.actualSpeed = velocity.current.length();

  });

  return (
    <group
      ref={root}
      name={`TopologicalSealMascot ${SEAL_MANIFOLD_FORMULA}`}
      position={[axisX, GUIDE_HEIGHT, depthZ]}
      renderOrder={9}
      userData={{
        className: "seal-avatar topological-seal",
        drawBudget: SEAL_MANIFOLD_DRAW_BUDGET,
        guideState,
        motionProfile: SEAL_MANIFOLD_MOTION_PROFILE,
        topology: SEAL_MANIFOLD_INVARIANT,
      }}
    >
      <group ref={poseRef} scale={presentationScale}>
        <mesh
          castShadow
          receiveShadow
          geometry={geometry}
          material={resources.material}
          name="seal-zone-xz topological-seal-primary-surface"
        />
        <instancedMesh
          args={[null, null, 2]}
          name="seal-anime-eye-pair"
          ref={eyes}
          renderOrder={12}
        >
          <sphereGeometry args={[0.052, 18, 12]} />
          <meshPhysicalMaterial
            clearcoat={1}
            clearcoatRoughness={0.06}
            color="#171A2D"
            emissive="#202944"
            emissiveIntensity={0.06}
            metalness={0}
            roughness={0.09}
          />
        </instancedMesh>
        <instancedMesh
          args={[null, null, 2]}
          name="seal-anime-eye-highlights"
          ref={eyeHighlights}
          renderOrder={13}
        >
          <sphereGeometry args={[0.017, 8, 6]} />
          <meshBasicMaterial color="#F9FFFF" toneMapped={false} />
        </instancedMesh>
      </group>
      <mesh
        name="seal-crown-halo seal-accent-guide-halo"
        position={[0.58, 1.02, -0.16]}
        ref={haloMesh}
        rotation={[Math.PI / 2, 0, 0]}
        renderOrder={8}
        userData={{
          className: "seal-crown-halo",
          profile: SEAL_CROWN_HALO_PROFILE,
        }}
      >
        <torusGeometry args={[0.38, 0.026, 8, 64]} />
        <meshBasicMaterial
          color="#65C1BC"
          depthTest
          depthWrite={false}
          opacity={HALO_STATE_OPACITY.idle}
          ref={haloMaterial}
          toneMapped={false}
          transparent
        />
      </mesh>
      <pointLight
        color={guideState === "error" ? "#E2B86A" : haloAccent}
        distance={3.4}
        intensity={moving ? 0.72 : 0.36}
        position={[0.2, 0.42, 0]}
      />
    </group>
  );
});

export default TopologicalSealMascot;
