"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export const DOME_RIB_COUNT = 32;
export const DOME_PANEL_ROWS = 8;
export const BLENDKIT_REFERENCE_ASSET_BASE_ID = "d8b9892d-0f4b-493f-8f69-e072d3353b24";
export const WHITE_QUILTED_FABRIC_PBR = {
  map: "/assets/pbr/igloo/white-quilted-fabric-bl/white-quilted-fabric_albedo.png",
  aoMap: "/assets/pbr/igloo/white-quilted-fabric-bl/white-quilted-fabric_ao.png",
  displacementMap: "/assets/pbr/igloo/white-quilted-fabric-bl/white-quilted-fabric_height.png",
  metalnessMap: "/assets/pbr/igloo/white-quilted-fabric-bl/white-quilted-fabric_metallic.png",
  normalMap: "/assets/pbr/igloo/white-quilted-fabric-bl/white-quilted-fabric_normal-ogl.png",
  roughnessMap: "/assets/pbr/igloo/white-quilted-fabric-bl/white-quilted-fabric_roughness.png",
};

const DOME_CENTER_Y = 0.12;
const DOME_RADIUS = { x: 2.18, y: 1.38, z: 1.24 };
const BASE_COLOR = "#dffdf7";
const SHADOW_COLOR = "#061014";
const PBR_MAP_SIZE = 64;
const SQUARE_BRICK_TEXTURE_SIZE = 96;
const SQUARE_EDGE_TEXTURE_SIZE = 96;
const SCIENCE_DOME_REFERENCE = "Antarctic geodesic science radome with observatory airlock";
export const DOME_COLLISION_MODE = "intact by default; collapse only on deliberate seal impact";
export const DOME_INTACT_SHELL_PROFILE = "continuous luminous ice shell under tiled PBR bricks";
export const DOME_TILE_GEOMETRY_PROFILE = "procedural crystal-growth ice brick tiles with tucked corners, facet chips, and varied frost UVs";
export const DOME_CRYSTAL_GROWTH_PROFILE = "browser-native procedural crystal-growth ice blocks; no igloo.inc geometry, texture, or shader assets";
export const DOME_BRICK_SHADER_PROFILE = "shader-injected frost veins, edge scatter, and cold chromatic ice response";
const DOME_TILE_COLUMNS_BY_ROW = [6, 8, 10, 12, 14, 16, 18, 20];

function domePoint(angle, theta, lift = 0) {
  const sinTheta = Math.sin(theta);
  return [
    Math.cos(angle) * sinTheta * DOME_RADIUS.x,
    DOME_CENTER_Y + Math.cos(theta) * DOME_RADIUS.y + lift,
    Math.sin(angle) * sinTheta * DOME_RADIUS.z,
  ];
}

function domeNormal(angle, theta) {
  const sinTheta = Math.sin(theta);
  return new THREE.Vector3(
    (Math.cos(angle) * sinTheta) / DOME_RADIUS.x,
    Math.cos(theta) / DOME_RADIUS.y,
    (Math.sin(angle) * sinTheta) / DOME_RADIUS.z,
  ).normalize();
}

function domeSurfacePoint(angle, theta, lift = 0) {
  const point = vectorFromArray(domePoint(angle, theta));
  return point.addScaledVector(domeNormal(angle, theta), lift);
}

function vectorFromArray(value) {
  return new THREE.Vector3(value[0], value[1], value[2]);
}

