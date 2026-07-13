"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MOTION_TIMINGS } from "../lib/polar-art-direction";
import { STATION_WORLD_SCHEMA } from "../lib/polar-station-world";
import { SEAL_GUIDE_STATES } from "../lib/seal-guide-state";

export { SEAL_GUIDE_STATES } from "../lib/seal-guide-state";

export const SEAL_AVATAR_FORMULA = "F(p)=smin(ellipsoid_body,sphere_head,flipper_fields)";
export const SEAL_COLLISION_BRIDGE = "continuous SDF mascot, discrete playground collision proxy";
export const SEAL_NORMAL_FIELD_PROFILE = "finite SDF surface-normal quiver marks";
export const SEAL_GUIDE_FACEPLATE_PROFILE = "station-bearing glass faceplate and topology pointer";
export const SEAL_STATION_BEARING_PROFILE = "canonical-XZ guide ray points from seal toward the active project station";
export const SEAL_GUIDE_BEACON_PROFILE = "active station beacon makes the seal read as a functional guide";
export const SEAL_PREMIUM_SILHOUETTE_PROFILE = "inked SDF silhouette rim with belly contour and topology seam";
export const SEAL_TOON_MATERIAL_PROFILE = "three-band anime seal skin with nearest-filtered palette ramp";
export const SEAL_SKIN_TEXTURE_BUDGET = "one memoized 3x1 RGBA gradient texture and zero per-frame allocations";
export const SEAL_LEGACY_SKIN_NORMAL_SOURCE =
  "/assets/pbr/seal/white-quilted-diamond-bl/white-quilted-diamond_normal-ogl.png";

export const SEAL_TOON_BANDS = Object.freeze({
  shadow: "#71839B",
  mid: "#AEBAB7",
  highlight: "#D8E1DC",
  ink: "#34384F",
});

const SEAL_BODY_SCALE = 0.88;
const PROBING_LEAN = THREE.MathUtils.degToRad(8);
const ERROR_TILT = THREE.MathUtils.degToRad(15);
const DOCKING_NOD = THREE.MathUtils.degToRad(8);
const MOVING_HEADING_LEAD = THREE.MathUtils.degToRad(10);
const WADDLE_RADIANS = THREE.MathUtils.degToRad(MOTION_TIMINGS.waddleDegrees);
const FLIPPER_REST = THREE.MathUtils.degToRad(-22);
const FLIPPER_MOVING_SWEEP = THREE.MathUtils.degToRad(9);
const FLIPPER_PROBING_POSE = THREE.MathUtils.degToRad(-7);
const FLIPPER_DOCKING_POSE = THREE.MathUtils.degToRad(-13);
const FLIPPER_ERROR_POSE = THREE.MathUtils.degToRad(-31);
const HEAD_DOCKING_GLANCE = THREE.MathUtils.degToRad(12);
const BLINK_INTERVAL_SECONDS = Object.freeze([4.2, 5.6, 6.8, 4.9, 6.1]);
const BLINK_DURATION_SECONDS = MOTION_TIMINGS.blinkMs / 1000;
const DOCKING_NOD_SECONDS = MOTION_TIMINGS.dockingNodMs / 1000;
const PROBING_PULSE_SECONDS = MOTION_TIMINGS.probingPulseMs / 1000;

function useSealMaterial() {
  const resources = useMemo(() => {
    const gradientMap = new THREE.DataTexture(
      new Uint8Array([
        0x71, 0x83, 0x9b, 0xff,
        0xae, 0xba, 0xb7, 0xff,
        0xd8, 0xe1, 0xdc, 0xff,
      ]),
      3,
      1,
      THREE.RGBAFormat,
      THREE.UnsignedByteType,
    );
    gradientMap.name = "SealSkinThreeBandGradient";
    gradientMap.colorSpace = THREE.SRGBColorSpace;
    gradientMap.minFilter = THREE.NearestFilter;
    gradientMap.magFilter = THREE.NearestFilter;
    gradientMap.generateMipmaps = false;
    gradientMap.needsUpdate = true;

    const material = new THREE.MeshToonMaterial({
      color: "#FFFFFF",
      gradientMap,
    });
    material.name = `SealSkin ${SEAL_TOON_MATERIAL_PROFILE}`;
    material.userData = {
      bands: SEAL_TOON_BANDS,
      sourceNormalMap: SEAL_LEGACY_SKIN_NORMAL_SOURCE,
      textureBudget: SEAL_SKIN_TEXTURE_BUDGET,
    };
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "return vec3( texture2D( gradientMap, coord ).r );",
        "return texture2D( gradientMap, coord ).rgb;",
      );
    };
    material.customProgramCacheKey = () => "seal-three-band-anime-toon-v1";

    return { gradientMap, material };
  }, []);

  useEffect(
    () => () => {
      resources.material.dispose();
      resources.gradientMap.dispose();
    },
    [resources],
  );

  return resources.material;
}

