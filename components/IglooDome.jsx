"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export const IGLOO_BLOCK_ROWS = 6;
export const IGLOO_BLOCKS_PER_ROW = [10, 12, 14, 16, 18, 16];
export const IGLOO_RADIUS = 2.42;
export const IGLOO_HEIGHT = 1.64;
export const IGLOO_TECHNIQUE = "procedural ice blocks with glowing seam lattice";

const BLOCK_SIZE = [0.76, 0.3, 0.26];
const ENTRANCE_SEGMENTS = 9;
const BASE_COLOR = "#9FBDD4";
const GLOW_COLOR = "#FFE3B8";
const SEAM_COLOR = "#A8F0E8";
const OBSERVATORY_RINGS = [0.18, 0.34, 0.5, 0.66, 0.82];
const IGLOO_PBR = {
  map: "/assets/pbr/igloo/white-quilted-fabric-bl/white-quilted-fabric_albedo.png",
  normalMap: "/assets/pbr/igloo/white-quilted-fabric-bl/white-quilted-fabric_normal-ogl.png",
  roughnessMap: "/assets/pbr/igloo/white-quilted-fabric-bl/white-quilted-fabric_roughness.png",
};

function createIceMaps() {
  const size = 128;
  const colorData = new Uint8Array(size * size * 4);
  const normalData = new Uint8Array(size * size * 4);
  const roughnessData = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
      const edgeShade = Math.max(0, 1 - edge / 18);
      const weave = Math.sin(x * 0.22) * 8 + Math.cos(y * 0.19) * 7 + Math.sin((x + y) * 0.08) * 12;
      const frost = Math.max(168, Math.min(255, 242 + weave - edgeShade * 24));

      colorData[i] = frost - 20;
      colorData[i + 1] = frost;
      colorData[i + 2] = frost + 8;
      colorData[i + 3] = 255;

      normalData[i] = Math.max(76, Math.min(188, 128 + (x < 12 ? -24 : x > size - 13 ? 24 : 0) + weave * 0.2));
      normalData[i + 1] = Math.max(76, Math.min(188, 128 + (y < 12 ? -24 : y > size - 13 ? 24 : 0) - weave * 0.16));
      normalData[i + 2] = 255;
      normalData[i + 3] = 255;

      const roughness = Math.max(150, Math.min(255, 228 - weave * 0.35 + edgeShade * 22));
      roughnessData[i] = roughness;
      roughnessData[i + 1] = roughness;
      roughnessData[i + 2] = roughness;
      roughnessData[i + 3] = 255;
    }
  }

  const map = new THREE.DataTexture(colorData, size, size, THREE.RGBAFormat);
  const normalMap = new THREE.DataTexture(normalData, size, size, THREE.RGBAFormat);
  const roughnessMap = new THREE.DataTexture(roughnessData, size, size, THREE.RGBAFormat);

  for (const texture of [map, normalMap, roughnessMap]) {
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }
  map.colorSpace = THREE.SRGBColorSpace;

  return { map, normalMap, roughnessMap };
}