function OrientedCylinder({ color, end, opacity = 0.5, radius = 0.01, start }) {
  const transform = useMemo(() => {
    const from = vectorFromArray(start);
    const to = vectorFromArray(end);
    const delta = new THREE.Vector3().subVectors(to, from);
    const length = delta.length();
    const midpoint = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      delta.clone().normalize(),
    );

    return {
      length,
      position: midpoint.toArray(),
      quaternion,
    };
  }, [end, start]);

  return (
    <mesh position={transform.position} quaternion={transform.quaternion}>
      <cylinderGeometry args={[radius, radius, transform.length, 8, 1, true]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
}

function useProceduralPbrMaps() {
  return useMemo(() => {
    const roughnessData = new Uint8Array(PBR_MAP_SIZE * PBR_MAP_SIZE * 4);
    const normalData = new Uint8Array(PBR_MAP_SIZE * PBR_MAP_SIZE * 4);

    for (let y = 0; y < PBR_MAP_SIZE; y += 1) {
      for (let x = 0; x < PBR_MAP_SIZE; x += 1) {
        const index = (y * PBR_MAP_SIZE + x) * 4;
        const wave = Math.sin(x * 0.37) * 0.5 + Math.cos(y * 0.29) * 0.5;
        const frost = Math.sin((x + y) * 0.19) * Math.cos((x - y) * 0.11);
        const grain = ((x * 19 + y * 37 + (x * y) % 23) % 31) / 31;
        const roughness = Math.max(115, Math.min(248, 168 + wave * 32 + frost * 24 + grain * 28));
        const normalX = Math.max(72, Math.min(184, 128 + wave * 24 + grain * 18));
        const normalY = Math.max(72, Math.min(184, 128 + frost * 24 - grain * 14));

        roughnessData[index] = roughness;
        roughnessData[index + 1] = roughness;
        roughnessData[index + 2] = roughness;
        roughnessData[index + 3] = 255;

        normalData[index] = normalX;
        normalData[index + 1] = normalY;
        normalData[index + 2] = 255;
        normalData[index + 3] = 255;
      }
    }

    const roughnessMap = new THREE.DataTexture(roughnessData, PBR_MAP_SIZE, PBR_MAP_SIZE, THREE.RGBAFormat);
    const normalMap = new THREE.DataTexture(normalData, PBR_MAP_SIZE, PBR_MAP_SIZE, THREE.RGBAFormat);

    for (const map of [roughnessMap, normalMap]) {
      map.wrapS = THREE.RepeatWrapping;
      map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(3.5, 2.25);
      map.needsUpdate = true;
    }

    return { normalMap, roughnessMap };
  }, []);
}

function useSquareBrickMaps() {
  return useMemo(() => {
    const colorData = new Uint8Array(SQUARE_BRICK_TEXTURE_SIZE * SQUARE_BRICK_TEXTURE_SIZE * 4);
    const roughnessData = new Uint8Array(SQUARE_BRICK_TEXTURE_SIZE * SQUARE_BRICK_TEXTURE_SIZE * 4);
    const normalData = new Uint8Array(SQUARE_BRICK_TEXTURE_SIZE * SQUARE_BRICK_TEXTURE_SIZE * 4);
    const center = (SQUARE_BRICK_TEXTURE_SIZE - 1) * 0.5;

    for (let y = 0; y < SQUARE_BRICK_TEXTURE_SIZE; y += 1) {
      for (let x = 0; x < SQUARE_BRICK_TEXTURE_SIZE; x += 1) {
        const index = (y * SQUARE_BRICK_TEXTURE_SIZE + x) * 4;
        const edge = Math.min(x, y, SQUARE_BRICK_TEXTURE_SIZE - 1 - x, SQUARE_BRICK_TEXTURE_SIZE - 1 - y);
        const edgeMask = Math.max(0, Math.min(1, edge / 14));
        const dx = (x - center) / center;
        const dy = (y - center) / center;
        const domeLight = 1 - Math.min(1, Math.hypot(dx * 0.82, dy * 0.92)) * 0.32;
        const weave = Math.sin((x + y) * 0.26) * 9 + Math.cos((x - y) * 0.18) * 7;
        const bevelShadow = 52 * (1 - edgeMask);
        const frost = Math.max(0, Math.min(255, 222 + weave - bevelShadow + domeLight * 18));

        colorData[index] = Math.max(142, Math.min(255, frost - 7));
        colorData[index + 1] = Math.max(162, Math.min(255, frost + 5));
        colorData[index + 2] = Math.max(172, Math.min(255, frost + 10));
        colorData[index + 3] = 255;

        const roughness = Math.max(150, Math.min(250, 210 - edgeMask * 18 + weave * 0.45));
        roughnessData[index] = roughness;
        roughnessData[index + 1] = roughness;
        roughnessData[index + 2] = roughness;
        roughnessData[index + 3] = 255;

        const normalX = Math.max(74, Math.min(182, 128 + (x < 8 ? -26 : x > SQUARE_BRICK_TEXTURE_SIZE - 9 ? 26 : 0) + weave * 0.25));
        const normalY = Math.max(74, Math.min(182, 128 + (y < 8 ? -26 : y > SQUARE_BRICK_TEXTURE_SIZE - 9 ? 26 : 0) - weave * 0.2));
        normalData[index] = normalX;
        normalData[index + 1] = normalY;
        normalData[index + 2] = 255;
        normalData[index + 3] = 255;
      }
    }

    const map = new THREE.DataTexture(colorData, SQUARE_BRICK_TEXTURE_SIZE, SQUARE_BRICK_TEXTURE_SIZE, THREE.RGBAFormat);
    const roughnessMap = new THREE.DataTexture(roughnessData, SQUARE_BRICK_TEXTURE_SIZE, SQUARE_BRICK_TEXTURE_SIZE, THREE.RGBAFormat);
    const normalMap = new THREE.DataTexture(normalData, SQUARE_BRICK_TEXTURE_SIZE, SQUARE_BRICK_TEXTURE_SIZE, THREE.RGBAFormat);

    for (const texture of [map, roughnessMap, normalMap]) {
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.anisotropy = 8;
      texture.needsUpdate = true;
    }
    map.colorSpace = THREE.SRGBColorSpace;

    return { map, normalMap, roughnessMap };
  }, []);
}

function useSquareBrickEdgeMaps() {
  return useMemo(() => {
    const colorData = new Uint8Array(SQUARE_EDGE_TEXTURE_SIZE * SQUARE_EDGE_TEXTURE_SIZE * 4);
    const roughnessData = new Uint8Array(SQUARE_EDGE_TEXTURE_SIZE * SQUARE_EDGE_TEXTURE_SIZE * 4);
    const normalData = new Uint8Array(SQUARE_EDGE_TEXTURE_SIZE * SQUARE_EDGE_TEXTURE_SIZE * 4);

    for (let y = 0; y < SQUARE_EDGE_TEXTURE_SIZE; y += 1) {
      for (let x = 0; x < SQUARE_EDGE_TEXTURE_SIZE; x += 1) {
        const index = (y * SQUARE_EDGE_TEXTURE_SIZE + x) * 4;
        const verticalCompression = y / Math.max(1, SQUARE_EDGE_TEXTURE_SIZE - 1);
        const strata = Math.sin(y * 0.42) * 12 + Math.cos((x + y) * 0.16) * 8;
        const chippedEdge = Math.sin(x * 0.31 + y * 0.12) * Math.cos(y * 0.19) * 14;
        const shadow = 58 + verticalCompression * 42;
        const frost = Math.max(68, Math.min(214, 176 + strata + chippedEdge - shadow));

        colorData[index] = Math.max(54, Math.min(235, frost - 18));
        colorData[index + 1] = Math.max(76, Math.min(242, frost + 2));
        colorData[index + 2] = Math.max(88, Math.min(248, frost + 12));
        colorData[index + 3] = 255;

        const roughness = Math.max(168, Math.min(252, 218 + strata * 0.4 + chippedEdge * 0.2));
        roughnessData[index] = roughness;
        roughnessData[index + 1] = roughness;
        roughnessData[index + 2] = roughness;
        roughnessData[index + 3] = 255;

        normalData[index] = Math.max(70, Math.min(190, 128 + chippedEdge * 0.9));
        normalData[index + 1] = Math.max(70, Math.min(190, 128 + strata * 0.7));
        normalData[index + 2] = 255;
        normalData[index + 3] = 255;
      }
    }

    const map = new THREE.DataTexture(colorData, SQUARE_EDGE_TEXTURE_SIZE, SQUARE_EDGE_TEXTURE_SIZE, THREE.RGBAFormat);
    const roughnessMap = new THREE.DataTexture(roughnessData, SQUARE_EDGE_TEXTURE_SIZE, SQUARE_EDGE_TEXTURE_SIZE, THREE.RGBAFormat);
    const normalMap = new THREE.DataTexture(normalData, SQUARE_EDGE_TEXTURE_SIZE, SQUARE_EDGE_TEXTURE_SIZE, THREE.RGBAFormat);

    for (const texture of [map, roughnessMap, normalMap]) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1.5, 1);
      texture.anisotropy = 8;
      texture.needsUpdate = true;
    }
    map.colorSpace = THREE.SRGBColorSpace;

    return { map, normalMap, roughnessMap };
  }, []);
}

