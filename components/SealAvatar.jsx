"use client";

import { useTexture } from "@react-three/drei";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export const SEAL_AVATAR_FORMULA = "F(p)=smin(ellipsoid_body,sphere_head,flipper_fields)";
export const SEAL_COLLISION_BRIDGE = "continuous SDF mascot, discrete playground collision proxy";
export const SEAL_GUIDE_STATES = ["parked", "piloting", "docking", "station-bearing"];
export const SEAL_NORMAL_FIELD_PROFILE = "finite SDF surface-normal quiver marks";
export const SEAL_GUIDE_FACEPLATE_PROFILE = "station-bearing glass faceplate and topology pointer";
export const SEAL_STATION_BEARING_PROFILE = "loop-aware guide ray points from seal toward the active project station";
export const SEAL_GUIDE_BEACON_PROFILE = "active station beacon makes the seal read as a functional guide";
export const SEAL_PREMIUM_SILHOUETTE_PROFILE = "inked SDF silhouette rim with belly contour and topology seam";

const SEAL_WORLD_LOOP_LENGTH = 128;
const SEAL_GUIDE_OFFSET = { x: 0.18, z: 1.96 };

const SEAL_PBR = {
  map: "/assets/pbr/seal/white-quilted-diamond-bl/white-quilted-diamond_albedo.png",
  normalMap: "/assets/pbr/seal/white-quilted-diamond-bl/white-quilted-diamond_normal-ogl.png",
  roughnessMap: "/assets/pbr/seal/white-quilted-diamond-bl/white-quilted-diamond_roughness.png",
};

function useSealMaterial(accent) {
  const maps = useTexture(SEAL_PBR);

  useEffect(() => {
    for (const texture of Object.values(maps)) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1.8, 1.2);
      texture.anisotropy = 8;
      texture.needsUpdate = true;
    }
    maps.map.colorSpace = THREE.SRGBColorSpace;
  }, [maps]);

  return useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#9fb0ad",
        emissive: accent,
        emissiveIntensity: 0.055,
        map: maps.map,
        metalness: 0.02,
        normalMap: maps.normalMap,
        normalScale: new THREE.Vector2(0.055, 0.055),
        roughness: 0.54,
        roughnessMap: maps.roughnessMap,
        clearcoat: 0.34,
        clearcoatRoughness: 0.36,
      }),
    [accent, maps],
  );
}

