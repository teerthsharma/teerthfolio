"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export const SNOW_ATMOSPHERE_MODE = "bounded falling snow and ground fog";
export const POLAR_GROUND_FOG_PROFILE = "dusk translucent twilight-blue ground fog that keeps station silhouettes readable";

// Polar-dusk grade: cold ice-blue flakes with a faint warm glint borrowed from
// the low sun. The glint is a slow color drift only, never extra particles.
const SNOW_BASE_COLOR = new THREE.Color("#E8F2FF");
const SNOW_GLINT_COLOR = new THREE.Color("#F5D9A8");

function makeSnowGeometry(count) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 24;
    positions[i * 3 + 1] = Math.random() * 8 + 0.4;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
    speeds[i] = 0.14 + Math.random() * 0.38;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("speed", new THREE.BufferAttribute(speeds, 1));
  return geometry;
}

export default function SnowAtmosphere({ axisX = 0, depthZ = 0, quality = "medium", windSpeed = 1 }) {
  const points = useRef(null);
  const fog = useRef(null);
  const count = quality === "low" ? 90 : quality === "medium" ? 150 : 230;
  const geometry = useMemo(() => makeSnowGeometry(count), [count]);
  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: "#E8F2FF",
        size: quality === "low" ? 0.026 : 0.018,
        transparent: true,
        opacity: quality === "low" ? 0.13 : 0.16,
        depthWrite: false,
        blending: THREE.NormalBlending,
      }),
    [quality],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ clock }, delta) => {
    const node = points.current;
    if (!node) return;
    node.position.x = axisX;
    node.position.z = depthZ;

    const dt = Math.min(delta, 0.05);
    const positions = geometry.attributes.position;
    const speeds = geometry.attributes.speed;
    for (let i = 0; i < speeds.count; i += 1) {
      const y = positions.getY(i) - speeds.getX(i) * dt * 2.4;
      const drift = Math.sin(clock.elapsedTime * 0.4 + i * 0.31) * dt * 0.12 * windSpeed;
      positions.setX(i, positions.getX(i) + drift);
      positions.setY(i, y < -0.2 ? 8 : y);
    }
    positions.needsUpdate = true;

    const glint = 0.06 + Math.sin(clock.elapsedTime * 0.45) * 0.05;
    material.color.copy(SNOW_BASE_COLOR).lerp(SNOW_GLINT_COLOR, glint);

    if (fog.current) {
      fog.current.position.x = axisX;
      fog.current.position.z = depthZ - 2;
      fog.current.material.opacity = 0.045 + Math.sin(clock.elapsedTime * 0.33) * 0.007;
    }
  });

  return (
    <group name={`SnowAtmosphere ${SNOW_ATMOSPHERE_MODE}`}>
      <points ref={points} geometry={geometry} material={material} />
      <mesh ref={fog} position={[axisX, -0.05, depthZ - 2]} rotation={[-Math.PI / 2, 0, 0]} scale={[30, 18, 1]}>
        <planeGeometry args={[1, 1, 1, 1]} />
        <meshBasicMaterial color="#3A4C73" transparent opacity={0.045} depthWrite={false} />
      </mesh>
    </group>
  );
}