function useIglooAssets(accent) {
  const pbr = useTexture(IGLOO_PBR);

  useEffect(() => {
    for (const texture of Object.values(pbr)) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1.35, 0.82);
      texture.anisotropy = 8;
      texture.needsUpdate = true;
    }
    pbr.map.colorSpace = THREE.SRGBColorSpace;
  }, [pbr]);

  return useMemo(() => {
    const maps = createIceMaps();
    const blockGeometry = new RoundedBoxGeometry(1, 1, 1, 3, 0.085);
    const seamGeometry = new THREE.CylinderGeometry(1, 1, 1, 6);
    const entranceGeometry = new RoundedBoxGeometry(1, 1, 1, 3, 0.065);
    const ringGeometry = new THREE.TorusGeometry(1, 0.007, 6, 128);
    const blockMaterial = new THREE.MeshPhysicalMaterial({
      color: BASE_COLOR,
      emissive: accent,
      emissiveIntensity: 0.22,
      emissiveMap: maps.map,
      map: pbr.map,
      metalness: 0.06,
      normalMap: pbr.normalMap,
      normalScale: new THREE.Vector2(0.18, 0.18),
      roughness: 0.55,
      roughnessMap: pbr.roughnessMap,
      clearcoat: 0.85,
      clearcoatRoughness: 0.26,
      transmission: 0,
      thickness: 0.24,
    });
    const shadowMaterial = new THREE.MeshPhysicalMaterial({
      color: "#3A4C63",
      emissive: "#0E1E33",
      emissiveIntensity: 0.18,
      metalness: 0.02,
      roughness: 0.88,
      transparent: true,
      opacity: 0.96,
    });
    const shellMaterial = new THREE.MeshPhysicalMaterial({
      color: "#6E8FB0",
      emissive: accent,
      emissiveIntensity: 0.2,
      metalness: 0.04,
      roughness: 0.38,
      clearcoat: 0.7,
      clearcoatRoughness: 0.28,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const seamMaterial = new THREE.MeshBasicMaterial({
      color: SEAM_COLOR,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: SEAM_COLOR,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: GLOW_COLOR,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return {
      geometries: { blockGeometry, entranceGeometry, ringGeometry, seamGeometry },
      materials: { blockMaterial, glowMaterial, ringMaterial, seamMaterial, shadowMaterial, shellMaterial },
      maps,
    };
  }, [accent, pbr]);
}

function buildBlocks() {
  const blocks = [];
  for (let row = 0; row < IGLOO_BLOCK_ROWS; row += 1) {
    const count = IGLOO_BLOCKS_PER_ROW[row];
    const rowT = (row + 0.42) / IGLOO_BLOCK_ROWS;
    const theta = rowT * Math.PI * 0.5;
    const ringRadius = Math.sin(theta) * IGLOO_RADIUS;
    const y = Math.cos(theta) * IGLOO_HEIGHT + 0.16;

    for (let col = 0; col < count; col += 1) {
      const angle = (col / count) * Math.PI * 2 + row * 0.17;
      const normalizedAngle = Math.atan2(Math.sin(angle), Math.cos(angle));
      if (row < 3 && Math.abs(normalizedAngle) < 0.3) continue;
      const x = Math.cos(angle) * ringRadius;
      const z = Math.sin(angle) * ringRadius * 0.72;
      const normal = new THREE.Vector3(x / (IGLOO_RADIUS * IGLOO_RADIUS), y / (IGLOO_HEIGHT * IGLOO_HEIGHT), z / (IGLOO_RADIUS * IGLOO_RADIUS * 0.52)).normalize();
      const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      const rowScale = 1 - row * 0.025;

      blocks.push({
        angle,
        home: new THREE.Vector3(x, y, z).addScaledVector(normal, -0.045),
        index: blocks.length,
        normal,
        quaternion,
        scale: new THREE.Vector3(BLOCK_SIZE[0] * rowScale, BLOCK_SIZE[1] * (1 - row * 0.012), BLOCK_SIZE[2]),
      });
    }
  }
  return blocks;
}

function buildSeams(blocks) {
  const seams = [];
  for (let i = 0; i < blocks.length; i += 1) {
    for (let j = i + 1; j < blocks.length; j += 1) {
      const distance = blocks[i].home.distanceTo(blocks[j].home);
      if (distance > 0.43 && distance < 0.79) {
        const start = blocks[i].home;
        const end = blocks[j].home;
        const direction = end.clone().sub(start);
        const mid = start.clone().add(end).multiplyScalar(0.5);
        seams.push({
          key: `${i}-${j}`,
          length: direction.length(),
          position: mid,
          quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()),
        });
      }
    }
  }
  return seams.slice(0, 150);
}

export default function IglooDome({ accent = "#6FE7C8", position = [0, 0, 0], pulse = 0 }) {
  const rootRef = useRef(null);
  const blockRefs = useRef([]);
  const innerLight = useRef(null);
  const assets = useIglooAssets(accent);
  const blocks = useMemo(() => buildBlocks(), []);
  const seams = useMemo(() => buildSeams(blocks), [blocks]);
  const entranceBlocks = useMemo(() => Array.from({ length: ENTRANCE_SEGMENTS }, (_, index) => index), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (rootRef.current) {
      rootRef.current.position.set(position[0], position[1] + Math.sin(t * 0.24) * 0.012, position[2]);
    }
    if (innerLight.current) {
      innerLight.current.intensity = 1.75 + Math.sin(t * 1.2) * 0.18 + pulse * 2.6;
    }

    for (const block of blocks) {
      const node = blockRefs.current[block.index];
      if (!node) continue;
      const delay = block.index / Math.max(1, blocks.length);
      const localPulse = Math.max(0, Math.min(1, (pulse - delay * 0.22) / 0.78));
      const breath = Math.sin(t * 0.56 + block.index * 0.27) * 0.006;
      node.position.copy(block.home).addScaledVector(block.normal, localPulse * (0.18 + block.home.y * 0.05));
      node.position.y += breath + localPulse * 0.05;
      node.quaternion.copy(block.quaternion);
      node.rotateX(localPulse * (0.12 + (block.index % 3) * 0.035));
      node.rotateY(localPulse * (block.index % 2 === 0 ? 0.08 : -0.08));
    }
  });

  useEffect(
    () => () => {
      for (const geometry of Object.values(assets.geometries)) geometry.dispose();
      for (const material of Object.values(assets.materials)) material.dispose();
      for (const texture of Object.values(assets.maps)) texture.dispose();
    },
    [assets],
  );

  return (
    <group ref={rootRef} name={`IglooDome ${IGLOO_TECHNIQUE}`} position={position} userData={{ className: "igloo-dome" }}>
      <pointLight ref={innerLight} color={accent} distance={9} intensity={2} position={[0, 0.72, 0]} />
      <mesh name="observatory-ice-shell" position={[0, 0.1, 0]} scale={[IGLOO_RADIUS * 0.98, IGLOO_HEIGHT * 0.98, IGLOO_RADIUS * 0.7]}>
        <sphereGeometry args={[1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <primitive object={assets.materials.shellMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0.64, 0]} scale={[1.82, 1.18, 1.32]}>
        <sphereGeometry args={[1, 36, 24]} />
        <meshBasicMaterial color={GLOW_COLOR} transparent opacity={0.1 + pulse * 0.22} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {OBSERVATORY_RINGS.map((ringT, index) => {
        const theta = ringT * Math.PI * 0.5;
        const radius = Math.sin(theta) * IGLOO_RADIUS * 0.985;
        const y = Math.cos(theta) * IGLOO_HEIGHT + 0.13;
        return (
          <mesh
            geometry={assets.geometries.ringGeometry}
            key={`observatory-ring-${index}`}
            material={assets.materials.ringMaterial}
            position={[0, y, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[radius, radius * 0.72, 1]}
          />
        );
      })}

      {seams.map((seam) => (
        <mesh
          geometry={assets.geometries.seamGeometry}
          key={seam.key}
          material={assets.materials.seamMaterial}
          position={seam.position}
          quaternion={seam.quaternion}
          scale={[0.009, seam.length, 0.009]}
        />
      ))}

      {blocks.map((block) => (
        <group
          key={`ice-block-${block.index}`}
          ref={(node) => {
            blockRefs.current[block.index] = node;
          }}
          position={block.home}
          quaternion={block.quaternion}
          scale={block.scale}
          userData={{ className: "ice-block" }}
        >
          <mesh castShadow receiveShadow geometry={assets.geometries.blockGeometry} material={assets.materials.blockMaterial} />
          <mesh geometry={assets.geometries.blockGeometry} material={assets.materials.glowMaterial} scale={[1.04, 1.08, 1.08]} />
        </group>
      ))}

      <group name="igloo-entrance" position={[IGLOO_RADIUS * 0.64, 0.22, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, -0.02, 0]} scale={[0.78, 0.28, 0.72]} geometry={assets.geometries.entranceGeometry} material={assets.materials.shadowMaterial} />
        {entranceBlocks.map((index) => {
          const arc = (index / (ENTRANCE_SEGMENTS - 1)) * Math.PI;
          const x = Math.cos(arc) * 0.62;
          const y = Math.sin(arc) * 0.54;
          return (
            <mesh
              castShadow
              geometry={assets.geometries.blockGeometry}
              key={`entrance-block-${index}`}
              material={assets.materials.blockMaterial}
              position={[0, y + 0.08, x]}
              rotation={[0, 0, arc - Math.PI * 0.5]}
              scale={[0.24, 0.2, 0.22]}
              userData={{ className: "ice-block" }}
            />
          );
        })}
      </group>

      <mesh name="igloo-contact-ring" position={[0, -0.035, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[IGLOO_RADIUS * 1.05, 0.018, 8, 120]} />
        <meshBasicMaterial color={accent} transparent opacity={0.42 + pulse * 0.36} />
      </mesh>
    </group>
  );
}