function SealBody({ accent, eyelidRef, farFlipperRef, headRef, material, nearFlipperRef, poseRef }) {
  const dark = useMemo(() => new THREE.MeshBasicMaterial({ color: "#34384F" }), []);
  const cheekMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#F6F1E7",
        roughness: 0.9,
        clearcoat: 0.04,
      }),
    [],
  );
  const contourMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      }),
    [accent],
  );
  const shadowLineMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#34384F",
        transparent: true,
        opacity: 0.64,
        depthWrite: false,
      }),
    [],
  );
  const rimMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#34384F",
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        side: THREE.BackSide,
      }),
    [],
  );
  const normalFieldMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      }),
    [accent],
  );
  const faceplateMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#34384F",
        emissive: accent,
        emissiveIntensity: 0.06,
        metalness: 0,
        roughness: 0.76,
        clearcoat: 0.1,
        clearcoatRoughness: 0.68,
        transparent: true,
        opacity: 0.045,
      }),
    [accent],
  );
  const faceplateLineMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
      }),
    [accent],
  );
  const finMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#71839B",
        emissive: accent,
        emissiveIntensity: 0.0,
        roughness: 0.9,
        clearcoat: 0.04,
      }),
    [accent],
  );
  const instrumentMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#34384F",
        transparent: true,
        opacity: 0.05,
        depthWrite: false,
      }),
    [],
  );
  const scarfMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#C4D64B",
        roughness: 0.92,
        metalness: 0,
      }),
    [],
  );
  const eyelidMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#AEBAB7" }),
    [],
  );

  useEffect(
    () => () => {
      dark.dispose();
      cheekMaterial.dispose();
      contourMaterial.dispose();
      faceplateLineMaterial.dispose();
      faceplateMaterial.dispose();
      finMaterial.dispose();
      instrumentMaterial.dispose();
      normalFieldMaterial.dispose();
      rimMaterial.dispose();
      scarfMaterial.dispose();
      shadowLineMaterial.dispose();
      eyelidMaterial.dispose();
    },
    [
      cheekMaterial,
      contourMaterial,
      dark,
      eyelidMaterial,
      faceplateLineMaterial,
      faceplateMaterial,
      finMaterial,
      instrumentMaterial,
      normalFieldMaterial,
      rimMaterial,
      scarfMaterial,
      shadowLineMaterial,
    ],
  );

  return (
    <group
      ref={poseRef}
      name={`SealBody ${SEAL_AVATAR_FORMULA} ${SEAL_PREMIUM_SILHOUETTE_PROFILE}`}
      scale={[SEAL_BODY_SCALE, SEAL_BODY_SCALE, SEAL_BODY_SCALE]}
    >
      <mesh position={[-0.12, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.02, 0.42, 1]}>
        <circleGeometry args={[1, 64]} />
        <meshBasicMaterial color="#33406E" depthWrite={false} />
      </mesh>
      <mesh material={rimMaterial} position={[-0.14, -0.028, 0]} scale={[0.98, 0.43, 0.51]}>
        <sphereGeometry args={[1, 34, 20]} />
      </mesh>
      <mesh castShadow receiveShadow material={material} position={[-0.13, -0.01, 0]} scale={[0.92, 0.39, 0.47]}>
        <sphereGeometry args={[1, 34, 20]} />
      </mesh>
      <mesh material={shadowLineMaterial} position={[-0.08, -0.07, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.72, 0.5, 0.2]}>
        <torusGeometry args={[1, 0.01, 6, 84]} />
      </mesh>
      <mesh material={contourMaterial} position={[-0.08, 0.02, 0]} rotation={[Math.PI / 2, 0.08, 0]} scale={[0.74, 0.47, 0.18]}>
        <torusGeometry args={[1, 0.006, 6, 96]} />
      </mesh>
      <mesh material={shadowLineMaterial} position={[0.18, 0.31, 0]} rotation={[Math.PI / 2, -0.1, 0.02]} scale={[0.24, 0.16, 0.08]}>
        <torusGeometry args={[1, 0.006, 6, 64]} />
      </mesh>
      <mesh material={contourMaterial} position={[0.08, 0.12, 0]} rotation={[Math.PI / 2, -0.12, 0.04]} scale={[0.42, 0.3, 0.16]}>
        <torusGeometry args={[1, 0.0045, 6, 80]} />
      </mesh>
      {[
        [-0.46, 0.33, 0, 0.2, 0.012, 0.07],
        [-0.18, 0.38, 0, 0.24, 0.012, 0.082],
        [0.1, 0.35, 0, 0.18, 0.012, 0.064],
      ].map(([x, y, z, sx, sy, sz], index) => (
        <mesh key={`seal-dorsal-instrument-${index}`} material={instrumentMaterial} position={[x, y, z]} rotation={[0, 0, -0.05]} scale={[sx, sy, sz]}>
          <boxGeometry args={[1, 1, 1]} />
        </mesh>
      ))}
      <group name={`SealNormalField ${SEAL_NORMAL_FIELD_PROFILE}`}>
        {[
          [-0.48, 0.36, 0.1, -0.18],
          [-0.22, 0.44, -0.08, 0.08],
          [0.04, 0.42, 0.12, -0.05],
          [0.3, 0.34, -0.1, 0.16],
        ].map(([x, y, z, yaw], index) => (
          <group key={`seal-normal-${index}`} position={[x, y, z]} rotation={[0.18, yaw, 0.08]}>
            <mesh material={normalFieldMaterial} rotation={[0, 0, Math.PI / 2]} scale={[0.005, 0.22, 0.005]}>
              <cylinderGeometry args={[1, 1, 1, 6]} />
            </mesh>
            <mesh material={normalFieldMaterial} position={[0.12, 0, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[0.035, 0.07, 0.035]}>
              <coneGeometry args={[1, 1, 8]} />
            </mesh>
          </group>
        ))}
      </group>
      {[-1, 1].map((side) => (
        <group
          key={`seal-guide-faceplate-${side}`}
          name={`seal-guide-faceplate ${SEAL_GUIDE_FACEPLATE_PROFILE}`}
          position={[0.02, 0.34, side * 0.34]}
          rotation={[side * 0.18, side * 0.18, 0.04]}
        >
          <mesh material={faceplateMaterial} scale={[0.28, 0.015, 0.14]}>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
          <mesh material={faceplateLineMaterial} position={[-0.06, 0.011, side * 0.035]} scale={[0.16, 0.004, 0.006]}>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
          <mesh material={faceplateLineMaterial} position={[0.07, 0.011, side * -0.028]} scale={[0.11, 0.004, 0.006]}>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
          {[-0.1, 0.0, 0.1].map((x) => (
            <mesh key={`seal-guide-node-${side}-${x}`} material={faceplateLineMaterial} position={[x, 0.014, side * -0.062]} scale={[0.014, 0.014, 0.014]}>
              <sphereGeometry args={[1, 8, 6]} />
            </mesh>
          ))}
        </group>
      ))}
      {[-1, 1].map((side) => (
        <group key={`seal-guide-pointer-${side}`} name="seal-guide-pointer" position={[0.52, 0.42, side * 0.3]} rotation={[side * -0.08, side * 0.24, -0.12]}>
          <mesh material={faceplateLineMaterial} rotation={[0, 0, Math.PI / 2]} scale={[0.004, 0.32, 0.004]}>
            <cylinderGeometry args={[1, 1, 1, 6]} />
          </mesh>
          <mesh material={faceplateLineMaterial} position={[0.18, 0, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[0.032, 0.08, 0.032]}>
            <coneGeometry args={[1, 1, 8]} />
          </mesh>
        </group>
      ))}
      <group name="seal-chartreuse-scarf" position={[0.36, 0.1, 0]}>
        <mesh castShadow material={scarfMaterial} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.3, 0.07, 8, 32]} />
        </mesh>
        <mesh
          castShadow
          material={scarfMaterial}
          position={[-0.09, -0.2, 0.3]}
          rotation={[0.3, 0.12, -0.42]}
          scale={[0.082, 0.31, 0.04]}
        >
          <capsuleGeometry args={[1, 0.3, 5, 10]} />
        </mesh>
      </group>
      <group ref={headRef} name="seal-guide-head" position={[0.43, 0.11, 0]}>
        <mesh material={rimMaterial} position={[0.28, 0.14, 0]} scale={[0.39, 0.38, 0.38]}>
          <sphereGeometry args={[1, 32, 24]} />
        </mesh>
        <mesh castShadow material={material} position={[0.28, 0.15, 0]} scale={[0.36, 0.35, 0.35]}>
          <sphereGeometry args={[1, 32, 24]} />
        </mesh>
        <mesh material={cheekMaterial} position={[0.6, 0.1, 0.105]} scale={[0.105, 0.09, 0.11]}>
          <sphereGeometry args={[1, 18, 12]} />
        </mesh>
        <mesh material={cheekMaterial} position={[0.6, 0.1, -0.105]} scale={[0.105, 0.09, 0.11]}>
          <sphereGeometry args={[1, 18, 12]} />
        </mesh>
        <mesh material={dark} position={[0.71, 0.135, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.04, 0.05, 0.04]}>
          <capsuleGeometry args={[1, 0.18, 6, 12]} />
        </mesh>
        <mesh material={dark} position={[0.615, 0.255, 0.118]} scale={[0.048, 0.062, 0.038]}>
          <sphereGeometry args={[1, 14, 10]} />
        </mesh>
        <mesh material={dark} position={[0.615, 0.255, -0.118]} scale={[0.048, 0.062, 0.038]}>
          <sphereGeometry args={[1, 14, 10]} />
        </mesh>
        <mesh material={cheekMaterial} position={[0.654, 0.278, 0.134]} scale={[0.014, 0.018, 0.011]}>
          <sphereGeometry args={[1, 8, 6]} />
        </mesh>
        <mesh material={cheekMaterial} position={[0.654, 0.278, -0.134]} scale={[0.014, 0.018, 0.011]}>
          <sphereGeometry args={[1, 8, 6]} />
        </mesh>
        <group ref={eyelidRef} name="seal-guide-eyelids" position={[0, 0.255, 0]} scale={[1, 0.08, 1]}>
          <mesh material={eyelidMaterial} position={[0.618, 0, 0.118]} scale={[0.052, 0.064, 0.041]}>
            <sphereGeometry args={[1, 14, 10]} />
          </mesh>
          <mesh material={eyelidMaterial} position={[0.618, 0, -0.118]} scale={[0.052, 0.064, 0.041]}>
            <sphereGeometry args={[1, 14, 10]} />
          </mesh>
        </group>
        <mesh material={dark} position={[0.682, 0.078, 0.035]} rotation={[0.62, 0, 0]} scale={[0.004, 0.048, 0.004]}>
          <cylinderGeometry args={[1, 1, 1, 6]} />
        </mesh>
        <mesh material={dark} position={[0.682, 0.078, -0.035]} rotation={[-0.62, 0, 0]} scale={[0.004, 0.048, 0.004]}>
          <cylinderGeometry args={[1, 1, 1, 6]} />
        </mesh>
        {[0.17, 0.25, 0.33].map((z, index) => (
          <mesh
            key={`right-whisker-${z}`}
            material={dark}
            position={[0.69, 0.05 - index * 0.025, z * 0.72]}
            rotation={[0.08, 0.24, Math.PI / 2 + index * 0.08]}
            scale={[0.003, 0.15 - index * 0.02, 0.003]}
          >
            <cylinderGeometry args={[1, 1, 1, 6]} />
          </mesh>
        ))}
        {[0.17, 0.25, 0.33].map((z, index) => (
          <mesh
            key={`left-whisker-${z}`}
            material={dark}
            position={[0.69, 0.05 - index * 0.025, -z * 0.72]}
            rotation={[-0.08, -0.24, Math.PI / 2 - index * 0.08]}
            scale={[0.003, 0.15 - index * 0.02, 0.003]}
          >
            <cylinderGeometry args={[1, 1, 1, 6]} />
          </mesh>
        ))}
      </group>
      {[-1, 1].map((side) => (
        <group
          key={`seal-hind-flipper-${side}`}
          name="seal-forked-hind-flipper"
          position={[-0.88, -0.08, side * 0.13]}
          rotation={[side * 0.16, side * 0.34, -0.2]}
        >
          <mesh material={rimMaterial} scale={[0.31, 0.09, 0.19]}>
            <sphereGeometry args={[1, 18, 12]} />
          </mesh>
          <mesh castShadow receiveShadow material={finMaterial} position={[0.012, 0.008, 0]} scale={[0.292, 0.078, 0.176]}>
            <sphereGeometry args={[1, 18, 12]} />
          </mesh>
        </group>
      ))}
      <group ref={nearFlipperRef} name="seal-near-gesture-flipper" position={[0.02, -0.18, 0.34]} rotation={[0.48, -0.18, FLIPPER_REST]}>
        <mesh material={rimMaterial} scale={[0.265, 0.076, 0.38]}>
          <sphereGeometry args={[1, 18, 12]} />
        </mesh>
        <mesh castShadow receiveShadow material={finMaterial} position={[0.008, 0.01, -0.008]} scale={[0.248, 0.063, 0.358]}>
          <sphereGeometry args={[1, 18, 12]} />
        </mesh>
      </group>
      <group ref={farFlipperRef} name="seal-far-gesture-flipper" position={[0.02, -0.18, -0.34]} rotation={[-0.48, 0.18, FLIPPER_REST]}>
        <mesh material={rimMaterial} scale={[0.265, 0.076, 0.38]}>
          <sphereGeometry args={[1, 18, 12]} />
        </mesh>
        <mesh castShadow receiveShadow material={finMaterial} position={[0.008, 0.01, 0.008]} scale={[0.248, 0.063, 0.358]}>
          <sphereGeometry args={[1, 18, 12]} />
        </mesh>
      </group>
    </group>
  );
}