function SealBody({ accent, guideState, material }) {
  const dark = useMemo(() => new THREE.MeshBasicMaterial({ color: "#060b0c" }), []);
  const cheekMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#aebfbb",
        emissive: accent,
        emissiveIntensity: 0.035,
        roughness: 0.42,
        clearcoat: 0.38,
      }),
    [accent],
  );
  const contourMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: guideState === "piloting" ? 0.62 : 0.44,
        depthWrite: false,
      }),
    [accent, guideState],
  );
  const shadowLineMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#071214",
        transparent: true,
        opacity: 0.68,
        depthWrite: false,
      }),
    [],
  );
  const rimMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#020607",
        transparent: true,
        opacity: 0.62,
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
        opacity: guideState === "piloting" ? 0.78 : 0.54,
        depthWrite: false,
      }),
    [accent, guideState],
  );
  const faceplateMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#071214",
        emissive: accent,
        emissiveIntensity: guideState === "station-bearing" ? 0.22 : 0.14,
        metalness: 0.04,
        roughness: 0.28,
        clearcoat: 0.82,
        clearcoatRoughness: 0.16,
        transparent: true,
        opacity: 0.76,
      }),
    [accent, guideState],
  );
  const faceplateLineMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: guideState === "piloting" ? 0.84 : 0.58,
        depthWrite: false,
      }),
    [accent, guideState],
  );
  const finMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#53686b",
        emissive: accent,
        emissiveIntensity: 0.0,
        roughness: 0.68,
        clearcoat: 0.24,
      }),
    [accent],
  );

  useEffect(
    () => () => {
      dark.dispose();
      cheekMaterial.dispose();
      contourMaterial.dispose();
      faceplateLineMaterial.dispose();
      faceplateMaterial.dispose();
      finMaterial.dispose();
      normalFieldMaterial.dispose();
      rimMaterial.dispose();
      shadowLineMaterial.dispose();
    },
    [cheekMaterial, contourMaterial, dark, faceplateLineMaterial, faceplateMaterial, finMaterial, normalFieldMaterial, rimMaterial, shadowLineMaterial],
  );

  return (
    <group name={`SealBody ${SEAL_AVATAR_FORMULA} ${SEAL_PREMIUM_SILHOUETTE_PROFILE}`} scale={[0.88, 0.88, 0.88]}>
      <mesh position={[-0.12, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.9, 0.38, 1]}>
        <circleGeometry args={[1, 64]} />
        <meshBasicMaterial color="#010304" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <mesh material={rimMaterial} position={[-0.12, -0.018, 0]} scale={[1.02, 0.37, 0.46]}>
        <sphereGeometry args={[1, 34, 20]} />
      </mesh>
      <mesh castShadow receiveShadow material={material} position={[-0.11, 0, 0]} scale={[0.96, 0.34, 0.42]}>
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
        <mesh key={`seal-dorsal-instrument-${index}`} material={shadowLineMaterial} position={[x, y, z]} rotation={[0, 0, -0.05]} scale={[sx, sy, sz]}>
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
      <mesh material={rimMaterial} position={[0.69, 0.155, 0]} scale={[0.35, 0.34, 0.34]}>
        <sphereGeometry args={[1, 32, 24]} />
      </mesh>
      <mesh castShadow material={material} position={[0.68, 0.17, 0]} scale={[0.335, 0.325, 0.325]}>
        <sphereGeometry args={[1, 32, 24]} />
      </mesh>
      <mesh material={cheekMaterial} position={[0.87, 0.16, 0.12]} scale={[0.105, 0.048, 0.07]}>
        <sphereGeometry args={[1, 16, 10]} />
      </mesh>
      <mesh material={cheekMaterial} position={[0.87, 0.16, -0.12]} scale={[0.105, 0.048, 0.07]}>
        <sphereGeometry args={[1, 16, 10]} />
      </mesh>
      <mesh material={shadowLineMaterial} position={[0.78, 0.34, 0]} scale={[0.13, 0.024, 0.16]}>
        <sphereGeometry args={[1, 18, 10]} />
      </mesh>
      <mesh material={shadowLineMaterial} position={[0.82, 0.245, 0.19]} rotation={[0.18, 0.1, -0.1]} scale={[0.145, 0.018, 0.062]}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      <mesh material={shadowLineMaterial} position={[0.82, 0.245, -0.19]} rotation={[-0.18, -0.1, -0.1]} scale={[0.145, 0.018, 0.062]}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      <mesh castShadow receiveShadow material={finMaterial} position={[0.92, 0.145, 0]} scale={[0.12, 0.086, 0.096]}>
        <sphereGeometry args={[1, 16, 12]} />
      </mesh>
      <mesh material={dark} position={[1.0, 0.19, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.032, 0.042, 0.032]}>
        <capsuleGeometry args={[1, 0.18, 6, 12]} />
      </mesh>
      <mesh material={dark} position={[0.83, 0.298, 0.145]} scale={[0.052, 0.042, 0.026]}>
        <sphereGeometry args={[1, 12, 8]} />
      </mesh>
      <mesh material={dark} position={[0.83, 0.298, -0.145]} scale={[0.052, 0.042, 0.026]}>
        <sphereGeometry args={[1, 12, 8]} />
      </mesh>
      <mesh material={contourMaterial} position={[0.85, 0.322, 0.154]} scale={[0.014, 0.012, 0.007]}>
        <sphereGeometry args={[1, 8, 6]} />
      </mesh>
      <mesh material={contourMaterial} position={[0.85, 0.322, -0.154]} scale={[0.014, 0.012, 0.007]}>
        <sphereGeometry args={[1, 8, 6]} />
      </mesh>
      <mesh material={rimMaterial} position={[-0.72, -0.052, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[0.152, 0.36, 0.122]}>
        <coneGeometry args={[1, 1, 18]} />
      </mesh>
      <mesh castShadow receiveShadow material={finMaterial} position={[-0.7, -0.04, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[0.144, 0.34, 0.114]}>
        <coneGeometry args={[1, 1, 18]} />
      </mesh>
      <mesh material={rimMaterial} position={[0.0, -0.214, 0.34]} rotation={[0.5, -0.18, -0.42]} scale={[0.216, 0.072, 0.35]}>
        <sphereGeometry args={[1, 18, 12]} />
      </mesh>
      <mesh castShadow receiveShadow material={finMaterial} position={[0.008, -0.204, 0.326]} rotation={[0.5, -0.18, -0.42]} scale={[0.204, 0.064, 0.334]}>
        <sphereGeometry args={[1, 18, 12]} />
      </mesh>
      <mesh material={rimMaterial} position={[0.0, -0.214, -0.34]} rotation={[-0.5, 0.18, -0.42]} scale={[0.216, 0.072, 0.35]}>
        <sphereGeometry args={[1, 18, 12]} />
      </mesh>
      <mesh castShadow receiveShadow material={finMaterial} position={[0.008, -0.204, -0.326]} rotation={[-0.5, 0.18, -0.42]} scale={[0.204, 0.064, 0.334]}>
        <sphereGeometry args={[1, 18, 12]} />
      </mesh>
      <mesh material={dark} position={[0.92, 0.145, 0.1]} rotation={[0, 0, Math.PI / 2]} scale={[0.0035, 0.17, 0.0035]}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
      </mesh>
      <mesh material={dark} position={[0.92, 0.145, -0.1]} rotation={[0, 0, Math.PI / 2]} scale={[0.0035, 0.17, 0.0035]}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
      </mesh>
      {[0.17, 0.25, 0.33].map((z, index) => (
        <mesh
          key={`right-whisker-${z}`}
          material={dark}
          position={[1.0, 0.122 - index * 0.025, z * 0.86]}
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
          position={[1.0, 0.122 - index * 0.025, -z * 0.86]}
          rotation={[-0.08, -0.24, Math.PI / 2 - index * 0.08]}
          scale={[0.003, 0.15 - index * 0.02, 0.003]}
        >
          <cylinderGeometry args={[1, 1, 1, 6]} />
        </mesh>
      ))}
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
    iglooPosition = [0, 0, 0],
    moving = false,
    onTouchIgloo,
  },
  forwardedRef,
) {
  const root = useRef(null);
  const touchCooldown = useRef(0);
  const material = useSealMaterial(accent);
  const guideRingMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [accent],
  );
  const bearingMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: activeArtifact?.accent || accent,
        transparent: true,
        opacity: 0.36,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [accent, activeArtifact],
  );
  const target = useMemo(() => new THREE.Vector3(), []);
  const bearingRef = useRef(null);
  const bearingRayRef = useRef(null);
  const beaconRef = useRef(null);
  const guideFieldRef = useRef(null);

  useImperativeHandle(forwardedRef, () => root.current, []);

  useEffect(
    () => () => {
      material.dispose();
      guideRingMaterial.dispose();
      bearingMaterial.dispose();
    },
    [bearingMaterial, guideRingMaterial, material],
  );

  useFrame(({ clock }, delta) => {
    if (!root.current) return;
    const t = clock.elapsedTime;
    const speed = Math.min(1, Math.hypot(axisVelocity, depthVelocity));
    const targetY = 0.45 + Math.sin(axisX * 0.13) * 0.08 + Math.cos(depthZ * 0.21) * 0.05;
    target.set(axisX + SEAL_GUIDE_OFFSET.x, targetY, depthZ + SEAL_GUIDE_OFFSET.z);

    root.current.position.lerp(target, moving ? 0.14 : 0.08);
    if (!moving) {
      root.current.position.y += Math.sin(t * 1.4) * 0.008;
    }

    const heading = speed > 0.02 ? Math.atan2(depthVelocity, axisVelocity || 0.001) : root.current.rotation.y;
    root.current.rotation.y = THREE.MathUtils.lerp(root.current.rotation.y, -heading + Math.PI / 2, 0.12);
    root.current.rotation.z = THREE.MathUtils.lerp(
      root.current.rotation.z,
      -axisVelocity * 0.28 + Math.sin(t * 1.6) * (moving ? 0.025 : 0.06),
      0.1,
    );
    root.current.rotation.x = THREE.MathUtils.lerp(root.current.rotation.x, depthVelocity * 0.18 + speed * 0.04, 0.1);
    root.current.scale.setScalar(0.72 + Math.sin(t * 1.8) * 0.006 + speed * 0.024);

    const distanceToIgloo = Math.hypot(root.current.position.x - iglooPosition[0], root.current.position.z - iglooPosition[2]);
    const guideState =
      distanceToIgloo < 2.9 && speed > 0.18 ? "docking" : speed > 0.04 ? "piloting" : activeArtifact ? "station-bearing" : "parked";
    root.current.userData.guideState = guideState;
    touchCooldown.current = Math.max(0, touchCooldown.current - delta);
    if (distanceToIgloo < 2.9 && speed > 0.18 && touchCooldown.current <= 0) {
      touchCooldown.current = 1.4;
      onTouchIgloo?.();
    }
    if (guideFieldRef.current) {
      guideFieldRef.current.rotation.z = t * (guideState === "piloting" ? 0.42 : 0.18);
      guideFieldRef.current.scale.setScalar(1 + speed * 0.16);
    }
    if (beaconRef.current) {
      beaconRef.current.visible = guideState !== "parked";
      beaconRef.current.position.y = 0.74 + Math.sin(t * 1.7) * 0.035 + speed * 0.04;
      beaconRef.current.rotation.y = t * (guideState === "piloting" ? 0.85 : 0.34);
      beaconRef.current.scale.setScalar(guideState === "station-bearing" ? 1.08 : 1 + speed * 0.18);
    }
    if (bearingRef.current) {
      bearingRef.current.visible = guideState !== "parked";
      const stationX = activeArtifact
        ? activeArtifact.position[0] + Math.round((root.current.position.x - activeArtifact.position[0]) / SEAL_WORLD_LOOP_LENGTH) * SEAL_WORLD_LOOP_LENGTH
        : root.current.position.x + 1;
      const stationZ = activeArtifact ? activeArtifact.position[2] * 2.4 : root.current.position.z;
      const dx = stationX - root.current.position.x;
      const dz = stationZ - root.current.position.z;
      const bearingAngle = Math.atan2(-dz, dx);
      const bearingDistance = THREE.MathUtils.clamp(Math.hypot(dx, dz), 0.45, 3.2);
      bearingRef.current.rotation.y = THREE.MathUtils.lerp(bearingRef.current.rotation.y, bearingAngle - root.current.rotation.y, 0.18);
      bearingRef.current.rotation.z = Math.sin(t * 0.7) * 0.08;
      if (bearingRayRef.current) {
        bearingRayRef.current.position.x = 0.25 + bearingDistance * 0.1;
        bearingRayRef.current.scale.y = 0.36 + bearingDistance * 0.16;
      }
    }
  });

  const speed = Math.min(1, Math.hypot(axisVelocity, depthVelocity));
  const initialDistanceToIgloo = Math.hypot(axisX + SEAL_GUIDE_OFFSET.x - iglooPosition[0], depthZ + SEAL_GUIDE_OFFSET.z - iglooPosition[2]);
  const guideState =
    initialDistanceToIgloo < 2.9 && speed > 0.18 ? "docking" : speed > 0.04 ? "piloting" : activeArtifact ? "station-bearing" : "parked";

  return (
    <group
      ref={root}
      name={`SealAvatar ${SEAL_COLLISION_BRIDGE}`}
      position={[axisX + SEAL_GUIDE_OFFSET.x, 0.45, depthZ + SEAL_GUIDE_OFFSET.z]}
      renderOrder={9}
      userData={{ className: "seal-avatar", guideState }}
    >
      <SealBody accent={accent} guideState={guideState} material={material} />
      <pointLight color={accent} distance={3.8} intensity={moving ? 1.35 : 0.55} position={[0, 0.45, 0]} />
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