function ProceduralFrostMaterial({
  accent,
  color = BASE_COLOR,
  emissiveIntensity = 0.08,
  opacity = 0.5,
  roughness = 0.42,
}) {
  const extractedMaps = useTexture(WHITE_QUILTED_FABRIC_PBR);
  const proceduralMaps = useProceduralPbrMaps();
  const normalScale = useMemo(() => new THREE.Vector2(0.038, 0.075), []);

  useEffect(() => {
    for (const map of Object.values(extractedMaps)) {
      map.wrapS = THREE.RepeatWrapping;
      map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(4.8, 2.6);
      map.anisotropy = 8;
      map.needsUpdate = true;
    }
    extractedMaps.map.colorSpace = THREE.SRGBColorSpace;
  }, [extractedMaps]);

  return (
    <meshStandardMaterial
      aoMap={extractedMaps.aoMap}
      color={color}
      displacementMap={extractedMaps.displacementMap}
      displacementScale={0.006}
      depthWrite
      emissive={accent}
      emissiveIntensity={emissiveIntensity * 0.45}
      metalness={0.0}
      metalnessMap={extractedMaps.metalnessMap}
      normalMap={extractedMaps.normalMap || proceduralMaps.normalMap}
      normalScale={normalScale}
      opacity={opacity}
      roughness={roughness}
      roughnessMap={extractedMaps.roughnessMap || proceduralMaps.roughnessMap}
      side={THREE.DoubleSide}
      transparent
    />
  );
}

function DomeBrickFaceMaterial({ accent, color = "#e8f7f4", sourceMaps, squareMaps }) {
  const normalScale = useMemo(() => new THREE.Vector2(0.08, 0.12), []);
  const customProgramCacheKey = useMemo(() => () => DOME_BRICK_SHADER_PROFILE, []);
  const onBeforeCompile = useMemo(
    () => (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
varying vec2 vDomeIceUv;
varying vec3 vDomeIceNormal;`,
        )
        .replace(
          "#include <uv_vertex>",
          `#include <uv_vertex>
vDomeIceUv = uv;`,
        )
        .replace(
          "#include <beginnormal_vertex>",
          `#include <beginnormal_vertex>
vDomeIceNormal = objectNormal;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
varying vec2 vDomeIceUv;
varying vec3 vDomeIceNormal;
float domeIceHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float domeIceNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = domeIceHash(i);
  float b = domeIceHash(i + vec2(1.0, 0.0));
  float c = domeIceHash(i + vec2(0.0, 1.0));
  float d = domeIceHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}`,
        )
        .replace(
          "#include <map_fragment>",
          `#include <map_fragment>
float domeEdge = min(min(vDomeIceUv.x, 1.0 - vDomeIceUv.x), min(vDomeIceUv.y, 1.0 - vDomeIceUv.y));
float domeRimScatter = 1.0 - smoothstep(0.0, 0.24, domeEdge);
float domeGrowth = domeIceNoise(vDomeIceUv * vec2(6.5, 5.2));
float domeVeinA = abs(fract(vDomeIceUv.x * 5.6 + vDomeIceUv.y * 2.1 + domeGrowth * 0.42) - 0.5);
float domeVeinB = abs(fract(vDomeIceUv.y * 6.2 - vDomeIceUv.x * 1.7 + domeGrowth * 0.38) - 0.5);
float domeVeins = (1.0 - smoothstep(0.018, 0.052, min(domeVeinA, domeVeinB))) * 0.72;
float domeFacet = smoothstep(0.34, 0.92, domeGrowth);
diffuseColor.rgb *= mix(vec3(0.72, 0.86, 0.88), vec3(1.2, 1.28, 1.22), domeFacet * 0.36);
diffuseColor.rgb += vec3(0.11, 0.21, 0.22) * domeVeins;
diffuseColor.rgb += vec3(0.16, 0.27, 0.28) * domeRimScatter;
diffuseColor.r += domeRimScatter * 0.025;
diffuseColor.b += domeVeins * 0.045;`,
        )
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
totalEmissiveRadiance += vec3(0.018, 0.06, 0.066) * (domeVeins + domeRimScatter * 0.84);`,
        );
    },
    [],
  );

  return (
    <meshStandardMaterial
      aoMap={sourceMaps.aoMap}
      color={color}
      customProgramCacheKey={customProgramCacheKey}
      depthWrite
      displacementMap={sourceMaps.displacementMap}
      displacementScale={0.004}
      emissive={accent}
      emissiveIntensity={0.01}
      map={squareMaps.map}
      metalness={0.0}
      metalnessMap={sourceMaps.metalnessMap}
      normalMap={squareMaps.normalMap}
      normalScale={normalScale}
      polygonOffset
      polygonOffsetFactor={-1}
      polygonOffsetUnits={-1}
      onBeforeCompile={onBeforeCompile}
      roughness={0.72}
      roughnessMap={squareMaps.roughnessMap}
      side={THREE.DoubleSide}
    />
  );
}

