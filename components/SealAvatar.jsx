"use client";

import { useTexture } from "@react-three/drei";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export const SEAL_AVATAR_FORMULA = "F(p)=smin(ellipsoid_body,sphere_head,flipper_fields)";
export const SEAL_COLLISION_BRIDGE = "continuous SDF mascot, discrete playground collision proxy";
export const SEAL_GUIDE_STATES = ["parked", "piloting", "docking", "station-bearing"];
export const SEAL_NORMAL_FIELD_PROFILE = "finite SDF surface-normal quiver marks";

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
        color: "#ffffff",
        emissive: accent,
        emissiveIntensity: 0.18,
        map: maps.map,
        metalness: 0.02,
        normalMap: maps.normalMap,
        normalScale: new THREE.Vector2(0.055, 0.055),
        roughness: 0.38,
        roughnessMap: maps.roughnessMap,
        clearcoat: 0.68,
        clearcoatRoughness: 0.2,
      }),
    [accent, maps],
  );
}

function SealBody({ accent, guideState, material }) {
  const dark = useMemo(() => new THREE.MeshBasicMaterial({ color: "#060b0c" }), []);
  const cheekMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#eefdfa",
        emissive: accent,
        emissiveIntensity: 0.08,
        roughness: 0.32,
        clearcoat: 0.52,
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
        opacity: 0.52,
        depthWrite: false,
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
  const finMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#cfdfdd",
        emissive: accent,
        emissiveIntensity: 0.02,
        roughness: 0.58,
        clearcoat: 0.38,
      }),
    [accent],
  );

  useEffect(
    () => () => {
      dark.dispose();
      cheekMaterial.dispose();
      contourMaterial.dispose();
      finMaterial.dispose();
      normalFieldMaterial.dispose();
      shadowLineMaterial.dispose();
    },
    [cheekMaterial, contourMaterial, dark, finMaterial, normalFieldMaterial, shadowLineMaterial],
  );

  return (
    <group name={`SealBody ${SEAL_AVATAR_FORMULA}`} scale={[0.92, 0.92, 0.92]}>
      <mesh castShadow material={material} rotation={[0, 0, Math.PI / 2]} scale={[0.42, 1.05, 0.42]}>
        <capsuleGeometry args={[1, 1, 12, 24]} />
      </mesh>
      <mesh material={shadowLineMaterial} rotation={[Math.PI / 2, 0, 0]} scale={[0.72, 0.48, 0.22]}>
        <torusGeometry args={[1, 0.01, 6, 84]} />
      </mesh>
      <mesh material={contourMaterial} position={[0.05, 0.02, 0]} rotation={[Math.PI / 2, 0.08, 0]} scale={[0.86, 0.5, 0.22]}>
        <torusGeometry args={[1, 0.006, 6, 96]} />
      </mesh>
      <mesh material={contourMaterial} position={[0.22, 0.08, 0]} rotation={[Math.PI / 2, -0.12, 0.04]} scale={[0.48, 0.34, 0.2]}>
        <torusGeometry args={[1, 0.0045, 6, 80]} />
      </mesh>
      <group name={`SealNormalField ${SEAL_NORMAL_FIELD_PROFILE}`}>
        {[
          [-0.48, 0.44, 0.1, -0.18],
          [-0.18, 0.54, -0.08, 0.08],
          [0.16, 0.52, 0.12, -0.05],
          [0.48, 0.42, -0.1, 0.16],
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
      <mesh castShadow material={material} position={[0.78, 0.18, 0]} scale={[0.36, 0.35, 0.35]}>
        <sphereGeometry args={[1, 32, 24]} />
      </mesh>
      <mesh material={cheekMaterial} position={[0.99, 0.17, 0.13]} scale={[0.12, 0.052, 0.08]}>
        <sphereGeometry args={[1, 16, 10]} />
      </mesh>
      <mesh material={cheekMaterial} position={[0.99, 0.17, -0.13]} scale={[0.12, 0.052, 0.08]}>
        <sphereGeometry args={[1, 16, 10]} />
      </mesh>
      <mesh material={shadowLineMaterial} position={[0.88, 0.37, 0]} scale={[0.15, 0.028, 0.18]}>
        <sphereGeometry args={[1, 18, 10]} />
      </mesh>
      <mesh castShadow material={finMaterial} position={[1.04, 0.15, 0]} scale={[0.14, 0.1, 0.11]}>
        <sphereGeometry args={[1, 16, 12]} />
      </mesh>
      <mesh material={dark} position={[1.15, 0.2, 0]} scale={[0.052, 0.036, 0.036]}>
        <sphereGeometry args={[1, 12, 8]} />
      </mesh>
      <mesh material={dark} position={[0.92, 0.31, 0.13]} scale={[0.046, 0.046, 0.026]}>
        <sphereGeometry args={[1, 12, 8]} />
      </mesh>
      <mesh material={dark} position={[0.92, 0.31, -0.13]} scale={[0.046, 0.046, 0.026]}>
        <sphereGeometry args={[1, 12, 8]} />
      </mesh>
      <mesh material={contourMaterial} position={[0.942, 0.333, 0.138]} scale={[0.014, 0.014, 0.008]}>
        <sphereGeometry args={[1, 8, 6]} />
      </mesh>
      <mesh material={contourMaterial} position={[0.942, 0.333, -0.138]} scale={[0.014, 0.014, 0.008]}>
        <sphereGeometry args={[1, 8, 6]} />
      </mesh>
      <mesh castShadow material={finMaterial} position={[-0.8, -0.04, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[0.16, 0.42, 0.13]}>
        <coneGeometry args={[1, 1, 18]} />
      </mesh>
      <mesh castShadow material={finMaterial} position={[0.06, -0.22, 0.38]} rotation={[0.5, -0.18, -0.42]} scale={[0.24, 0.075, 0.42]}>
        <sphereGeometry args={[1, 18, 12]} />
      </mesh>
      <mesh castShadow material={finMaterial} position={[0.06, -0.22, -0.38]} rotation={[-0.5, 0.18, -0.42]} scale={[0.24, 0.075, 0.42]}>
        <sphereGeometry args={[1, 18, 12]} />
      </mesh>
      <mesh material={dark} position={[1.04, 0.15, 0.11]} rotation={[0, 0, Math.PI / 2]} scale={[0.004, 0.2, 0.004]}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
      </mesh>
      <mesh material={dark} position={[1.04, 0.15, -0.11]} rotation={[0, 0, Math.PI / 2]} scale={[0.004, 0.2, 0.004]}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
      </mesh>
      {[0.17, 0.25, 0.33].map((z, index) => (
        <mesh
          key={`right-whisker-${z}`}
          material={dark}
          position={[1.13, 0.13 - index * 0.028, z]}
          rotation={[0.08, 0.24, Math.PI / 2 + index * 0.08]}
          scale={[0.003, 0.18 - index * 0.025, 0.003]}
        >
          <cylinderGeometry args={[1, 1, 1, 6]} />
        </mesh>
      ))}
      {[0.17, 0.25, 0.33].map((z, index) => (
        <mesh
          key={`left-whisker-${z}`}
          material={dark}
          position={[1.13, 0.13 - index * 0.028, -z]}
          rotation={[-0.08, -0.24, Math.PI / 2 - index * 0.08]}
          scale={[0.003, 0.18 - index * 0.025, 0.003]}
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
        opacity: 0.34,
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
        opacity: 0.42,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [accent, activeArtifact],
  );
  const target = useMemo(() => new THREE.Vector3(), []);
  const bearingRef = useRef(null);
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
    target.set(axisX + 1.72, targetY, depthZ + 1.12);

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
    root.current.scale.setScalar(0.92 + Math.sin(t * 1.8) * 0.01 + speed * 0.018);

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
    if (bearingRef.current) {
      bearingRef.current.visible = guideState !== "parked";
      bearingRef.current.rotation.y = -root.current.rotation.y;
      bearingRef.current.rotation.z = Math.sin(t * 0.7) * 0.08;
    }
  });

  const speed = Math.min(1, Math.hypot(axisVelocity, depthVelocity));
  const initialDistanceToIgloo = Math.hypot(axisX + 1.72 - iglooPosition[0], depthZ + 1.12 - iglooPosition[2]);
  const guideState =
    initialDistanceToIgloo < 2.9 && speed > 0.18 ? "docking" : speed > 0.04 ? "piloting" : activeArtifact ? "station-bearing" : "parked";

  return (
    <group
      ref={root}
      name={`SealAvatar ${SEAL_COLLISION_BRIDGE}`}
      position={[axisX + 1.72, 0.45, depthZ + 1.12]}
      renderOrder={9}
      userData={{ className: "seal-avatar", guideState }}
    >
      <SealBody accent={accent} guideState={guideState} material={material} />
      <pointLight color={accent} distance={6} intensity={moving ? 3.4 : 2.35} position={[0, 0.45, 0]} />
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
      <group ref={bearingRef} name={`seal-station-bearing ${activeArtifact?.shortLabel || "station"}`} position={[0.18, 0.34, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.18, 0.2, 36]} />
          <primitive object={bearingMaterial} attach="material" />
        </mesh>
        <mesh position={[0.38, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.006, 0.36, 0.006]}>
          <cylinderGeometry args={[1, 1, 1, 6]} />
          <primitive object={bearingMaterial} attach="material" />
        </mesh>
      </group>
    </group>
  );
});

export default SealAvatar;
