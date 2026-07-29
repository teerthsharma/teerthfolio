"use client";

import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { POLAR_PALETTE } from "../lib/polar-art-direction";

export const TERRAIN_CHUNK_SIZE = 26;
export const TERRAIN_CHUNK_COUNT = 7;
export const TERRAIN_RENDER_NOTE = "recursive Antarctic floor material tile";
export const CLEAN_POLAR_SURFACE_PROFILE = "uplifting clean polar ice, soft blue-violet shadows, texture subordinate to stations";
export const ANIME_TERRAIN_SHADER_PROFILE =
  "three-band anime snow on one memoized 4-pixel toon ramp: #F2D3A8 warm bounce, #68829E dusk cyan, #3E4A64 night shadow";
export const TERRAIN_MATERIAL_COLOR = POLAR_PALETTE.glacierWhite;

const SNOW_PBR = {
  map: "/assets/pbr/ground/cloudy-veined-quartz-light-bl/cloudy-veined-quartz-light_albedo.png",
  normalMap: "/assets/pbr/ground/cloudy-veined-quartz-light-bl/cloudy-veined-quartz-light_normal-ogl.png",
  roughnessMap: "/assets/pbr/ground/cloudy-veined-quartz-light-bl/cloudy-veined-quartz-light_roughness.png",
};

function terrainHeight(x, z) {
  const crossDrift = Math.sin(x * 0.052 + z * 0.031) * 0.12;
  const longDrift = Math.sin(z * 0.041 - x * 0.019 + 1.7) * 0.075;
  const pathSwell = Math.cos((x + z * 0.44) * 0.067 - 0.8) * 0.045;
  return (
    crossDrift +
    longDrift +
    pathSwell
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

function useAnimeGradientMap() {
  return useMemo(() => {
    const data = new Uint8Array([
      62, 74, 100, 255,
      104, 130, 158, 255,
      104, 130, 158, 255,
      242, 211, 168, 255,
    ]);
    const texture = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    return texture;
  }, []);
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
  const gradientMap = useAnimeGradientMap();
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
      new THREE.MeshToonMaterial({
        color: TERRAIN_MATERIAL_COLOR,
        gradientMap,
        normalMap: maps.normalMap,
        normalScale: new THREE.Vector2(0.0025, 0.0025),
      }),
    [gradientMap, maps.normalMap],
  );
  const mountainMaterial = useMemo(
    () =>
      new THREE.MeshToonMaterial({
        color: "#4A6484",
        emissive: POLAR_PALETTE.animeShadow,
        emissiveIntensity: 0.025,
        gradientMap,
      }),
    [gradientMap],
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

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => gradientMap.dispose(), [gradientMap]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => mountainGeometry.dispose(), [mountainGeometry]);
  useEffect(() => () => mountainMaterial.dispose(), [mountainMaterial]);

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