function DomeBrickSideMaterial({ accent, color = "#728a92", edgeMaps }) {
  const normalScale = useMemo(() => new THREE.Vector2(0.18, 0.18), []);

  return (
    <meshStandardMaterial
      color={color}
      depthWrite
      emissive={accent}
      emissiveIntensity={0.004}
      map={edgeMaps.map}
      metalness={0.0}
      normalMap={edgeMaps.normalMap}
      normalScale={normalScale}
      roughness={0.9}
      roughnessMap={edgeMaps.roughnessMap}
    />
  );
}

function useDomeBrickTextureBundle() {
  const sourceMaps = useTexture(WHITE_QUILTED_FABRIC_PBR);
  const squareMaps = useSquareBrickMaps();
  const edgeMaps = useSquareBrickEdgeMaps();

  useEffect(() => {
    for (const map of Object.values(sourceMaps)) {
      map.wrapS = THREE.RepeatWrapping;
      map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(1, 1);
      map.offset.set(0, 0);
      map.anisotropy = 8;
      map.needsUpdate = true;
    }
    sourceMaps.map.colorSpace = THREE.SRGBColorSpace;
  }, [sourceMaps]);

  return useMemo(
    () => ({
      edgeMaps,
      sourceMaps,
      squareMaps,
    }),
    [edgeMaps, sourceMaps, squareMaps],
  );
}

