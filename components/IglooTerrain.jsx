"use client";

import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

export const TERRAIN_CHUNK_SIZE = 26;
export const TERRAIN_CHUNK_COUNT = 7;
export const TERRAIN_RENDER_NOTE = "recursive Antarctic floor material tile";
export const CLEAN_POLAR_SURFACE_PROFILE = "clean low-contrast polar ice, texture subordinate to observatory";
export const TERRAIN_MATERIAL_COLOR = "#5f787e";

const SNOW_PBR = {
  map: "/assets/pbr/ground/cloudy-veined-quartz-light-bl/cloudy-veined-quartz-light_albedo.png",
  normalMap: "/assets/pbr/ground/cloudy-veined-quartz-light-bl/cloudy-veined-quartz-light_normal-ogl.png",
  roughnessMap: "/assets/pbr/ground/cloudy-veined-quartz-light-bl/cloudy-veined-quartz-light_roughness.png",
};

function terrainHeight(x, z) {
  return (
    Math.sin(x * 0.13) * 0.2 +
    Math.cos(z * 0.21) * 0.14 +
    Math.sin((x + z) * 0.055) * 0.22 +
    Math.cos((x - z) * 0.038) * 0.12
  );
}

function useTerrainMaps() {
  const maps = useTexture(SNOW_PBR);

  useEffect(() => {
    for (const texture of Object.values(maps)) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(7.2, 5.4);
      texture.anisotropy = 8;
      texture.needsUpdate = true;
    }
    maps.map.colorSpace = THREE.SRGBColorSpace;
  }, [maps]);

  return maps;
}

function TerrainChunk({ geometry, material, x, z }) {
  return (
    <mesh
      geometry={geometry}
      material={material}
      name={TERRAIN_RENDER_NOTE}
      position={[x, -0.22, z]}
      receiveShadow
      rotation={[-Math.PI / 2, 0, 0]}
    />
  );
}

function MountainRidge({ geometry, material, seed, x, z, scale }) {
  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[x, scale * 0.26 - 0.3, z]}
      rotation={[0, seed, 0]}
      scale={[scale, scale * 0.72, scale * 0.62]}
    />
  );
}

export default function IglooTerrain({ axisX = 0, depthZ = 0, quality = "medium" }) {
  const maps = useTerrainMaps();
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(TERRAIN_CHUNK_SIZE, TERRAIN_CHUNK_SIZE, 34, 34);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const z = pos.getY(i);
      pos.setZ(i, terrainHeight(x, z));
    }
    geo.computeVertexNormals();
    return geo;
  }, []);
  const mountainGeometry = useMemo(() => {
    const geo = new THREE.ConeGeometry(1, 1, quality === "low" ? 6 : 8, 3);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const px = pos.getX(i);
      const py = pos.getY(i);
      const pz = pos.getZ(i);
      pos.setX(i, px + Math.sin(py * 4.1 + pz * 2.2) * 0.12);
      pos.setZ(i, pz + Math.cos(py * 3.2 + px * 2.8) * 0.1);
    }
    geo.computeVertexNormals();
    return geo;
  }, [quality]);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: TERRAIN_MATERIAL_COLOR,
        emissive: "#061114",
        emissiveIntensity: 0.04,
        metalness: 0.0,
        normalMap: maps.normalMap,
        normalScale: new THREE.Vector2(0.01, 0.01),
        roughness: 0.96,
        roughnessMap: maps.roughnessMap,
      }),
    [maps],
  );
  const mountainMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#778e96",
        emissive: "#081519",
        emissiveIntensity: 0.06,
        metalness: 0.02,
        roughness: 0.86,
      }),
    [],
  );
  const activeChunkCount = quality === "low" ? 3 : quality === "medium" ? 5 : TERRAIN_CHUNK_COUNT;
  const chunks = useMemo(
    () => Array.from({ length: activeChunkCount }, (_, index) => index - Math.floor(activeChunkCount / 2)),
    [activeChunkCount],
  );
  const ridges = useMemo(
    () =>
      Array.from({ length: quality === "low" ? 8 : 14 }, (_, index) => ({
        key: `ridge-${index}`,
        seed: index * 1.83,
        x: (index % 2 === 0 ? -1 : 1) * (16 + (index % 5) * 10),
        z: -28 - (index % 7) * 10,
        scale: 3.4 + (index % 4) * 1.6,
      })),
    [quality],
  );
  const chunkX = Math.round(axisX / TERRAIN_CHUNK_SIZE);
  const chunkZ = Math.round(depthZ / TERRAIN_CHUNK_SIZE);

  useEffect(
    () => () => {
      geometry.dispose();
      mountainGeometry.dispose();
      material.dispose();
      mountainMaterial.dispose();
    },
    [geometry, material, mountainGeometry, mountainMaterial],
  );

  return (
    <group name="IglooTerrain IglooHorizontalAxisTerrain">
      {chunks.map((offsetX) =>
        chunks.map((offsetZ) => {
          const x = (chunkX + offsetX) * TERRAIN_CHUNK_SIZE;
          const z = (chunkZ + offsetZ) * TERRAIN_CHUNK_SIZE;
          return <TerrainChunk geometry={geometry} key={`terrain-${x}-${z}`} material={material} x={x} z={z} />;
        }),
      )}
      {ridges.map((ridge) => (
        <MountainRidge
          geometry={mountainGeometry}
          key={ridge.key}
          material={mountainMaterial}
          scale={ridge.scale}
          seed={ridge.seed}
          x={axisX * 0.22 + ridge.x}
          z={ridge.z + depthZ * 0.08}
        />
      ))}
    </group>
  );
}