const SealAvatar = forwardRef(function SealAvatar(
  {
    accent = "#5ff8e7",
    activeArtifact,
    axisVelocity = 0,
    axisX = 0,
    depthVelocity = 0,
    depthZ = 0,
    guideState = "idle",
    iglooPosition = [0, 0, 0],
    moving = false,
    onTouchIgloo,
    reducedMotion = false,
  },
  forwardedRef,
) {
  const root = useRef(null);
  const poseRef = useRef(null);
  const headRef = useRef(null);
  const eyelidRef = useRef(null);
  const nearFlipperRef = useRef(null);
  const farFlipperRef = useRef(null);
  const touchCooldown = useRef(0);
  const previousGuideState = useRef(guideState);
  const dockingStartedAt = useRef(-1);
  const blinkEndsAt = useRef(-1);
  const nextBlinkAt = useRef(-1);
  const blinkIntervalIndex = useRef(0);
  const material = useSealMaterial();
  const guideRingMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#65C1BC",
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
        blending: THREE.NormalBlending,
      }),
    [],
  );
  const bearingMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: activeArtifact?.accent || accent,
        transparent: true,
        opacity: 0.36,
        depthWrite: false,
        blending: THREE.NormalBlending,
      }),
    [accent, activeArtifact],
  );
  const target = useMemo(() => new THREE.Vector3(), []);
  const bearingRef = useRef(null);
  const bearingRayRef = useRef(null);
  const beaconRef = useRef(null);
  const guideFieldRef = useRef(null);

  useImperativeHandle(forwardedRef, () => root.current, []);

  useEffect(() => {
    guideRingMaterial.color.set(
      guideState === "error" ? "#E2B86A" : guideState === "probing" ? "#65C1BC" : accent,
    );
  }, [accent, guideRingMaterial, guideState]);

  useEffect(
    () => () => {
      guideRingMaterial.dispose();
    },
    [guideRingMaterial],
  );

  useEffect(
    () => () => {
      bearingMaterial.dispose();
    },
    [bearingMaterial],
  );

  useFrame(({ clock }, delta) => {
    if (!root.current) return;
    const t = clock.elapsedTime;
    const speed = Math.min(1, Math.hypot(axisVelocity, depthVelocity));
    const targetY = 0.45 + Math.sin(axisX * 0.13) * 0.08 + Math.cos(depthZ * 0.21) * 0.05;
    target.set(axisX, targetY, depthZ);
    const rootAlpha = reducedMotion ? 1 : 1 - Math.exp(-delta * (moving ? 12 : 8));
    root.current.position.copy(target);

    const stationWorld = activeArtifact
      ? STATION_WORLD_SCHEMA.stations[activeArtifact.id]
      : null;
    const stationX = stationWorld?.center.x ?? root.current.position.x + 1;
    const stationZ = stationWorld?.center.z ?? root.current.position.z;
    const stationDx = stationX - root.current.position.x;
    const stationDz = stationZ - root.current.position.z;
    let heading = Math.PI / 2 - root.current.rotation.y;
    if (guideState === "docking" && activeArtifact) {
      heading = Math.atan2(stationDz, stationDx);
    } else if (speed > 0.02) {
      heading = Math.atan2(depthVelocity, axisVelocity || 0.001);
    } else if (guideState === "idle") {
      heading = Math.atan2(
        iglooPosition[2] - root.current.position.z,
        iglooPosition[0] - root.current.position.x,
      );
    }
    const headingLead =
      guideState === "moving"
        ? Math.sign(axisVelocity || depthVelocity || 1) * MOVING_HEADING_LEAD
        : 0;
    root.current.rotation.y = THREE.MathUtils.lerp(
      root.current.rotation.y,
      -heading + Math.PI / 2 + headingLead,
      rootAlpha,
    );
    root.current.rotation.x = THREE.MathUtils.lerp(root.current.rotation.x, 0, rootAlpha);
    root.current.rotation.z = THREE.MathUtils.lerp(root.current.rotation.z, 0, rootAlpha);
    const rootScale = THREE.MathUtils.lerp(
      root.current.scale.x,
      0.72 + speed * 0.024,
      rootAlpha,
    );
    root.current.scale.setScalar(rootScale);

    if (guideState === "docking") {
      if (previousGuideState.current !== "docking" || dockingStartedAt.current < 0) {
        dockingStartedAt.current = t;
      }
    } else {
      dockingStartedAt.current = -1;
    }
    previousGuideState.current = guideState;

    const waddle =
      reducedMotion || guideState !== "moving"
        ? 0
        : WADDLE_RADIANS *
          Math.sin(t * Math.PI * 2 * MOTION_TIMINGS.waddleHz);
    const breath = reducedMotion ? 1 : 1 + Math.sin(t * 2.6) * 0.014;
    const stateTilt =
      guideState === "probing" ? -PROBING_LEAN : guideState === "error" ? ERROR_TILT : 0;
    const errorSettle = guideState === "error" ? -0.08 : 0;
    const dockingProgress =
      dockingStartedAt.current < 0
        ? 1
        : THREE.MathUtils.clamp(
            (t - dockingStartedAt.current) / DOCKING_NOD_SECONDS,
            0,
            1,
          );
    const dockingNod =
      reducedMotion || guideState !== "docking"
        ? 0
        : -Math.sin(dockingProgress * Math.PI) * DOCKING_NOD;
    const poseAlpha = reducedMotion ? 1 : 1 - Math.exp(-delta * 14);
    if (poseRef.current) {
      poseRef.current.rotation.x = THREE.MathUtils.lerp(
        poseRef.current.rotation.x,
        waddle,
        poseAlpha,
      );
      poseRef.current.rotation.z = THREE.MathUtils.lerp(
        poseRef.current.rotation.z,
        stateTilt,
        poseAlpha,
      );
      poseRef.current.position.y = THREE.MathUtils.lerp(
        poseRef.current.position.y,
        errorSettle,
        poseAlpha,
      );
      const bodyScale = THREE.MathUtils.lerp(
        poseRef.current.scale.x,
        SEAL_BODY_SCALE * breath,
        poseAlpha,
      );
      poseRef.current.scale.setScalar(bodyScale);
    }
    if (headRef.current) {
      headRef.current.rotation.z = THREE.MathUtils.lerp(
        headRef.current.rotation.z,
        dockingNod,
        poseAlpha,
      );
      const headGlance =
        guideState === "docking"
          ? HEAD_DOCKING_GLANCE
          : guideState === "probing"
            ? -PROBING_LEAN * 0.55
            : guideState === "error"
              ? ERROR_TILT * 0.35
              : 0;
      headRef.current.rotation.y = THREE.MathUtils.lerp(
        headRef.current.rotation.y,
        headGlance,
        poseAlpha,
      );
    }
    const flipperSweep =
      reducedMotion || guideState !== "moving"
        ? 0
        : Math.sin(t * Math.PI * 2 * MOTION_TIMINGS.waddleHz) * FLIPPER_MOVING_SWEEP;
    const flipperPose =
      guideState === "probing"
        ? FLIPPER_PROBING_POSE
        : guideState === "docking"
          ? FLIPPER_DOCKING_POSE
          : guideState === "error"
            ? FLIPPER_ERROR_POSE
            : FLIPPER_REST;
    if (nearFlipperRef.current) {
      nearFlipperRef.current.rotation.z = THREE.MathUtils.lerp(
        nearFlipperRef.current.rotation.z,
        flipperPose + flipperSweep,
        poseAlpha,
      );
    }
    if (farFlipperRef.current) {
      farFlipperRef.current.rotation.z = THREE.MathUtils.lerp(
        farFlipperRef.current.rotation.z,
        flipperPose - flipperSweep,
        poseAlpha,
      );
    }

    if (nextBlinkAt.current < 0) {
      nextBlinkAt.current = t + BLINK_INTERVAL_SECONDS[0];
    }
    if (!reducedMotion && t >= nextBlinkAt.current) {
      blinkEndsAt.current = t + BLINK_DURATION_SECONDS;
      blinkIntervalIndex.current =
        (blinkIntervalIndex.current + 1) % BLINK_INTERVAL_SECONDS.length;
      nextBlinkAt.current =
        t + BLINK_INTERVAL_SECONDS[blinkIntervalIndex.current];
    }
    if (eyelidRef.current) {
      eyelidRef.current.scale.y =
        !reducedMotion && t < blinkEndsAt.current ? 1 : 0.08;
    }

    const distanceToIgloo = Math.hypot(root.current.position.x - iglooPosition[0], root.current.position.z - iglooPosition[2]);
    root.current.userData.guideState = guideState;
    touchCooldown.current = Math.max(0, touchCooldown.current - delta);
    if (distanceToIgloo < 2.9 && speed > 0.18 && touchCooldown.current <= 0) {
      touchCooldown.current = 1.4;
      onTouchIgloo?.();
    }
    if (guideFieldRef.current) {
      let haloOpacity = 0.1;
      let haloScale = 1;
      if (guideState === "probing") {
        if (reducedMotion) {
          haloOpacity = 0.2;
        } else {
          const pulse =
            0.5 + 0.5 * Math.sin((t * Math.PI * 2) / PROBING_PULSE_SECONDS);
          haloOpacity = 0.12 + pulse * 0.16;
          haloScale = 1 + pulse * 0.06;
        }
      } else if (guideState === "error") {
        haloOpacity = 0.34;
        haloScale = 1.03;
      } else if (guideState === "docking") {
        haloOpacity = 0.22;
      } else if (guideState === "moving") {
        haloOpacity = 0.14 + speed * 0.08;
      }
      guideRingMaterial.opacity = haloOpacity;
      guideFieldRef.current.scale.setScalar(haloScale);
      if (reducedMotion) {
        guideFieldRef.current.rotation.z = 0;
      } else if (guideState === "moving" || guideState === "docking") {
        guideFieldRef.current.rotation.z +=
          delta * (guideState === "moving" ? 0.42 : 0.18);
      }
    }
    if (beaconRef.current) {
      beaconRef.current.visible = Boolean(activeArtifact);
      beaconRef.current.position.y = 0.74 + speed * 0.04;
      if (reducedMotion) {
        beaconRef.current.rotation.y = 0;
      } else if (guideState === "moving" || guideState === "docking") {
        beaconRef.current.rotation.y +=
          delta * (guideState === "moving" ? 0.85 : 0.34);
      }
      beaconRef.current.scale.setScalar(
        guideState === "docking" ? 1.08 : 1 + speed * 0.08,
      );
    }
    if (bearingRef.current) {
      bearingRef.current.visible = Boolean(activeArtifact);
      const bearingAngle = Math.atan2(-stationDz, stationDx);
      const bearingDistance = THREE.MathUtils.clamp(
        Math.hypot(stationDx, stationDz),
        0.45,
        3.2,
      );
      const bearingAlpha = reducedMotion ? 1 : 1 - Math.exp(-delta * 10);
      bearingRef.current.rotation.y = THREE.MathUtils.lerp(
        bearingRef.current.rotation.y,
        bearingAngle - root.current.rotation.y,
        bearingAlpha,
      );
      bearingRef.current.rotation.z = reducedMotion ? 0 : Math.sin(t * 0.7) * 0.08;
      if (bearingRayRef.current) {
        bearingRayRef.current.position.x = 0.25 + bearingDistance * 0.1;
        bearingRayRef.current.scale.y = 0.36 + bearingDistance * 0.16;
      }
    }
  });

  return (
    <group
      ref={root}
      name={`SealAvatar ${SEAL_COLLISION_BRIDGE}`}
      position={[axisX, 0.45, depthZ]}
      renderOrder={9}
      userData={{ className: "seal-avatar", guideState }}
    >
      <SealBody
        accent={accent}
        eyelidRef={eyelidRef}
        farFlipperRef={farFlipperRef}
        headRef={headRef}
        material={material}
        nearFlipperRef={nearFlipperRef}
        poseRef={poseRef}
      />
      <pointLight
        color={guideState === "error" ? "#E2B86A" : accent}
        distance={3.8}
        intensity={moving ? 1.05 : 0.5}
        position={[0, 0.45, 0]}
      />
      <group ref={beaconRef} name={`seal-guide-beacon ${SEAL_GUIDE_BEACON_PROFILE} ${activeArtifact?.shortLabel || "station"}`} position={[0.58, 0.74, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.18, 0.005, 6, 64]} />
          <primitive object={bearingMaterial} attach="material" />
        </mesh>
        <mesh rotation={[0.9, 0.22, 0.18]}>
          <torusGeometry args={[0.13, 0.004, 6, 56]} />
          <primitive object={bearingMaterial} attach="material" />
        </mesh>
        <mesh position={[0, 0.006, 0]} scale={[0.035, 0.035, 0.035]}>
          <sphereGeometry args={[1, 12, 8]} />
          <primitive object={bearingMaterial} attach="material" />
        </mesh>
      </group>
      <group ref={guideFieldRef} name={`seal-guide-field ${SEAL_GUIDE_STATES.join("/")}`}>
        {[0.58, 0.78, 1.02].map((radius, index) => (
          <mesh key={`seal-field-ring-${radius}`} rotation={[Math.PI / 2, 0, index * 0.38]}>
            <torusGeometry args={[radius, 0.0045, 6, 96]} />
            <primitive object={guideRingMaterial} attach="material" />
          </mesh>
        ))}
      </group>
      <mesh name="seal-topology-ring" rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.72, 0.006, 6, 88]} />
        <primitive object={guideRingMaterial} attach="material" />
      </mesh>
      <group ref={bearingRef} name={`seal-station-bearing ${SEAL_STATION_BEARING_PROFILE} ${activeArtifact?.shortLabel || "station"}`} position={[0.18, 0.34, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.18, 0.2, 36]} />
          <primitive object={bearingMaterial} attach="material" />
        </mesh>
        <mesh ref={bearingRayRef} position={[0.38, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.006, 0.36, 0.006]}>
          <cylinderGeometry args={[1, 1, 1, 6]} />
          <primitive object={bearingMaterial} attach="material" />
        </mesh>
      </group>
    </group>
  );
});

export default SealAvatar;