function CurvedDomeTileGeometry({ panel }) {
  const geometry = useMemo(() => {
    const uSegments = 7;
    const vSegments = 5;
    const center = vectorFromArray(panel.position);
    const positions = [];
    const uvs = [];
    const indices = [];

    for (let v = 0; v <= vSegments; v += 1) {
      const vRatio = v / vSegments;
      const theta = panel.theta + (vRatio - 0.5) * panel.thetaSpan;
      for (let u = 0; u <= uSegments; u += 1) {
        const uRatio = u / uSegments;
        const angle = panel.angle + (uRatio - 0.5) * panel.angleSpan;
        const edgeFalloff = Math.sin(Math.PI * uRatio) * Math.sin(Math.PI * vRatio);
        const cornerDistance = Math.max(Math.abs(uRatio - 0.5), Math.abs(vRatio - 0.5)) * 2;
        const cornerTuck = Math.max(0, cornerDistance - 0.62) ** 2;
        const frostWarp =
          Math.sin((uRatio + panel.seed) * Math.PI * 2.0) *
          Math.cos((vRatio - panel.seed * 0.13) * Math.PI * 2.0) *
          0.006;
        const crystalFacet =
          Math.sin((uRatio * 6.0 + panel.seed * 0.7) * Math.PI) *
          Math.sin((vRatio * 5.0 - panel.seed * 0.31) * Math.PI) *
          0.007;
        const edgeChip =
          Math.max(0, Math.sin((uRatio + panel.seed) * 22.0) * Math.cos((vRatio - panel.seed) * 17.0)) *
          (1 - edgeFalloff) *
          0.012;
        const lift = panel.lift + edgeFalloff * panel.puff + frostWarp + crystalFacet - cornerTuck * panel.puff * 0.5 - edgeChip;
        const point = domeSurfacePoint(angle, theta, lift);
        point.sub(center);
        positions.push(point.x, point.y, point.z);
        uvs.push(
          panel.tile.offset[0] + uRatio * panel.tile.repeat[0],
          panel.tile.offset[1] + (1 - vRatio) * panel.tile.repeat[1],
        );
      }
    }

    const rowWidth = uSegments + 1;
    for (let v = 0; v < vSegments; v += 1) {
      for (let u = 0; u < uSegments; u += 1) {
        const a = v * rowWidth + u;
        const b = a + 1;
        const c = a + rowWidth;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const curvedGeometry = new THREE.BufferGeometry();
    curvedGeometry.setIndex(indices);
    curvedGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    curvedGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    curvedGeometry.computeVertexNormals();
    return curvedGeometry;
  }, [panel]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return <primitive attach="geometry" object={geometry} />;
}

function DomeBrickSideGeometry({ panel }) {
  const geometry = useMemo(() => {
    const uSegments = 3;
    const vSegments = 2;
    const center = vectorFromArray(panel.position);
    const front = [];
    const back = [];
    const positions = [];
    const uvs = [];
    const indices = [];
    const thickness = panel.thickness;

    for (let v = 0; v <= vSegments; v += 1) {
      const vRatio = v / vSegments;
      const theta = panel.theta + (vRatio - 0.5) * panel.thetaSpan;
      for (let u = 0; u <= uSegments; u += 1) {
        const uRatio = u / uSegments;
        const angle = panel.angle + (uRatio - 0.5) * panel.angleSpan;
        const centerPuff = Math.sin(Math.PI * uRatio) * Math.sin(Math.PI * vRatio);
        const frontPoint = domeSurfacePoint(angle, theta, panel.lift + centerPuff * panel.puff);
        const backPoint = domeSurfacePoint(angle, theta, panel.lift - thickness);
        front.push(frontPoint.sub(center).clone());
        back.push(backPoint.sub(center).clone());
      }
    }

    const addVertex = (point, uv) => {
      positions.push(point.x, point.y, point.z);
      uvs.push(uv[0], uv[1]);
      return positions.length / 3 - 1;
    };

    const addQuad = (a, b, c, d, uvScale = [1, 1]) => {
      const ia = addVertex(a, [0, 0]);
      const ib = addVertex(b, [uvScale[0], 0]);
      const ic = addVertex(c, [0, uvScale[1]]);
      const id = addVertex(d, [uvScale[0], uvScale[1]]);
      indices.push(ia, ic, ib, ib, ic, id);
    };

    const rowWidth = uSegments + 1;

    for (let v = 0; v < vSegments; v += 1) {
      for (let u = 0; u < uSegments; u += 1) {
        const a = back[v * rowWidth + u];
        const b = back[v * rowWidth + u + 1];
        const c = back[(v + 1) * rowWidth + u];
        const d = back[(v + 1) * rowWidth + u + 1];
        addQuad(b, a, d, c, [1, 1]);
      }
    }

    for (let u = 0; u < uSegments; u += 1) {
      addQuad(
        front[u],
        front[u + 1],
        back[u],
        back[u + 1],
        [1, 0.35],
      );
      const lastRow = vSegments * rowWidth;
      addQuad(
        front[lastRow + u + 1],
        front[lastRow + u],
        back[lastRow + u + 1],
        back[lastRow + u],
        [1, 0.35],
      );
    }

    for (let v = 0; v < vSegments; v += 1) {
      const leftA = v * rowWidth;
      const leftB = (v + 1) * rowWidth;
      const rightA = v * rowWidth + uSegments;
      const rightB = (v + 1) * rowWidth + uSegments;
      addQuad(front[leftB], front[leftA], back[leftB], back[leftA], [1, 0.35]);
      addQuad(front[rightA], front[rightB], back[rightA], back[rightB], [1, 0.35]);
    }

    const sideGeometry = new THREE.BufferGeometry();
    sideGeometry.setIndex(indices);
    sideGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    sideGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    sideGeometry.computeVertexNormals();
    return sideGeometry;
  }, [panel]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return <primitive attach="geometry" object={geometry} />;
}

function DomeTile({ accent, brickMaps, impact, panel }) {
  const ref = useRef(null);
  const collapse = useRef(0);
  const homePosition = useMemo(() => new THREE.Vector3(...panel.position), [panel.position]);
  const homeRotation = useMemo(() => new THREE.Euler(0, 0, 0), []);
  const outward = useMemo(() => {
    const vector = new THREE.Vector3(panel.position[0], panel.position[1] - DOME_CENTER_Y, panel.position[2]);
    if (vector.lengthSq() < 0.0001) return new THREE.Vector3(0, 1, 0);
    return vector.normalize();
  }, [panel.position]);

  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    const localImpact = Math.max(0, (impact - panel.breakDelay) / Math.max(0.001, 1 - panel.breakDelay));
    collapse.current = THREE.MathUtils.damp(collapse.current, localImpact, localImpact > 0 ? 5.8 : 1.35, delta);
    const c = collapse.current;
    ref.current.position.copy(homePosition);
    ref.current.position.addScaledVector(outward, c * (0.28 + panel.row * 0.045));
    ref.current.position.y -= c * c * (0.28 + panel.row * 0.075);
    ref.current.rotation.copy(homeRotation);
    ref.current.rotation.x += c * (0.8 + panel.seed * 0.2);
    ref.current.rotation.y += Math.sin(clock.elapsedTime * 1.2 + panel.seed) * c * 0.28;
    ref.current.rotation.z += c * (panel.rib % 2 === 0 ? 0.44 : -0.44);
  });

  return (
    <group ref={ref} name="curved-thick-dome-brick" userData={{ className: "curved-thick-dome-brick ice-block" }}>
      <mesh castShadow receiveShadow>
        <DomeBrickSideGeometry panel={panel} />
        <DomeBrickSideMaterial accent={accent} color={panel.sideTint} edgeMaps={brickMaps.edgeMaps} />
      </mesh>
      <mesh castShadow receiveShadow>
        <CurvedDomeTileGeometry panel={panel} />
        <DomeBrickFaceMaterial
          accent={accent}
          color={panel.tint}
          sourceMaps={brickMaps.sourceMaps}
          squareMaps={brickMaps.squareMaps}
        />
      </mesh>
    </group>
  );
}

function IcePlinth({ accent }) {
  const shards = useMemo(
    () =>
      Array.from({ length: 28 }, (_, index) => {
        const angle = (index / 28) * Math.PI * 2;
        const radius = 1.86 + (index % 5) * 0.09;
        return {
          angle,
          key: `plinth-shard-${index}`,
          position: [
            Math.cos(angle) * radius,
            0.04 + (index % 3) * 0.015,
            Math.sin(angle) * radius * 0.6,
          ],
          rotation: [0.16 + (index % 4) * 0.08, -angle + Math.PI * 0.5, (index % 2 ? -1 : 1) * 0.07],
          scale: [0.08 + (index % 4) * 0.018, 0.24 + (index % 5) * 0.035, 0.05],
        };
      }),
    [],
  );

  return (
    <group name="PolarDomeIcePlinth">
      <mesh position={[0.05, -0.055, 0.04]} scale={[2.82, 0.012, 1.58]}>
        <cylinderGeometry args={[1, 1, 1, 96]} />
        <meshBasicMaterial color="#010304" transparent opacity={0.58} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, -0.02, 0]} scale={[2.54, 0.1, 1.5]}>
        <cylinderGeometry args={[1, 1, 1, 96]} />
        <meshStandardMaterial
          color="#586f76"
          emissive={SHADOW_COLOR}
          emissiveIntensity={0.08}
          metalness={0.08}
          roughness={0.82}
          transparent
          opacity={0.66}
        />
      </mesh>
      <mesh position={[0, 0.07, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.32, 0.82, 1]}>
        <torusGeometry args={[1.74, 0.018, 10, 160]} />
        <meshBasicMaterial color={accent} transparent opacity={0.09} />
      </mesh>
      <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.22, 0.76, 1]}>
        <torusGeometry args={[1.25, 0.006, 8, 144]} />
        <meshBasicMaterial color={BASE_COLOR} transparent opacity={0.045} />
      </mesh>
      {shards.map((shard) => (
        <mesh
          castShadow
          key={shard.key}
          position={shard.position}
          rotation={shard.rotation}
          scale={shard.scale}
        >
          <coneGeometry args={[1, 1, 5]} />
          <meshStandardMaterial
            color={shard.key.endsWith("0") ? "#adc0c3" : "#6f858b"}
            emissive={accent}
            emissiveIntensity={0.015}
            roughness={0.74}
            transparent
            opacity={0.42}
          />
        </mesh>
      ))}
    </group>
  );
}

function DomeIceShell({ accent, brickMaps, impact, quality }) {
  const model = useMemo(() => {
    const ribs = [];
    const panels = [];
    const rings = [];
    const thetaTop = 0.2;
    const thetaBottom = Math.PI * 0.5;
    const thetaSpan = thetaBottom - thetaTop;

    for (let row = 1; row <= DOME_PANEL_ROWS; row += 1) {
      const theta = thetaTop + (thetaSpan / DOME_PANEL_ROWS) * row;
      rings.push({
        key: `frost-ring-${row}`,
        opacity: 0.025 + row * 0.006,
        position: [0, DOME_CENTER_Y + Math.cos(theta) * DOME_RADIUS.y, 0],
        radius: Math.sin(theta),
      });
    }

    for (let rib = 0; rib < DOME_RIB_COUNT; rib += 1) {
      const angle = (rib / DOME_RIB_COUNT) * Math.PI * 2;
      for (let row = 0; row < DOME_PANEL_ROWS; row += 1) {
        const thetaA = thetaTop + (thetaSpan / DOME_PANEL_ROWS) * row;
        const thetaB = thetaTop + (thetaSpan / DOME_PANEL_ROWS) * (row + 1);
        ribs.push({
          end: domePoint(angle, thetaB, 0.012),
          key: `dome-rib-${rib}-${row}`,
          opacity: rib % 4 === 0 ? 0.18 : 0.04,
          radius: rib % 4 === 0 ? 0.008 : 0.0035,
          start: domePoint(angle, thetaA, 0.012),
        });
      }
    }

    for (let row = 0; row < DOME_PANEL_ROWS; row += 1) {
      const columns = DOME_TILE_COLUMNS_BY_ROW[row] || DOME_TILE_COLUMNS_BY_ROW.at(-1);
      const rowBand = thetaSpan / (DOME_PANEL_ROWS + 0.22);
      const theta = thetaTop + rowBand * (row + 0.82);
      const columnStep = (Math.PI * 2) / columns;
      const angleSpan = columnStep * (row < 2 ? 0.78 : row > 5 ? 0.64 : 0.7);
      const thetaTileSpan = rowBand * (row < 2 ? 0.66 : row > 5 ? 0.7 : 0.68);
      const stagger = row % 2 === 0 ? 0.5 : 0;
      for (let column = 0; column < columns; column += 1) {
        const angle = (column + stagger) * columnStep;
        const rib = Math.round((angle / (Math.PI * 2)) * DOME_RIB_COUNT);
        panels.push({
          breakDelay: Math.min(0.72, 0.08 + row * 0.085 + ((column % 7) * 0.026)),
          angle,
          angleSpan,
          key: `frost-panel-${row}-${column}`,
          lift: 0.058 + ((column + row) % 3) * 0.003,
          position: domeSurfacePoint(angle, theta, 0.058).toArray(),
          puff: 0.018 + row * 0.0022,
          rib,
          row,
          seed: row * 1.91 + column * 0.37,
          sideTint: row > 5 ? ((column + row) % 5 === 0 ? "#617980" : "#465d64") : (column + row) % 5 === 0 ? "#728a92" : "#566e76",
          theta,
          thetaSpan: thetaTileSpan,
          thickness: 0.18 + row * 0.012,
          tile: {
            offset: [((column * 17 + row * 5) % 37) / 37, ((row * 11 + column * 3) % 29) / 29],
            repeat: [0.82 + (column % 3) * 0.045, 0.84 + (row % 3) * 0.04],
          },
          tint:
            row < 2
              ? ((column + row) % 5 === 0 ? "#eef7f3" : "#c8dad8")
              : row > 5
                ? ((column + row) % 5 === 0 ? "#c4d9de" : "#91adb6")
                : (column + row) % 5 === 0
                  ? "#e0eeee"
                  : "#b7cdd2",
        });
      }
    }

    return { panels, ribs, rings };
  }, []);

  const visiblePanels = quality === "low" ? model.panels.filter((_, index) => index % 2 === 0) : model.panels;
  const visibleRibs =
    quality === "low"
      ? model.ribs.filter((rib) => rib.opacity > 0.1 && rib.key.endsWith("-0"))
      : model.ribs.filter((rib) => rib.opacity > 0.1);

  return (
    <group name="DomeIceShell">
      <mesh castShadow receiveShadow position={[0, DOME_CENTER_Y, 0]} scale={[DOME_RADIUS.x, DOME_RADIUS.y, DOME_RADIUS.z]}>
        <sphereGeometry args={[1, 56, 18, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshStandardMaterial
          color="#a9c1c6"
          emissive={accent}
          emissiveIntensity={0.026}
          metalness={0.0}
          opacity={0.38}
          roughness={0.84}
          side={THREE.DoubleSide}
          transparent
        />
      </mesh>
      {model.rings.map((ring) => (
        <mesh
          key={ring.key}
          position={ring.position}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[DOME_RADIUS.x * ring.radius, DOME_RADIUS.z * ring.radius, 1]}
        >
          <torusGeometry args={[1, 0.008, 8, 132]} />
          <meshBasicMaterial color={BASE_COLOR} transparent opacity={ring.opacity + 0.018} />
        </mesh>
      ))}

      {visibleRibs.map((rib) => (
        <OrientedCylinder
          key={rib.key}
          color={rib.opacity > 0.5 ? BASE_COLOR : accent}
          end={rib.end}
          opacity={rib.opacity}
          radius={rib.radius}
          start={rib.start}
        />
      ))}

      {visiblePanels.map((panel) => (
        <DomeTile
          accent={accent}
          brickMaps={brickMaps}
          impact={impact}
          key={panel.key}
          panel={panel}
        />
      ))}
    </group>
  );
}

function AirlockTunnelGeometry() {
  const geometry = useMemo(() => {
    const segments = 20;
    const outerX = 0.54;
    const outerY = 0.58;
    const innerX = 0.34;
    const innerY = 0.38;
    const depth = 0.74;
    const positions = [];
    const uvs = [];
    const indices = [];

    for (let zIndex = 0; zIndex <= 1; zIndex += 1) {
      const z = (zIndex - 0.5) * depth;
      for (let i = 0; i <= segments; i += 1) {
        const ratio = i / segments;
        const angle = Math.PI - ratio * Math.PI;
        positions.push(Math.cos(angle) * outerX, Math.sin(angle) * outerY, z);
        uvs.push(ratio, zIndex);
        positions.push(Math.cos(angle) * innerX, Math.sin(angle) * innerY, z + 0.012);
        uvs.push(ratio, zIndex + 0.35);
      }
    }

    const row = (segments + 1) * 2;
    for (let zIndex = 0; zIndex < 1; zIndex += 1) {
      const base = zIndex * row;
      const next = (zIndex + 1) * row;
      for (let i = 0; i < segments; i += 1) {
        const outerA = base + i * 2;
        const innerA = outerA + 1;
        const outerB = outerA + 2;
        const innerB = outerA + 3;
        const outerC = next + i * 2;
        const innerC = outerC + 1;
        const outerD = outerC + 2;
        const innerD = outerC + 3;
        indices.push(outerA, outerC, outerB, outerB, outerC, outerD);
        indices.push(innerB, innerC, innerA, innerD, innerC, innerB);
        indices.push(outerA, innerA, outerC, outerC, innerA, innerC);
        indices.push(outerB, outerD, innerB, innerB, outerD, innerD);
      }
    }

    const tunnelGeometry = new THREE.BufferGeometry();
    tunnelGeometry.setIndex(indices);
    tunnelGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    tunnelGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    tunnelGeometry.computeVertexNormals();
    return tunnelGeometry;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return <primitive attach="geometry" object={geometry} />;
}

function ScienceAirlockTunnel({ accent, brickMaps, impact }) {
  const tunnel = useRef(null);

  useFrame((_, delta) => {
    if (!tunnel.current) return;
    const cTarget = Math.max(0, (impact - 0.18) / 0.82);
    tunnel.current.position.x = THREE.MathUtils.damp(tunnel.current.position.x, 1.34 + cTarget * 0.18, 5, delta);
    tunnel.current.position.y = THREE.MathUtils.damp(tunnel.current.position.y, 0.16 - cTarget * 0.08, 5, delta);
    tunnel.current.rotation.z = THREE.MathUtils.damp(tunnel.current.rotation.z, cTarget * 0.16, 5, delta);
  });

  return (
    <group name="ScienceAirlockTunnel antarctic science dome airlock" rotation={[0, -0.12, 0]}>
      <mesh castShadow receiveShadow ref={tunnel} position={[1.34, 0.16, 1.18]}>
        <AirlockTunnelGeometry />
        <DomeBrickFaceMaterial
          accent={accent}
          color="#9fb6bd"
          opacity={0.96}
          sourceMaps={brickMaps.sourceMaps}
          squareMaps={brickMaps.squareMaps}
        />
      </mesh>
      <mesh castShadow receiveShadow position={[1.34, 0.18, 1.58]} scale={[0.74, 0.06, 0.18]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#566a71" roughness={0.9} metalness={0.02} transparent opacity={0.82} />
      </mesh>
      <mesh position={[1.34, 0.31, 1.56]} scale={[0.34, 0.24, 0.025]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#010304" transparent opacity={0.78} />
      </mesh>
      <mesh position={[1.34, 0.32, 1.54]} rotation={[Math.PI / 2, 0, 0]} scale={[0.42, 0.36, 1]}>
        <torusGeometry args={[1, 0.015, 8, 72, Math.PI]} />
        <meshBasicMaterial color={BASE_COLOR} transparent opacity={0.32} />
      </mesh>
      <pointLight color={BASE_COLOR} distance={2.4} intensity={0.28 + impact * 0.8} position={[1.34, 0.54, 1.14]} />
    </group>
  );
}

function TopologySeamNetwork({ accent, quality }) {
  const seams = useMemo(() => {
    const values = [];
    for (let index = 0; index < 20; index += 1) {
      const angle = (index / 20) * Math.PI * 2;
      const theta = 0.48 + (index % 5) * 0.16;
      values.push({
        end: domePoint(angle + 0.34 + (index % 3) * 0.04, theta + 0.18, 0.035),
        key: `topology-seam-${index}`,
        opacity: index % 4 === 0 ? 0.26 : 0.08,
        start: domePoint(angle, theta, 0.04),
      });
    }
    return values;
  }, []);

  const visibleSeams = quality === "low" ? seams.filter((_, index) => index % 2 === 0) : seams;

  return (
    <group name="TopologySeamNetwork">
      {visibleSeams.map((seam) => (
        <OrientedCylinder
          key={seam.key}
          color={seam.opacity > 0.5 ? "#a996ff" : accent}
          end={seam.end}
          opacity={seam.opacity}
          radius={seam.opacity > 0.3 ? 0.006 : 0.0035}
          start={seam.start}
        />
      ))}
      <mesh position={[0, 0.64, 0]} rotation={[1.15, 0.22, 0.64]} scale={[1.18, 0.58, 1]}>
        <torusGeometry args={[1.04, 0.006, 8, 144]} />
        <meshBasicMaterial color="#dffdf7" transparent opacity={0.11} />
      </mesh>
      <mesh position={[0, 0.55, 0]} rotation={[1.84, -0.4, 0.18]} scale={[1.0, 0.5, 1]}>
        <torusGeometry args={[1.22, 0.005, 8, 144]} />
        <meshBasicMaterial color={accent} transparent opacity={0.1} />
      </mesh>
    </group>
  );
}

function S2CoreAssembly({ accent }) {
  const coreRef = useRef(null);

  useFrame(({ clock }) => {
    if (!coreRef.current) return;
    coreRef.current.rotation.y = clock.elapsedTime * 0.34;
    coreRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.2) * 0.18;
  });

  return (
    <group ref={coreRef} name="S2CoreAssembly" position={[0, 0.48, 0]}>
      <mesh scale={[0.44, 0.44, 0.44]}>
        <icosahedronGeometry args={[1, 3]} />
        <meshStandardMaterial
          color={BASE_COLOR}
          emissive={accent}
          emissiveIntensity={0.3}
          metalness={0.14}
          roughness={0.22}
          transparent
          opacity={0.34}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.66, 0.006, 8, 96]} />
        <meshBasicMaterial color={accent} transparent opacity={0.18} />
      </mesh>
      <mesh rotation={[0.85, 0.24, 0.4]}>
        <torusGeometry args={[0.78, 0.005, 8, 96]} />
        <meshBasicMaterial color="#a996ff" transparent opacity={0.12} />
      </mesh>
      <mesh scale={[0.18, 0.18, 0.18]}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshBasicMaterial color="#010304" transparent opacity={0.62} />
      </mesh>
    </group>
  );
}

export default function PolarObservatoryDome({
  activeArtifact,
  axisVelocity = 0,
  axisX,
  homeX,
  impactPulse = 0,
  quality = "high",
}) {
  const rootRef = useRef(null);
  const brickMaps = useDomeBrickTextureBundle();
  const accent = activeArtifact?.accent || "#5ff8e7";
  const collisionImpact =
    Math.max(0, 1 - Math.abs((axisX ?? homeX) - homeX) / 0.34) *
    Math.min(1, Math.max(0, Math.abs(axisVelocity) - 0.72) * 2.1);
  const impact = Math.max(collisionImpact, impactPulse);

  useFrame(({ clock }) => {
    if (!rootRef.current) return;
    rootRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.1) * 0.024 + axisVelocity * 0.08 + impact * 0.05;
    rootRef.current.position.y = 0.04 + Math.sin(clock.elapsedTime * 0.18) * 0.012 - impact * 0.025;
    rootRef.current.position.x = homeX + Math.sin(clock.elapsedTime * 18) * impact * 0.018;
  });

  return (
    <group
      ref={rootRef}
      name={`igloo-polar-dome PolarObservatoryDome ${SCIENCE_DOME_REFERENCE}`}
      position={[homeX, 0.04, 0]}
      scale={[0.86, 0.9, 0.86]}
      userData={{ className: "igloo-polar-dome igloo-dome" }}
    >
      <IcePlinth accent={accent} />
      <DomeIceShell accent={accent} brickMaps={brickMaps} impact={impact} quality={quality} />
      <ScienceAirlockTunnel accent={accent} brickMaps={brickMaps} impact={impact} />
      <TopologySeamNetwork accent={accent} quality={quality} />
      <S2CoreAssembly accent={accent} />
      <mesh position={[0, 1.5, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.86, 0.54, 1]}>
        <torusGeometry args={[0.72, 0.008, 8, 120]} />
        <meshBasicMaterial color={BASE_COLOR} transparent opacity={0.14} />
      </mesh>
      <pointLight color={accent} distance={5.2} intensity={0.38} position={[0, 0.76, 0.4]} />
      <spotLight
        angle={0.42}
        color={BASE_COLOR}
        distance={7}
        intensity={quality === "low" ? 0.68 : 0.92}
        penumbra={0.82}
        position={[-1.4, 2.25, 1.2]}
      />
    </group>
  );
}
